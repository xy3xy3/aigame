from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    WEBAPP_CALLBACK_URL: str = "http://127.0.0.1:3000/api/submissions/callback"
    WEBAPP_CALLBACK_SECRET: str = "a-very-long-and-random-secret-string-for-callback"
    # 新增：webapp -> evaluateapp 上传鉴权密钥（与回调密钥不同）
    EVALUATE_INBOUND_SECRET: str = "a-different-very-long-secret-for-evaluate-inbound"
    # 是否启用调试用的 Gradio 页面
    ENABLE_GRADIO: bool = False
    # Gradio 页面挂载路径
    GRADIO_PATH: str = "/gradio"
    # 是否启用 Seccomp 过滤（默认关闭，避免阻断 exec 等系统调用）
    ENABLE_SECCOMP: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
