import asyncio
import contextlib
import io
import json
import tempfile
import zipfile
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

from core.config import settings, BASE_DIR

# 复用安全解压与回调逻辑
from .sandbox import _safe_extractall
from .sandbox import post_results_to_webapp


def _fill_eval_runner(judge_dir_in_container: str, submission_dir_in_container: str, python_executable: str) -> str:
    """Render eval_script_template.py with container-side paths."""
    from string import Template
    template_path = Path(__file__).parent / "eval_script_template.py"
    content = template_path.read_text(encoding="utf-8")
    return Template(content).substitute(
        judge_dir_json=json.dumps(judge_dir_in_container),
        submission_dir_json=json.dumps(submission_dir_in_container),
        python_executable_json=json.dumps(python_executable),
    )


def _resolve_self_image(client) -> str | None:
    """Resolve image for DOCKER_IMAGE=self.

    Priority:
    1) If running inside a container, resolve current container image.
    2) If on host and allowed to build, build evaluateapp service image and return its tag.
    3) Otherwise return None.
    """
    # 1) try current container via HOSTNAME
    try:
        cid = (Path("/etc/hostname").read_text().strip() or "").strip()
        if not cid:
            import os
            cid = os.environ.get("HOSTNAME", "").strip()
        if cid:
            this = client.containers.get(cid)
            img = this.image
            if getattr(img, "tags", None):
                return img.tags[0]
            return img.id
    except Exception:
        pass

    # 2) host build path
    if settings.DOCKER_SELF_BUILD_ON_HOST:
        try:
            context_path = Path(settings.DOCKER_SELF_CONTEXT or str(BASE_DIR.parent)).resolve()
            dockerfile_rel = settings.DOCKER_SELF_DOCKERFILE or "evaluateapp/docker/evaluateapp.Dockerfile"
            dockerfile_path = dockerfile_rel
            tag = settings.DOCKER_SELF_TAG or "aigame-eval:self"
            print(f"[DockerSandbox] Building self image on host: context={context_path} dockerfile={dockerfile_path} tag={tag}")
            image_obj, build_logs = client.images.build(
                path=str(context_path),
                dockerfile=dockerfile_path,
                tag=tag,
                rm=True,
                pull=False,
                forcerm=True,
            )
            # optional: print brief build log summary
            try:
                # consume generator if returned as such
                for _ in build_logs or []:
                    pass
            except Exception:
                pass
            # Prefer resulting tag
            if getattr(image_obj, "tags", None):
                return image_obj.tags[0]
            return image_obj.id
        except Exception as e:
            print(f"[DockerSandbox] Failed to build self image: {e}")

    return None


def _run_in_docker_sync(submission_dir: Path, judge_dir: Path) -> dict:
    """
    Run evaluation inside a Docker container and return result dict.

    - Mounts submission and judge directories read-only under /workspace/* in container
    - Generates eval_runner.py and mounts it to /workspace/eval_runner.py
    - Executes `python /workspace/eval_runner.py`
    """
    import docker

    image_cfg = settings.DOCKER_IMAGE
    image = image_cfg
    mem_limit = settings.DOCKER_MEMORY
    cpus = max(0.1, float(settings.DOCKER_CPUS or 1.0))
    nano_cpus = int(cpus * 1e9)  # docker uses 1e9 = 1 CPU
    network_mode = settings.DOCKER_NETWORK_MODE or "none"
    user = settings.DOCKER_USER

    # Prepare a temporary runner file
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        runner_host_path = tmpdir_path / "eval_runner.py"
        runner_code = _fill_eval_runner(
            judge_dir_in_container="/workspace/judge",
            submission_dir_in_container="/workspace/submission",
            python_executable="/usr/bin/python3",
        )
        runner_host_path.write_text(runner_code, encoding="utf-8")

        client = docker.from_env()

        # If configured to reuse this running container's image, resolve it
        if (str(image_cfg or "").strip().lower() == "self"):
            resolved = _resolve_self_image(client)
            if resolved:
                image = resolved
            else:
                # fallback default
                image = "swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/python:3.12-slim"

        # Optionally pull image
        if settings.DOCKER_PULL:
            try:
                client.images.pull(image)
            except Exception:
                pass

        # Build volume bindings
        volumes = {
            str(submission_dir.resolve()): {"bind": "/workspace/submission", "mode": "ro"},
            str(judge_dir.resolve()): {"bind": "/workspace/judge", "mode": "ro"},
            str(runner_host_path.resolve()): {"bind": "/workspace/eval_runner.py", "mode": "ro"},
        }

        env = {
            # cap thread counts
            "OMP_NUM_THREADS": "1",
            "OPENBLAS_NUM_THREADS": "1",
            "MKL_NUM_THREADS": "1",
            "NUMEXPR_NUM_THREADS": "1",
            "VECLIB_MAXIMUM_THREADS": "1",
            "MALLOC_ARENA_MAX": "2",
        }

        container = None
        try:
            container = client.containers.run(
                image=image,
                command=["python", "/workspace/eval_runner.py"],
                detach=True,
                stdout=True,
                stderr=True,
                remove=False,  # we need to capture logs after wait
                volumes=volumes,
                environment=env,
                network_mode=network_mode,
                nano_cpus=nano_cpus,
                mem_limit=mem_limit,
                user=user,
                working_dir="/workspace",
            )

            # 310s timeout similar to chroot timeout
            result = container.wait(timeout=310)
            exit_code = result.get("StatusCode", 1)
            logs_bytes = container.logs(stdout=True, stderr=True)
            logs_text = logs_bytes.decode("utf-8", errors="replace") if isinstance(logs_bytes, (bytes, bytearray)) else str(logs_bytes)

            # Try parse last JSON on stdout. We assume our runner prints a single JSON to stdout.
            # Best effort: scan lines for a valid JSON dict having required keys.
            candidate = None
            for line in logs_text.splitlines():
                line = line.strip()
                if not (line.startswith("{") and line.endswith("}")):
                    continue
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict) and "status" in obj and "score" in obj and "logs" in obj:
                        candidate = obj
                except Exception:
                    continue

            if candidate is not None and exit_code == 0:
                # Merge logs if needed
                return candidate

            # If JSON not found or non-zero exit, return error with container logs
            return {
                "status": "ERROR",
                "score": 0.0,
                "logs": f"Container exit_code={exit_code}. Logs:\n" + logs_text,
            }
        except docker.errors.APIError as e:
            return {"status": "ERROR", "score": 0.0, "logs": f"Docker API error: {e.explanation if hasattr(e, 'explanation') else str(e)}"}
        except docker.errors.DockerException as e:
            return {"status": "ERROR", "score": 0.0, "logs": f"Docker error: {e}"}
        except Exception as e:
            import traceback
            return {"status": "ERROR", "score": 0.0, "logs": f"Unexpected error: {e}\n{traceback.format_exc()}"}
        finally:
            # Ensure container is removed
            if container is not None:
                with contextlib.suppress(Exception):
                    container.remove(force=True)


async def run_in_sandbox_and_callback(
    submission_id: str,
    submission_data: bytes,
    judge_data: bytes,
    semaphore: asyncio.Semaphore,
    executor: ProcessPoolExecutor,
    callback_url: str,
):
    """
    Docker backend: prepare temp dirs, extract zips, run in container, callback.
    Signature kept same as chroot backend for API compatibility.
    """
    print(f"[DockerSandbox] Starting evaluation for submission {submission_id}")
    async with semaphore:
        print(f"[DockerSandbox] Semaphore acquired for submission {submission_id}")
        with tempfile.TemporaryDirectory() as tmpdir:
            workspace = Path(tmpdir)
            submission_dir = workspace / "submission"
            judge_dir = workspace / "judge"
            submission_dir.mkdir()
            judge_dir.mkdir()
            # Safe extract
            with zipfile.ZipFile(io.BytesIO(submission_data)) as zf:
                _safe_extractall(zf, submission_dir)
            with zipfile.ZipFile(io.BytesIO(judge_data)) as zf:
                _safe_extractall(zf, judge_dir)

            # Run in threadpool to avoid blocking event loop while interacting with Docker SDK
            loop = asyncio.get_running_loop()
            result_dict = await loop.run_in_executor(
                executor,
                _run_in_docker_sync,
                submission_dir,
                judge_dir,
            )
            print(f"[DockerSandbox] Evaluation completed for submission {submission_id}: {result_dict.get('status', 'UNKNOWN')}")

        await post_results_to_webapp(submission_id, result_dict, callback_url)
