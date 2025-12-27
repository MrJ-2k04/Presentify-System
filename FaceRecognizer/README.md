# FaceRecognizer - AI Face Recognition Service

A Python-based FastAPI service that provides face detection and recognition capabilities using InsightFace for the AI Attendance System. This service processes student photos to generate embeddings and verifies attendance from classroom images.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [GPU vs CPU Setup](#-gpu-vs-cpu-setup)
- [Running the Service](#-running-the-service)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## ✨ Features

- **Face Detection**: High-accuracy face detection using InsightFace
- **Face Embedding Generation**: Create 512-dimensional face embeddings for recognition
- **Face Recognition**: Match detected faces against stored student embeddings
- **Batch Processing**: Handle multiple images in a single request
- **Annotated Images**: Generate images with bounding boxes and labels
- **GPU Acceleration**: CUDA support for faster processing (optional)
- **CPU Fallback**: Automatically falls back to CPU if GPU unavailable
- **AWS S3 Integration**: Upload processed images to S3
- **Local Storage**: Dry-run mode saves images locally for testing
- **Configurable Thresholds**: Adjust detection and recognition confidence levels

## 🛠️ Tech Stack

- **Framework**: FastAPI
- **Server**: Uvicorn
- **Face Recognition**: InsightFace with ArcFace model
- **Deep Learning**: ONNX Runtime (CPU and GPU)
- **Image Processing**: 
  - OpenCV (cv2) - headless version
  - Pillow (PIL)
  - NumPy
- **Cloud Storage**: boto3 (AWS S3)
- **Environment**: python-dotenv

## 📋 Prerequisites

- **Python**: Version 3.8 or higher (3.9 recommended)
- **pip**: Python package installer
- **AWS Account**: S3 bucket for image storage
- **CUDA Toolkit** (Optional): For GPU acceleration
  - CUDA 11.x or 12.x
  - Compatible NVIDIA GPU

## 🚀 Installation

### 1. Navigate to FaceRecognizer Directory

```bash
cd AttendanceSystemBackend/FaceRecognizer
```

### 2. Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

**Dependencies installed:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `insightface` - Face recognition library
- `numpy` - Numerical computing
- `pillow` - Image processing
- `python-multipart` - File upload support
- `boto3` - AWS SDK for Python
- `python-dotenv` - Environment variables
- `opencv-python-headless` - Computer vision (no GUI)
- `onnxruntime-gpu` - Deep learning inference with GPU

## 🔧 Environment Variables

Create a `.env` file in the `FaceRecognizer` directory:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your-s3-bucket-name
```

### Environment Variables Explained

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS IAM user access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS IAM user secret key | `secret...` |
| `AWS_REGION` | Yes | AWS region where S3 bucket is located | `ap-south-1` |
| `AWS_BUCKET_NAME` | Yes | S3 bucket name for image storage | `ai-attendance-bucket` |

> **Note**: These should match the Backend service's AWS configuration for consistency.

## 🎮 GPU vs CPU Setup

### GPU Setup (CUDA - Faster)

**1. Install NVIDIA CUDA Toolkit**

Download and install from [NVIDIA CUDA Downloads](https://developer.nvidia.com/cuda-downloads)

**Verify CUDA installation:**
```bash
nvidia-smi
```

**Expected output:**
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 525.x.xx    Driver Version: 525.x.xx    CUDA Version: 12.x     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
...
```

**2. GPU is Auto-Detected**

The service automatically uses GPU if available. Check `main.py`:

```python
# Line 25-29 in main.py
USE_GPU = True  # Automatically uses GPU if available
face_analyzer.prepare(ctx_id=0 if USE_GPU else -1, det_size=DETECT_SIZE)
```

**Performance:** 5-10x faster than CPU for face recognition

### CPU Setup (No GPU Required)

**For development/testing without GPU:**

The service automatically falls back to CPU if CUDA is not detected. No configuration needed!

**Manual CPU-only mode:**

Edit `main.py` line 25:
```python
USE_GPU = False  # Force CPU mode
```

**Performance:** Slower but functional for testing and low-volume usage

### GPU vs CPU Performance Comparison

| Operation | GPU (CUDA) | CPU |
|-----------|------------|-----|
| Face Detection (10 images) | ~0.5s | ~2-3s |
| Embedding Generation (100 students) | ~2s | ~10-15s |
| Attendance Verification (batch) | ~1-2s | ~5-8s |

## 🚀 Running the Service

### Start the Service

```bash
# Make sure virtual environment is activated
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Run with auto-reload (development)
uvicorn main:app --host 0.0.0.0 --port 10000 --reload

# Run in production mode
uvicorn main:app --host 0.0.0.0 --port 10000
```

The service will start on **http://localhost:10000**

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:10000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### First Run - Model Download

On first startup, InsightFace will download the ArcFace model (~100MB):

```
Downloading buffalo_l model...
Model cached in: ~/.insightface/models/buffalo_l
```

This is a one-time download.

## 🔌 API Endpoints

### 1. Health Check

```http
GET /
```

**Response:**
```json
{
  "message": "Welcome to Presentify Face Recognition API"
}
```

### 2. Generate Embeddings

Generate face embeddings from student images.

```http
POST /generate-embeddings
Content-Type: multipart/form-data
```

**Parameters:**
- `files`: Multiple image files

**Example using cURL:**
```bash
curl -X POST http://localhost:10000/generate-embeddings \
  -F "files=@student1.jpg" \
  -F "files=@student2.jpg"
```

**Response:**
```json
{
  "embeddings": [
    {
      "image": "student1.jpg",
      "embedding": [0.123, -0.456, 0.789, ...]  // 512 dimensions
    },
    {
      "image": "student2.jpg",
      "embedding": [0.234, -0.567, 0.890, ...]
    }
  ]
}
```

### 3. Verify Attendance

Process classroom images and identify students.

```http
POST /verify-attendance
Content-Type: multipart/form-data
```

**Parameters:**
- `images`: Classroom image files
- `studentEmbeddings`: JSON string of student embeddings
- `subjectId`: Subject ID
- `lectureId`: Lecture ID

**Example using Python:**
```python
import requests

files = [
    ('images', open('classroom1.jpg', 'rb')),
    ('images', open('classroom2.jpg', 'rb'))
]

data = {
    'studentEmbeddings': json.dumps(student_data),
    'subjectId': 'subject123',
    'lectureId': 'lecture456'
}

response = requests.post(
    'http://localhost:10000/verify-attendance',
    files=files,
    data=data
)
```

**Response:**
```json
{
  "results": [
    {
      "fileName": "classroom1.jpg",
      "fileSize": 245760,
      "matchedIds": ["24CI2110116", "24CI2110117", "Unknown"],
      "url": "https://bucket.s3.region.amazonaws.com/...",
      "key": "lectures/subject123/lecture456/annotated_images/classroom1.jpg"
    }
  ]
}
```

### 4. Dry Run (Testing)

Test face recognition locally without S3 upload.

```http
POST /verify-attendance/dry-run
Content-Type: multipart/form-data
```

**Parameters:**
- `student_images`: Student images (for building embeddings)
- `lecture_images`: Classroom images (for recognition)

**Example:**
```bash
curl -X POST http://localhost:10000/verify-attendance/dry-run \
  -F "student_images=@student1.jpg" \
  -F "student_images=@student2.jpg" \
  -F "lecture_images=@classroom1.jpg"
```

**Output:** Saves annotated images to `local_storage/dry_run/annotated_images/`

## 📁 Project Structure

```
FaceRecognizer/
├── main.py                      # FastAPI application and endpoints
├── requirements.txt             # Python dependencies
├── .env                         # Environment variables (not in git)
├── .gitignore                  # Git ignore rules
├── Dockerfile                   # Docker configuration
├── Dockerfile.dev              # Development Docker config
├── Pipfile                     # Pipenv configuration (optional)
│
├── utils/                      # Utility modules
│   ├── config.py                   # Environment variable loader
│   └── storage.py                  # S3 upload/download functions
│
├── local_storage/              # Local file storage for dry-run
│   └── dry_run/
│       └── annotated_images/
│
└── testing/                    # Test scripts and samples
```

## ⚙️ Configuration

### Face Recognition Parameters

Located in `main.py` (lines 22-26):

```python
# Detection confidence for creating student embeddings (stricter)
DETECTION_CONFIDENCE_DB = 0.75

# Detection confidence for verification (more lenient)
DETECTION_CONFIDENCE_VERIFY = 0.5

# Similarity threshold for recognition (higher = stricter matching)
RECOGNITION_THRESHOLD = 0.2

# Use GPU if available
USE_GPU = True

# Detection image size (higher = more accurate but slower)
DETECT_SIZE = (640, 640)
```

**Tuning Guidelines:**

| Parameter | Lower Value | Higher Value |
|-----------|-------------|--------------|
| `DETECTION_CONFIDENCE_DB` | More faces detected (may include false positives) | Only high-quality faces |
| `DETECTION_CONFIDENCE_VERIFY` | Detect more faces in classroom | Only clear faces |
| `RECOGNITION_THRESHOLD` | More matches (less strict) | Fewer matches (more strict) |
| `DETECT_SIZE` | Faster processing | Better accuracy |

### S3 Folder Structure

```
lectures/
  ├── {subjectId}/
      └── {lectureId}/
          ├── images/                    # Original classroom images
          │   └── {timestamp}.jpg
          └── annotated_images/          # Processed with face boxes
              └── {timestamp}.jpg

students/
  └── {rollNumber}/
      ├── 1.jpg
      ├── 2.jpg
      └── ...
```

## 🧪 Testing

### 1. Test Service Health

```bash
curl http://localhost:10000/
```

### 2. Test with Sample Images

Place test images in `testing/` folder and run:

```bash
curl -X POST http://localhost:10000/verify-attendance/dry-run \
  -F "student_images=@testing/student1.jpg" \
  -F "student_images=@testing/student2.jpg" \
  -F "lecture_images=@testing/classroom.jpg"
```

Check output in `local_storage/dry_run/annotated_images/`

### 3. Performance Testing

Monitor processing time in console output:

```
Time taken: 1.234 seconds
```

## 🐛 Troubleshooting

### CUDA/GPU Issues

**CUDA not found:**
```
Could not load dynamic library 'cudnn64_8.dll'
```

**Solutions:**
1. Install CUDA Toolkit from NVIDIA
2. Add CUDA to system PATH
3. Or switch to CPU mode: `USE_GPU = False` in `main.py`

**Verify GPU detection:**
```python
import onnxruntime as ort
print(ort.get_available_providers())
# Should include 'CUDAExecutionProvider'
```

### Module Import Errors

**InsightFace import fails:**
```bash
# Reinstall with dependencies
pip install insightface --no-cache-dir
```

**OpenCV import fails:**
```bash
pip install opencv-python-headless --force-reinstall
```

### Model Download Fails

**Long first startup:**
- InsightFace downloads models (~100MB) on first run
- Ensure stable internet connection
- Models cached in `~/.insightface/models/`

**Manual model download:**
```python
import insightface
app = insightface.app.FaceAnalysis()
app.prepare(ctx_id=-1)  # Downloads models
```

### Memory Issues

**Out of memory errors:**
- Reduce `DETECT_SIZE` in `main.py`
- Process fewer images per request
- Switch to CPU mode if GPU memory is limited

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :10000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :10000
kill -9 <PID>

# Or use different port
uvicorn main:app --port 10001
```

### S3 Upload Fails

**Check AWS credentials:**
```python
import boto3
s3 = boto3.client('s3')
s3.list_buckets()  # Should not error
```

**Common issues:**
- Invalid AWS credentials in `.env`
- S3 bucket doesn't exist
- IAM user lacks PutObject permission
- Incorrect region

### Low Recognition Accuracy

**Too many "Unknown" faces:**
- Lower `RECOGNITION_THRESHOLD` (try 0.15)
- Increase `DETECT_SIZE` to (800, 800)
- Ensure student photos are clear and well-lit
- Add more student training images

**Too many false positives:**
- Increase `RECOGNITION_THRESHOLD` (try 0.25)
- Increase `DETECTION_CONFIDENCE_VERIFY` (try 0.6)

## 📊 Performance Optimization

### For Production

1. **Use GPU**: Significantly faster (5-10x)
2. **Batch Processing**: Process multiple images together
3. **Optimize Image Size**: Balance between accuracy and speed
4. **Caching**: Model is cached after first load
5. **Load Balancing**: Run multiple instances for high traffic

### Resource Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 2GB (for models)

**Recommended:**
- CPU: 4+ cores (or GPU)
- RAM: 8GB
- GPU: 4GB+ VRAM (NVIDIA)
- Storage: 5GB

## 📄 License

**Copyright © 2025. All Rights Reserved.**

This software and its associated documentation are proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

For more details, see the main project [LICENSE](../README.md#-license).

---

**Service Version**: 1.0.0  
**Last Updated**: December 2025  
**Port**: 10000  
**Model**: InsightFace Buffalo_L (ArcFace)
