import os
import json
import cv2
import numpy as np
from insightface.app import FaceAnalysis
import time

# Paths
DATASET_DIR = "data/student_images" # other: "temp_student_images"
TEST_DIR = "data/lecture_images" # other: "temp_lecture_images"
OUTPUT_DIR = "data/annotated_images"
DB_PATH = "data/db_buffalo_s.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize InsightFace
app = FaceAnalysis(name="buffalo_s", providers=[
    'CUDAExecutionProvider',
    'CPUExecutionProvider'
])
app.prepare(ctx_id=0, det_size=(640, 640))

# ------------------------
# Step 1: Generate / Load embeddings for dataset
# ------------------------
# Load existing DB if available
if os.path.exists(DB_PATH):
    with open(DB_PATH, "r") as f:
        db = json.load(f)
    print(f"[INFO] Loaded {len(db)} embeddings from {DB_PATH}")
else:
    db = {}
    print("[INFO] No existing DB found. Creating new one.")

# Process dataset images
for file in os.listdir(DATASET_DIR):
    student_id = os.path.splitext(file)[0]   # filename without extension

    # Skip if already in DB
    if student_id in db:
        # print(f"[SKIP] {student_id} already in DB")
        continue

    path = os.path.join(DATASET_DIR, file)
    img = cv2.imread(path)
    if img is None:
        continue

    faces = app.get(img)
    if not faces:
        print(f"[WARN] No face detected in {file}")
        continue

    # Take first face
    emb = faces[0].embedding.tolist()
    db[student_id] = emb
    print(f"[INFO] Added embedding for {student_id}")

# Save (updated) database
with open(DB_PATH, "w") as f:
    json.dump(db, f, indent=2)

print(f"\n✅ Database updated and stored in {DB_PATH}")


# ------------------------
# Step 2: Compare with test_data
# ------------------------
start_time = time.time()
with open(DB_PATH, "r") as f:
    db = json.load(f)

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

results = {}
THRESHOLD = 0.35

for file in sorted(os.listdir(TEST_DIR)):
    file_start_time = time.time()
    path = os.path.join(TEST_DIR, file)
    img = cv2.imread(path)
    if img is None:
        continue

    faces = app.get(img)
    present = []

    for face in faces:
        emb = face.embedding.tolist()

        # Compare with db
        best_match, best_score = None, -1
        for student_id, db_emb in db.items():
            score = cosine_similarity(emb, db_emb)
            if score > best_score:
                best_match, best_score = student_id, score

        bbox = face.bbox.astype(int)

        if best_score > THRESHOLD:
            present.append(best_match)
            # Annotate as known (green)
            cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
            cv2.putText(img, f"{best_match} ({best_score:.2f})",
                        (bbox[0], bbox[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        else:
            present.append("Unknown")
            # Annotate as unknown (red)
            cv2.rectangle(img, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 0, 255), 2)
            cv2.putText(img, "Unknown",
                        (bbox[0], bbox[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    results[file] = present

    # Save annotated image
    out_path = os.path.join(OUTPUT_DIR, file)
    cv2.imwrite(out_path, img)
    file_end_time = time.time()
    print(f"Processed {file} in {file_end_time - file_start_time:.2f} seconds")

end_time = time.time()
print(f"Step 2 took {end_time - start_time:.2f} seconds to run.")

# ------------------------
# Step 3: Save results
# ------------------------
output_json = os.path.join(OUTPUT_DIR, "attendance.json")
with open(output_json, "w") as f:
    json.dump(results, f, indent=2)

print(f"\n✅ Results saved to {output_json}")
print(f"✅ Annotated images saved in {OUTPUT_DIR}/")
