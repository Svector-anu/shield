/// <reference lib="webworker" />
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const worker: Worker = self as unknown as Worker;
let faceLandmarker: FaceLandmarker | null = null;

const setup = async () => {
  if (faceLandmarker) {
    return;
  }
  try {
    const vision = await FilesetResolver.forVisionTasks("/wasm");
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `/models/face_landmarker.task`,
        delegate: "CPU",
      },
      outputFaceEmbeddings: true,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
      numFaces: 1,
      runningMode: 'IMAGE',
    } as any);
    worker.postMessage({ type: 'MODELS_LOADED' });
  } catch (error) {
    console.error('Worker model loading error:', error);
    worker.postMessage({ type: 'ERROR', payload: `Failed to load AI models. Details: ${error.message}` });
  }
};

const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magA * magB);
};

worker.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'LOAD_MODELS') {
    await setup();
  } else if (type === 'COMPARE_FACES') {
    if (!faceLandmarker) await setup();
    if (!faceLandmarker) return;

    const { image1, image2 } = payload;
    try {
      const imageBitmap1 = await createImageBitmap(image1);
      const imageBitmap2 = await createImageBitmap(image2);

      const result1: any = faceLandmarker.detect(imageBitmap1);
      const result2: any = faceLandmarker.detect(imageBitmap2);

      if (result1.faceEmbeddings?.[0]?.embedding && result2.faceEmbeddings?.[0]?.embedding) {
        const descriptor1 = result1.faceEmbeddings[0].embedding;
        const descriptor2 = result2.faceEmbeddings[0].embedding;
        const similarity = cosineSimilarity(descriptor1, descriptor2);
        worker.postMessage({ type: 'COMPARISON_RESULT', payload: { success: similarity > 0.9 } });
      } else {
        worker.postMessage({ type: 'COMPARISON_RESULT', payload: { success: false, error: 'Could not detect a face in one or both images.' } });
      }
    } catch (error) {
      worker.postMessage({ type: 'ERROR', payload: 'An error occurred during face comparison.' });
    }
  }
});
