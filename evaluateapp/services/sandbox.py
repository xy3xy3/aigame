import asyncio
import io
import json
import tempfile
import zipfile
import sys
import os
import importlib.util
import errno
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

# seccomp 库，安装包为 pyseccomp
import pyseccomp
from pyseccomp import SyscallFilter, ALLOW, ERRNO

# 添加 httpx 用于回调
import httpx
from core.config import settings

from schemas.evaluation import EvaluationResponse

# 创建一个进程池，用于在隔离的进程中运行评测代码
executor = ProcessPoolExecutor(max_workers=4)


def _create_ml_seccomp_filter() -> SyscallFilter:
    """
    创建一个为机器学习评测任务定制的 seccomp 安全过滤器。

    采用"默认拒绝，白名单放行"的原则。
    """
    # 默认情况下，拒绝所有系统调用，并返回 EPERM (Operation not permitted) 错误。
    # 相比于直接 KILL，这有时能让程序以更明确的方式失败。
    filt = SyscallFilter(ERRNO(errno.EPERM))


    # 白名单：允许对评测至关重要的系统调用
    # 这是一个经过考量的集合，旨在满足大多数ML/数据科学库的需求
    allowed_syscalls = {
        # 1. 程序生命周期和基本信息
        "exit_group",      # 程序退出
        "getpid",          # 获取进程ID
        "gettid",          # 获取线程ID
        "tgkill",          # 终止线程，用于断言失败等
        "uname",           # 获取系统信息，很多库启动时会调用
        "getrandom",       # 获取随机数，Python启动和库中常用

        # 2. 内存管理 (非常重要)
        "brk",             # 调整程序数据段大小
        "mmap",            # 内存映射，加载数据和模型的核心
        "munmap",          # 解除内存映射
        "mprotect",        # 修改内存区域保护属性
        "madvise",         # 向内核提供内存使用建议，优化性能

        # 3. 文件 I/O (核心功能)
        "openat",          # 打开文件（现代Linux下 open 的主要形式）
        "read", "pread64", # 读取文件
        "write", "pwrite64",# 写入文件（例如生成 submission.csv）
        "close",           # 关闭文件描述符
        "fstat", "newfstatat", "stat", # 获取文件状态
        "lseek",           # 移动文件读写指针
        "access", "faccessat", # 检查文件权限和存在性
        "statx",           # 获取扩展文件状态
        "readlink", "readlinkat", # 读取符号链接
        "getcwd",          # 获取当前工作目录
        "chdir",           # 更改当前工作目录

        # 4. 线程与同步 (Numpy/Torch/TF 并行计算所需)
        "futex", "futex_waitv", # 用户态快速互斥锁，并发关键
        "sched_getaffinity",   # 获取CPU亲和性
        "rseq",            # Restartable Sequences，现代glibc性能优化

        # 5. 信号处理
        "rt_sigaction",    # 设置信号处理函数
        "rt_sigprocmask",  # 获取/修改信号掩码
        "rt_sigreturn",    # 从信号处理函数返回

        # 6. 其他杂项
        "ioctl",           # I/O 控制，主要用于终端
        "fcntl",           # 文件描述符控制
        "dup", "dup2", "dup3", # 复制文件描述符 (stdout/stderr重定向)
        "prctl",           # 进程控制，用于设置沙箱自身等
        "set_robust_list", # 线程意外终止时清理futex
    }

    # ** [可选] 如果评测代码需要使用 multiprocessing，必须放行 clone **
    # `clone` 系统调用用于创建新进程或线程，存在一定安全风险，但对并行处理是必要的。
    # allowed_syscalls.add("clone")

    for syscall_name in allowed_syscalls:
        filt.add_rule(ALLOW, syscall_name)

    return filt


def _execute_judge_code(
    submission_dir: str,
    judge_dir: str,
) -> dict:
    """
    在一个受限的子进程中，动态加载并执行评测代码。
    警告：此函数将在一个单独的、无权限的进程中运行。
    """
    try:
        # 1. 应用我们内置的Seccomp安全策略！
        seccomp_filter = _create_ml_seccomp_filter()
        seccomp_filter.load()

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
            # 可选：打印响应头以提供更多调试信息
            # print(f"[Callback] Response headers: {e.response.headers}")
        except httpx.TimeoutException as e:
            print(f"[Callback] Timeout sending callback for {submission_id}: {e}")
        except Exception as e:
            print(f"[Callback] An unexpected error occurred during callback for {submission_id}: {e}")


async def run_in_sandbox_and_callback(submission_id: str, submission_data: bytes, judge_data: bytes, semaphore: asyncio.Semaphore):
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
async def run_in_sandbox(submission_data: bytes, judge_data: bytes) -> EvaluationResponse:
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
        # 注意：不再需要传递 seccomp_profile_path
        result_dict = await loop.run_in_executor(
            executor,
            _execute_judge_code,
            str(submission_dir),
            str(judge_dir),
        )

        return EvaluationResponse(**result_dict)