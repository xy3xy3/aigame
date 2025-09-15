import sys
import os
import json
import traceback
import io
import contextlib

# Injected constants from parent via string.Template
JUDGE_DIR = ${judge_dir_json}
SUBMISSION_DIR = ${submission_dir_json}
# Provide the resolved python executable path from sandbox
PYTHON_EXECUTABLE = ${python_executable_json}

# ==================== Seccomp 逻辑已移至父进程 ====================
# 这里不再需要 Seccomp 相关的导入和逻辑，因为父进程已经通过环境变量控制
# 并在启动子进程时加载了 Seccomp 过滤器。
# ============================================================================

# 注意：os.chdir() 已移至父进程的 subprocess.run(cwd=...) 参数
# 确保 judge.py 的相对路径正确，且避免了 numpy 导入问题。

# 添加评测目录到sys.path
# 这仍然是必要的，因为 judge.py 可能有其他本地依赖
sys.path.insert(0, JUDGE_DIR)

try:
    # 动态加载评测模块
    import importlib.util
    from pathlib import Path

    judge_script_path = Path(JUDGE_DIR) / "judge.py"
    if not judge_script_path.exists():
        raise FileNotFoundError("评测包中必须包含 'judge.py' 文件")

    spec = importlib.util.spec_from_file_location("judge", judge_script_path)
    # 修复：避免直接导入内部模块，使用更标准的加载方式
    # 确保 spec.loader 是可用的
    if spec is None or spec.loader is None:
        raise ImportError(f"无法为 {judge_script_path} 创建模块规范或加载器。")

    judge_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(judge_module)

    # 检查并调用约定的评测函数
    if not hasattr(judge_module, "evaluate"):
        raise AttributeError("评测脚本 'judge.py' 必须包含一个 'evaluate' 函数")

    # Capture stdout/stderr from judge.evaluate to avoid polluting JSON
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
        # 传递 python_executable_path 给 judge.py，以便它能正确调用用户脚本
        result_dict = judge_module.evaluate(
            submission_path=SUBMISSION_DIR,
            judge_data_path=JUDGE_DIR,
            python_executable_path=PYTHON_EXECUTABLE, # 新增参数
        )

    if not isinstance(result_dict, dict):
        raise TypeError("evaluate 函数必须返回一个字典")

    judge_stdout = stdout_buf.getvalue()
    judge_stderr = stderr_buf.getvalue()
    merged_logs = []
    if result_dict.get("logs"):
        merged_logs.append(str(result_dict.get("logs")))
    if judge_stdout:
        merged_logs.append("[judge stdout]:\n" + judge_stdout)
    if judge_stderr:
        merged_logs.append("[judge stderr]:\n" + judge_stderr)

    print(json.dumps({
        "status": "COMPLETED",
        "score": float(result_dict.get("score", 0.0)),
        "logs": "\n".join(merged_logs)
    }))
except Exception as e:
    error_info = "评测子进程异常: {}: {}\n{}".format(type(e).__name__, e, traceback.format_exc())
    print(json.dumps({"status": "ERROR", "score": 0.0, "logs": error_info}))