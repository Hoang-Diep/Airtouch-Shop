// src/detector.js
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class HandDetector {
    constructor() {
        this.handLandmarker = null;
        this.video = document.getElementById("video");
        this.fingerIndices = [4, 8, 12, 16, 20]; // Ngón cái, trỏ, giữa, áp út, út
    }

    async init() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });

        await this.setupWebcam();
    }

    async setupWebcam() {
        const constraints = { video: { width: 1280, height: 720 } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        return new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play();
                resolve();
            };
        });
    }

    detect() {
        if (!this.handLandmarker || this.video.readyState < 2) return null;

        const result = this.handLandmarker.detectForVideo(this.video, performance.now());
        
        if (result.landmarks && result.landmarks.length > 0) {
            // Return the full 21-point landmark array for the first hand
            return result.landmarks[0];
        }
        return null;
    }
}