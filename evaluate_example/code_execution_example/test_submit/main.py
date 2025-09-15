
import pandas as pd
from sklearn.linear_model import LinearRegression

# --- 模型训练 ---
# [最佳实践] 将模型训练放在模块加载时执行，而不是在 predict 函数内部。
# 这样，评测系统只需导入一次模块，模型就训练好了，可以被 predict 函数复用。
print("模块加载：开始训练模型...")

# 真实场景中，训练数据应与脚本放在一起或从固定路径读取
# 这里我们为了演示，直接在代码中创建
train_data = {
    'feature': [1.1, 1.3, 1.5, 2.0, 2.2, 2.9, 3.0, 3.2],
    'target': [5.1, 5.5, 5.9, 6.9, 7.3, 8.7, 9.0, 9.4]
}
train_df = pd.DataFrame(train_data)

X_train = train_df[['feature']]
y_train = train_df['target']

# 创建并训练模型实例
model = LinearRegression()
model.fit(X_train, y_train)

print("模型训练完成，已准备好进行预测。")


# --- 评测函数 ---
# 评测系统将导入此文件并调用这个函数
def predict(test_df: pd.DataFrame) -> pd.DataFrame:
    """
    使用预先训练好的模型对测试数据进行预测。

    参数:
    test_df (pd.DataFrame): 测试数据，包含 'id' 和 'feature' 列。

    返回:
    pd.DataFrame: 预测结果，必须包含 'id' 和 'prediction' 两列。
    """
    print("predict 函数被调用...")

    # 1. 提取特征
    X_test = test_df[['feature']]

    # 2. 进行预测
    print("正在进行预测...")
    predictions = model.predict(X_test)

    # 3. 格式化并返回结果
    output_df = pd.DataFrame({
        'id': test_df['id'],
        'prediction': predictions
    })

    print("预测完成，返回结果。")
    return output_df
