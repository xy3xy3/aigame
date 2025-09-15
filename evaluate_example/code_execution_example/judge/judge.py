import os
import subprocess
import pandas as pd
from sklearn.metrics import mean_squared_error

def evaluate(submission_path: str, judge_data_path: str, python_executable_path: str | None = None) -> dict:
    """
    评测逻辑：
    1. 找到用户提交的 main.py 脚本。
    2. 使用 subprocess 调用该脚本，并传入测试数据路径和指定的输出路径。
    3. 读取用户脚本生成的 predictions.csv 和标准答案 ground_truth.csv。
    4. 计算均方误差 (MSE) 并转换为最终分数。
    """
    logs = []
    score = 0.0

    try:
        # 定义文件路径
        user_script = os.path.join(submission_path, 'main.py')
        test_data = os.path.join(judge_data_path, 'test.csv')
        ground_truth_file = os.path.join(judge_data_path, 'ground_truth.csv')
        user_output_file = os.path.join(submission_path, 'predictions.csv')

        # 检查必要文件是否存在
        if not os.path.exists(user_script):
            raise FileNotFoundError("提交的压缩包中未找到 'main.py'。")
        if not os.path.exists(test_data) or not os.path.exists(ground_truth_file):
            raise FileNotFoundError("评测包配置错误，缺少测试数据或标准答案。")

        # 用于执行用户脚本的 Python 解释器
        python_bin = python_executable_path or 'python'

        # 构造并执行用户脚本的命令
        command = [
            python_bin, user_script,
            '--input', test_data,
            '--output', user_output_file
        ]
        logs.append(f"执行命令: {' '.join(command)}")

        # 使用 subprocess 执行用户代码，设置5分钟超时
        process = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=300
        )

        # 记录用户脚本的输出日志，便于调试
        if process.stdout:
            logs.append("--- 用户脚本标准输出 (stdout) ---")
            logs.append(process.stdout)
        if process.stderr:
            logs.append("--- 用户脚本标准错误 (stderr) ---")
            logs.append(process.stderr)

        # 检查用户脚本是否成功运行
        if process.returncode != 0:
            raise RuntimeError(f"用户脚本执行失败，返回码: {process.returncode}")

        logs.append("用户脚本执行成功。")

        # 检查用户是否生成了输出文件
        if not os.path.exists(user_output_file):
            raise FileNotFoundError("用户脚本执行成功，但未在指定路径生成 'predictions.csv'。")

        # 读取预测结果和标准答案
        pred_df = pd.read_csv(user_output_file)
        truth_df = pd.read_csv(ground_truth_file)

        # 合并以确保 id 对齐
        merged_df = pd.merge(truth_df, pred_df, on='id', suffixes=('_true', '_pred'))
        
        if len(merged_df) != len(truth_df):
            logs.append(f"警告：提交结果的 ID 与标准答案不完全匹配。仅评测匹配上的 {len(merged_df)} 条数据。")

        if len(merged_df) == 0:
            raise ValueError("提交结果的 ID 与标准答案完全不匹配，无法评测。")

        # 计算 MSE
        mse = mean_squared_error(merged_df['target'], merged_df['prediction'])
        logs.append(f"\n评测指标: 均方误差 (MSE) = {mse:.4f}")

        # 计算最终分数
        score = max(0, 100 - mse)
        logs.append(f"最终得分: Score = max(0, 100 - MSE) = {score:.2f}")

    except subprocess.TimeoutExpired:
        logs.append("错误：用户脚本执行超时（超过5分钟）。")
        score = 0.0
    except Exception as e:
        import traceback
        logs.append(f"评测过程中发生严重错误: {e}")
        logs.append(traceback.format_exc())
        score = 0.0

    return {
        "score": float(score),
        "logs": "\n".join(logs)
    }

