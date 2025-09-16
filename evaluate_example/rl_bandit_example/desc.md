### 任务描述
本题是一个简单的强化学习（Reinforcement Learning）示例：Bernoulli 多臂老虎机（Multi‑Armed Bandit）。
在每个任务中，你将面临若干个动作（臂），每个动作以固定概率产生 0/1 奖励。你需要在有限步数内探索与利用，从而最大化累计奖励。

评测端会给出 5 个固定的 Bandit 任务（各 5 臂），每个任务交互 200 步。你的智能体需要根据历史动作与奖励，不断改进选择策略。

### 数据说明
本题为“代码执行类”，无需额外数据文件。评测环境会直接加载你的 `main.py` 并与内置的环境交互。

### 提交格式（重要）
- 提交一个仅包含 `main.py` 的 zip 压缩包。
- `main.py` 必须定义一个名为 `Agent` 的类，接口如下：

```python
class Agent:
    def __init__(self, n_arms: int | None = None, **kwargs):
        ...

    def reset(self, n_arms: int, seed: int | None = None) -> None:
        """可选但推荐：在开始新任务前重置内部状态。"""

    def select_action(self) -> int:
        """返回要选择的动作编号（0 ~ n_arms-1）。"""

    def update(self, action: int, reward: float) -> None:
        """在获得奖励后，用于更新策略/估计。"""
```

评测端将尝试优先以 `Agent(n_arms)` 实例化；若失败，则回退到 `Agent()` 再调用 `reset(n_arms)`。建议同时兼容这两种方式。

你可以参考 `test_submit/main.py` 中给出的 Epsilon‑Greedy 示例实现。

### 评测与计分
- 共 5 个固定 Bandit 任务（各 5 臂），每个任务交互 200 步。
- 奖励为 Bernoulli(arm_prob)（0 或 1），arm_prob 为评测端固定参数（对选手未知）。
- 统计所有任务的平均奖励率：
  `reward_rate = 累计奖励 / (任务数 × 步数)`。
- 最终得分：`Score = round(100 * reward_rate, 2)`，范围 [0, 100]。

评测日志会给出每个任务的大致情况（最优臂概率、你的平均回报等），便于排查问题与优化策略。

### 本地自测（推荐）
你可以在题目目录下快速调用评测函数进行冒烟测试：

```bash
cd evaluate_example/rl_bandit_example
python - <<'PY'
import importlib.util
from pathlib import Path

judge_dir = Path('judge')
spec = importlib.util.spec_from_file_location('judge', judge_dir/'judge.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
ret = m.evaluate(submission_path='test_submit', judge_data_path='judge')
print(ret)
PY
```

确保返回的 `score` 合理且 `logs` 明确，`test_submit/` 中的示例能被正常评测。

### 打包与上传
使用仓库提供的 `pack.py` 进行一键打包：

```bash
cd evaluate_example
python3 pack.py rl_bandit_example
```

脚本会在 `rl_bandit_example/` 生成：
- `judge.zip`（评测端）
- `test_submit.zip`（示例提交）
- 最终 `rl_bandit_example.zip`（上传包）

在后台“题目管理 → 批量上传”中上传 `rl_bandit_example.zip` 即可。

