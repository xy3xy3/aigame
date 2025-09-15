import json
from pathlib import Path

def evaluate(submission_path: str, judge_data_path: str, python_executable_path: str | None = None) -> dict:
    """
    对比用户提交的 data.json 和评测包中的 correct_labels.json。
    """
    logs = []
    submission_file = Path(submission_path) / "data.json"
    correct_file = Path(judge_data_path) / "correct_labels.json"

    try:
        # 1. 加载正确答案
        logs.append(f"正在加载正确答案: {correct_file}")
        with open(correct_file, 'r', encoding='utf-8') as f:
            correct_labels = json.load(f)

        # 2. 加载用户提交
        logs.append(f"正在加载用户提交: {submission_file}")
        if not submission_file.exists():
            raise FileNotFoundError("提交的压缩包中未找到 'predictions.json' 文件。")
        with open(submission_file, 'r', encoding='utf-8') as f:
            user_predictions = json.load(f)

        logs.append("用户提交和正确答案均已成功加载。")

        # 3. 验证数据并计分
        if not isinstance(correct_labels, list) or not isinstance(user_predictions, list):
            raise TypeError("提交文件和答案文件都必须是JSON列表。")

        if len(correct_labels) != 5 or len(user_predictions) != 5:
            raise ValueError(f"提交的标签数量应为5个，实际为 {len(user_predictions)} 个。")

        score = 0
        for i in range(5):
            pred = user_predictions[i]
            correct = correct_labels[i]
            if pred == correct:
                score += 1
                logs.append(f"  - 第 {i+1} 个标签: 预测值 {pred}, 正确值 {correct} -> 匹配成功, +1分")
            else:
                logs.append(f"  - 第 {i+1} 个标签: 预测值 {pred}, 正确值 {correct} -> 匹配失败")

        logs.append(f"评测完成。最终得分: {score} / 5")

        return {
            "score": float(score),
            "logs": "\n".join(logs)
        }

    except FileNotFoundError as e:
        logs.append(f"错误: {e}")
        return {"score": 0.0, "logs": "\n".join(logs)}
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        logs.append(f"错误: 文件内容或格式不符合要求。{e}")
        return {"score": 0.0, "logs": "\n".join(logs)}
    except Exception as e:
        logs.append(f"评测过程中发生未知错误: {e}")
        return {"score": 0.0, "logs": "\n".join(logs)}
