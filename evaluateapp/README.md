# 环境包说明

原始包含的包：
```shell
uv add fastapi uvicorn python-multipart python-prctl pyseccomp pydantic-settings numpy opencv-python scikit-learn scikit-image pandas tqdm
```

可能需要apt安装的东西
```shell
sudo apt-get install -y libcap-dev
sudo apt-get install -y libseccomp-dev
```

新环境安装这些包
```shell
uv sync
```

# 说明

好的，遵照您的指示。我们进行最后一轮的精简和整合，移除API的V1层级嵌套，并为您生成一份可以直接写入 `README.md` 的完整开发者指南。

这份指南将包含最终的项目结构、核心工作流程的解释，以及所有关键文件的完整代码和说明。

-----

# EvaluateApp: 开发者指南

`EvaluateApp` 是一个轻量级、安全的评测微服务。它通过一个API接口接收用户提交的`submission.zip`和由题目开发者创建的`judge.zip`，在隔离的沙箱环境中执行评测，并返回结果。

## 最终项目结构

项目采用扁平化结构，清晰直接。

```plaintext
evaluateapp-project/
├── evaluateapp/                # Python 包根目录
│   ├── __init__.py
│   ├── api/                    # API 路由层 (已简化)
│   │   ├── __init__.py
│   │   └── evaluate.py         # 唯一的评测接口定义
│   ├── core/                   # 核心配置 (此示例中为空，可扩展)
│   │   └── __init__.py
│   ├── schemas/                # Pydantic 数据模型
│   │   ├── __init__.py
│   │   └── evaluation.py
│   ├── services/               # 核心业务逻辑
│   │   ├── __init__.py
│   │   └── sandbox.py
│   └── main.py                 # FastAPI 应用入口
├── seccomp_profiles/
│   └── python-basic.json       # Seccomp 安全配置文件
├── .env.example
├── pyproject.toml
└── README.md
```

## 核心工作流程

当一个评测请求到达时，系统按以下步骤执行：

1.  **接收请求**: Nuxt后端向 `POST /api/evaluate` 发起请求，请求体中包含 `submission_zip` 和 `judge_zip` 两个文件。
2.  **并发控制**: `main.py` 中初始化的 `asyncio.Semaphore(4)` 发挥作用。如果已有4个评测任务在运行，新的请求会在此异步等待，直到有任务完成。
3.  **路由处理**: 请求被 `main.py` 中的路由转发给 `api/evaluate.py` 中的处理函数。
4.  **调用服务**: `api/evaluate.py` 调用核心服务 `services/sandbox.py` 中的 `run_in_sandbox` 函数，并传入两个zip文件的二进制数据。
5.  **环境准备**: `run_in_sandbox` 函数：
      * 创建一个临时的、唯一的文件夹作为工作区。
      * 在此工作区内分别创建 `submission` 和 `judge` 两个子目录。
      * 将接收到的zip文件内容解压到对应的目录中。
6.  **安全执行**:
      * `run_in_sandbox` 使用 `ProcessPoolExecutor` 将真正的执行任务 `_execute_judge_code` 调度到一个**完全隔离的子进程**中运行，防止阻塞主服务。
      * 在子进程中，`_execute_judge_code` 函数首先加载 `seccomp_profiles/python-basic.json` 安全策略，严格限制该进程可用的系统调用（如禁止网络、禁止执行新进程等）。
      * 然后，它动态导入 `judge` 目录下的 `judge.py` 模块，并调用其中约定好的 `evaluate()` 函数。
7.  **返回结果**: `evaluate()` 函数的返回结果（一个字典）被子进程捕获，并通过进程间通信返回给主进程，最终作为API响应返回给调用方（Nuxt后端）。
8.  **自动清理**: 无论成功或失败，包含所有解压文件的临时工作区都会被自动删除。

## 完整文件代码

以下是项目中每个核心文件的完整代码和注释。

### `evaluateapp/main.py`

**职责**: FastAPI应用的入口，负责初始化应用、管理生命周期（如创建并发控制器）和加载API路由。

```python
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

# 导入简化后的API模块
from .api import evaluate

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    管理应用的生命周期。
    在应用启动时创建资源，在关闭时释放。
    """
    # 应用启动时: 创建一个容量为4的信号量，控制并发评测数
    app.state.semaphore = asyncio.Semaphore(4)
    print("FastAPI app started. Evaluation concurrency limit: 4")
    yield
    # 应用关闭时:
    print("FastAPI app shutting down.")


# 初始化FastAPI应用，并指定生命周期管理器
app = FastAPI(
    title="EvaluateApp",
    version="0.1.0",
    description="一个安全、并发控制的自动评测服务",
    lifespan=lifespan
)

# 加载API路由，前缀简化为 /api
app.include_router(evaluate.router, prefix="/api", tags=["Evaluation"])

@app.get("/", tags=["Health Check"])
def read_root():
    """根路径，用于健康检查。"""
    return {"status": "EvaluateApp is running"}
```

### `evaluateapp/api/evaluate.py`

**职责**: 定义 `POST /evaluate` 接口，负责接收文件、使用信号量、调用后端服务并返回最终响应。

```python
import asyncio
import logging
from fastapi import APIRouter, UploadFile, File, Depends, Request, HTTPException
from fastapi.responses import JSONResponse

# 调整相对导入路径以适应新的结构
from ..services import sandbox
from ..schemas.evaluation import EvaluationResponse

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/evaluate", response_model=EvaluationResponse)
async def run_evaluation(
    request: Request,
    submission_zip: UploadFile = File(..., description="用户的提交ZIP文件"),
    judge_zip: UploadFile = File(..., description="开发者的评测ZIP包")
):
    """
    接收提交和评测包，并发控制执行评测，并返回结果。
    """
    semaphore: asyncio.Semaphore = request.app.state.semaphore

    logger.info("Received evaluation request. Waiting for semaphore...")
    async with semaphore:
        # 只有在获得信号量（即并发数<4）时，以下代码才会执行
        logger.info("Semaphore acquired. Starting new evaluation task.")

        try:
            submission_data = await submission_zip.read()
            judge_data = await judge_zip.read()

            # 调用沙箱服务在安全的子进程中执行评测
            result = await sandbox.run_in_sandbox(submission_data, judge_data)

            return result

        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"评测时发生内部错误: {str(e)}")
        finally:
            logger.info("Evaluation task finished. Releasing semaphore.")
```

### `evaluateapp/services/sandbox.py`

**职责**: 实现所有核心业务逻辑，包括文件处理、环境隔离、安全沙箱（Seccomp）、子进程管理和动态代码执行。

```python
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

```

### `evaluateapp/schemas/evaluation.py`

**职责**: 定义API的请求和响应数据结构，确保类型安全。

```python
from pydantic import BaseModel, Field
from typing import Literal

class EvaluationResponse(BaseModel):
    """
    评测结果的统一响应模型。
    """
    status: Literal["COMPLETED", "ERROR"] = Field(..., description="评测状态，COMPLETED表示成功完成，ERROR表示出现异常")
    score: float = Field(0.0, description="评测分数，发生错误时为0")
    logs: str = Field("", description="评测过程中的日志或错误信息")

    class Config:
        # Pydantic v2 a.k.a. model_config
        # Pydantic v1 a.k.a. an inner class
        schema_extra = {
            "example": {
                "status": "COMPLETED",
                "score": 95.27,
                "logs": "评测成功。所有测试用例通过。"
            }
        }
```

### `seccomp_profiles/python-basic.json`

**职责**: 定义安全策略。这是一个系统调用白名单，只允许评测脚本执行最基本的文件读写和计算操作，禁止网络、执行新程序等危险行为。

```json
{
    "defaultAction": "SCMP_ACT_ERRNO",
    "architectures": [
        "SCMP_ARCH_X86_64",
        "SCMP_ARCH_X86",
        "SCMP_ARCH_AARCH64"
    ],
    "syscalls": [
        {"names": ["accept", "access", "brk", "close", "dup", "epoll_create", "epoll_ctl", "epoll_wait", "exit_group", "fstat", "fcntl", "futex", "getcwd", "getdents64", "getpid", "getrandom", "lseek", "lstat", "mmap", "mprotect", "munmap", "openat", "read", "readlink", "rt_sigaction", "rt_sigprocmask", "rt_sigreturn", "sched_getaffinity", "sendto", "select", "set_robust_list", "stat", "write", "writev"], "action": "SCMP_ACT_ALLOW"}
    ]
}
```

## 对评测包开发者的约定 (The Contract)

为了让系统能够正确执行评测，所有题目开发者在创建 `judge.zip` 时，必须遵循以下规则：

1.  **入口文件**: 评测包解压后，根目录下必须存在一个名为 `judge.py` 的文件。
2.  **入口函数**: `judge.py` 文件中必须定义一个名为 `evaluate` 的函数。
3.  **函数签名**: `evaluate` 函数必须接受两个关键字参数：
      * `submission_path: str`: 用户提交文件解压后的目录路径。
      * `judge_data_path: str`: 评测包自身解压后的目录路径。开发者可以利用此路径读取包内的正确标签、模型或其他数据文件。
4.  **函数返回值**: `evaluate` 函数必须返回一个**字典**，该字典至少需要包含以下两个键：
      * `score` (float): 本次提交的最终得分。
      * `logs` (str): 评测日志，可以是成功信息、调试信息或错误详情。
5.  **依赖**: `judge.py` 脚本能使用的所有Python库，都已预置在`evaluateapp`的主环境中（即您在`pyproject.toml`中定义的依赖）。

### 开发者参考示例: `judge.py`

```python
# 这是一个评测脚本的开发者需要编写的 judge.py 的示例
import json
from pathlib import Path

def evaluate(submission_path: str, judge_data_path: str) -> dict:
    """
    一个简单的评测函数示例。
    它会比较用户提交的json和评测包自带的json，并计算匹配度。
    """
    submission_p = Path(submission_path)
    judge_p = Path(judge_data_path)

    logs = []

    try:
        # 读取正确答案 (位于评测包内)
        labels_file = judge_p / "labels.json"
        with open(labels_file, 'r') as f:
            correct_labels = json.load(f)
        logs.append(f"成功读取正确答案文件: {labels_file}")

        # 读取用户提交 (位于用户提交目录)
        predictions_file = submission_p / "predictions.json"
        with open(predictions_file, 'r') as f:
            user_predictions = json.load(f)
        logs.append(f"成功读取用户提交文件: {predictions_file}")

        # 计算分数
        if not correct_labels:
            return {"score": 0.0, "logs": "错误：正确答案文件为空。"}

        correct_count = 0
        for key, value in correct_labels.items():
            if user_predictions.get(key) == value:
                correct_count += 1

        score = (correct_count / len(correct_labels)) * 100
        logs.append(f"评测完成。总共 {len(correct_labels)} 个样本，正确 {correct_count} 个。")

        return {
            "score": score,
            "logs": "\n".join(logs)
        }
    except FileNotFoundError as e:
        error_msg = f"评测失败：缺少文件 {e.filename}"
        logs.append(error_msg)
        return {"score": 0.0, "logs": "\n".join(logs)}
    except Exception as e:
        error_msg = f"评测失败：发生未知错误 {str(e)}"
        logs.append(error_msg)
        return {"score": 0.0, "logs": "\n".join(logs)}
```