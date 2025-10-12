/// <reference lib="webworker" />
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// This is a special variable in web workers that refers to the worker's global scope.
const worker: Worker = self as unknown as Worker;

let faceLandmarker: FaceLandmarker | null = null;

const setup = async () => {
  if (faceLandmarker) {
    return;
  }
  try {
    const vision = await FilesetResolver.forVisionTasks(
      // Path to the WASM files required by MediaPipe.
      // These are now served locally from our public directory.
      "/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        // This is a lightweight, yet accurate model for our purpose.
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "CPU",
      },
      outputFaceBlendshapes: false, // We don't need blendshapes (like smiling, frowning).
      outputFacialTransformationMatrixes: false, // We don't need the transformation matrix.
      outputFaceEmbeddings: true, // This is the key: we need the facial "fingerprint".
      numFaces: 1, // We only care about the single, most prominent face.
      runningMode: 'IMAGE', // Explicitly set the mode for single image processing.
      minFaceDetectionConfidence: 0.3, // Lower the confidence threshold to be less strict.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    worker.postMessage({ type: 'MODELS_LOADED' });
  } catch (error) {
    console.error('Worker model loading error:', error);
    worker.postMessage({ type: 'ERROR', payload: 'Could not load AI models in the background.' });
  }
};

// Listen for messages from the main application thread.
worker.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'LOAD_MODELS') {
    await setup();
  } else if (type === 'DETECT_FACE') {
    if (!faceLandmarker) {
      // This is a fallback in case the models weren't pre-loaded.
      await setup();
    }
    if (!faceLandmarker) {
      // If loading failed, we can't proceed.
      return;
    }

    const { imageBlob } = payload;
    try {
      const imageBitmap = await createImageBitmap(imageBlob);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = faceLandmarker.detect(imageBitmap);

      // MediaPipe returns embeddings as a Float32Array inside a nested structure.
      if (result.faceEmbeddings && result.faceEmbeddings.length > 0) {
        const descriptor = result.faceEmbeddings[0].embedding;
        worker.postMessage({ type: 'FACE_DETECTED', payload: descriptor });
      } else {
        worker.postMessage({ type: 'NO_FACE_DETECTED', payload: { result } });
      }
    } catch (error) {
      console.error('Worker face detection error:', error);
      worker.postMessage({ type: 'ERROR', payload: 'An error occurred during face processing.' });
    }
  }
});
