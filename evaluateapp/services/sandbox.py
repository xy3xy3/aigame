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
import subprocess # 确保导入 subprocess
from string import Template # 确保导入 Template

# seccomp 库，安装包为 pyseccomp
import pyseccomp
from pyseccomp import SyscallFilter, ALLOW, ERRNO

# 添加 httpx 用于回调
import httpx
from core.config import settings

from schemas.evaluation import EvaluationResponse

# [说明] 这个 executor 的生命周期已由 main.py 中的 lifespan 管理，此处无需定义


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
        "clock_gettime",   # 获取时间，常用
        "nanosleep",       # 睡眠，常用

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
        "getdents64", "getdents", # 读取目录内容，Python导入系统需要

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

        # 7. 如果评测代码需要使用 subprocess，必须放行以下系统调用
        # `execve` 用于执行新的程序 (如 `python user_script.py`)
        # `clone` 用于创建新进程 (如 `multiprocessing`)
        # `wait4` 用于父进程等待子进程结束
        "execve",
        "clone",
        "wait4",
    }

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
        # 1. 动态确定虚拟环境中的Python解释器路径
        project_root = Path(__file__).resolve().parent.parent.parent
        # 优先使用项目根目录下的 .venv
        expected_executable_venv = project_root / ".venv" / "bin" / "python"
        # 其次使用当前 evaluateapp 目录下的 .venv (如果 evaluateapp 本身在 venv 中)
        expected_executable_app_venv = Path(sys.executable).parent / "python"

        if expected_executable_venv.is_file():
            python_executable = str(expected_executable_venv)
        elif expected_executable_app_venv.is_file():
            python_executable = str(expected_executable_app_venv)
        else:
            # 备选方案：使用启动当前进程的Python解释器。
            python_executable = sys.executable
            print(
                f"WARNING: Preferred venv python not found. "
                f"Falling back to current process python: '{python_executable}'",
                file=sys.stderr
            )

        # 2. 读取 eval_script_template.py 的内容
        template_path = Path(__file__).parent / "eval_script_template.py"
        with open(template_path, "r", encoding="utf-8") as f:
            template_content = f.read()

        # 3. 填充模板变量
        # 使用 json.dumps 确保路径中的特殊字符被正确转义
        filled_script = Template(template_content).substitute(
            judge_dir_json=json.dumps(judge_dir),
            submission_dir_json=json.dumps(submission_dir),
            python_executable_json=json.dumps(python_executable), # 传递给 judge.py
        )

        # 4. 将填充后的脚本写入一个临时文件
        # 这样 subprocess 可以直接执行这个文件，而不是通过 -c 传递字符串
        with tempfile.NamedTemporaryFile(mode="w", delete=False, encoding="utf-8", suffix=".py") as tmp_script_file:
            tmp_script_file.write(filled_script)
            tmp_script_name = tmp_script_file.name

        # 5. 在子进程中执行评测脚本，并应用 Seccomp 过滤器
        # Seccomp 过滤器将在子进程启动后立即加载
        command = [python_executable, tmp_script_name]

        # 设置环境变量来控制 eval_script_template.py 中的 Seccomp 启用
        env = os.environ.copy()
        env['SANDBOX_SECCOMP'] = '1' # 强制在子进程中启用 Seccomp

        print(f"Executing command in sandbox: {' '.join(command)}", file=sys.stderr)

        # 使用 subprocess 在隔离的进程中运行评测脚本
        # 注意：cwd 设置为 judge_dir，确保 judge.py 的相对路径正确
        # 并且避免 numpy 导入问题
        result = subprocess.run(
            command,
            cwd=judge_dir, # 设置工作目录，而不是在脚本中 os.chdir
            capture_output=True,
            text=True,
            timeout=300,  # 5分钟超时
            env=env, # 传递环境变量
        )

        # 清理临时脚本文件
        os.unlink(tmp_script_name)

        # 6. 解析输出结果
        if result.stdout:
            try:
                # 评测脚本的最终结果应该通过 stdout 输出 JSON
                return json.loads(result.stdout.strip())
            except json.JSONDecodeError:
                # 如果JSON解析失败，返回错误信息
                return {
                    "status": "ERROR",
                    "score": 0.0,
                    "logs": f"无法解析评测结果: {result.stdout}\n错误输出: {result.stderr}"
                }
        else:
            # 如果没有标准输出，返回错误信息
            return {
                "status": "ERROR",
                "score": 0.0,
                "logs": f"评测脚本没有输出\n错误输出: {result.stderr}\n返回码: {result.returncode}"
            }

    except subprocess.TimeoutExpired:
        return {
            "status": "ERROR",
            "score": 0.0,
            "logs": "评测超时（超过5分钟）"
        }
    except Exception as e:
        import traceback
        error_info = f"执行评测时发生异常: {type(e).__name__}: {e}\n{traceback.format_exc()}"
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