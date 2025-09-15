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

将需要验证的标签和judge.py压缩为`judge.zip`，用于评测
将示例数据`data.json`压缩为`data.zip`，用于做演示数据
将`judge.zip`，`data.zip`，`problem.yml`放在同一目录下压缩后即可上传到网页。

参考的样子：
```
evaluate_example/label_compare/
├── correct_labels.json
├── data.json
├── data.zip
├── judge.py
├── label_compare.zip
└── problem.yml
```