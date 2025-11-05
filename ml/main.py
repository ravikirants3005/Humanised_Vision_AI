# emotion_api_safe.py
import cv2
import torch
import time
import threading
import base64
import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image
import threading as th
import traceback
from fastapi.middleware.cors import CORSMiddleware

# ---------------- CONFIG ----------------
MODEL_NAME = "trpakov/vit-face-expression"
CAMERA_INDEX = 0
DETECTION_INTERVAL = 3.0
# If you want backend to start automatically set to True. Otherwise use /start_live to start it.
AUTO_START_BACKEND_CAMERA = False
# ----------------------------------------

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- MODEL INIT ----------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🧠 Loading model on device: {device}")
processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
model = AutoModelForImageClassification.from_pretrained(MODEL_NAME).to(device).eval()
print("✅ Model loaded successfully!")

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# thread-shared state
latest_data = {
    "emotion": None,
    "confidence": 0.0,
    "message": "No face detected",
    "frame": None,
    "timestamp": None,
}
_latest_lock = th.Lock()

# webcam control
_webcam_thread = None
_webcam_running = False
_cap = None   # will hold cv2.VideoCapture instance when running

# ---------------- EMOTION MESSAGES ----------------
EMOTION_MESSAGES = {
    "happy": "You look happy 😊",
    "sad": "Feeling down? 😔",
    "angry": "You seem upset 😡",
    "surprise": "Wow, surprised! 😮",
    "fear": "A bit scared? 😨",
    "disgust": "Hmm... disgusted 😒",
    "neutral": "All calm and neutral 😐",
}
# --------------------------------------------------

def detect_faces(gray_frame):
    return face_cascade.detectMultiScale(gray_frame, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))

def predict_emotion(face_pil):
    inputs = processor(face_pil, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        conf, pred = torch.max(probs, dim=-1)
    label = model.config.id2label[int(pred)]
    return label, float(conf)

def analyze_frame_array(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detect_faces(gray)
    if len(faces) == 0:
        return {"emotion": None, "confidence": 0, "message": "No face detected"}
    (x, y, w, h) = faces[0]
    face_roi = frame[y:y + h, x:x + w]
    face_pil = Image.fromarray(cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB))
    label, conf = predict_emotion(face_pil)
    return {"emotion": label, "confidence": conf, "message": EMOTION_MESSAGES.get(label.lower(), label)}

# ---------------- WEBCAM THREAD ----------------
def webcam_loop():
    global _webcam_running, _cap, latest_data
    try:
        _cap = cv2.VideoCapture(CAMERA_INDEX)
        if not _cap.isOpened():
            print("❌ webcam_loop: Cannot open webcam (index {}).".format(CAMERA_INDEX))
            _webcam_running = False
            return

        print("✅ Backend webcam loop started...")
        _webcam_running = True
        last_detection = 0.0

        while _webcam_running:
            ret, frame = _cap.read()
            if not ret:
                # if frame not grabbed, sleep briefly to avoid busy loop
                time.sleep(0.1)
                continue

            current_time = time.time()
            if current_time - last_detection >= DETECTION_INTERVAL:
                try:
                    result = analyze_frame_array(frame)
                except Exception as e:
                    print("Error during analyze_frame_array:", e)
                    traceback.print_exc()
                    result = {"emotion": None, "confidence": 0.0, "message": "analysis error"}

                with _latest_lock:
                    latest_data.update(result)
                    latest_data["timestamp"] = time.strftime("%H:%M:%S")

                last_detection = current_time

            # draw overlay on display frame copy
            display = frame.copy()
            with _latest_lock:
                emotion = latest_data.get("emotion")
                conf = latest_data.get("confidence")
                msg = latest_data.get("message", "")

            if emotion:
                cv2.putText(display, f"{emotion} ({conf*100:.1f}%)", (10, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                cv2.putText(display, msg, (10, 80),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            _, buffer = cv2.imencode(".jpg", display)
            frame_b64 = base64.b64encode(buffer).decode("utf-8")
            with _latest_lock:
                latest_data["frame"] = frame_b64

            # small sleep to yield
            time.sleep(0.02)

    finally:
        # ensure capture released
        if _cap is not None:
            try:
                _cap.release()
            except Exception:
                pass
            _cap = None
        _webcam_running = False
        print("🛑 Webcam loop stopped and capture released.")

# endpoints to control webcam thread
@app.post("/start_live")
def start_live():
    global _webcam_thread, _webcam_running
    if _webcam_running:
        return {"status": "already_running"}
    _webcam_thread = threading.Thread(target=webcam_loop, daemon=True)
    _webcam_thread.start()
    # wait briefly to check if started
    time.sleep(0.3)
    if _webcam_running:
        return {"status": "started"}
    else:
        return {"status": "failed_to_start"}

@app.post("/stop_live")
def stop_live():
    global _webcam_running, _webcam_thread
    if not _webcam_running:
        return {"status": "not_running"}
    _webcam_running = False
    # wait briefly for thread to exit
    time.sleep(0.3)
    return {"status": "stopping"}

# ---------------- BROWSER CAMERA MODE ----------------
@app.post("/analyze_frame")
async def analyze_frame(request: Request):
    try:
        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type:
            form = await request.form()
            file_item = list(form.values())[0]
            file_bytes = await file_item.read()
        else:
            file_bytes = await request.body()

        nparr = np.frombuffer(file_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Invalid image data"}

        result = analyze_frame_array(frame)
        print(f"📷 Browser upload detected: {result}")
        return result
    except Exception as e:
        print("❌ Error in /analyze_frame:", e)
        traceback.print_exc()
        return {"error": str(e)}

# ---------------- CAPTURE & ANALYZE (uses running capture if available) ----------------
@app.get("/capture_and_analyze")
def capture_and_analyze():
    global _cap, _webcam_running
    # If the backend webcam thread is running, reuse the latest frame by decoding latest_data["frame"]
    with _latest_lock:
        frame_b64 = latest_data.get("frame")
    if _webcam_running and frame_b64:
        try:
            frame_bytes = base64.b64decode(frame_b64)
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            result = analyze_frame_array(frame)
            print("📸 capture_and_analyze (from running thread):", result)
            return result
        except Exception as e:
            print("Error analyzing latest_data frame:", e)
            traceback.print_exc()

    # Otherwise, open temporary capture (short-lived), analyze one frame and release
    temp_cap = cv2.VideoCapture(CAMERA_INDEX)
    if not temp_cap.isOpened():
        return {"error": "Cannot open webcam (temporary capture)"}
    ret, frame = temp_cap.read()
    temp_cap.release()
    if not ret or frame is None:
        return {"error": "Failed to capture frame"}
    result = analyze_frame_array(frame)
    print("📸 capture_and_analyze (temporary capture):", result)
    return result

# ---------------- LIVE JSON + MJPEG FEED ----------------
@app.get("/webcam")
def get_emotion_data():
    if not USE_BACKEND_CAMERA:
        return JSONResponse(content=latest_data.copy())

@app.get("/video_feed")
def video_feed():
    """MJPEG stream of the latest webcam frames with emotion overlay."""

    def generate():
        while True:
            frame_b64 = None
            # Safely access the latest frame
            with _latest_lock:
                frame_b64 = latest_data.get("frame")

            if frame_b64:
                try:
                    frame_bytes = base64.b64decode(frame_b64)
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" +
                        frame_bytes +
                        b"\r\n"
                    )
                except Exception as e:
                    print(f"⚠️ Error streaming frame: {e}")
            else:
                # No frame yet — yield a blank frame every 1 second to keep connection alive
                time.sleep(1)

            time.sleep(0.05)  # smoother refresh rate (~20 FPS)

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/")
def root():
    return {
        "status": "ok",
        "webcam_running": bool(_webcam_running),
        "endpoints": [
            "/start_live (POST)",
            "/stop_live (POST)",
            "/analyze_frame (POST)",
            "/capture_and_analyze (GET)",
            "/webcam (GET)",
            "/video_feed (GET)",
        ],
    }

# auto-start backend camera if desired
if AUTO_START_BACKEND_CAMERA:
    threading.Thread(target=webcam_loop, daemon=True).start()
