import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

# 导入简化后的API模块
from api import evaluate

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    管理应用的生命周期。
    在应用启动时创建资源，在关闭时释放。
    """
    # 应用启动时: 创建一个容量为4的信号量，控制并发评测数
    app.state.semaphore = asyncio.Semaphore(4)
    print("FastAPI app started. Evaluation concurrency limit: 4")
    yield
    # 应用关闭时:
    print("FastAPI app shutting down.")


# 初始化FastAPI应用，并指定生命周期管理器
app = FastAPI(
    title="EvaluateApp",
    version="0.1.0",
    description="一个安全、并发控制的自动评测服务",
    lifespan=lifespan
)

# 加载API路由，前缀为 /evaluate
app.include_router(evaluate.router, prefix="/evaluate", tags=["Evaluation"])

@app.get("/", tags=["Health Check"])
def read_root():
    """根路径，用于健康检查。"""
    return {"status": "EvaluateApp is running"}

if __name__ == "__main__":
    import uvicorn
    # 启动FastAPI应用
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")