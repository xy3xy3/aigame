import json
from pathlib import Path
from typing import List, Tuple
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix


def _calc_band(score_0_1: float) -> float:
    # 将 [0,1] 的指标按旧版区间规则映射到 0~400
    score_base = 400
    acc100 = score_0_1 * 100
    if acc100 >= 90.0:
        return 1.0 * score_base
    elif acc100 >= 87.0:
        return 0.9 * score_base
    elif acc100 >= 84.0:
        return 0.8 * score_base
    elif acc100 >= 79.0:
        return 0.7 * score_base
    elif acc100 >= 75.0:
        return 0.6 * score_base
    elif acc100 >= 70.0:
        return 0.4 * score_base
    elif acc100 >= 60.0:
        return 0.2 * score_base
    else:
        return 0.0


def _load_results(path: Path) -> Tuple[List[int], List[int]]:
    """
    返回 (ids, labels)
    JSON 格式：{"results": [{"id": int, "label": int}, ...]}
    """
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("results", data.get("predictions", []))
    ids = [int(it["id"]) for it in items]
    labels = [int(it["label"]) for it in items]
    return ids, labels


def evaluate(submission_path: str, judge_data_path: str) -> dict:
    """
    评测说明：
    - 评测包(judge_data_path)需包含："test_set_submission.json"（作为参考标签）
    - 提交包(submission_path)需包含："results.json"（与参考格式一致）
    - 计算 Accuracy/Precision/Recall/F1 以及混淆矩阵，并按旧版权重得分：
      total = 0.7 * band(F1) + 0.3 * band(Recall)
    """
    logs = []
    ref_file = Path(judge_data_path) / "test_set_submission.json"
    sub_file = Path(submission_path) / "results.json"
    try:
        if not ref_file.exists():
            raise FileNotFoundError(f"评测包缺少参考文件: {ref_file}")
        if not sub_file.exists():
            raise FileNotFoundError(f"提交包缺少结果文件: {sub_file}")

        logs.append(f"读取参考标签: {ref_file}")
        ref_ids, y_true = _load_results(ref_file)
        logs.append(f"读取提交结果: {sub_file}")
        sub_ids, y_pred = _load_results(sub_file)

        # 依据 id 对齐
        ref_map = {i: y for i, y in zip(ref_ids, y_true)}
        pred_pairs = [(i, ref_map.get(i, None)) for i in sub_ids]
        aligned_true = [t for _, t in pred_pairs if t is not None]
        aligned_pred = [p for p, t in zip(y_pred, aligned_true)]

        if not aligned_true:
            raise ValueError("无法对齐数据，请检查 id 是否一致。")

        y_t = np.array(aligned_true)
        y_p = np.array(aligned_pred)

        acc = accuracy_score(y_t, y_p)
        prec = precision_score(y_t, y_p, average="binary", pos_label=1)
        rec = recall_score(y_t, y_p, average="binary", pos_label=1)
        f1 = f1_score(y_t, y_p, average="binary", pos_label=1)
        cm = confusion_matrix(y_t, y_p)

        score = 0.7 * _calc_band(f1) + 0.3 * _calc_band(rec)

        logs.extend([
            "===== 评估指标 =====",
            f"Accuracy: {acc:.4f}",
            f"Precision(pos=1): {prec:.4f}",
            f"Recall(pos=1): {rec:.4f}",
            f"F1(pos=1): {f1:.4f}",
            "",
            "混淆矩阵:",
            str(cm),
            "",
            "===== 计分 =====",
            f"总分: {score:.2f}",
        ])

        return {"score": float(score), "logs": "\n".join(logs)}
    except Exception as e:
        logs.append(f"评测失败: {e}")
        return {"score": 0.0, "logs": "\n".join(logs)}

