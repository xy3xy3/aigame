import argparse
import pandas as pd
from sklearn.linear_model import LinearRegression

def main():
    # 1. 设置命令行参数解析
    parser = argparse.ArgumentParser(description="线性回归模型预测脚本")
    parser.add_argument('--input', type=str, required=True, help='测试数据 .csv 文件路径')
    parser.add_argument('--output', type=str, required=True, help='预测结果 .csv 文件的保存路径')
    args = parser.parse_args()

    print("脚本开始执行...")

    # 2. 加载训练数据并训练模型
    # 真实场景中，训练数据应与脚本放在一起或从固定路径读取
    # 这里我们为了演示，直接在代码中创建（与生成器生成的数据同分布）
    train_data = {
        'feature': [1.1, 1.3, 1.5, 2.0, 2.2, 2.9, 3.0, 3.2],
        'target': [5.1, 5.5, 5.9, 6.9, 7.3, 8.7, 9.0, 9.4]
    }
    train_df = pd.DataFrame(train_data)
    
    X_train = train_df[['feature']]
    y_train = train_df['target']

    print("正在训练模型...")
    model = LinearRegression()
    model.fit(X_train, y_train)
    print("模型训练完成。")

    # 3. 加载测试数据
    print(f"正在从 {args.input} 加载测试数据...")
    test_df = pd.read_csv(args.input)
    X_test = test_df[['feature']]

    # 4. 进行预测
    print("正在进行预测...")
    predictions = model.predict(X_test)

    # 5. 格式化并保存结果
    output_df = pd.DataFrame({
        'id': test_df['id'],
        'prediction': predictions
    })

    print(f"正在将结果保存到 {args.output}...")
    output_df.to_csv(args.output, index=False)

    print("脚本执行完毕！")

if __name__ == '__main__':
    main()

