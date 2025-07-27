原始包含的包：
```shell
uv add fastapi uvicorn python-multipart python-prctl pydantic-settings numpy opencv-python scikit-learn scikit-image pandas tqdm
```

可能需要apt安装的东西
```shell
sudo apt-get install -y libcap-dev
```

新环境安装这些包
```shell
uv sync
```