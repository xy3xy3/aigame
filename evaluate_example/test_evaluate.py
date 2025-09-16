#!/usr/bin/env python3
"""
轻量 E2E 脚本：向 EvaluateApp 发送评测请求，并打印回调结果。

特性：
- 可选 --tasks 参数：选择要测试的题目（默认全部）。
- 启动一个本地回调 HTTP 服务，接收 EvaluateApp 的回调并打印完整 JSON。
- 不负责启动 EvaluateApp，请手动启动并保证回调 URL 指向本地回调服务。
- 仅使用 httpx 作为 HTTP 客户端发起请求（无 curl/urllib 依赖）。
- 运行前请确认 evaluateapp/.env 或环境变量中的 EVALUATE_INBOUND_SECRET、WEBAPP_CALLBACK_URL、WEBAPP_CALLBACK_SECRET 设置正确。

用法示例：
  1) 启动 EvaluateApp（确保其回调地址与本脚本一致）
     cd evaluateapp && . .venv/bin/activate \
       && WEBAPP_CALLBACK_URL=http://127.0.0.1:39001/api/submissions/callback \
          WEBAPP_CALLBACK_SECRET=test-cb \
          EVALUATE_INBOUND_SECRET=test-inbound \
          uvicorn main:app --host 127.0.0.1 --port 8000

  2) 启动本脚本（默认根据 evaluateapp/.env 读取回调地址与密钥，也可用参数覆盖）
     python3 evaluate_example/test_evaluate.py --tasks judge_sum,label_compare \
       --base-url http://127.0.0.1:8000 \
       --inbound-secret test-inbound \
       --callback-url http://127.0.0.1:39001/api/submissions/callback \
       --callback-secret test-cb
"""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
import queue
import random
import shutil
import signal
import socket
import string
import subprocess
import sys
import tempfile
import threading
import time
import zipfile
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse


# -------------------- Utilities --------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
EVALUATEAPP_DIR = REPO_ROOT / "evaluateapp"


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def rand_id(prefix: str = "t") -> str:
    suf = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{prefix}-{suf}"


def zip_dir_contents(src_dir: Path, out_zip: Path) -> None:
    if not src_dir.exists() or not src_dir.is_dir():
        raise FileNotFoundError(f"Directory not found: {src_dir}")
    out_zip.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(src_dir):
            root_path = Path(root)
            for name in files:
                # Avoid nesting any existing zip inside
                if name.lower().endswith(".zip"):
                    continue
                abs_path = root_path / name
                arcname = abs_path.relative_to(src_dir)
                zf.write(abs_path, arcname)


def wait_http_ready(url: str, timeout: float = 15.0) -> bool:
    try:
        import httpx
    except Exception:
        raise SystemExit("需要安装 httpx：pip install httpx")

    start = time.time()
    while time.time() - start < timeout:
        try:
            with httpx.Client(timeout=1.5) as client:
                r = client.get(url)
                if 200 <= r.status_code < 500:
                    return True
        except Exception:
            time.sleep(0.2)
    return False


# -------------------- Callback server --------------------

class CallbackStore:
    def __init__(self, expected_secret: str) -> None:
        self._secret = expected_secret
        self._lock = threading.Lock()
        self._results: Dict[str, dict] = {}
        self._events: Dict[str, threading.Event] = {}

    def put(self, submission_id: str, payload: dict) -> None:
        with self._lock:
            self._results[submission_id] = payload
            ev = self._events.get(submission_id)
            if ev is not None:
                ev.set()

    def get(self, submission_id: str, timeout: float = 30.0) -> Optional[dict]:
        with self._lock:
            if submission_id in self._results:
                return self._results[submission_id]
            ev = self._events.get(submission_id)
            if ev is None:
                ev = self._events[submission_id] = threading.Event()
        ok = ev.wait(timeout)
        if not ok:
            return None
        with self._lock:
            return self._results.get(submission_id)


class CallbackHandler(BaseHTTPRequestHandler):
    server_version = "EvaluateCallback/1.0"

    # Will be set by factory
    store: CallbackStore
    expected_path: str = "/api/submissions/callback"

    def _json_response(self, code: int, data: dict) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        try:
            if self.path != self.expected_path:
                self._json_response(HTTPStatus.NOT_FOUND, {"error": "not found"})
                return

            auth = self.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                self._json_response(HTTPStatus.UNAUTHORIZED, {"error": "missing bearer"})
                return
            token = auth.split(" ", 1)[1]
            if token != self.store._secret:
                self._json_response(HTTPStatus.UNAUTHORIZED, {"error": "invalid secret"})
                return

            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            try:
                payload = json.loads(raw.decode("utf-8"))
            except Exception:
                self._json_response(HTTPStatus.BAD_REQUEST, {"error": "invalid json"})
                return

            sub_id = str(payload.get("submissionId", ""))
            if not sub_id:
                self._json_response(HTTPStatus.BAD_REQUEST, {"error": "missing submissionId"})
                return

            self.store.put(sub_id, payload)
            self._json_response(HTTPStatus.OK, {"ok": True})
        except Exception as e:
            self._json_response(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(e)})

    def log_message(self, format: str, *args) -> None:  # silence
        pass


@dataclass
class RunningServer:
    thread: threading.Thread
    httpd: ThreadingHTTPServer
    host: str
    port: int
    path: str


def start_callback_server(secret: str, host: str = "127.0.0.1", port: Optional[int] = None, path: str = "/api/submissions/callback") -> Tuple[RunningServer, CallbackStore]:
    if port is None:
        port = find_free_port()
    store = CallbackStore(secret)

    # 注意：BaseHTTPRequestHandler 的 __init__ 会在实例化期间处理请求，
    # 因此必须在实例化之前就把依赖（store/expected_path）设置到类属性上。
    class Handler(CallbackHandler):
        pass
    Handler.store = store  # type: ignore[attr-defined]
    Handler.expected_path = path  # type: ignore[attr-defined]

    httpd = ThreadingHTTPServer((host, port), Handler)

    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return RunningServer(thread=t, httpd=httpd, host=host, port=port, path=path), store


def stop_callback_server(srv: RunningServer) -> None:
    with contextlib.suppress(Exception):
        srv.httpd.shutdown()
    with contextlib.suppress(Exception):
        srv.httpd.server_close()


# -------------------- HTTP submit helper --------------------

def http_post_evaluate(base_url: str, inbound_secret: str, submission_id: str, submission_zip: Path, judge_zip: Path) -> dict:
    try:
        import httpx
    except Exception:
        raise SystemExit("需要安装 httpx：pip install httpx")

    url = f"{base_url}/api/evaluate"
    headers = {"Authorization": f"Bearer {inbound_secret}"}
    with open(submission_zip, "rb") as f_sub, open(judge_zip, "rb") as f_jud:
        files = {
            "submission_id": (None, submission_id),
            "submission_zip": (submission_zip.name, f_sub, "application/zip"),
            "judge_zip": (judge_zip.name, f_jud, "application/zip"),
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, files=files)
            resp.raise_for_status()
            return resp.json()


# -------------------- Test runner --------------------

def discover_tasks(root: Path) -> Dict[str, str]:
    """返回 {任务名: 目录名} 的映射。"""
    tasks: Dict[str, str] = {}
    for name in [
        "judge_sum",
        "label_compare",
        "ns_2025_00",
        "ns_2025_02",
        "code_execution_example",
        "rl_bandit_example",
    ]:
        if (root / name).is_dir():
            tasks[name] = name
    return tasks


def package_task(task_root: Path, out_dir: Path) -> Tuple[Path, Path]:
    """Return (submission_zip, judge_zip) created in out_dir."""
    sub_dir = task_root / "test_submit"
    judge_dir = task_root / "judge"
    if not sub_dir.is_dir() or not judge_dir.is_dir():
        raise FileNotFoundError(f"Invalid task layout: {task_root}")

    out_dir.mkdir(parents=True, exist_ok=True)
    sub_zip = out_dir / "submission.zip"
    judge_zip = out_dir / "judge.zip"
    zip_dir_contents(sub_dir, sub_zip)
    zip_dir_contents(judge_dir, judge_zip)
    return sub_zip, judge_zip


def almost_equal(a: float, b: float, tol: float = 1e-2) -> bool:
    return abs(float(a) - float(b)) <= tol


def load_env_file(path: Path) -> Dict[str, str]:
    out: Dict[str, str] = {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                out[k] = v
    except FileNotFoundError:
        pass
    return out


def run_tests(selected: Optional[List[str]] = None, base_url: str = "http://127.0.0.1:8000", inbound_secret: Optional[str] = None, callback_url: Optional[str] = None, callback_secret: Optional[str] = None, timeout_s: float = 60.0) -> int:
    tasks = discover_tasks(REPO_ROOT / "evaluate_example")
    if selected:
        for name in selected:
            if name not in tasks:
                raise SystemExit(f"Unknown task name: {name}\nAvailable: {', '.join(tasks.keys())}")
        items = {k: v for k, v in tasks.items() if k in selected}
    else:
        items = tasks

    # Load defaults from evaluateapp/.env if not provided
    env_defaults = load_env_file(EVALUATEAPP_DIR / ".env")
    if inbound_secret is None:
        inbound_secret = os.environ.get("EVALUATE_INBOUND_SECRET") or env_defaults.get("EVALUATE_INBOUND_SECRET")
    if callback_url is None:
        callback_url = os.environ.get("WEBAPP_CALLBACK_URL") or env_defaults.get("WEBAPP_CALLBACK_URL", "http://127.0.0.1:3000/api/submissions/callback")
    if callback_secret is None:
        callback_secret = os.environ.get("WEBAPP_CALLBACK_SECRET") or env_defaults.get("WEBAPP_CALLBACK_SECRET", "a-very-long-and-random-secret-string-for-callback")

    if not inbound_secret:
        raise SystemExit("EVALUATE_INBOUND_SECRET 未提供。请通过 --inbound-secret 或环境变量/ evaluateapp/.env 设置。")

    # Ensure EvaluateApp is reachable (manual start required)
    if not wait_http_ready(base_url, timeout=5.0):
        raise SystemExit(f"无法连接 EvaluateApp: {base_url}。请先手动启动服务（例如 uvicorn main:app --port 8000）。")

    # Start local callback server bound to the configured callback_url
    parsed = urlparse(callback_url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or (80 if parsed.scheme == "http" else 443)
    path = parsed.path or "/api/submissions/callback"
    try:
        cb_srv, cb_store = start_callback_server(callback_secret, host=host, port=port, path=path)
    except OSError as e:
        raise SystemExit(
            f"无法在 {host}:{port} 启动回调服务（可能端口已被占用）。\n"
            f"请确保 EvaluateApp 的 WEBAPP_CALLBACK_URL ({callback_url}) 指向一个空闲端口，"
            f"或者关闭占用该端口的进程后重试。\n原始错误: {e}"
        )
    print(f"Callback server listening: {parsed.scheme}://{host}:{port}{path}")

    failures: List[str] = []
    try:
        for task_name, dir_name in items.items():
            task_dir = REPO_ROOT / "evaluate_example" / dir_name
            print(f"[TEST] {task_name} ...")

            with tempfile.TemporaryDirectory() as td:
                sub_zip, judge_zip = package_task(task_dir, Path(td))
                submission_id = rand_id(task_name)
                # Kick off evaluation
                resp = http_post_evaluate(base_url, inbound_secret, submission_id, sub_zip, judge_zip)
                if resp.get("status") != "Evaluation started" or resp.get("submission_id") != submission_id:
                    print("  启动失败：", json.dumps(resp, ensure_ascii=False))
                    failures.append(task_name)
                    continue

                # Wait for callback
                result = cb_store.get(submission_id, timeout=timeout_s)
                if not result:
                    print("  超时：未收到回调。")
                    failures.append(task_name)
                    continue

                # 仅打印结果（不做断言校验）
                print("  回调结果：")
                print(json.dumps(result, ensure_ascii=False, indent=2))

    finally:
        stop_callback_server(cb_srv)

    if failures:
        print("\n存在失败的任务:", ", ".join(failures))
        return 1
    print("\n所有任务均已收到回调。")
    return 0


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="EvaluateApp E2E tests for example tasks")
    parser.add_argument(
        "--tasks",
        help="Comma-separated task names to run (default: all). Options: judge_sum,label_compare,ns_2025_00,ns_2025_02,code_execution_example,rl_bandit_example",
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="Base URL for the running EvaluateApp (default: http://127.0.0.1:8000)")
    parser.add_argument("--inbound-secret", help="EVALUATE_INBOUND_SECRET for Authorization header to /api/evaluate (default: from env or evaluateapp/.env)")
    parser.add_argument("--callback-url", help="Callback URL EvaluateApp will POST to (default: from env or evaluateapp/.env)")
    parser.add_argument("--callback-secret", help="Secret expected in callback Authorization header (default: from env or evaluateapp/.env)")
    parser.add_argument("--timeout", type=float, default=60.0, help="Seconds to wait for each callback (default: 60)")
    args = parser.parse_args(argv)

    selected: Optional[List[str]] = None
    if args.tasks:
        selected = [s.strip() for s in args.tasks.split(",") if s.strip()]

    return run_tests(
        selected,
        base_url=args.base_url,
        inbound_secret=args.inbound_secret,
        callback_url=args.callback_url,
        callback_secret=args.callback_secret,
        timeout_s=args.timeout,
    )


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
