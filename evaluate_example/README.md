# 创建方法

在文件夹下面创建`judge.py`

默认支持的包如下

```
[project]
name = "evaluateapp"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.116.1",
    "numpy>=2.3.2",
    "opencv-python>=4.11.0.86",
    "pandas>=2.3.1",
    "pydantic-settings>=2.10.1",
    "python-multipart>=0.0.20",
    "python-prctl>=1.8.1",
    "scikit-image>=0.25.2",
    "scikit-learn>=1.7.1",
    "tqdm>=4.67.1",
    "uvicorn>=0.35.0",
]
```

函数结构要求：

```python
def evaluate(submission_path: str, judge_data_path: str) -> dict:
    return {
                "score": float(score),
                "logs": "\n".join(logs)
            }
```

将需要验证的标签和judge.py压缩为`judge.zip`，用于评测。

将用于本地自测的示例提交或结果文件（例如`data.json`/`results.json`/`results.csv`等）压缩为`test_submit.zip`，仅用于用户测试。

如需提供给选手下载的数据集，请单独打包为`data.zip`（可选）。或者用网盘链接。

将`judge.zip`，`test_submit.zip`，`problem.yml`（以及可选的`data.zip`）放在同一目录下压缩后即可上传到网页。

比如problem.zip是最后要提交的结果
里面包含judge.zip, test_submit.zip, problem.yml, data.zip(可选)
judge.zip里面包含judge.py和标签文件（不要嵌套judge文件夹）
test_submit.zip里面包含选手提交的结果文件
data.zip里面包含选手需要下载的数据集文件