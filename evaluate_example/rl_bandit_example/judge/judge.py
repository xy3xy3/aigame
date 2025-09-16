import os
import sys
import importlib.util
import traceback
import random
from typing import List


def _simulate_bandit(agent, probs: List[float], steps: int, seed: int, logs: List[str]) -> tuple[float, float]:
    """
    在给定 Bernoulli 多臂老虎机环境下模拟一次交互。
    - agent: 选手实现的 Agent 实例，需提供 reset/select_action/update 接口
    - probs: 每个动作的命中概率（0~1）
    - steps: 交互步数
    - seed: 固定随机种子，确保评测可复现
    返回: (累计奖励, 理论最优累计奖励)
    """
    rng = random.Random(seed)
    n_arms = len(probs)

    # 兼容 Agent(...) 与 Agent().reset(...)
    if hasattr(agent, "reset") and callable(agent.reset):
        try:
            agent.reset(n_arms=n_arms, seed=seed)
        except TypeError:
            # 对旧签名的兼容: reset(n_arms)
            agent.reset(n_arms)

    total_reward = 0.0
    best_prob = max(probs)
    best_total = best_prob * steps

    for _t in range(steps):
        if not hasattr(agent, "select_action") or not callable(agent.select_action):
            raise AttributeError("Agent 必须实现 select_action(self) -> int")
        action = agent.select_action()
        if not isinstance(action, int):
            raise TypeError(f"select_action 必须返回 int，但得到 {type(action)}")
        if action < 0 or action >= n_arms:
            raise ValueError(f"select_action 返回非法动作 {action}，应在 [0, {n_arms-1}] 范围内")

        reward = 1.0 if rng.random() < probs[action] else 0.0
        total_reward += reward

        if not hasattr(agent, "update") or not callable(agent.update):
            raise AttributeError("Agent 必须实现 update(self, action: int, reward: float) -> None")
        agent.update(action, reward)

    logs.append(f"  - 最优臂概率: {best_prob:.3f}，平均奖励(本任务): {total_reward/steps:.3f}")
    return total_reward, best_total


def evaluate(submission_path: str, judge_data_path: str, python_executable_path: str | None = None) -> dict:
    """
    强化学习 - 多臂老虎机（Bernoulli Bandit）评测

    选手需提交 main.py，内含 `Agent` 类，接口规范：
    - reset(self, n_arms: int, seed: int | None = None) -> None  （可选但推荐；如不存在将跳过）
    - select_action(self) -> int
    - update(self, action: int, reward: float) -> None

    评测流程：
    - 使用 5 个固定 bandit 任务（各 5 臂），每个任务交互 200 步。
    - 奖励为 Bernoulli(arm_prob)。
    - 记总平均奖励率 reward_rate = 累计奖励 / (任务数*步数)。
    - 最终得分 = round(100 * reward_rate, 2)。
    """
    logs: List[str] = []
    score = 0.0
    user_module = None

    try:
        # 1) 动态导入用户模块
        user_script_path = os.path.join(submission_path, "main.py")
        if not os.path.exists(user_script_path):
            raise FileNotFoundError("提交的压缩包中未找到 'main.py'。")

        logs.append(f"正在导入选手代码: {user_script_path}")
        spec = importlib.util.spec_from_file_location("user_main", user_script_path)
        if spec is None or spec.loader is None:
            raise ImportError("无法创建 user_main 的模块规范或加载器。")
        user_module = importlib.util.module_from_spec(spec)
        sys.modules["user_main"] = user_module
        spec.loader.exec_module(user_module)
        logs.append("选手模块导入成功。")

        # 2) 获取 Agent 类
        if not hasattr(user_module, "Agent"):
            raise AttributeError("'main.py' 中必须定义 'Agent' 类。")
        AgentClass = getattr(user_module, "Agent")
        if not callable(AgentClass):
            raise TypeError("'Agent' 必须是可调用的类。")

        # 3) 评测任务配置（固定，保证可复现）
        tasks: List[List[float]] = [
            [0.10, 0.20, 0.80, 0.30, 0.50],
            [0.70, 0.65, 0.60, 0.55, 0.40],
            [0.05, 0.90, 0.10, 0.20, 0.05],
            [0.30, 0.30, 0.30, 0.30, 0.30],
            [0.99, 0.95, 0.40, 0.50, 0.60],
        ]
        steps_per_task = 200

        logs.append(f"共 {len(tasks)} 个任务，每个任务 {steps_per_task} 步，臂数 = {len(tasks[0])}")

        total_reward = 0.0
        total_best = 0.0

        for i, probs in enumerate(tasks):
            # 优先尝试 Agent(n_arms)，失败则 Agent()
            try:
                agent = AgentClass(len(probs))
            except TypeError:
                agent = AgentClass()

            logs.append(f"任务 {i+1}：")
            r, b = _simulate_bandit(agent, probs, steps_per_task, seed=2025 + i, logs=logs)
            total_reward += r
            total_best += b

        reward_rate = total_reward / (len(tasks) * steps_per_task)
        optimum_rate = total_best / (len(tasks) * steps_per_task)
        logs.append("")
        logs.append(f"总体平均奖励率: {reward_rate:.4f}（理论上限约 {optimum_rate:.4f}）")

        score = round(max(0.0, min(1.0, reward_rate)) * 100.0, 2)
        logs.append(f"最终得分 = 100 * 平均奖励率 = {score:.2f}")

    except Exception as e:
        logs.append("\n--- 评测过程中发生错误 ---")
        logs.append(f"错误类型: {type(e).__name__}")
        logs.append(f"错误信息: {e}")
        logs.append("详细追溯信息:")
        logs.append(traceback.format_exc())
        score = 0.0

    return {
        "score": float(score),
        "logs": "\n".join(str(x) for x in logs),
    }

