import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from concurrent.futures import ProcessPoolExecutor

# 导入API模块
from api import evaluate
from core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    管理应用的生命周期。
    在应用启动时创建资源，在关闭时释放。
    """
    # 应用启动时:
    # 1. 创建一个容量为4的信号量，控制并发评测数
    app.state.semaphore = asyncio.Semaphore(4)
    # 2. 创建一个进程池，用于在隔离的进程中运行评测代码，并将其存入app.state
    app.state.executor = ProcessPoolExecutor(max_workers=4)
    print("FastAPI app started. Concurrency limit: 4. ProcessPoolExecutor created.")

    yield

    # 应用关闭时:
    # 明确关闭进程池，等待所有子进程结束
    print("FastAPI app shutting down. Shutting down ProcessPoolExecutor...")
    app.state.executor.shutdown(wait=True)
    print("ProcessPoolExecutor shut down gracefully.")


# 初始化FastAPI应用，并指定生命周期管理器
app = FastAPI(
    title="EvaluateApp",
    version="0.1.0",
    description="一个安全、并发控制的自动评测服务",
    lifespan=lifespan
)

# 加载API路由，前缀为 /api
app.include_router(evaluate.router, prefix="/api", tags=["Evaluation"])

# 可选：挂载 Gradio 调试页面（仅在 ENABLE_GRADIO=true 且已安装 gradio 时启用）
if settings.ENABLE_GRADIO:
    try:
        import io
        import json
        import zipfile
        import tempfile
        from pathlib import Path
        import gradio as gr
        # 复用沙箱执行核心逻辑，保持与正式评测一致
        from services.sandbox import _execute_judge_code

        def build_gradio_ui():
            def run_debug(submission_id: str, submission_zip_path: str, judge_zip_path: str):
                """在本地沙箱中同步执行评测，流式输出日志并返回最终结果。"""
                logs = []

                def emit(msg: str):
                    logs.append(msg)
                    # 中间态：仅日志，无最终结果
                    return "\n".join(logs), None

                # 第一次即时反馈
                yield emit("开始校验输入...")
                try:
                    if not submission_id:
                        yield emit("缺少 submission_id")
                        return
                    if not submission_zip_path or not judge_zip_path:
                        yield emit("请上传 submission_zip 与 judge_zip 文件")
                        return

                    yield emit("准备临时工作目录并解压文件...")
                    with tempfile.TemporaryDirectory() as tmpdir:
                        workspace = Path(tmpdir)
                        submission_dir = workspace / "submission"
                        judge_dir = workspace / "judge"
                        submission_dir.mkdir()
                        judge_dir.mkdir()

                        # 解压 submission
                        with open(submission_zip_path, "rb") as f:
                            submission_bytes = f.read()
                        with zipfile.ZipFile(io.BytesIO(submission_bytes)) as zf:
                            zf.extractall(submission_dir)
                        yield emit("已解压 submission.zip")

                        # 解压 judge
                        with open(judge_zip_path, "rb") as f:
                            judge_bytes = f.read()
                        with zipfile.ZipFile(io.BytesIO(judge_bytes)) as zf:
                            zf.extractall(judge_dir)
                        yield emit("已解压 judge.zip")

                        # 运行评测
                        yield emit("开始执行评测...")
                        result = _execute_judge_code(str(submission_dir), str(judge_dir))
                        # 最终态：输出最终结果
                        logs_text = "\n".join(logs + [f"完成。状态: {result.get('status')} 分数: {result.get('score')}"])
                        yield logs_text, result
                except Exception as e:
                    err_result = {"status": "ERROR", "score": 0.0, "logs": str(e)}
                    logs_text = "\n".join(logs + [f"发生错误: {e}"])
                    yield logs_text, err_result

            with gr.Blocks() as demo:
                gr.Markdown("# EvaluateApp 调试面板\n在本地沙箱中上传 ZIP 并实时查看评测结果。")
                with gr.Row():
                    submission_id = gr.Textbox(label="Submission ID", placeholder="用于标识本次评测")
                with gr.Row():
                    submission_zip = gr.File(label="Submission ZIP", file_count="single", file_types=[".zip"], type="filepath")
                    judge_zip = gr.File(label="Judge ZIP", file_count="single", file_types=[".zip"], type="filepath")
                run_btn = gr.Button("运行评测")
                logs = gr.Textbox(label="实时日志", lines=18)
                result = gr.JSON(label="评测结果")
                run_btn.click(fn=run_debug, inputs=[submission_id, submission_zip, judge_zip], outputs=[logs, result])
            return demo

        demo = build_gradio_ui()
        app = gr.mount_gradio_app(app, demo, path=settings.GRADIO_PATH)
        print(f"Gradio 调试页面已挂载: {settings.GRADIO_PATH}")
    except ImportError:
        print("未安装 gradio，跳过调试页面挂载。要启用请安装 gradio 并设置 ENABLE_GRADIO=true")
    except Exception as e:
        print(f"挂载 Gradio 调试页面失败: {e}")

@app.get("/", tags=["Health Check"])
def read_root():
    """根路径，用于健康检查。"""
    return {"status": "EvaluateApp is running"}

if __name__ == "__main__":
    import uvicorn
    # 启动FastAPI应用
    # 重要：直接传入 app 对象，避免 uvicorn 再次导入模块导致重复挂载
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
