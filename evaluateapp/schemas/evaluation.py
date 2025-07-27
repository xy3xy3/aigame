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