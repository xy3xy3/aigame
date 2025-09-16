# 题目开发与打包指南（基于最新示例）

本文档面向“出题人”，说明如何在 `evaluate_example/` 下开发、打包并本地联调评测服务。内容已同步本仓库的最新示例：`judge_sum`、`label_compare`、`ns_2025_00`、`ns_2025_02`、`code_execution_example`、`rl_bandit_example`。

— 如果你想直接跑通本地端到端评测，推荐用 uv 部署 `evaluateapp`，并用 Gradio 或 `evaluate_example/test_evaluate.py` 做联调，自查细节见文末“本地评测服务（uv）”与“端到端测试”。

## 目录规范（必须）

在 `evaluate_example/` 内为你的题目新建文件夹（英文名），使用统一结构：

```
evaluate_example/
  task_name/
    judge/           # 评测端必需文件：judge.py + 参考标签/资源
    data/            # 可选，提供给选手下载的数据集（与评测无关）
    test_submit/     # 提交示例（结果样例或最小可运行代码）
    problem.yml      # 题目信息（不包含 detailedDescription）
    desc.md          # 题目详细描述（Markdown）
```

约定：
- 评测依赖的“隐藏数据”（参考标签、配表等）放 `judge/`，保证评测包自洽；
- 仅供选手下载的数据放 `data/`（可选）；
- `test_submit/` 提供可直接压缩上传的提交样例（结果文件或最小代码）；
- `problem.yml` 与 `desc.md` 必须位于题目根目录。

## problem.yml 规范

最小字段集合（ISO8601 时间）：

```yaml
title: "示例题目：A+B Problem"
shortDescription: "一句话简介"
startTime: "2024-01-01T00:00:00Z"
endTime: "2024-01-31T23:59:59Z"
score: 100
```

注意：详细描述已从 `problem.yml` 分离为独立 `desc.md`。后台上传时将优先读取压缩包中的 `desc.md` 作为 `detailedDescription`。可拷贝本目录下 `problem_template.yml` 作为起点，把其中的 `detailedDescription` 内容移到 `desc.md` 并从 YAML 中删除该字段。

## desc.md 规范

建议包含：
- 任务描述 / 背景
- 数据说明（目录结构、下载方式、字段含义）
- 提交格式（文件名、字段/列、示例）
- 评测与计分（指标、加权方式、示例）
- 约束与条款（时间/资源限制、禁止事项、版权说明）

## judge.py 评测接口

评测脚本需在 `judge/` 下提供 `judge.py`，并实现：

```python
def evaluate(submission_path: str, judge_data_path: str, python_executable_path: str | None = None) -> dict:
    # 读取 submission_path 下的选手提交，使用 judge_data_path 下的参考数据
    # 返回：{"score": float, "logs": str}
    return {"score": float(score), "logs": "\n".join(logs)}
```

建议与约束：
- 默认资源限制：CPU 约 300 秒、内存约 2GB、进程/线程数上限、文件大小上限等（见 `evaluateapp/services/sandbox.py`）。请避免长时间训练/外网下载；
- 禁止网络访问；仅依赖 `submission_path` 和 `judge_data_path`；
- 日志量适中（建议 < 200KB），有助问题定位；
- 代码执行类题目可用 `python_executable_path` 调用用户代码，或使用受控子进程/动态导入；
- 平台基础依赖与版本以 `evaluateapp/pyproject.toml` 为准（如 numpy/pandas/sklearn/opencv/fastapi/gradio 等）。不保证安装额外库，超出需求建议做“结果上传类”。

## 常见题型范式（含最新示例）

- 标签/结果上传类（离线训练，线上只传预测结果）
  - 示例：`judge_sum`、`label_compare`、`ns_2025_00`、`ns_2025_02`
  - 做法：`judge/` 内放参考标签；`test_submit/` 给出 `results.csv`/`results.json` 样例；`judge.py` 按 id/file_name 对齐计算 Accuracy/F1/加权得分等；
  - 结果文件示例：
    - CSV：`file_name,label` 或 `id,prediction`
    - JSON：`{"results": [{"id": 1, "label": 0}, ...]}`

- 代码执行类（上传最小可运行代码，线上快速评测）
  - 示例：`code_execution_example`
  - 做法：`test_submit/` 提供 `main.py` 骨架；`judge/` 放 `test.csv` 与 `ground_truth.csv`（仅在评测侧读取）；评测通过子进程与选手程序以 JSON Lines 协议交互，校验输出并打分（如 MSE→分数）。

- 交互/强化学习类（多轮通信）
  - 示例：`rl_bandit_example`
  - 做法：评测端多回合与选手程序交互（stdin/stdout 的 JSON），如多臂老虎机；记录奖励、计算平均回报率并折算分数；确保协议健壮（超时/异常处理、动作合法性校验）。

## 本地自测（评测脚本冒烟）

在题目目录下直接加载 `judge.py` 调用 `evaluate()`：

```bash
cd evaluate_example/task_name
python - <<'PY'
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('judge', Path('judge')/'judge.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print(m.evaluate(submission_path='test_submit', judge_data_path='judge'))
PY
```

确保返回 `{"score": float, "logs": str}`；示例提交能被正确评测。

## 一键打包与后台上传

使用打包脚本 `pack.py`（避免手工遗漏/嵌套目录）：

```bash
cd evaluate_example
# 打包单个题目
python3 pack.py task_name
# 或批量打包当前目录下所有题目
python3 pack.py --all --root .
```

脚本会在题目目录生成：
- `judge.zip`：来自 `judge/`（跳过内部 .zip）；
- `test_submit.zip`：来自 `test_submit/`；
- `data.zip`（可选）：来自 `data/`；
- 最终 `task_name.zip`：包含以上 zip + `problem.yml` + `desc.md`。

后台“题目管理 → 批量上传”选择 `task_name.zip`，需要更新时可选择“覆盖”。

## 本地评测服务（uv，推荐）

评测服务在 `evaluateapp/`。为了便于出题人自测，推荐使用 uv 快速部署：

1) 安装 uv（未安装时）
   - macOS/Linux：`curl -fsSL https://astral.sh/uv/install.sh | sh`
   - Windows（PowerShell）：`iwr https://astral.sh/uv/install.ps1 -UseB -OutFile install.ps1; ./install.ps1`

2) 准备依赖与虚拟环境
   - `cd evaluateapp`
   - `uv sync`（据 `pyproject.toml`/`uv.lock` 安装依赖）
   - 复制配置：`cp .env.example .env` 并按需修改：
     - `WEBAPP_CALLBACK_URL`：回调地址（本地可设 `http://127.0.0.1:39001/api/submissions/callback`）
     - `WEBAPP_CALLBACK_SECRET`：回调鉴权密钥
     - `EVALUATE_INBOUND_SECRET`：/api/evaluate 上传鉴权密钥
     - `ENABLE_GRADIO=true` 可挂载调试页面（默认路径 `/gradio`，由 `GRADIO_PATH` 控制）

3) 准备沙箱（首次）
   - 创建无特权账号和目录（root）：
     ```bash
     sudo groupadd sandboxgroup || true
     sudo useradd --system --no-create-home --shell /bin/false -g sandboxgroup sandboxuser || true
     sudo mkdir -p /opt/sandbox_jail && sudo chown root:root /opt/sandbox_jail
     sudo mkdir -p /opt/sandboxes && sudo chmod 1777 /opt/sandboxes
     ```
   - 构建 chroot 基础环境（root）：
     ```bash
     cd evaluateapp
     sudo bash setup_chroot.sh
     ```

4) 启动服务
   - 使用 uv 运行：
     ```bash
     cd evaluateapp
     # 方式一：直接跑 main.py（包含 uvicorn 启动）
     uv run python main.py
     # 方式二：显式 uvicorn（热重载可加 --reload）
     uv run uvicorn main:app --host 127.0.0.1 --port 8000
     ```
   - 访问 `http://127.0.0.1:8000/` 健康检查；若启用 Gradio，访问 `http://127.0.0.1:8000/gradio`

说明：评测时会校验 `EVALUATE_INBOUND_SECRET`，并在完成后向 `WEBAPP_CALLBACK_URL` 发送带 `WEBAPP_CALLBACK_SECRET` 的回调。

## 端到端测试（两种方式）

- Gradio 调试页（更直观）
  - 在 `evaluateapp/.env` 里设置 `ENABLE_GRADIO=true`，启动服务后打开 `/gradio`；
  - 上传 `submission.zip` 与 `judge.zip`，实时查看日志和最终 JSON 结果。

- 脚本：`evaluate_example/test_evaluate.py`（覆盖多个示例题）
  - 确保 `evaluateapp` 已启动，且 `.env` 中 `WEBAPP_CALLBACK_URL` 与本地空闲端口一致；
  - 运行示例：
    ```bash
    python3 evaluate_example/test_evaluate.py \
      --tasks judge_sum,label_compare,ns_2025_00,ns_2025_02,code_execution_example,rl_bandit_example \
      --base-url http://127.0.0.1:8000 \
      --inbound-secret <与你服务一致的EVALUATE_INBOUND_SECRET> \
      --callback-url http://127.0.0.1:39001/api/submissions/callback \
      --callback-secret <与你服务一致的WEBAPP_CALLBACK_SECRET>
    ```
  - 脚本会：打包各题目的 `test_submit/` 与 `judge/` 为 zip，调用 `/api/evaluate`，并开启本地回调 HTTP 服务打印评测结果。

## 规范检查清单

- problem.yml：包含 title/shortDescription/startTime/endTime/score；时间为 ISO8601 且 start < end；
- desc.md：包含任务、数据、提交格式、计分与注意事项；UTF-8；
- judge.py：实现 `evaluate(...) -> dict`；严禁网络访问；300 秒内可完成；异常时返回可读日志；
- test_submit/：示例提交可通过评测；结果/协议与题面一致；
- judge/：包含所有评测必需数据；使用相对路径；不依赖运行时下载；
- 打包：用 `pack.py` 生成 `task_name.zip`；压缩包内部不再嵌套顶层目录；
- 交互题：定义清晰稳健的通信协议（字段校验、超时/异常处理、回合终止信号等）。

## 目录示例

以 `ns_2025_02` 为例：

```
ns_2025_02/
  judge/
    judge.py
    test_set_submission.json
  test_submit/
    results.json   # 选手仅上传此文件
  problem.yml      # 标题/时间/分值
  desc.md          # 详细题面（Markdown）
```

更多可参考：`judge_sum`、`label_compare`（标签对比）、`ns_2025_00`（CSV 对齐）、`code_execution_example`（子进程+JSON 协议）、`rl_bandit_example`（交互式强化学习）。

—— 若有疑问或需要校验你的题目结构，优先对照本目录下的最新示例与上述联调流程。
