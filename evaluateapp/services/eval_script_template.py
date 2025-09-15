import sys
import os
import json
import traceback
import errno
import io
import contextlib

# Injected constants from parent via string.Template
JUDGE_DIR = ${judge_dir_json}
SUBMISSION_DIR = ${submission_dir_json}
# Provide the resolved python executable path from sandbox
PYTHON_EXECUTABLE = ${python_executable_json}

# ==================== Apply Seccomp on Linux (best effort) ====================
if sys.platform == 'linux':
    try:
        import pyseccomp
        from pyseccomp import SyscallFilter, ALLOW, ERRNO

        # Strict default deny policy
        filt = SyscallFilter(ERRNO(errno.EPERM))

        # Whitelist: essential syscalls for Python/ML workloads
        allowed_syscalls = {
            # 1) Process/runtime basics
            "exit_group", "getpid", "gettid", "tgkill", "uname", "getrandom",

            # 2) Memory management
            "brk", "mmap", "munmap", "mprotect", "madvise",

            # 3) File I/O
            "openat", "read", "pread64", "write", "pwrite64", "close",
            "fstat", "newfstatat", "stat", "lseek", "access", "faccessat",
            "statx", "readlink", "readlinkat", "getcwd", "chdir",

            # 4) Threads/synchronization
            "futex", "futex_waitv", "sched_getaffinity", "rseq",

            # 5) Signals
            "rt_sigaction", "rt_sigprocmask", "rt_sigreturn",

            # 6) Misc
            "ioctl", "fcntl", "dup", "dup2", "dup3", "prctl", "set_robust_list",

            # 7) Allow subprocess/multiprocessing if judge.py runs user code
            "execve", "clone", "wait4",
        }

        for sc in allowed_syscalls:
            try:
                filt.add_rule(ALLOW, sc)
            except Exception:
                pass

        filt.load()
        print("[Seccomp] Filter applied.", file=sys.stderr)
    except Exception as se:
        # If pyseccomp missing or unsupported environment, continue without seccomp
        print(f"[Seccomp] Not applied: {se}", file=sys.stderr)
# ============================================================================

# 设置工作目录
os.chdir(JUDGE_DIR)

# 添加评测目录到sys.path
sys.path.insert(0, JUDGE_DIR)

try:
    # 动态加载评测模块
    import importlib.util
    from pathlib import Path

    judge_script_path = Path(JUDGE_DIR) / "judge.py"
    if not judge_script_path.exists():
        raise FileNotFoundError("评测包中必须包含 'judge.py' 文件")

    spec = importlib.util.spec_from_file_location("judge", judge_script_path)
    judge_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(judge_module)

    # 检查并调用约定的评测函数
    if not hasattr(judge_module, "evaluate"):
        raise AttributeError("评测脚本 'judge.py' 必须包含一个 'evaluate' 函数")

    # Capture stdout/stderr from judge.evaluate to avoid polluting JSON
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
        result_dict = judge_module.evaluate(
            submission_path=SUBMISSION_DIR,
            judge_data_path=JUDGE_DIR,
            python_executable_path=PYTHON_EXECUTABLE,
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
