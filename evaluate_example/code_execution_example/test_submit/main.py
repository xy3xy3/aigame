import sys
import json
import csv
from typing import Tuple, List, Dict
import traceback # 导入 traceback 模块

def _fit_simple_linear_regression(x_vals: List[float], y_vals: List[float]) -> Tuple[float, float]:
    """使用最小二乘拟合 y = a + b*x，返回 (a, b)。"""
    n = len(x_vals)
    if n == 0:
        return 0.0, 0.0
    sumx = sum(x_vals)
    sumy = sum(y_vals)
    sumx2 = sum(v * v for v in x_vals)
    sumxy = sum(x_vals[i] * y_vals[i] for i in range(n))
    denom = n * sumx2 - sumx * sumx
    if denom == 0.0:
        a = sumy / n if n else 0.0
        return a, 0.0
    b = (n * sumxy - sumx * sumy) / denom
    a = (sumy - b * sumx) / n
    return a, b


def _read_train_csv(path: str) -> Tuple[List[float], List[float]]:
    xs: List[float] = []
    ys: List[float] = []
    with open(path, "r", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            return xs, ys
        # 定位列索引
        try:
            fi = header.index("feature")
            ti = header.index("target")
        except ValueError:
            # 兼容大小写或空白
            lowered = [h.strip().lower() for h in header]
            fi = lowered.index("feature")
            ti = lowered.index("target")
        for row in reader:
            if not row:
                continue
            try:
                xs.append(float(row[fi]))
                ys.append(float(row[ti]))
            except Exception:
                continue
    return xs, ys


def handle_predict(params: dict) -> dict:
    # 期望 params["test"] 为记录列表：[{"id":..., "feature":...}, ...]
    test_records: List[Dict] = params.get("test", [])

    # 加载训练数据（从当前工作目录读取 train.csv）
    xs, ys = _read_train_csv("train.csv")
    a, b = _fit_simple_linear_regression(xs, ys)

    # 预测
    predictions = []
    for rec in test_records:
        try:
            fid = rec["id"]
            xval = float(rec["feature"])
            yhat = a + b * xval
            predictions.append({"id": fid, "prediction": float(yhat)})
        except Exception:
            continue
    return {"predictions": predictions}


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
            # --- 关键修改：添加 try...except 块 ---
            try:
                resp = handle_predict(params)
                # 成功时，将结果作为 'data' 发送
                final_resp = {"status": "success", "data": resp}
            except Exception as e:
                # 失败时，将错误信息作为 'error' 发送
                error_info = f"{type(e).__name__}: {e}\n{traceback.format_exc()}"
                final_resp = {"status": "error", "error": error_info}

            print(json.dumps(final_resp), flush=True)

        elif cmd == "terminate":
            break


if __name__ == "__main__":
    main()
