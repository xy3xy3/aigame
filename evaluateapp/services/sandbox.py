import asyncio
import io
import tempfile
import zipfile
import sys
import os
import importlib.util
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

# prctl 需要 `uv pip install python-prctl`
import prctl

from ..schemas.evaluation import EvaluationResponse

# 创建一个进程池，用于在隔离的进程中运行评测代码
# max_workers 应该与信号量的大小匹配
executor = ProcessPoolExecutor(max_workers=4)

def _execute_judge_code(
    submission_dir: str,
    judge_dir: str,
    seccomp_profile_path: str
) -> dict:
    """
    在一个受限的子进程中，动态加载并执行评测代码。
    警告：此函数将在一个单独的、无权限的进程中运行。
    """
    try:
        # 1. 应用Seccomp安全策略！这是安全的核心！
        with open(seccomp_profile_path, 'r') as f:
            profile_data = f.read()
        prctl.set_seccomp(True, profile_data)

        # 2. 更改工作目录，限制文件访问范围
        os.chdir(judge_dir)

        # 3. 动态加载评测模块
        judge_script_path = Path(judge_dir) / "judge.py"
        if not judge_script_path.exists():
            raise FileNotFoundError("评测包中必须包含 'judge.py' 文件")

        sys.path.insert(0, judge_dir)

        spec = importlib.util.spec_from_file_location("judge", judge_script_path)
        judge_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(judge_module)

        # 4. 检查并调用约定的评测函数
        if not hasattr(judge_module, "evaluate"):
            raise AttributeError("评测脚本 'judge.py' 必须包含一个 'evaluate' 函数")

        result_dict = judge_module.evaluate(
            submission_path=submission_dir,
            judge_data_path=judge_dir
        )

        if not isinstance(result_dict, dict):
            raise TypeError("evaluate 函数必须返回一个字典")

        return {"status": "COMPLETED", "score": result_dict.get("score", 0.0), "logs": result_dict.get("logs", "")}

    except Exception as e:
        import traceback
        error_info = f"评测子进程异常: {type(e).__name__}: {e}\n{traceback.format_exc()}"
        return {"status": "ERROR", "score": 0.0, "logs": error_info}
    finally:
        # 清理sys.path，以防万一
        if judge_dir in sys.path:
             sys.path.remove(judge_dir)


async def run_in_sandbox(submission_data: bytes, judge_data: bytes) -> EvaluationResponse:
    """
    准备环境并调用进程池来安全地执行评测。
    """
    loop = asyncio.get_running_loop()

    # 定义项目根目录，以便准确定位 seccomp_profiles
    PROJECT_ROOT = Path(__file__).parent.parent.parent
    seccomp_profile = PROJECT_ROOT / "seccomp_profiles" / "python-basic.json"

    if not seccomp_profile.exists():
        raise FileNotFoundError(f"Seccomp profile not found at: {seccomp_profile}")

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

        # 将阻塞的、CPU密集型的子进程任务交给进程池处理，不阻塞主事件循环
        result_dict = await loop.run_in_executor(
            executor,
            _execute_judge_code,
            str(submission_dir),
            str(judge_dir),
            str(seccomp_profile)
        )

        return EvaluationResponse(**result_dict)