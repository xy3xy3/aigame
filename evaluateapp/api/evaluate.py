import asyncio
import logging
import random
from fastapi import APIRouter, UploadFile, File, Depends, Request, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse

# 调整相对导入路径以适应新的结构
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
    judge_zip: UploadFile = File(..., description="题目的评测脚本ZIP包")
):
    """
    接收提交文件和评测脚本文件，执行评测，并通过回调返回结果。
    """
    semaphore: asyncio.Semaphore = request.app.state.semaphore

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
            semaphore
        )
        
        logger.info(f"Background evaluation task started for submission: {submission_id}")
        return {"status": "Evaluation started", "submission_id": submission_id}

    except Exception as e:
        logger.error(f"Failed to start evaluation for submission {submission_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"评测启动失败: {str(e)}")