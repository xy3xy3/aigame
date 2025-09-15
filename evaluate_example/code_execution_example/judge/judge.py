import os
import sys
import pandas as pd
from sklearn.metrics import mean_squared_error
import importlib.util
import traceback

def evaluate(submission_path: str, judge_data_path: str, **kwargs) -> dict:
    """
    评测逻辑 (函数导入模式):
    1. 动态导入用户提交的 main.py 模块。
    2. 检查模块中是否存在 'predict' 函数。
    3. 加载测试数据和标准答案。
    4. 调用用户的 'predict' 函数并获取预测结果。
    5. 验证预测结果的格式。
    6. 计算均方误差 (MSE) 并转换为最终分数。
    """
    logs = []
    score = 0.0
    user_module = None

    try:
        # 定义文件路径
        user_script_path = os.path.join(submission_path, 'main.py')
        test_data_path = os.path.join(judge_data_path, 'test.csv')
        ground_truth_path = os.path.join(judge_data_path, 'ground_truth.csv')

        if not os.path.exists(user_script_path):
            raise FileNotFoundError("提交的压缩包中未找到 'main.py'。")

        # 1. 动态导入用户模块
        logs.append(f"正在动态导入用户模块: {user_script_path}")
        spec = importlib.util.spec_from_file_location("user_main", user_script_path)
        if spec is None:
            raise ImportError("无法为 user_main 创建模块规范。")
        user_module = importlib.util.module_from_spec(spec)
        sys.modules["user_main"] = user_module
        spec.loader.exec_module(user_module)
        logs.append("用户模块导入成功。")

        # 2. 检查 'predict' 函数是否存在
        if not hasattr(user_module, 'predict') or not callable(user_module.predict):
            raise AttributeError("提交的 'main.py' 中未找到可调用的 'predict' 函数。")
        logs.append("'predict' 函数找到。")

        # 3. 加载数据
        test_df = pd.read_csv(test_data_path)
        truth_df = pd.read_csv(ground_truth_path)
        logs.append("测试数据和标准答案加载成功。")

        # 4. 调用用户的 predict 函数
        logs.append("正在调用用户的 'predict' 函数...")
        pred_df = user_module.predict(test_df.copy()) # 传入副本以防用户修改原始数据
        logs.append("'predict' 函数执行完毕。")

        # 5. 验证返回结果
        if not isinstance(pred_df, pd.DataFrame):
            raise TypeError(f"'predict' 函数必须返回一个 pandas DataFrame，但返回了 {type(pred_df)}。")
        if 'id' not in pred_df.columns or 'prediction' not in pred_df.columns:
            raise ValueError("返回的 DataFrame 必须包含 'id' 和 'prediction' 列。")
        logs.append("预测结果格式验证通过。")

        # 6. 合并与计算
        merged_df = pd.merge(truth_df, pred_df, on='id', suffixes=('_true', '_pred'))

        if len(merged_df) != len(truth_df):
            logs.append(f"警告：提交结果的 ID 与标准答案不完全匹配。仅评测匹配上的 {len(merged_df)} 条数据。")

        if len(merged_df) == 0:
            raise ValueError("提交结果的 ID 与标准答案完全不匹配，无法评测。")

        mse = mean_squared_error(merged_df['target'], merged_df['prediction'])
        logs.append(f"\n评测指标: 均方误差 (MSE) = {mse:.4f}")

        score = max(0, 100 - mse)
        logs.append(f"最终得分: Score = max(0, 100 - MSE) = {score:.2f}")

    except Exception as e:
        logs.append("\n--- 评测过程中发生严重错误 ---")
        logs.append(f"错误类型: {type(e).__name__}")
        logs.append(f"错误信息: {e}")
        logs.append("详细追溯信息:")
        logs.append(traceback.format_exc())
        score = 0.0

    return {
        "score": float(score),
        "logs": "\n".join(logs)
    }