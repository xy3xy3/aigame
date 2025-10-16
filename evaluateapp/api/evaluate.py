import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Form, BackgroundTasks
import hashlib
import hmac
from concurrent.futures import ProcessPoolExecutor

# 调整相对导入路径
from core.config import settings

# 根据配置选择评测后端（CHROOT 或 DOCKER）
if (settings.SANDBOX_BACKEND or "").strip().upper() == "DOCKER":
    from services import docker_sandbox as sandbox
else:
    from services import sandbox
from schemas.evaluation import EvaluationResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/evaluate")
async def run_evaluation(
    background_tasks: BackgroundTasks,
    request: Request,
    submission_id: str = Form(..., description="提交ID，用于回调"),
    submission_zip: UploadFile = File(..., description="用户的提交ZIP文件"),
    judge_zip: UploadFile = File(..., description="题目的评测脚本ZIP包"),
    callback_url: str | None = Form(None, description="回调URL，可覆盖默认配置")
):
    """
    接收提交文件和评测脚本文件，执行评测，并通过回调返回结果。
    """
    # 签名校验：X-Timestamp + X-Sign
    ts = request.headers.get("X-Timestamp")
    sign = request.headers.get("X-Sign")
    if not ts or not sign:
        raise HTTPException(status_code=401, detail="Unauthorized: Missing signature headers")
    try:
        ts_int = int(ts)
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid timestamp")
    import time
    if abs(time.time() - ts_int) > 600:
        raise HTTPException(status_code=401, detail="Unauthorized: Signature expired")

    semaphore: asyncio.Semaphore = request.app.state.semaphore
    executor: ProcessPoolExecutor = request.app.state.executor # <-- 从app.state获取executor

    logger.info(f"Received evaluation request for submission: {submission_id}")

    try:
        submission_data = await submission_zip.read()
        judge_data = await judge_zip.read()
        cb_url = callback_url or settings.WEBAPP_CALLBACK_URL

        # 计算签名（主方案：不包含回调URL；兼容方案：包含回调URL，便于平滑过渡）
        sub_hash = hashlib.sha256(submission_data).hexdigest()
        judge_hash = hashlib.sha256(judge_data).hexdigest()
        content_hash_v1 = hashlib.sha256(f"{submission_id}\n{sub_hash}\n{judge_hash}".encode("utf-8")).hexdigest()
        expected_v1 = hmac.new(settings.SHARED_SECRET.encode("utf-8"), f"{ts}\n{content_hash_v1}".encode("utf-8"), hashlib.sha256).hexdigest()

        # 兼容：如果客户端仍包含 callback_url 进签名，允许通过
        content_hash_v2 = hashlib.sha256(f"{submission_id}\n{sub_hash}\n{judge_hash}\n{cb_url}".encode("utf-8")).hexdigest()
        expected_v2 = hmac.new(settings.SHARED_SECRET.encode("utf-8"), f"{ts}\n{content_hash_v2}".encode("utf-8"), hashlib.sha256).hexdigest()

        # 调试输出（stdout + logger）
        # 仅输出密钥摘要，避免泄露明文
        secret_sha = hashlib.sha256(settings.SHARED_SECRET.encode("utf-8")).hexdigest()
        print(f"[AuthDebug] submission_id={submission_id} ts={ts} sub_hash={sub_hash} judge_hash={judge_hash} content_hash_v1={content_hash_v1} expected_v1={expected_v1} content_hash_v2={content_hash_v2} expected_v2={expected_v2} provided={sign}")
        print(f"[AuthDebugSecret] secret_len={len(settings.SHARED_SECRET)} secret_sha256={secret_sha}")
        try:
            import logging
            logging.getLogger(__name__).info(
                f"[AuthDebug] submission_id=%s ts=%s sub_hash=%s judge_hash=%s content_hash_v1=%s expected_v1=%s content_hash_v2=%s expected_v2=%s provided=%s",
                submission_id, ts, sub_hash, judge_hash, content_hash_v1, expected_v1, content_hash_v2, expected_v2, sign,
            )
        except Exception:
            pass

        if not (hmac.compare_digest(expected_v1, sign) or hmac.compare_digest(expected_v2, sign)):
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid signature")

        # 将异步任务交由后台执行，并立即返回
        background_tasks.add_task(
            sandbox.run_in_sandbox_and_callback,
            submission_id,
            submission_data,
            judge_data,
            semaphore,
            executor,  # <-- 将executor传递给后台任务
            cb_url,
        )

        logger.info(f"Background evaluation task started for submission: {submission_id}")
        return {"status": "Evaluation started", "submission_id": submission_id}

    except HTTPException as e:
        # 直接透传 HTTP 异常（例如 401 签名失败），避免被包装成 500
        raise e
    except Exception as e:
        logger.error(f"Failed to start evaluation for submission {submission_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"评测启动失败: {str(e)}")
