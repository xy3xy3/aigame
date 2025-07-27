import asyncio
import logging
import random
from fastapi import APIRouter, UploadFile, File, Depends, Request, HTTPException
from fastapi.responses import JSONResponse

# 调整相对导入路径以适应新的结构
from ..services import sandbox
from ..schemas.evaluation import EvaluationResponse, EvaluationRequest

# 导入 Prisma 客户端
from prisma import Prisma

router = APIRouter()
logger = logging.getLogger(__name__)

# 初始化 Prisma 客户端实例
prisma = Prisma()

@router.post("/evaluate", response_model=EvaluationResponse)
async def run_evaluation(
    request: Request,
    submission_zip: UploadFile = File(..., description="用户的提交ZIP文件"),
    judge_zip: UploadFile = File(..., description="开发者的评测ZIP包")
):
    """
    接收提交和评测包，并发控制执行评测，并返回结果。
    """
    semaphore: asyncio.Semaphore = request.app.state.semaphore

    logger.info("Received evaluation request. Waiting for semaphore...")
    async with semaphore:
        # 只有在获得信号量（即并发数<4）时，以下代码才会执行
        logger.info("Semaphore acquired. Starting new evaluation task.")

        try:
            submission_data = await submission_zip.read()
            judge_data = await judge_zip.read()

            # 调用沙箱服务在安全的子进程中执行评测
            result = await sandbox.run_in_sandbox(submission_data, judge_data)

            return result

        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"评测时发生内部错误: {str(e)}")
        finally:
            logger.info("Evaluation task finished. Releasing semaphore.")

@router.post("/")
async def evaluate_submission(evaluation_request: EvaluationRequest):
    """
    接收 submissionId，模拟评测过程，并将结果更新回数据库。
    """
    submission_id = evaluation_request.submission_id

    try:
        # 连接数据库
        await prisma.connect()

        # 更新状态为 RUNNING
        await prisma.submission.update(
            where={"id": submission_id},
            data={"status": "RUNNING"}
        )

        # 模拟评测过程
        # 生成一个 0 到 100 之间的随机浮点数作为 score
        score = random.uniform(0, 100)
        stdout = "Evaluation successful."

        # 更新最终结果
        await prisma.submission.update(
            where={"id": submission_id},
            data={
                "status": "SUCCESS",
                "score": score,
                "stdout": stdout,
                "judgedAt": {"$newDate": {}}
            }
        )

        # 返回成功响应
        return {"status": "SUCCESS", "message": "Evaluation completed successfully"}

    except Exception as e:
        # 错误处理
        logger.error(f"An error occurred during evaluation: {e}", exc_info=True)
        try:
            # 更新状态为 FAILED
            await prisma.submission.update(
                where={"id": submission_id},
                data={
                    "status": "FAILED",
                    "stderr": str(e)
                }
            )
        except Exception as update_error:
            logger.error(f"Failed to update submission status to FAILED: {update_error}", exc_info=True)

        # 返回失败响应
        return {"status": "FAILED", "message": f"Evaluation failed: {str(e)}"}

    finally:
        # 断开数据库连接
        await prisma.disconnect()