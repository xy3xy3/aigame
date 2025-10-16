# EvaluateApp service image using uv to manage Python packages

FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/python:3.12-slim-bookworm AS base

ENV UV_LINK_MODE=copy \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMEXPR_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 MALLOC_ARENA_MAX=2

RUN set -eux; \
    if [ -f /etc/apt/sources.list ]; then \
      sed -i -E 's@https?://deb.debian.org@https://mirrors.tuna.tsinghua.edu.cn@g; s@https?://security.debian.org@https://mirrors.tuna.tsinghua.edu.cn@g' /etc/apt/sources.list; \
    fi; \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
      sed -i -E 's@https?://deb.debian.org@https://mirrors.tuna.tsinghua.edu.cn@g; s@https?://security.debian.org@https://mirrors.tuna.tsinghua.edu.cn@g' /etc/apt/sources.list.d/debian.sources; \
    fi; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgl1 \
        libgomp1 \
        libcap2 \
        libseccomp2 \
        libstdc++6 \
    ; \
    rm -rf /var/lib/apt/lists/*

# Use Tsinghua PyPI mirror and install uv via pip
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
    PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn \
    PIP_NO_CACHE_DIR=1
RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install uv

WORKDIR /app/evaluateapp

# Copy only project metadata first to leverage Docker layer caching
COPY evaluateapp/pyproject.toml evaluateapp/uv.lock ./

# Use uv to export locked requirements and install them into the system interpreter
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        build-essential \
        libc6-dev \
        linux-libc-dev \
        libcap-dev \
        libseccomp-dev \
        pkg-config \
    ; \
    uv export --no-dev --format requirements-txt --index https://pypi.tuna.tsinghua.edu.cn/simple -o /tmp/requirements.txt; \
    uv pip install --system -r /tmp/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple; \
    rm -f /tmp/requirements.txt; \
    apt-get purge -y --auto-remove build-essential libc6-dev linux-libc-dev libcap-dev libseccomp-dev pkg-config; \
    rm -rf /var/lib/apt/lists/*

# Now copy the application source
COPY evaluateapp/ /app/evaluateapp/

# Expose app port
EXPOSE 8000

# Default envs (can be overridden by env_file or -e)
ENV SANDBOX_BACKEND=DOCKER \
    DOCKER_IMAGE=self \
    DOCKER_NETWORK_MODE=none \
    DOCKER_MEMORY=2g \
    DOCKER_CPUS=1.0

# Ensure docker SDK is available (already installed via pyproject)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
