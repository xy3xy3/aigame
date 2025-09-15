import json
from pathlib import Path
import pandas as pd


def _calculate_score(accuracy: float) -> float:
    score = 400
    if accuracy >= 0.98:
        return 1.0 * score
    elif accuracy >= 0.97:
        return 0.9 * score
    elif accuracy >= 0.96:
        return 0.8 * score
    elif accuracy >= 0.95:
        return 0.7 * score
    elif accuracy >= 0.93:
        return 0.6 * score
    elif accuracy >= 0.90:
        return 0.4 * score
    elif accuracy >= 0.80:
        return 0.2 * score
    else:
        return 0.0


def evaluate(submission_path: str, judge_data_path: str) -> dict:
    """
    评测说明：
    - 评测包(judge_data_path)需包含："reference_labels.csv"，两列[file_name,label]
    - 提交包(submission_path)需包含："results.csv"，两列[file_name,label]
    - 根据与参考标签的逐行匹配计算准确率，并按阈值换算为 0~400 分。
    """
    logs = []
    ref_file = Path(judge_data_path) / "reference_labels.csv"
    sub_file = Path(submission_path) / "results.csv"

    try:
        if not ref_file.exists():
            raise FileNotFoundError(f"评测包缺少参考文件: {ref_file}")
        if not sub_file.exists():
            raise FileNotFoundError(f"提交包缺少结果文件: {sub_file}")

        logs.append(f"读取参考标签: {ref_file}")
        ref_df = pd.read_csv(ref_file)
        logs.append(f"读取提交结果: {sub_file}")
        sub_df = pd.read_csv(sub_file)

        # 按 file_name 对齐
        merged = ref_df.merge(sub_df, on="file_name", suffixes=("_ref", "_pred"))
        total = len(merged)
        if total == 0:
            raise ValueError("对齐后数据为空，请检查 file_name 是否一致。")

        correct = (merged["label_ref"] == merged["label_pred"]).sum()
        accuracy = correct / total
        score = _calculate_score(accuracy)

        logs.append(f"样本总数: {total}")
        logs.append(f"预测正确: {correct}")
        logs.append(f"准确率: {accuracy:.4f}")
        logs.append(f"换算得分: {score:.2f}")

        return {
            "score": float(score),
            "logs": "\n".join(logs),
        }
    except Exception as e:
        logs.append(f"评测失败: {e}")
        return {"score": 0.0, "logs": "\n".join(logs)}

