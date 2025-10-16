# EvaluateApp service image using uv to manage Python packages

FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/python:3.12-slim AS base

ENV UV_LINK_MODE=copy \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 NUMEXPR_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 MALLOC_ARENA_MAX=2

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install uv (https://astral.sh/uv)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
    && ln -s /root/.local/bin/uv /usr/local/bin/uv

WORKDIR /app/evaluateapp

# Copy only project metadata first to leverage Docker layer caching
COPY evaluateapp/pyproject.toml evaluateapp/uv.lock ./

# Use uv to export locked requirements and install them into the system interpreter
RUN uv export --no-dev --format requirements-txt -o /tmp/requirements.txt \
    && uv pip install --system -r /tmp/requirements.txt \
    && rm -f /tmp/requirements.txt

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
