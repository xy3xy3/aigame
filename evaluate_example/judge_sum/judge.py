import json
from pathlib import Path

def evaluate(submission_path: str, judge_data_path: str, python_executable_path: str | None = None) -> dict:
    """
    计算用户提交的 data.json 文件中所有 "value" 字段的总和。
    """
    logs = []
    submission_file = Path(submission_path) / "data.json"

    try:
        # 1. 检查并读取用户提交的文件
        logs.append(f"正在检查提交文件: {submission_file}")
        if not submission_file.exists():
            raise FileNotFoundError("提交的压缩包中未找到 'data.json' 文件。")

        with open(submission_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logs.append("文件读取成功，JSON格式正确。")

        # 2. 验证数据结构并计算总和
        if not isinstance(data, list):
            raise TypeError("JSON文件的顶层结构必须是一个列表 (list)。")

        total_score = 0.0
        item_count = 0
        for i, item in enumerate(data):
            item_count += 1
            if isinstance(item, dict) and 'value' in item and isinstance(item['value'], (int, float)):
                total_score += item['value']
                logs.append(f"  - 第 {i+1} 项有效，值: {item['value']}，当前总和: {total_score}")
            else:
                logs.append(f"  - 警告: 第 {i+1} 项格式不正确或缺少有效的'value'字段，已忽略。内容: {item}")

        logs.append(f"评测完成。共处理 {item_count} 项，最终总和为 {total_score}。")

        return {
            "score": total_score,
            "logs": "\n".join(logs)
        }

    except FileNotFoundError as e:
        logs.append(f"错误: {e}")
        return {"score": 0.0, "logs": "\n".join(logs)}
    except json.JSONDecodeError:
        logs.append("错误: 'data.json' 文件不是一个有效的JSON格式。")
        return {"score": 0.0, "logs": "\n".join(logs)}
    except TypeError as e:
        logs.append(f"错误: 数据结构不符合要求。{e}")
        return {"score": 0.0, "logs": "\n".join(logs)}
    except Exception as e:
        logs.append(f"评测过程中发生未知错误: {e}")
        return {"score": 0.0, "logs": "\n".join(logs)}
