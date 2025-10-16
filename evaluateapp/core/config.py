from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # evaluateapp/ 目录

class Settings(BaseSettings):
    WEBAPP_CALLBACK_URL: str = "http://127.0.0.1:3000/api/submissions/callback"
    # 统一共享密钥：用于双向签名校验
    SHARED_SECRET: str = "a-very-long-and-random-shared-secret"
    # 是否启用调试用的 Gradio 页面
    ENABLE_GRADIO: bool = False
    # Gradio 页面挂载路径
    GRADIO_PATH: str = "/gradio"
    # 是否启用 Seccomp 过滤（默认关闭，避免阻断 exec 等系统调用）
    ENABLE_SECCOMP: bool = False
    # 评测后端：CHROOT 或 DOCKER
    SANDBOX_BACKEND: str = "CHROOT"

    # Docker 评测相关配置（当 SANDBOX_BACKEND=DOCKER 时生效）
    DOCKER_IMAGE: str = "swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/python:3.12-slim"
    DOCKER_PULL: bool = False
    DOCKER_SOCKET: str = "/var/run/docker.sock"  # 仅用于部署文档提示
    DOCKER_MEMORY: str = "2g"
    DOCKER_CPUS: float = 1.0  # 逻辑 CPU 数量限制
    DOCKER_NETWORK_MODE: str = "none"  # 默认禁网
    DOCKER_USER: str | None = None  # 例如 "65534:65534" 以 nobody 运行，None 表示镜像默认用户
    # 当 DOCKER_IMAGE=self 且 EvaluateApp 运行在宿主机时，是否自动构建服务镜像供评测复用
    DOCKER_SELF_BUILD_ON_HOST: bool = True
    # 构建出的自用镜像 tag（宿主机 self 模式）
    DOCKER_SELF_TAG: str = "aigame-eval:self"
    # 构建上下文与 Dockerfile（相对项目根）
    DOCKER_SELF_CONTEXT: str = str(BASE_DIR.parent)
    DOCKER_SELF_DOCKERFILE: str = "evaluateapp/docker/evaluateapp.Dockerfile"

    class Config:
        # 使用绝对路径加载 .env，避免工作目录变化导致无法读取
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"

settings = Settings()
