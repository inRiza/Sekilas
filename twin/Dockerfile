# Image GPU untuk worker Visual Twin. Base image resmi nerfstudio sudah berisi CUDA + COLMAP.
# TODO(M8b): pin tag base image ke versi spesifik setelah spike M8a.
FROM ghcr.io/nerfstudio-project/nerfstudio:latest
WORKDIR /app
COPY twin_worker ./twin_worker
COPY scripts ./scripts
COPY requirements-gpu.txt ./
RUN pip install --no-cache-dir arq pydantic opencv-python-headless -r requirements-gpu.txt
CMD ["arq", "twin_worker.main.WorkerSettings"]
