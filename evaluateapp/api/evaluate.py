import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, Request, HTTPException, Form, BackgroundTasks
from concurrent.futures import ProcessPoolExecutor

# 调整相对导入路径
from services import sandbox
from core.config import settings
from schemas.evaluation import EvaluationResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/evaluate")
async def run_evaluation(
    background_tasks: BackgroundTasks,
    request: Request,
    submission_id: str = Form(..., description="提交ID，用于回调"),
    submission_zip: UploadFile = File(..., description="用户的提交ZIP文件"),
    judge_zip: UploadFile = File(..., description="题目的评测脚本ZIP包")
):
    """
    接收提交文件和评测脚本文件，执行评测，并通过回调返回结果。
    """
    # 简单的Bearer鉴权（要求 webapp 提供与 EVALUATE_INBOUND_SECRET 匹配的密钥）
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: Missing or invalid authorization header")
    token = auth_header.split(" ", 1)[1]
    if token != settings.EVALUATE_INBOUND_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid inbound secret")

    semaphore: asyncio.Semaphore = request.app.state.semaphore
    executor: ProcessPoolExecutor = request.app.state.executor # <-- 从app.state获取executor

    logger.info(f"Received evaluation request for submission: {submission_id}")

    try:
        submission_data = await submission_zip.read()
        judge_data = await judge_zip.read()

        # 将异步任务交由后台执行，并立即返回
        background_tasks.add_task(
            sandbox.run_in_sandbox_and_callback,
            submission_id,
            submission_data,
            judge_data,
            semaphore,
            executor  # <-- 将executor传递给后台任务
        )

        logger.info(f"Background evaluation task started for submission: {submission_id}")
        return {"status": "Evaluation started", "submission_id": submission_id}

    except Exception as e:
        logger.error(f"Failed to start evaluation for submission {submission_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"评测启动失败: {str(e)}")
