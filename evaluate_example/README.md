# 题目开发与打包指南

本文档说明如何在 `evaluate_example/` 下开发一套可上线的题目，并用打包脚本一键生成上传包。

## 目录规范（必须）

在 `evaluate_example/` 内创建你的题目文件夹（英文名），并使用统一结构：

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
- 评测所需的一切“隐藏”数据（参考标签等）放在 `judge/`，保证评测包自洽。
- 仅供选手下载的数据，放在 `data/`（可选）。
- `test_submit/` 提供一个可直接上传的参考提交（结果文件或最小代码）。
- `problem.yml` 与 `desc.md` 必须位于题目根目录。

## problem.yml 规范

最小字段集合如下（ISO8601 时间）：

```yaml
title: "示例题目：A+B Problem"
shortDescription: "一句话简介"
startTime: "2024-01-01T00:00:00Z"
endTime: "2024-01-31T23:59:59Z"
score: 100
```

注意：详细描述从 `problem.yml` 中分离为 `desc.md`，后台上传时将优先读取压缩包中的 `desc.md` 作为 `detailedDescription`。
如需参考模板，可拷贝本目录下的 `problem_template.yml`，把其中的 `detailedDescription` 内容移到 `desc.md` 并从 YAML 中删除该字段。

## desc.md 规范

建议包含以下小节，使用 Markdown 编写：
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
    # 计算得分与日志，返回如下结构
    return {
        "score": float(score),      # 0.0 ~ 任意正数；平台按题目满分做显示
        "logs": "\n".join(logs),   # 字符串，简洁说明评测过程与结论
    }
```

建议与约束：
- 评测总时长默认限制约 300 秒（沙箱超时），请避免长时间训练/下载。
- 不要访问网络，不要依赖外部服务；仅使用 `submission_path` 与 `judge_data_path` 内的文件。
- 日志量适中（建议 < 200KB），方便选手排查问题。
- 若为“代码执行类”题目，可用 `python_executable_path` 辅助调用用户代码，或使用安全的动态导入。

平台默认可用依赖（节选）：

```
numpy, pandas, scikit-learn, scikit-image, opencv-python,
fastapi, tqdm, python-multipart, pydantic-settings, uvicorn
```

如需其它第三方库，建议在题面或 desc.md 中明确说明选手本地环境需求，并设计题目为“结果上传类”。

## 两种常见题型范式

1) 标签上传类（离线训练，线上只传推理结果）：
- `judge/` 内放置参考标签（如 `reference_labels.csv`、`test_set_submission.json`）。
- `test_submit/` 提供一个可直接压缩上传的结果样例（如 `results.csv` / `results.json`）。
- `judge.py` 读取结果文件，与参考标签对齐计算指标（Accuracy/F1 等）。

结果文件示例：
- CSV：`file_name,label` 或 `id,prediction`
- JSON：`{"results": [{"id": 1, "label": 0}, ...]}`

2) 文件上传/代码执行类（上传最小可运行代码，线上快速执行）：
- `test_submit/` 提供最小代码骨架（如 `main.py`），写明函数签名与返回格式。
- `judge/` 携带足够的评测数据（如 `test.csv` 与 `ground_truth.csv`），保证评测自洽。
- `judge.py` 动态导入或子进程调用用户代码，验证输出格式，计算指标并给分。

参考：`code_execution_example` 题目演示了导入 `predict(test_df)` 的做法。

## 本地自测（推荐）

在题目目录下，使用 Python 直接调用评测函数进行冒烟测试：

```bash
cd evaluate_example/task_name
python - <<'PY'
import importlib.util, os
from pathlib import Path
judge_dir = Path('judge')
spec = importlib.util.spec_from_file_location('judge', judge_dir/'judge.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ret = m.evaluate(submission_path='test_submit', judge_data_path='judge')
print(ret)
PY
```

确保返回的 `score` 合理且 `logs` 明确，`test_submit/` 中的示例能被正确评测。

## 一键打包与上传

使用打包脚本 `pack.py`（避免手工打包出错）：

```bash
cd evaluate_example
# 打包单个题目
python3 pack.py task_name
# 或批量打包当前目录下所有题目
python3 pack.py --all --root .
```

脚本会在题目目录生成：
- `judge.zip`：打包自 `judge/`（不包含最外层文件夹，自动忽略内部 .zip 文件）
- `test_submit.zip`：打包自 `test_submit/`
- `data.zip`（可选）：打包自 `data/`
- 最终 `task_name.zip`：包含以上三个 zip 与 `problem.yml`、`desc.md`

随后在后台“题目管理 → 批量上传”中上传 `task_name.zip`。覆盖已有题目时选择“覆盖”模式即可。

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

`label_compare`/`ns_2025_00`/`code_execution_example` 也分别给出了“标签上传类”和“代码执行类”的参考实现。

## 规范检查清单

- problem.yml：包含 title/shortDescription/startTime/endTime/score；时间为 ISO8601 且 start < end。
- desc.md：包含任务、数据、提交格式、计分与注意事项；编码为 UTF-8。
- judge.py：实现 `evaluate(...) -> dict`；无网络访问；300 秒内可完成；异常时返回可读日志。
- test_submit/：示例提交可通过评测；结果格式与题面一致。
- judge/：包含所有评测必需数据；路径使用相对路径；不要依赖运行时临时下载。
- 打包：使用 `pack.py` 生成 `task_name.zip`；压缩包内部不要再嵌套顶层目录。

如需进一步示例或检查，请参考本目录下各示例题目。
