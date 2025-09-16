# evaluateapp/services/sandbox.py

import asyncio
import io
import json
import tempfile
import zipfile
import sys
import os
import shutil
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
import subprocess
from string import Template

# 添加 httpx 用于回调
import httpx
from core.config import settings

from schemas.evaluation import EvaluationResponse

def _execute_judge_code(
    submission_dir: str,
    judge_dir: str,
) -> dict:
    """
    在一个隔离的、扁平化的工作目录中执行评测，以防止路径遍历攻击。
    """
    # 使用一个临时目录作为安全的、隔离的评测工作区
    with tempfile.TemporaryDirectory() as workspace:
        try:
            # --- 1. 准备扁平化的沙箱环境 ---
            workspace_path = Path(workspace)

            # 将评测脚本和数据文件复制到工作区顶层
            for item in os.listdir(judge_dir):
                src = os.path.join(judge_dir, item)
                dst = workspace_path / item
                if os.path.isdir(src):
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

            # 将用户提交的文件也复制到工作区顶层
            for item in os.listdir(submission_dir):
                src = os.path.join(submission_dir, item)
                dst = workspace_path / item
                if os.path.isdir(src):
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

            # --- 2. 准备评测入口脚本 ---
            python_executable = sys.executable
            template_path = Path(__file__).parent / "eval_script_template.py"
            with open(template_path, "r", encoding="utf-8") as f:
                template_content = f.read()

            # 在扁平目录中，所有路径都是相对于当前目录的
            filled_script = Template(template_content).substitute(
                judge_dir_json=json.dumps("."), # 当前目录
                submission_dir_json=json.dumps("."), # 当前目录
                python_executable_json=json.dumps(python_executable),
            )

            # 将评测入口脚本直接写入工作区
            script_path = workspace_path / "eval_runner.py"
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(filled_script)

            # --- 3. 在沙箱工作目录中执行子进程 ---
            # 恢复使用 bash 引导脚本，以解决原始的 ImportError 问题
            venv_dir = str(Path(python_executable).parent.parent)
            bootstrap_command = f"""
            unset PYTHONPATH
            unset PYTHONHOME
            source "{venv_dir}/bin/activate"
            "{python_executable}" "{script_path.name}"
            """

            # 关键：使用 cwd 参数将子进程的当前工作目录设置为我们的沙箱
            result = subprocess.run(
                ['/bin/bash', '-c', bootstrap_command],
                capture_output=True,
                text=True,
                timeout=300,
                cwd=workspace_path  # <-- 将子进程锁定在我们的安全目录中
            )

            # --- 4. 解析结果 ---
            if result.stdout:
                try:
                    return json.loads(result.stdout.strip())
                except json.JSONDecodeError:
                    return {"status": "ERROR", "score": 0.0, "logs": f"无法解析评测结果JSON: {result.stdout}\n[stderr]: {result.stderr}"}
            else:
                return {"status": "ERROR", "score": 0.0, "logs": f"评测脚本没有输出到stdout。\n[stderr]: {result.stderr}\n返回码: {result.returncode}"}

        except Exception as e:
            import traceback
            error_info = f"执行评测的工作进程发生异常: {type(e).__name__}: {e}\n{traceback.format_exc()}"
            return {"status": "ERROR", "score": 0.0, "logs": error_info}

# ... (文件的其余部分: post_results_to_webapp, run_in_sandbox_and_callback 等保持不变)
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
            response.raise_for_status()
            print(f"[Callback] Successfully sent callback for submission {submission_id}")
        except httpx.HTTPStatusError as e:
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
    准备环境，在工作进程中执行评测，然后调用回调函数发送结果。
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
            result_dict = await loop.run_in_executor(
                executor,
                _execute_judge_code,
                str(submission_dir),
                str(judge_dir),
            )
            print(f"[Sandbox] Evaluation completed for submission {submission_id}: {result_dict.get('status', 'UNKNOWN')}")
        await post_results_to_webapp(submission_id, result_dict)
