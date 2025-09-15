"""
通过脚本生成示例线性数据：
 - data/train.csv: 训练数据（供选手）
 - data/test.csv: 测试数据（供选手和评测）
 - judge/ground_truth.csv: 测试集标准答案（仅评测）

运行方式：
  python generate_data.py
"""
from pathlib import Path
import csv

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
JUDGE_DIR = ROOT / "judge"


def ensure_dirs():
    (DATA_DIR).mkdir(parents=True, exist_ok=True)
    (JUDGE_DIR).mkdir(parents=True, exist_ok=True)


def write_csv(path: Path, header: list[str], rows: list[list]):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


def main():
    ensure_dirs()

    # 简单线性关系: target = 2.3 * feature + 0.0 (训练数据用较小范围示例)
    train_rows = [
        [1.1, 5.1],
        [1.3, 5.5],
        [1.5, 5.9],
        [2.0, 6.9],
        [2.2, 7.3],
        [2.9, 8.7],
        [3.0, 9.0],
        [3.2, 9.4],
    ]
    write_csv(DATA_DIR / "train.csv", ["feature", "target"], train_rows)

    # 测试集（ID 与 feature）
    test_rows = [
        [1, 5.0],
        [2, 6.0],
        [3, 7.0],
        [4, 8.0],
        [5, 9.0],
    ]
    write_csv(DATA_DIR / "test.csv", ["id", "feature"], test_rows)
    # 评测端也携带一份 test.csv，保证 judge 包自洽
    write_csv(JUDGE_DIR / "test.csv", ["id", "feature"], test_rows)

    # 标准答案（仅评测使用）
    # 与问题描述保持一致
    truth_rows = [
        [1, 11.5],
        [2, 13.8],
        [3, 16.1],
        [4, 18.4],
        [5, 20.7],
    ]
    write_csv(JUDGE_DIR / "ground_truth.csv", ["id", "target"], truth_rows)

    print("data/train.csv, data/test.csv, judge/ground_truth.csv 已生成")


if __name__ == "__main__":
    main()
