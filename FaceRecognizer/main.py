from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import json
import time
from utils.storage import upload_to_s3, delete_from_s3, save_to_local
import os
from utils.config import load_env
import insightface

app = FastAPI()
load_env()  # Load env vars from .env

# Load InsightFace model once at startup
face_analyzer = insightface.app.FaceAnalysis(
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
)
# Configuration constants (tune these as needed)
DETECTION_CONFIDENCE_DB = 0.75      # Minimum detection score when creating student embeddings
DETECTION_CONFIDENCE_VERIFY = 0.5   # Minimum detection score during verification
RECOGNITION_THRESHOLD = 0.2        # Cosine similarity threshold for recognition (higher -> stricter)
USE_GPU = True
DETECT_SIZE = (640, 640)

# Prepare model with configured device and detection size
face_analyzer.prepare(ctx_id=0 if USE_GPU else -1, det_size=DETECT_SIZE)


@app.get("/")
async def root():
    return {"message": "Welcome to Presentify Face Recognition API"}


@app.post("/generate-embeddings")
async def generate_embeddings(files: List[UploadFile] = File(...)):
    response = []

    for file in files:
        contents = await file.read()
        image = np.array(Image.open(io.BytesIO(contents)).convert("RGB"))
        faces = face_analyzer.get(image)

        if not faces:
            continue

        embedding = faces[0].normed_embedding.tolist()
        response.append({"image": file.filename, "embedding": embedding})

    return {"embeddings": response}


@app.post("/verify-attendance")
async def verify_attendance(
    images: List[UploadFile] = File(...),
    studentEmbeddings: str = Form(...),
    subjectId: str = Form(...),
    lectureId: str = Form(...),
):
    start = time.time()
    studentEmbeddings = json.loads(studentEmbeddings)

    embeddings_map = {}
    for student in studentEmbeddings:
        rollNumber = student["rollNumber"]
        if len(student["embeddings"]) > 0:
            embeddings_map[rollNumber] = {
                "images": [item["image"] for item in student["embeddings"]],
                "values": [
                    np.array(item["embedding"]) for item in student["embeddings"]
                ],
            }

    font = ImageFont.load_default()
    results = []

    for file in images:
        contents = await file.read()
        image_np = np.array(Image.open(io.BytesIO(contents)).convert("RGB"))
        faces = face_analyzer.get(image_np)

        pil_img = Image.fromarray(image_np)
        draw = ImageDraw.Draw(pil_img)
        matched_ids = []

        for face in faces:
            encoding = face.normed_embedding
            bbox = face.bbox.astype(int)
            top, right, bottom, left = bbox[1], bbox[2], bbox[3], bbox[0]

            best_match = None
            best_distance = float("inf")

            # Compare with stored student embeddings
            for rollNumber, data in embeddings_map.items():
                db_encodings = data["values"]
                distances = np.linalg.norm(db_encodings - encoding, axis=1)
                min_distance = np.min(distances)

                if (
                    min_distance < best_distance and min_distance < 0.8
                ):  # threshold tuned
                    best_match = rollNumber
                    best_distance = min_distance

            label = best_match if best_match else "Unknown"
            matched_ids.append(label)

            # 🟥 Red for Unknown, 🟩 Green for known
            box_color = (255, 0, 0) if label == "Unknown" else (0, 255, 0)
            draw.rectangle(((left, top), (right, bottom)), outline=box_color, width=3)

            text_bbox = draw.textbbox((0, 0), label, font=font)
            draw.rectangle(
                [(left, bottom), (left + text_bbox[2] + 6, bottom + text_bbox[3] + 6)],
                fill=box_color,
            )
            draw.text((left + 3, bottom + 3), label, fill=(0, 0, 0), font=font)

        # Save annotated image
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG")
        image_bytes = buf.getvalue()

        timestamped_name = f"{file.filename}"
        path = f"lectures/{subjectId}/{lectureId}/annotated_images"

        try:
            s3_url, s3_key = upload_to_s3(image_bytes, timestamped_name, path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

        try:
            results.append(
                {
                    "fileName": file.filename,
                    "fileSize": len(image_bytes),
                    "matchedIds": matched_ids,
                    "url": s3_url,
                    "key": s3_key,
                }
            )
        except Exception as e:
            delete_from_s3(s3_key)
            raise HTTPException(
                status_code=500, detail=f"Post-upload failure: {str(e)}"
            )

    print(f"Time taken: {time.time() - start}")
    return JSONResponse(content={"results": results})


@app.post("/verify-attendance/dry-run")
async def verify_attendance_dry(
    student_images: List[UploadFile] = File(...),
    lecture_images: List[UploadFile] = File(...),
):
    """Dry-run endpoint: accept only student images and lecture images.
    Builds embeddings from student images (labelled by filename stem) and
    annotates lecture images, saving results locally under `local_storage/dry_run`.
    """
    start = time.time()

    # Build embeddings map from student images using configured DB detection threshold
    embeddings_map = {}
    for sfile in student_images:
        contents = await sfile.read()
        try:
            img = np.array(Image.open(io.BytesIO(contents)).convert("RGB"))
        except Exception:
            continue

        faces = face_analyzer.get(img)
        if not faces:
            continue

        # Prefer faces with detection score above the DB threshold
        valid_faces = [f for f in faces if getattr(f, "det_score", None) is None or f.det_score > DETECTION_CONFIDENCE_DB]
        if not valid_faces:
            continue

        best_face = max(valid_faces, key=lambda x: getattr(x, "det_score", 0))
        embedding = best_face.normed_embedding
        label = os.path.splitext(sfile.filename)[0]

        if label not in embeddings_map:
            embeddings_map[label] = {"values": [np.array(embedding)]}
        else:
            embeddings_map[label]["values"].append(np.array(embedding))

    font = ImageFont.load_default()
    results = []

    for file in lecture_images:
        contents = await file.read()
        try:
            image_np = np.array(Image.open(io.BytesIO(contents)).convert("RGB"))
        except Exception:
            continue

        faces = face_analyzer.get(image_np)

        pil_img = Image.fromarray(image_np)
        draw = ImageDraw.Draw(pil_img)
        matched_ids = []

        # Filter faces by verification detection threshold
        valid_faces = [f for f in faces if getattr(f, "det_score", None) is None or f.det_score > DETECTION_CONFIDENCE_VERIFY]
        for face in valid_faces:
            encoding = face.normed_embedding
            bbox = face.bbox.astype(int)
            top, right, bottom, left = bbox[1], bbox[2], bbox[3], bbox[0]

            best_match = None
            best_similarity = float("-inf")

            # Compare using cosine similarity (assumes normed embeddings)
            for label, data in embeddings_map.items():
                db_encodings = np.array(data["values"])
                if db_encodings.size == 0:
                    continue

                # similarities: dot product between each db encoding and query encoding
                similarities = db_encodings.dot(encoding)
                max_sim = float(np.max(similarities))

                if max_sim > best_similarity:
                    best_similarity = max_sim
                    best_match = label

            # Decide match based on configured recognition threshold
            label = best_match if best_similarity is not None and best_similarity > RECOGNITION_THRESHOLD else "Unknown"
            matched_ids.append(label)

            box_color = (255, 0, 0) if label == "Unknown" else (0, 255, 0)
            draw.rectangle(((left, top), (right, bottom)), outline=box_color, width=3)

            text_bbox = draw.textbbox((0, 0), label, font=font)
            draw.rectangle(
                [(left, bottom), (left + text_bbox[2] + 6, bottom + text_bbox[3] + 6)],
                fill=box_color,
            )
            draw.text((left + 3, bottom + 3), label, fill=(0, 0, 0), font=font)

        # Save annotated image locally under dry_run
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG")
        image_bytes = buf.getvalue()

        timestamped_name = f"{file.filename}"
        path = f"dry_run/annotated_images"

        try:
            local_url, local_key = save_to_local(image_bytes, timestamped_name, path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Local save failed: {str(e)}")

        try:
            results.append(
                {
                    "fileName": file.filename,
                    "fileSize": len(image_bytes),
                    "matchedIds": matched_ids,
                    "localUrl": local_url,
                    "localKey": local_key,
                }
            )
        except Exception as e:
            # Attempt to remove the local file on post-save failure
            try:
                abs_path = local_url.replace("file://", "")
                if os.path.exists(abs_path):
                    os.remove(abs_path)
            except Exception:
                pass
            raise HTTPException(
                status_code=500, detail=f"Post-save failure: {str(e)}"
            )

    print(f"Dry run Time taken: {time.time() - start}")
    return JSONResponse(content={"results": results})
