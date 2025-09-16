import os
import sys
import json
import subprocess
import random
import traceback
from typing import List

# 评测任务配置（仅在评测进程中可见）
_EVALUATION_TASKS: List[List[float]] = [
    [0.10, 0.20, 0.80, 0.30, 0.50],
    [0.70, 0.65, 0.60, 0.55, 0.40],
    [0.05, 0.90, 0.10, 0.20, 0.05],
    [0.30, 0.30, 0.30, 0.30, 0.30],
    [0.99, 0.95, 0.40, 0.50, 0.60],
]


def evaluate(submission_path: str, judge_data_path: str, python_executable_path: str | None = None) -> dict:
    """
    强化学习 - 多臂老虎机（Bernoulli Bandit）评测（进程隔离 + JSON Lines 协议）
    - 评测脚本通过 stdin/stdout 与选手进程进行回合式通信。
    - Agent 进程无法访问评测机的内部变量与内存。
    """
    logs: List[str] = []
    score = 0.0
    agent_process: subprocess.Popen[str] | None = None

    try:
        user_script_path = os.path.join(submission_path, "main.py")
        if not os.path.exists(user_script_path):
            raise FileNotFoundError("提交的压缩包中未找到 'main.py'。")

        # 启动用户代码为独立子进程
        agent_process = subprocess.Popen(
            [sys.executable, user_script_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,  # 行缓冲，适合交互
        )

        # --- 通信辅助函数 ---
        def send_command(command: str, params: dict | None = None) -> None:
            assert agent_process is not None and agent_process.stdin is not None
            msg = {"command": command}
            if params:
                msg["params"] = params
            agent_process.stdin.write(json.dumps(msg) + "\n")

        def receive_json() -> dict:
            assert agent_process is not None and agent_process.stdout is not None
            line = agent_process.stdout.readline()
            if not line:
                raise EOFError("Agent 进程未返回数据（可能已崩溃）。")
            return json.loads(line)

        steps_per_task = 200
        total_reward = 0.0
        logs.append(f"共 {len(_EVALUATION_TASKS)} 个任务，每个任务 {steps_per_task} 步。")

        for i, probs in enumerate(_EVALUATION_TASKS):
            n_arms = len(probs)
            rng = random.Random(2025 + i)
            task_reward = 0.0

            # 1) 重置 Agent
            send_command("reset", {"n_arms": n_arms, "seed": 2025 + i})
            logs.append(f"\n任务 {i+1} 开始...")

            # 2) 交互回合
            for _ in range(steps_per_task):
                send_command("select_action")
                resp = receive_json()
                if "action" not in resp:
                    raise KeyError("Agent 响应缺少 'action' 字段。")
                action = resp["action"]
                if not isinstance(action, int) or action < 0 or action >= n_arms:
                    raise ValueError(f"Agent 返回非法动作: {action}")

                reward = 1.0 if rng.random() < probs[action] else 0.0
                task_reward += reward

                send_command("update", {"action": action, "reward": reward})

            total_reward += task_reward
            logs.append(
                f"  - 任务 {i+1} 平均奖励: {task_reward/steps_per_task:.4f} (最优臂≈{max(probs):.3f})"
            )

        # 3) 结束评测
        send_command("terminate")

        # 清理子进程
        assert agent_process is not None
        if agent_process.stdin:
            agent_process.stdin.close()
        agent_process.wait(timeout=5)

        reward_rate = total_reward / (len(_EVALUATION_TASKS) * steps_per_task)
        score = round(max(0.0, min(1.0, reward_rate)) * 100.0, 2)
        logs.append("")
        logs.append(f"最终得分 = 100 * 平均奖励率 = {score:.2f}")

    except Exception as e:
        logs.append("\n--- 评测过程中发生严重错误 ---")
        logs.append(f"错误类型: {type(e).__name__}")
        logs.append(f"错误信息: {e}")
        logs.append(traceback.format_exc())
        # 若子进程仍活着，尽量抓取其 stderr 帮助定位
        if agent_process and agent_process.poll() is None and agent_process.stderr is not None:
            try:
                logs.append("\n--- Agent Stderr ---")
                logs.append(agent_process.stderr.read())
            except Exception:
                pass
        score = 0.0
    finally:
        if agent_process and agent_process.poll() is None:
            agent_process.kill()

    return {"score": float(score), "logs": "\n".join(logs)}
