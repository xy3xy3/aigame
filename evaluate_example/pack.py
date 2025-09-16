#!/usr/bin/env python3
"""
Pack problems in the new task layout.

Task layout (under a task directory):

task_name/
  judge/           # judge.py + reference labels and any assets
  data/            # optional assets for contestants to download
  test_submit/     # sample submission files or example code
  problem.yml      # metadata (without detailedDescription)
  desc.md          # detailedDescription (Markdown)

This script will:
  1) Zip the contents of judge/, data/ (if exists and non-empty), and test_submit/
     into judge.zip, data.zip, test_submit.zip respectively. The ZIPs contain
     only the files, not a nested top-level folder.
  2) Write those ZIP archives to the task directory (task_name/).
  3) Create a final package ZIP named <task_name>.zip in the task directory
     that includes: judge.zip, (optional) data.zip, test_submit.zip, problem.yml, desc.md.

Usage:
  - Pack a single task directory:
        python3 pack.py path/to/task_dir
  - Pack all task directories (children containing problem.yml) under a root:
        python3 pack.py --all [root_dir]

Notes:
  - Existing ZIPs in the task directory will be overwritten.
  - Files with extension .zip inside judge/, data/, test_submit/ are skipped
    to avoid nested archives.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys
import zipfile


def zip_dir_contents(src_dir: Path, out_zip: Path) -> None:
    """Zip the contents of src_dir into out_zip without nesting the folder itself.

    Skips files ending with .zip to avoid nesting prebuilt archives.
    """
    if not src_dir.exists() or not src_dir.is_dir():
        raise FileNotFoundError(f"Directory not found: {src_dir}")

    # Ensure parent exists
    out_zip.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(src_dir):
            root_path = Path(root)
            for name in files:
                if name.lower().endswith(".zip"):
                    # Skip nested zips
                    continue
                abs_path = root_path / name
                # arcname relative to src_dir root
                arcname = abs_path.relative_to(src_dir)
                zf.write(abs_path, arcname)


def is_dir_non_empty(p: Path) -> bool:
    return p.exists() and p.is_dir() and any(p.iterdir())


def pack_task(task_dir: Path) -> Path:
    """Pack a single task directory. Returns path to final package.

    Raises on missing required files or directories.
    """
    if not task_dir.exists() or not task_dir.is_dir():
        raise FileNotFoundError(f"Task directory not found: {task_dir}")

    problem_yml = task_dir / "problem.yml"
    desc_md = task_dir / "desc.md"
    judge_dir = task_dir / "judge"
    data_dir = task_dir / "data"
    test_submit_dir = task_dir / "test_submit"

    # Basic checks
    if not problem_yml.exists():
        raise FileNotFoundError(f"Missing problem.yml in {task_dir}")
    if not desc_md.exists():
        raise FileNotFoundError(f"Missing desc.md in {task_dir}")
    if not judge_dir.exists() or not judge_dir.is_dir():
        raise FileNotFoundError(f"Missing judge/ directory in {task_dir}")
    if not test_submit_dir.exists() or not test_submit_dir.is_dir():
        raise FileNotFoundError(f"Missing test_submit/ directory in {task_dir}")

    # Step 1: Build per-folder zips
    judge_zip = task_dir / "judge.zip"
    test_submit_zip = task_dir / "test_submit.zip"
    data_zip = task_dir / "data.zip"

    zip_dir_contents(judge_dir, judge_zip)
    zip_dir_contents(test_submit_dir, test_submit_zip)
    data_included = False
    if is_dir_non_empty(data_dir):
        zip_dir_contents(data_dir, data_zip)
        data_included = True
    elif data_zip.exists():
        try:
            data_zip.unlink()
        except OSError:
            pass

    # Step 2: Final package (task_name.zip)
    task_name = task_dir.name
    final_zip = task_dir / f"{task_name}.zip"
    with zipfile.ZipFile(final_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(problem_yml, arcname="problem.yml")
        zf.write(desc_md, arcname="desc.md")
        zf.write(judge_zip, arcname="judge.zip")
        zf.write(test_submit_zip, arcname="test_submit.zip")
        if data_included and data_zip.exists():
            zf.write(data_zip, arcname="data.zip")

    return final_zip


def find_task_dirs(root: Path) -> list[Path]:
    """Find child directories under root that look like task directories (contain problem.yml)."""
    if not root.is_dir():
        return []
    out = []
    for p in root.iterdir():
        if p.is_dir() and (p / "problem.yml").exists():
            out.append(p)
    return sorted(out)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Pack AIGame problems")
    parser.add_argument("task_dir", nargs="?", help="Path to one task directory")
    parser.add_argument("--all", action="store_true", help="Pack all tasks under the given directory (or CWD)")
    parser.add_argument("--root", default=".", help="Root directory when using --all (default: .)")
    args = parser.parse_args(argv)

    try:
        if args.all:
            root = Path(args.root).resolve()
            tasks = find_task_dirs(root)
            if not tasks:
                print(f"No task directories found under: {root}")
                return 1
            print(f"Found {len(tasks)} task(s) under {root}")
            for t in tasks:
                print(f"Packing: {t}")
                final_zip = pack_task(t)
                print(f"  -> {final_zip}")
        else:
            if not args.task_dir:
                parser.error("Provide a task directory or use --all")
            task_dir = Path(args.task_dir).resolve()
            final_zip = pack_task(task_dir)
            print(final_zip)
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

