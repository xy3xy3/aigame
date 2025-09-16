import os
import sys
import importlib.util
import traceback
import random
from typing import List
import contextlib # 1. 导入用于重定向输出的模块
import io         # 1. 导入用于重定向输出的模块

# 2. [防御核心] 将评测任务配置定义为模块级的全局常量。
# 这样它就不会作为局部变量出现在任何函数的调用栈帧中。
_EVALUATION_TASKS: List[List[float]] = [
    [0.10, 0.20, 0.80, 0.30, 0.50],
    [0.70, 0.65, 0.60, 0.55, 0.40],
    [0.05, 0.90, 0.10, 0.20, 0.05],
    [0.30, 0.30, 0.30, 0.30, 0.30],
    [0.99, 0.95, 0.40, 0.50, 0.60],
]

def _simulate_bandit(agent, probs: List[float], steps: int, seed: int, logs: List[str]) -> tuple[float, float]:
    """
    (此函数内部逻辑不变)
    在给定 Bernoulli 多臂老虎机环境下模拟一次交互。
    """
    rng = random.Random(seed)
    n_arms = len(probs)

    if hasattr(agent, "reset") and callable(agent.reset):
        try:
            agent.reset(n_arms=n_arms, seed=seed)
        except TypeError:
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
    强化学习 - 多臂老虎机（Bernoulli Bandit）评测 (安全增强版)
    """
    logs: List[str] = []
    score = 0.0
    user_module = None

    try:
        user_script_path = os.path.join(submission_path, "main.py")
        if not os.path.exists(user_script_path):
            raise FileNotFoundError("提交的压缩包中未找到 'main.py'。")

        # 准备一个缓冲区来捕获并丢弃用户的 print 内容
        f = io.StringIO()

        # 3. [防御核心] 将所有与用户代码的交互都包裹在 stdout 重定向块中。
        with contextlib.redirect_stdout(f):
            # 1) 动态导入用户模块 (会执行顶层代码)
            logs.append(f"正在导入选手代码: {user_script_path} (用户 print 已静默)")
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

            # 3) 评测任务配置
            tasks = _EVALUATION_TASKS # 使用全局常量
            steps_per_task = 200

            logs.append(f"共 {len(tasks)} 个任务，每个任务 {steps_per_task} 步，臂数 = {len(tasks[0])}")

            total_reward = 0.0
            total_best = 0.0

            for i, probs in enumerate(tasks):
                # 实例化 Agent (也在静默块中)
                try:
                    agent = AgentClass(len(probs))
                except TypeError:
                    agent = AgentClass()

                logs.append(f"任务 {i+1}：")
                # 模拟交互 (所有 agent 方法调用都在静默块中)
                r, b = _simulate_bandit(agent, probs, steps_per_task, seed=2025 + i, logs=logs)
                total_reward += r
                total_best += b

        # 此时 with 块结束，stdout 恢复正常
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