from modal import App, Image, Secret, asgi_app

# ------------------------------------------------------
# Modal App
# ------------------------------------------------------
app = App("insightface-fastapi")

image = (
    Image.from_registry("nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04")
    .apt_install("python3", "python3-pip", "git", "ffmpeg", "libgl1", "libglib2.0-0")
    .run_commands("ln -s /usr/bin/python3 /usr/bin/python")
    .run_commands("pip3 install --upgrade pip")
    .pip_install(
        "fastapi",
        "numpy",
        "Pillow",
        "python-multipart",
        "boto3",
        "python-dotenv",
        "insightface",
        "opencv-python-headless",
        "onnxruntime-gpu",
    )
)
image = image.add_local_file("main.py", "/root/").add_local_dir("utils", "/root/utils")

# ------------------------------------------------------
# Build FastAPI app entirely inside modal.asgi_app scope
# ------------------------------------------------------
@app.function(
    gpu="A10G",
    image=image,
    secrets=[Secret.from_dotenv()],
    timeout=600,
)
@asgi_app()
def fastapi_app():
    from main import app
    return app
