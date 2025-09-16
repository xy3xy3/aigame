import os
import sys
import json
import shutil
import tempfile
import subprocess
import pandas as pd
from sklearn.metrics import mean_squared_error
import traceback


def evaluate(submission_path: str, judge_data_path: str, **kwargs) -> dict:
    """
    代码执行-线性回归（进程隔离 + JSON Lines 协议）
    - Judge 通过 stdin/stdout 给 Agent 一次性下发测试样本，请求预测。
    - 为避免数据泄露，仅将 train.csv 拷贝至 Agent 的工作目录，不提供 ground_truth.csv。
    """
    logs: list[str] = []
    score = 0.0
    agent: subprocess.Popen[str] | None = None
    sandbox_dir: str | None = None

    try:
        user_script_path = os.path.join(submission_path, "main.py")
        test_csv = os.path.join(judge_data_path, "test.csv")
        truth_csv = os.path.join(judge_data_path, "ground_truth.csv")
        train_csv = os.path.join(judge_data_path, "train.csv")
        if not os.path.exists(user_script_path):
            raise FileNotFoundError("提交的压缩包中未找到 'main.py'。")

        # 读取评测侧数据
        test_df = pd.read_csv(test_csv)
        truth_df = pd.read_csv(truth_csv)
        logs.append("已加载测试集与标准答案。")

        # 为 Agent 创建最小沙箱，仅复制 train.csv 与用户 main.py（不包含 ground_truth.csv）
        sandbox_dir = tempfile.mkdtemp(prefix="agent_sbx_")
        shutil.copy2(train_csv, os.path.join(sandbox_dir, "train.csv"))
        # 将用户脚本复制到沙箱目录，确保以相对路径执行可找到
        shutil.copy2(user_script_path, os.path.join(sandbox_dir, "main.py"))
        logs.append("已创建沙箱工作目录并复制 train.csv。")

        # 启动用户进程（工作目录指向沙箱）
        agent = subprocess.Popen(
            [sys.executable, "main.py"],
            cwd=sandbox_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,
        )

        # 工具函数
        def send_command(command: str, params: dict | None = None) -> None:
            assert agent is not None and agent.stdin is not None
            msg = {"command": command}
            if params:
                msg["params"] = params
            agent.stdin.write(json.dumps(msg) + "\n")
            try:
                agent.stdin.flush()
            except Exception:
                pass

        def receive_json() -> dict:
            assert agent is not None and agent.stdout is not None
            line = agent.stdout.readline()
            if not line:
                raise EOFError("Agent 进程未返回数据（可能已退出/崩溃）。")
            return json.loads(line)

        # 发送预测请求（一次性下发测试样本）
        test_records = test_df[["id", "feature"]].to_dict(orient="records")
        send_command("predict", {"test": test_records})
        logs.append("已向 Agent 发送预测请求（JSON Lines）。")

        resp = receive_json()
        if "predictions" not in resp or not isinstance(resp["predictions"], list):
            raise ValueError("Agent 返回的数据缺少 'predictions' 列表。")

        pred_df = pd.DataFrame(resp["predictions"])  # 需要包含 id, prediction
        if "id" not in pred_df.columns or "prediction" not in pred_df.columns:
            raise ValueError("Agent 返回的 predictions 必须包含 'id' 与 'prediction' 字段。")
        logs.append("已收到 Agent 预测结果。")

        # 结束 Agent
        send_command("terminate")
        if agent.stdin:
            agent.stdin.close()
        agent.wait(timeout=5)

        # 评测
        merged_df = pd.merge(truth_df, pred_df, on="id", suffixes=("_true", "_pred"))
        if len(merged_df) != len(truth_df):
            logs.append(
                f"警告：ID 对齐不完整，仅评测匹配到的 {len(merged_df)}/{len(truth_df)} 行。"
            )
        if len(merged_df) == 0:
            raise ValueError("提交结果与标准答案无任何匹配行，无法评测。")

        mse = mean_squared_error(merged_df["target"], merged_df["prediction"])
        logs.append(f"评测指标: MSE = {mse:.4f}")
        score = max(0.0, 100.0 - float(mse))
        logs.append(f"最终得分: max(0, 100 - MSE) = {score:.2f}")

    except Exception as e:
        logs.append("\n--- 评测过程中发生严重错误 ---")
        logs.append(f"错误类型: {type(e).__name__}")
        logs.append(f"错误信息: {e}")
        logs.append(traceback.format_exc())
        # 尽量抓取子进程的 stderr，无论是否仍在运行
        if agent and agent.stderr is not None:
            try:
                if agent.poll() is not None:
                    logs.append("\n--- Agent Stderr ---")
                    logs.append(agent.stderr.read() or "<empty>")
                else:
                    try:
                        _out, _err = agent.communicate(timeout=0.8)
                        logs.append("\n--- Agent Stderr ---")
                        logs.append(_err or "<empty>")
                    except subprocess.TimeoutExpired:
                        pass
            except Exception:
                pass
        score = 0.0
    finally:
        if agent and agent.poll() is None:
            agent.kill()
        if sandbox_dir and os.path.isdir(sandbox_dir):
            try:
                shutil.rmtree(sandbox_dir)
            except Exception:
                pass

    return {"score": float(score), "logs": "\n".join(logs)}
