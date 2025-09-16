import sys
import json
import pandas as pd
from sklearn.linear_model import LinearRegression


def handle_predict(params: dict) -> dict:
    # 期望 params["test"] 为记录列表：[{"id":..., "feature":...}, ...]
    test_records = params.get("test", [])
    test_df = pd.DataFrame.from_records(test_records)

    # 训练一个简单的线性回归（从当前工作目录读取 train.csv）
    train_df = pd.read_csv("train.csv")
    X_train = train_df[["feature"]]
    y_train = train_df["target"]
    model = LinearRegression()
    model.fit(X_train, y_train)

    # 预测
    X_test = test_df[["feature"]]
    preds = model.predict(X_test)
    out = pd.DataFrame({"id": test_df["id"], "prediction": preds})
    return {"predictions": out.to_dict(orient="records")}


def main() -> None:
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            msg = json.loads(line)
        except Exception:
            continue

        cmd = msg.get("command")
        params = msg.get("params", {})

        if cmd == "predict":
            resp = handle_predict(params)
            print(json.dumps(resp), flush=True)
        elif cmd == "terminate":
            break


if __name__ == "__main__":
    main()
