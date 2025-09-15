import asyncio
import io
import json
import tempfile
import zipfile
import sys
import os
import importlib.util
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from string import Template

# 添加 httpx 用于回调
import httpx
from core.config import settings

from schemas.evaluation import EvaluationResponse

# [说明] 这个 executor 的生命周期已由 main.py 中的 lifespan 管理，此处无需定义

def _execute_judge_code(
    submission_dir: str,
    judge_dir: str,
) -> dict:
    """
    在一个受限的子进程中，动态加载并执行评测代码。
    警告：此函数将在一个单独的、无权限的进程中运行。
    """
    try:
        # 1. [MODIFIED] 动态确定虚拟环境中的Python解释器路径
        #    这使得代码在主机和Docker中都具有可移植性
        project_root = Path(__file__).resolve().parent.parent.parent
        expected_executable = project_root / ".venv" / "bin" / "python"

        if expected_executable.is_file():
            python_executable = str(expected_executable)
        else:
            # 备选方案：使用启动当前进程的Python解释器。
            # 这在Docker或已激活venv的环境中非常可靠。
            python_executable = sys.executable
            print(
                f"WARNING: Preferred venv python not found at '{expected_executable}'. "
                f"Falling back to current process python: '{python_executable}'"
            )

        # 2. 从独立模板文件读取评测脚本，并用变量替换占位符
        tmpl_path = Path(__file__).resolve().parent / "eval_script_template.py"
        with open(tmpl_path, "r", encoding="utf-8") as f:
            tmpl_text = f.read()

        # 使用 JSON 转义来保证路径字符串在子进程中的安全性
        eval_script = Template(tmpl_text).substitute(
            judge_dir_json=json.dumps(str(judge_dir)),
            submission_dir_json=json.dumps(str(submission_dir)),
        )

        # 3. 使用subprocess在虚拟环境中运行评测脚本
        import subprocess
        result = subprocess.run(
            [python_executable, "-c", eval_script],
            capture_output=True,
            text=True,
            timeout=900  # 15分钟超时，以适应模型推理任务
        )

        # 4. 解析输出结果
        if result.stdout:
            try:
                return json.loads(result.stdout.strip())
            except json.JSONDecodeError:
                # 如果JSON解析失败，返回错误信息
                return {
                    "status": "ERROR",
                    "score": 0.0,
                    "logs": f"无法解析评测结果: {result.stdout}\\n错误输出: {result.stderr}"
                }
        else:
            # 如果没有标准输出，返回错误信息
            return {
                "status": "ERROR",
                "score": 0.0,
                "logs": f"评测脚本没有输出\\n错误输出: {result.stderr}\\n返回码: {result.returncode}"
            }

    except subprocess.TimeoutExpired:
        return {
            "status": "ERROR",
            "score": 0.0,
            "logs": "评测超时（超过15分钟）"
        }
    except Exception as e:
        import traceback
        error_info = f"执行评测时发生异常: {type(e).__name__}: {e}\\n{traceback.format_exc()}"
        return {"status": "ERROR", "score": 0.0, "logs": error_info}


async def post_results_to_webapp(submission_id: str, result: dict):
    """向 webapp 发送回调请求"""
    headers = {
        "Authorization": f"Bearer {settings.WEBAPP_CALLBACK_SECRET}",
        "Content-Type": "application/json"
    }
    payload = {
        "submissionId": submission_id,
        **result
    }

    print(f"[Callback] Sending results for submission {submission_id}: {json.dumps(payload)}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(settings.WEBAPP_CALLBACK_URL, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()  # 如果状态码不是 2xx，则抛出异常
            print(f"[Callback] Successfully sent callback for submission {submission_id}")
        except httpx.HTTPStatusError as e:
            # 获取响应体，如果为空则显示"(empty body)"或"(no body)"
            response_body = e.response.text if e.response.text else "(empty body)"
            print(f"[Callback] Error sending callback for {submission_id}: Status {e.response.status_code}, Body: {response_body}")
        except httpx.TimeoutException as e:
            print(f"[Callback] Timeout sending callback for {submission_id}: {e}")
        except Exception as e:
            print(f"[Callback] An unexpected error occurred during callback for {submission_id}: {e}")


async def run_in_sandbox_and_callback(
    submission_id: str,
    submission_data: bytes,
    judge_data: bytes,
    semaphore: asyncio.Semaphore,
    executor: ProcessPoolExecutor
):
    """
    准备环境，执行评测，然后调用回调函数发送结果。
    """
    print(f"[Sandbox] Starting evaluation for submission {submission_id}")

    async with semaphore:
        print(f"[Sandbox] Semaphore acquired for submission {submission_id}")
        loop = asyncio.get_running_loop()

        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir)
            submission_dir = workspace / "submission"
            judge_dir = workspace / "judge"
            submission_dir.mkdir()
            judge_dir.mkdir()

            with zipfile.ZipFile(io.BytesIO(submission_data)) as zf:
                zf.extractall(submission_dir)
            with zipfile.ZipFile(io.BytesIO(judge_data)) as zf:
                zf.extractall(judge_dir)

            # 执行评测代码
            print(f"[Sandbox] Starting evaluation process for submission {submission_id}")
            result_dict = await loop.run_in_executor(
                executor,
                _execute_judge_code,
                str(submission_dir),
                str(judge_dir),
            )
            print(f"[Sandbox] Evaluation completed for submission {submission_id}: {result_dict['status']}")

        # 评测完成后，发送回调
        await post_results_to_webapp(submission_id, result_dict)


# 保留原有函数用于兼容性
async def run_in_sandbox(
    submission_data: bytes,
    judge_data: bytes,
    executor: ProcessPoolExecutor
) -> EvaluationResponse:
    """
    准备环境并调用进程池来安全地执行评测。
    """
    loop = asyncio.get_running_loop()

    # 使用临时目录，确保自动清理
    with tempfile.TemporaryDirectory() as tmpdir:
        workspace = Path(tmpdir)
        submission_dir = workspace / "submission"
        judge_dir = workspace / "judge"
        submission_dir.mkdir()
        judge_dir.mkdir()

        with zipfile.ZipFile(io.BytesIO(submission_data)) as zf:
            zf.extractall(submission_dir)
        with zipfile.ZipFile(io.BytesIO(judge_data)) as zf:
            zf.extractall(judge_dir)

        # 将阻塞的、CPU密集型的子进程任务交给进程池处理
        result_dict = await loop.run_in_executor(
            executor,
            _execute_judge_code,
            str(submission_dir),
            str(judge_dir),
        )

        return EvaluationResponse(**result_dict)
