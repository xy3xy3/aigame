"""
示例提交：Epsilon-Greedy 多臂老虎机 Agent

接口要求：
- reset(self, n_arms: int, seed: int | None = None) -> None
- select_action(self) -> int
- update(self, action: int, reward: float) -> None
"""

from __future__ import annotations
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


if __name__ == "__main__":
    # 本地小测试：随机奖励
    agent = Agent(5, epsilon=0.1)
    import random as _r
    probs = [0.1, 0.2, 0.8, 0.3, 0.5]
    rng = _r.Random(0)
    total = 0
    for _ in range(200):
        a = agent.select_action()
        r = 1.0 if rng.random() < probs[a] else 0.0
        agent.update(a, r)
        total += r
    print("avg_reward=", total / 200)

