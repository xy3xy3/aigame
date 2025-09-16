"""
交互式提交：Epsilon-Greedy 多臂老虎机 Agent（JSON Lines 协议）

协议：
- Judge -> Agent: {"command": "reset", "params": {"n_arms": int, "seed": int}}
- Judge -> Agent: {"command": "select_action"}
- Agent -> Judge: {"action": int}
- Judge -> Agent: {"command": "update", "params": {"action": int, "reward": float}}
- Judge -> Agent: {"command": "terminate"}
"""

from __future__ import annotations
import sys
import json
import random
from typing import List, Optional


class Agent:
    def __init__(self, n_arms: Optional[int] = None, epsilon: float = 0.1):
        self.epsilon = float(epsilon)
        self.n_arms = 0
        self.values: List[float] = []  # 各臂的价值估计
        self.counts: List[int] = []    # 各臂的拉取次数
        self._rng = random.Random()
        if n_arms is not None:
            self.reset(n_arms)

    def reset(self, n_arms: int, seed: int | None = None) -> None:
        self.n_arms = int(n_arms)
        self.values = [0.0 for _ in range(self.n_arms)]
        self.counts = [0 for _ in range(self.n_arms)]
        if seed is not None:
            self._rng.seed(int(seed))

    def select_action(self) -> int:
        # 先确保每个臂至少尝试一次
        for i in range(self.n_arms):
            if self.counts[i] == 0:
                return i

        if self._rng.random() < self.epsilon:
            return self._rng.randrange(self.n_arms)
        # 选择当前估计价值最大的臂；并在并列时选索引较小者
        best_value = max(self.values)
        for i, v in enumerate(self.values):
            if v == best_value:
                return i
        return 0  # 理论不可达，仅为静态检查器安心

    def update(self, action: int, reward: float) -> None:
        self.counts[action] += 1
        n = self.counts[action]
        # 增量式均值更新
        self.values[action] += (reward - self.values[action]) / n


def run_agent() -> None:
    agent = Agent()
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            msg = json.loads(line)
        except Exception:
            # 忽略无法解析的行
            continue

        cmd = msg.get("command")
        params = msg.get("params", {})

        if cmd == "reset":
            agent.reset(**params)
        elif cmd == "select_action":
            action = agent.select_action()
            print(json.dumps({"action": action}), flush=True)
        elif cmd == "update":
            agent.update(**params)
        elif cmd == "terminate":
            break


if __name__ == "__main__":
    run_agent()
