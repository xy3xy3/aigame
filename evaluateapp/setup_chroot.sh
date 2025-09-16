#!/bin/bash

# 遇到任何错误立即退出
set -e

# 目标监狱目录
JAIL="/opt/sandbox_jail"

# 脚本所在目录（用于优先选择项目内的 .venv）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 确保以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "错误：请使用 sudo 运行此脚本"
  exit 1
fi

echo "--- 清理旧的 chroot 环境（如果存在）---"
if [ -d "$JAIL" ]; then
    find "$JAIL" -mindepth 1 -delete
fi

echo "--- 正在为 chroot 环境创建基础目录结构 ---"
mkdir -p $JAIL/{bin,usr/bin,lib,lib64,etc}
mkdir -p $JAIL/usr/lib/x86_64-linux-gnu
mkdir -p $JAIL/dev
echo "nameserver 8.8.8.8" > $JAIL/etc/resolv.conf

echo "--- 正在复制基础命令 (bash) ---"
cp /bin/bash $JAIL/bin/

echo "--- 正在定位 Python 解释器 ---"
# 优先使用项目内的虚拟环境解释器（版本与依赖一致）
if [ -x "$SCRIPT_DIR/.venv/bin/python" ]; then
    VENV_PY="$SCRIPT_DIR/.venv/bin/python"
    echo "检测到项目虚拟环境：$VENV_PY"
else
    VENV_PY="$(which python3)"
    echo "未找到项目虚拟环境，使用系统解释器：$VENV_PY"
fi
PYTHON_REAL_EXEC=$(readlink -f "$VENV_PY")
echo "Python 真实解释器路径: $PYTHON_REAL_EXEC"
mkdir -p "$JAIL/usr/bin"
cp "$PYTHON_REAL_EXEC" "$JAIL/usr/bin/python3"
echo "已将解释器复制到 $JAIL/usr/bin/python3"

echo "--- 正在复制所有依赖的共享库 (.so files) ---"
copy_deps() {
    local bin="$1"
    # 解析 ldd 输出，处理两种行：
    # 1) "libxxx.so => /path/to/libxxx.so (0x...)"
    # 2) 直接以绝对路径开头的解释器行，如 "/lib64/ld-linux-x86-64.so.2 (0x...)"
    ldd "$bin" 2>/dev/null | while IFS= read -r line; do
        local path=""
        if echo "$line" | grep -q "=>"; then
            path=$(echo "$line" | awk '{print $3}')
        else
            path=$(echo "$line" | awk '{print $1}')
        fi
        if [ -n "$path" ] && echo "$path" | grep -q "^/" && ! echo "$path" | grep -q "vdso"; then
            local dest="$JAIL$path"
            if [ ! -e "$dest" ]; then
                mkdir -p "$(dirname "$dest")"
                cp "$path" "$dest"
                echo "  - 已复制: $path"
            fi
        fi
    done
}

copy_deps /bin/bash
copy_deps "$PYTHON_REAL_EXEC"

# 推导 Python 版本与 site-packages 路径（优先 .venv）
PYTHON_VERSION=$("$VENV_PY" -c "import sys; print(f'python{sys.version_info.major}.{sys.version_info.minor}')")
SITE_PACKAGES_PATH="$SCRIPT_DIR/.venv/lib/$PYTHON_VERSION/site-packages"
if [ ! -d "$SITE_PACKAGES_PATH" ]; then
    # 兜底：根据解释器所在前缀推导
    VENV_PATH=$(dirname $(dirname "$PYTHON_REAL_EXEC"))
    SITE_PACKAGES_PATH="$VENV_PATH/lib/$PYTHON_VERSION/site-packages"
fi

if [ -d "$SITE_PACKAGES_PATH" ]; then
    echo "--- 正在复制 venv site-packages 从: $SITE_PACKAGES_PATH ---"
    JAIL_SITE_PACKAGES_PATH="$JAIL/usr/lib/$PYTHON_VERSION/site-packages"
    mkdir -p "$JAIL_SITE_PACKAGES_PATH"
    cp -a "$SITE_PACKAGES_PATH/." "$JAIL_SITE_PACKAGES_PATH/"

    echo "--- 正在复制 site-packages 中 .so 文件的依赖 ---"
    # 注意：这里我们查找监狱内的 .so 文件来确定需要检查哪些原始文件
    find "$JAIL_SITE_PACKAGES_PATH" -name "*.so" -print0 | while IFS= read -r -d $'\0' file_in_jail; do
        # 从监狱路径反推出原始 site-packages 中的路径
        relative_path=${file_in_jail#"$JAIL_SITE_PACKAGES_PATH/"}
        original_file="$SITE_PACKAGES_PATH/$relative_path"
        if [ -f "$original_file" ]; then
           copy_deps "$original_file"
        fi
    done
fi

STD_LIB_PATH=$("$VENV_PY" -c "import sysconfig; print(sysconfig.get_path('stdlib'))")
if [ -d "$STD_LIB_PATH" ]; then
    echo "--- 正在复制 Python 标准库从: $STD_LIB_PATH ---"
    JAIL_STD_LIB_PATH="$JAIL/usr/lib/$PYTHON_VERSION"
    mkdir -p "$JAIL_STD_LIB_PATH"
    cp -a "$STD_LIB_PATH/." "$JAIL_STD_LIB_PATH/"
fi
# --- **核心修正：强制设置权限** ---
echo "--- 正在修正 chroot 环境的权限 ---"
# 确保监狱根目录对所有人可读可执行
chmod 755 "$JAIL"
# 递归地为监狱内所有目录添加“其他人”的读和执行权限
find "$JAIL" -type d -exec chmod a+rx {} \;
# 递归地为监狱内所有文件添加“其他人”的读权限
find "$JAIL" -type f -exec chmod a+r {} \;

echo "--- 正在为可执行文件和共享库添加执行权限 ---"
# 特别确保关键可执行文件有执行权限
chmod a+x "$JAIL/bin/bash"
chmod a+x "$JAIL/usr/bin/python3"

# 【关键修正】递归地为所有 .so 文件（共享库）添加“其他人”的执行权限
# 这是必须的，因为降权后的用户需要权限来加载这些库
find "$JAIL" -name "*.so" -exec chmod a+x {} \;
find "$JAIL" -name "*.so.*" -exec chmod a+x {} \;

# --- 创建设备节点：/dev/null, /dev/zero, /dev/random, /dev/urandom, /dev/tty ---
echo "--- 正在创建设备节点 (/dev/*) ---"
create_chr() {
    local path="$1"; local major="$2"; local minor="$3"; local mode="$4"
    if [ -e "$path" ] && [ ! -c "$path" ]; then
        rm -f "$path"
    fi
    if [ ! -e "$path" ]; then
        mknod "$path" c "$major" "$minor" || true
    fi
    chmod "$mode" "$path" || true
}
create_chr "$JAIL/dev/null" 1 3 666
create_chr "$JAIL/dev/zero" 1 5 666
create_chr "$JAIL/dev/random" 1 8 666
create_chr "$JAIL/dev/urandom" 1 9 666
create_chr "$JAIL/dev/tty" 5 0 666

echo "--- Chroot 环境准备完成于: $JAIL ---"
