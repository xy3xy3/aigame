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
    在一个隔离的、分层的工作目录中执行评测，以防止路径遍历和模块劫持攻击。
    """
    with tempfile.TemporaryDirectory() as workspace:
        try:
            # --- 1. 准备分层的沙箱环境 ---
            workspace_path = Path(workspace)

            # CHANGED: 创建独立的目录用于存放评测代码和用户代码
            judge_workspace = workspace_path / "judge_env"
            submission_workspace = workspace_path / "submission_env"
            judge_workspace.mkdir()
            submission_workspace.mkdir()

            # 将评测脚本和数据文件复制到其专属目录
            for item in os.listdir(judge_dir):
                src = os.path.join(judge_dir, item)
                dst = judge_workspace / item
                if os.path.isdir(src):
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

            # 将用户提交的文件复制到其专属目录
            for item in os.listdir(submission_dir):
                src = os.path.join(submission_dir, item)
                dst = submission_workspace / item
                if os.path.isdir(src):
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

            # --- 2. 准备评测入口脚本 ---
            python_executable = sys.executable
            template_path = Path(__file__).parent / "eval_script_template.py"
            with open(template_path, "r", encoding="utf-8") as f:
                template_content = f.read()

            # CHANGED: 传递相对路径给模板，不再是 "."
            # 模板脚本将从 workspace_path 运行，并使用这些相对路径
            filled_script = Template(template_content).substitute(
                judge_dir_json=json.dumps(str(judge_workspace.name)),
                submission_dir_json=json.dumps(str(submission_workspace.name)),
                python_executable_json=json.dumps(python_executable),
            )

            script_path = workspace_path / "eval_runner.py"
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(filled_script)

            # --- 3. 在沙箱工作目录中执行子进程 ---
            venv_dir = str(Path(python_executable).parent.parent)
            bootstrap_command = f"""
            unset PYTHONPATH
            unset PYTHONHOME
            source "{venv_dir}/bin/activate"
            "{python_executable}" "{script_path.name}"
            """

            # 关键：子进程的当前工作目录(cwd)是 workspace_path。
            # eval_runner.py 会将 judge_env 添加到 sys.path，
            # 这样它就能找到 judge.py，但它绝不会把 submission_env 添加到 sys.path。
            result = subprocess.run(
                ['/bin/bash', '-c', bootstrap_command],
                capture_output=True,
                text=True,
                timeout=300,
                cwd=workspace_path
            )

            # --- 4. 解析结果 (no changes needed here) ---
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
