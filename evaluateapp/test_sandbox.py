import sys
import os
from pathlib import Path

# 添加项目根目录到sys.path
sys.path.append('/proj/aigame/evaluateapp')

# 导入sandbox模块中的_execute_judge_code函数
from services.sandbox import _execute_judge_code

def test_sandbox_with_venv():
    """
    测试修改后的sandbox是否能正确使用虚拟环境
    """
    # 创建测试目录结构
    import tempfile
    import shutil

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)
        submission_dir = tmpdir_path / "submission"
        judge_dir = tmpdir_path / "judge"

        # 创建目录
        submission_dir.mkdir()
        judge_dir.mkdir()

        # 创建一个简单的judge.py文件用于测试
        judge_py_content = '''
import pandas as pd
import numpy as np
import pytz

def evaluate(submission_path, judge_data_path):
    """
    简单的评测函数，用于测试依赖导入
    """
    # 检查是否能正确导入依赖
    pandas_version = pd.__version__
    numpy_version = np.__version__
    pytz_version = pytz.__version__

    logs = f"成功导入依赖:\\n"
    logs += f"pandas版本: {pandas_version}\\n"
    logs += f"numpy版本: {numpy_version}\\n"
    logs += f"pytz版本: {pytz_version}\\n"

    return {
        "score": 100.0,
        "logs": logs
    }
'''

        # 写入judge.py文件
        (judge_dir / "judge.py").write_text(judge_py_content)

        # 调用_execute_judge_code函数
        result = _execute_judge_code(str(submission_dir), str(judge_dir))

        print("评测结果:")
        print(f"状态: {result['status']}")
        print(f"分数: {result['score']}")
        print(f"日志:\\n{result['logs']}")

        return result

if __name__ == "__main__":
    print("开始测试sandbox环境...")
    result = test_sandbox_with_venv()

    if result['status'] == 'COMPLETED':
        print("\\n测试成功！虚拟环境中的依赖可以正常导入。")
    else:
        print("\\n测试失败！")
        print(result['logs'])