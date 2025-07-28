import asyncio
import logging
import random
from fastapi import APIRouter, UploadFile, File, Depends, Request, HTTPException
from fastapi.responses import JSONResponse

# 调整相对导入路径以适应新的结构
from services import sandbox
from schemas.evaluation import EvaluationResponse
router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/evaluate", response_model=EvaluationResponse)
async def run_evaluation(
    request: Request,
    submission_file: UploadFile = File(..., description="用户的提交文件（可以是.py或.zip格式）"),
    judge_file: UploadFile = File(..., description="题目的评测脚本文件（可以是.py或.zip格式）")
):
    """
    接收提交文件和评测脚本文件，执行评测，并返回结果。
    """
    semaphore: asyncio.Semaphore = request.app.state.semaphore

    logger.info("Received evaluation request. Waiting for semaphore...")
    async with semaphore:
        # 只有在获得信号量（即并发数<4）时，以下代码才会执行
        logger.info("Semaphore acquired. Starting new evaluation task.")

        try:
            submission_data = await submission_file.read()
            judge_data = await judge_file.read()

            # 调用沙箱服务在安全的子进程中执行评测
            result = await sandbox.run_in_sandbox(submission_data, judge_data)

            return result

        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"评测时发生内部错误: {str(e)}")
        finally:
            logger.info("Evaluation task finished. Releasing semaphore.")