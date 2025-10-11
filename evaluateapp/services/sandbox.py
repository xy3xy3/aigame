import asyncio
import io
import json
import contextlib
import tempfile
import zipfile
import sys
import os
import shutil
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path, PurePosixPath
import stat
import subprocess
from string import Template
import resource # 引入 resource 模块

# 引入 httpx 用于回调
import httpx
from core.config import settings

from schemas.evaluation import EvaluationResponse

# --- 新增：安全配置 ---
# 警告：在生产环境中，这个路径应该是只读的，并且经过严格配置
CHROOT_JAIL_PATH = "/opt/sandbox_jail"
# 运行时每次评测的临时 chroot 根目录父路径
RUNTIME_JAIL_ROOT = "/opt/sandboxes"
SANDBOX_UID = os.getuid() # 默认为 root，因为需要权限设置沙箱
SANDBOX_GID = os.getgid()

try:
    import pwd
    import grp
    # 获取无特权用户的 UID 和 GID
    SANDBOX_USER_INFO = pwd.getpwnam("sandboxuser")
    SANDBOX_GROUP_INFO = grp.getgrnam("sandboxgroup")
    UNPRIVILEGED_UID = SANDBOX_USER_INFO.pw_uid
    UNPRIVILEGED_GID = SANDBOX_GROUP_INFO.gr_gid
except KeyError:
    print("警告：未找到 'sandboxuser' 或 'sandboxgroup'。将以降权至 nobody 用户运行。")
    UNPRIVILEGED_UID = pwd.getpwnam("nobody").pw_uid
    UNPRIVILEGED_GID = grp.getgrnam("nogroup").gr_gid

from typing import Any, Optional


MAX_ARCHIVE_MEMBER_SIZE = 512 * 1024 * 1024  # 512MB，与沙箱文件限制保持一致


def _safe_extractall(zf: zipfile.ZipFile, target_dir: Path) -> None:
    """Safely extract zip contents into target_dir, preventing Zip Slip."""
    resolved_target = target_dir.resolve()
    for member in zf.infolist():
        member_path = PurePosixPath(member.filename)

        if member_path.is_absolute() or any(part == ".." for part in member_path.parts):
            raise ValueError(f"非法的压缩包路径: {member.filename}")

        target_path = (resolved_target / Path(*member_path.parts)).resolve()
        if resolved_target != target_path and not str(target_path).startswith(str(resolved_target) + os.sep):
            raise ValueError(f"压缩包路径逃逸: {member.filename}")

        if member.create_system == 3:
            mode = member.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError(f"不允许的符号链接: {member.filename}")

        if member.file_size > MAX_ARCHIVE_MEMBER_SIZE:
            raise ValueError(f"压缩包内文件过大: {member.filename} ({member.file_size} bytes)")

        if member.is_dir() or member.filename.endswith("/"):
            target_path.mkdir(parents=True, exist_ok=True)
            continue

        target_path.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(member) as source, open(target_path, "wb") as dest:
            shutil.copyfileobj(source, dest)

        if member.create_system == 3:
            mode = member.external_attr >> 16
            if mode:
                os.chmod(target_path, mode & 0o777)
try:
    import seccomp as sc  # 优先使用 python-seccomp
    _SECCOMP_PROVIDER = "seccomp"
except Exception:
    try:
        import pyseccomp as sc  # 备用：有些环境提供 pyseccomp
        _SECCOMP_PROVIDER = "pyseccomp"
    except Exception:
        sc = None  # type: ignore[assignment]
        _SECCOMP_PROVIDER = None  # type: ignore[assignment]
        print("警告：未找到可用的 seccomp 绑定（'seccomp' 或 'pyseccomp'）。系统调用过滤将不会启用。")


def _setup_sandbox_and_demote_privileges(jail_path: str):
    """
    此函数将作为 subprocess.run 的 preexec_fn。
    它在子进程中、执行目标命令前运行。
    """
    # 1. 资源限制
    # 限制 CPU 时间为 300 秒 (软限制和硬限制)
    resource.setrlimit(resource.RLIMIT_CPU, (300, 300))
    # 限制虚拟内存为 2GB
    resource.setrlimit(resource.RLIMIT_AS, (2 * 1024**3, 2 * 1024**3))
    # 限制可创建的“任务”（线程/进程）数量。部分科学计算库需要线程，给到一个小上限。
    resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))
    # 限制文件大小为 512MB
    resource.setrlimit(resource.RLIMIT_FSIZE, (512 * 1024**2, 512 * 1024**2))

    # 2. 在进入 chroot 与降权前，约束并行线程数，避免科学计算库大量并发
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
    os.environ.setdefault("MKL_NUM_THREADS", "1")
    os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
    os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
    os.environ.setdefault("MALLOC_ARENA_MAX", "2")

    # 3. Chroot 到监狱目录
    os.chroot(jail_path)
    os.chdir("/") # chroot后，新的根目录是'/'

    # 4. Seccomp 系统调用过滤 (如果可用且启用)
    if sc is not None and getattr(settings, "ENABLE_SECCOMP", False):
        # 默认策略：杀死任何不符合规则的进程
        f = sc.SyscallFilter(defaction=sc.KILL)

        # 白名单：允许基础的、安全的系统调用
        # 允许执行新程序（python 可执行文件）
        f.add_rule(sc.ALLOW, 'execve')
        f.add_rule(sc.ALLOW, 'execveat')
        # 文件操作
        f.add_rule(sc.ALLOW, 'read')
        f.add_rule(sc.ALLOW, 'write')
        f.add_rule(sc.ALLOW, 'openat')
        f.add_rule(sc.ALLOW, 'close')
        f.add_rule(sc.ALLOW, 'fstat')
        f.add_rule(sc.ALLOW, 'lseek')
        f.add_rule(sc.ALLOW, 'access')
        f.add_rule(sc.ALLOW, 'stat')

        # 内存管理
        f.add_rule(sc.ALLOW, 'mmap')
        f.add_rule(sc.ALLOW, 'munmap')
        f.add_rule(sc.ALLOW, 'brk')
        f.add_rule(sc.ALLOW, 'mprotect')

        # 进程生命周期
        f.add_rule(sc.ALLOW, 'exit_group')
        f.add_rule(sc.ALLOW, 'rt_sigaction')
        f.add_rule(sc.ALLOW, 'rt_sigprocmask')

        # 其他必要调用
        f.add_rule(sc.ALLOW, 'getuid')
        f.add_rule(sc.ALLOW, 'getgid')
        f.add_rule(sc.ALLOW, 'geteuid')
        f.add_rule(sc.ALLOW, 'getegid')
        f.add_rule(sc.ALLOW, 'arch_prctl')
        f.add_rule(sc.ALLOW, 'futex')
        f.add_rule(sc.ALLOW, 'sched_getaffinity')

        # 加载过滤器
        f.load()

    # 5. 降权 (最关键的一步，最后执行)
    # 必须先设置组ID，再设置用户ID
    os.setgid(UNPRIVILEGED_GID)
    os.setuid(UNPRIVILEGED_UID)
    os.umask(0o077) # 设置掩码，使得创建的文件/目录只有所有者有权访问


def _execute_judge_code(
    submission_dir: str,
    judge_dir: str,
) -> dict:
    """
    在一个使用 chroot, seccomp 和无特权用户隔离的沙箱中执行评测。
    """
    # 确保运行时根路径存在且可遍历
    os.makedirs(RUNTIME_JAIL_ROOT, exist_ok=True)
    os.chmod(RUNTIME_JAIL_ROOT, 0o755)

    # 使用一个临时目录作为本次评测的 chroot "监狱"
    with tempfile.TemporaryDirectory(prefix="eval_jail_", dir=RUNTIME_JAIL_ROOT) as jail_path_str:
        try:
            jail_path = Path(jail_path_str)
            # 关键：临时目录默认 0700，需要放宽为 0755，否则降权后无法遍历 '/'
            jail_path.chmod(0o755)
            os.chmod(jail_path, 0o755)

            # --- 1. 准备 Chroot 环境 ---
            # 复制基础 chroot 环境 (python解释器, 库等)
            # 这一步假设 /opt/sandbox_jail 已经准备好
            if not os.path.exists(CHROOT_JAIL_PATH) or not os.listdir(CHROOT_JAIL_PATH):
                 raise EnvironmentError(f"Chroot 基础环境 '{CHROOT_JAIL_PATH}' 未准备好或为空。")

            # 优先用硬链接快速复制（节省磁盘与页缓存）；失败则逐项复制且跳过 /dev
            try:
                subprocess.run(["cp", "-al", os.path.join(CHROOT_JAIL_PATH, "."), str(jail_path)], check=True)
            except Exception:
                for item in os.listdir(CHROOT_JAIL_PATH):
                    src = os.path.join(CHROOT_JAIL_PATH, item)
                    dst = jail_path / item
                    if os.path.basename(src) == "dev":
                        continue
                    if os.path.isdir(src):
                        shutil.copytree(src, dst, symlinks=True, dirs_exist_ok=True)
                    else:
                        shutil.copy2(src, dst)

            # 在监狱内重建必要的 /dev 设备节点
            dev_dir = jail_path / "dev"
            if dev_dir.exists():
                # 尝试移除 cp -al 带入的 /dev 内容
                for root, dirs, files in os.walk(dev_dir, topdown=False):
                    for name in files:
                        with contextlib.suppress(Exception):
                            os.unlink(os.path.join(root, name))
                    for name in dirs:
                        with contextlib.suppress(Exception):
                            os.rmdir(os.path.join(root, name))
                with contextlib.suppress(Exception):
                    os.rmdir(dev_dir)
            dev_dir.mkdir(exist_ok=True)
            def _mknod_char(path: Path, major: int, minor: int, mode: int = 0o666):
                try:
                    if path.exists() and not stat.S_ISCHR(os.stat(path).st_mode):
                        path.unlink()
                    if not path.exists():
                        os.mknod(str(path), stat.S_IFCHR | mode, os.makedev(major, minor))
                    os.chmod(path, mode)
                except PermissionError:
                    # 在某些受限环境可能没有 CAP_MKNOD；忽略，让 Python 回退其他熵源
                    pass

            _mknod_char(dev_dir / "null", 1, 3)
            _mknod_char(dev_dir / "zero", 1, 5)
            _mknod_char(dev_dir / "random", 1, 8)
            _mknod_char(dev_dir / "urandom", 1, 9)
            _mknod_char(dev_dir / "tty", 5, 0)

            # 确保常见临时目录存在并可写
            for tmpd in [jail_path / "tmp", jail_path / "var" / "tmp", jail_path / "usr" / "tmp"]:
                tmpd.mkdir(parents=True, exist_ok=True)
                os.chmod(tmpd, 0o1777)

            # --- 2. 在监狱中创建工作目录并复制文件 ---
            judge_workspace = jail_path / "judge_env"
            submission_workspace = jail_path / "submission_env"
            judge_workspace.mkdir(0o755)
            submission_workspace.mkdir(0o755)

            # 复制评测脚本和数据
            shutil.copytree(judge_dir, judge_workspace, dirs_exist_ok=True)
            # 复制用户提交
            shutil.copytree(submission_dir, submission_workspace, dirs_exist_ok=True)

            # --- 3. 准备评测入口脚本 ---
            # 注意：这里的路径都是相对于监狱内部的
            python_executable = "/usr/bin/python3" # 假设解释器在监狱中的这个位置
            template_path = Path(__file__).parent / "eval_script_template.py"
            with open(template_path, "r", encoding="utf-8") as f:
                template_content = f.read()

            filled_script = Template(template_content).substitute(
                judge_dir_json=json.dumps("judge_env"), # 相对路径
                submission_dir_json=json.dumps("submission_env"), # 相对路径
                python_executable_json=json.dumps(python_executable),
            )

            script_path_in_jail = jail_path / "eval_runner.py"
            with open(script_path_in_jail, "w", encoding="utf-8") as f:
                f.write(filled_script)
            os.chmod(script_path_in_jail, 0o644)

            # --- 4. 在沙箱中执行子进程 ---
            # 命令中的路径是 chroot 后的相对路径
            command = [python_executable, "eval_runner.py"]

            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=310, # 比内部CPU限制稍长
                preexec_fn=lambda: _setup_sandbox_and_demote_privileges(jail_path_str),
            )

            # --- 5. 解析结果 ---
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

import hashlib, hmac, json

async def post_results_to_webapp(submission_id: str, result: dict, callback_url: str):
    """向 webapp 发送回调请求（签名）"""
    payload = {"submissionId": submission_id, **result}
    # canonical json
    def canonical(obj):
        if obj is None or not isinstance(obj, (dict, list)):
            return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        if isinstance(obj, list):
            return "[" + ",".join(canonical(x) for x in obj) + "]"
        keys = sorted(obj.keys())
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + canonical(obj[k]) for k in keys) + "}"
    payload_str = canonical(payload)
    content_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
    import time
    ts = str(int(time.time()))
    sign = hmac.new(settings.SHARED_SECRET.encode("utf-8"), f"{ts}\n{content_hash}".encode("utf-8"), hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Timestamp": ts,
        "X-Sign": sign,
        "X-Content-Hash": content_hash,
    }
    print(f"[Callback] Sending results for submission {submission_id}: {json.dumps(payload)}")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(callback_url, json=payload, headers=headers, timeout=30.0)
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
    executor: ProcessPoolExecutor,
    callback_url: str,
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
                _safe_extractall(zf, submission_dir)
            with zipfile.ZipFile(io.BytesIO(judge_data)) as zf:
                _safe_extractall(zf, judge_dir)
            result_dict = await loop.run_in_executor(
                executor,
                _execute_judge_code,
                str(submission_dir),
                str(judge_dir),
            )
            print(f"[Sandbox] Evaluation completed for submission {submission_id}: {result_dict.get('status', 'UNKNOWN')}")
        await post_results_to_webapp(submission_id, result_dict, callback_url)
