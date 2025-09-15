
import pandas as pd
from sklearn.linear_model import LinearRegression
import os

# --- 评测函数 ---
# 评测系统将导入此文件并调用这个函数
def predict(test_df: pd.DataFrame) -> pd.DataFrame:
    """
    读取训练数据、训练模型，并对传入的测试数据进行预测。

    参数:
    test_df (pd.DataFrame): 测试数据，包含 'id' 和 'feature' 列。

    返回:
    pd.DataFrame: 预测结果，必须包含 'id' 和 'prediction' 两列。
    """
    print("predict 函数被调用...")

    # --- 1. 加载训练数据并训练模型 ---
    # 评测环境保证 train.csv 和 main.py 在同一目录下
    train_data_path = 'train.csv'
    print(f"正在从 {train_data_path} 加载训练数据...")
    train_df = pd.read_csv(train_data_path)

    X_train = train_df[['feature']]
    y_train = train_df['target']

    print("正在训练模型...")
    model = LinearRegression()
    model.fit(X_train, y_train)
    print("模型训练完成。")

    # --- 2. 加载测试数据并进行预测 ---
    print("正在使用传入的 test_df 进行预测...")
    X_test = test_df[['feature']]
    predictions = model.predict(X_test)

    # --- 3. 格式化并返回结果 ---
    output_df = pd.DataFrame({
        'id': test_df['id'],
        'prediction': predictions
    })

    print("预测完成，返回结果。")
    return output_df