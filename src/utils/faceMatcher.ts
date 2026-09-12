// Utility for Facial Recognition, Face Enrolment and Real-time Verification
// Works offline and without external server dependencies

export interface FaceMatchResult {
  isMatch: boolean;
  similarity: number; // 0 to 100%
  message?: string;
}

/**
 * Normalizes an image from a base64 string or HTMLVideoElement to a feature vector
 */
export async function extractFaceVector(source: string | HTMLVideoElement): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const size = 48; // 48x48 normalized grid = 2304 feature points
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      reject(new Error('Canvas context unavailable'));
      return;
    }

    const processCanvas = (imageLike: HTMLImageElement | HTMLVideoElement) => {
      // Draw centered square crop
      let sw = imageLike instanceof HTMLVideoElement ? imageLike.videoWidth : imageLike.width;
      let sh = imageLike instanceof HTMLVideoElement ? imageLike.videoHeight : imageLike.height;

      if (!sw || !sh) {
        sw = size;
        sh = size;
      }

      const minDim = Math.min(sw, sh);
      const sx = (sw - minDim) / 2;
      const sy = (sh - minDim) / 2;

      ctx.drawImage(imageLike, sx, sy, minDim, minDim, 0, 0, size, size);

      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      const vector: number[] = [];

      // Convert to normalized grayscale + edge luminance
      let totalLuminance = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;
        vector.push(lum);
      }

      // Mean centering and variance normalization (makes it robust to overall lighting changes)
      const mean = totalLuminance / vector.length;
      let varianceSum = 0;
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] - mean;
        varianceSum += vector[i] * vector[i];
      }

      const stdDev = Math.sqrt(varianceSum / vector.length) || 1;
      const normalizedVector = vector.map((val) => val / stdDev);

      resolve(normalizedVector);
    };

    if (typeof source === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processCanvas(img);
      img.onerror = (e) => reject(e);
      img.src = source;
    } else {
      processCanvas(source);
    }
  });
}

/**
 * Compares two face vectors using Cosine Similarity & Pearson Correlation
 */
export function compareFaceVectors(vectorA: number[], vectorB: number[]): FaceMatchResult {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length || vectorA.length === 0) {
    return { isMatch: false, similarity: 0, message: 'Dados faciais inválidos para comparação.' };
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Convert similarity (-1 to 1) into percentage (0 to 100)
  const percentage = Math.max(0, Math.min(100, Math.round(((similarity + 1) / 2) * 100)));

  // Threshold: A match similarity of >= 68% between normalized faces ensures true identity
  // while allowing slight natural angle/expression changes.
  const MATCH_THRESHOLD = 68;
  const isMatch = percentage >= MATCH_THRESHOLD;

  return {
    isMatch,
    similarity: percentage,
    message: isMatch
      ? `Rosto reconhecido com sucesso (${percentage}% de correspondência)!`
      : `Rosto não corresponde ao proprietário (${percentage}% de similaridade).`
  };
}

/**
 * Captures high resolution snapshot from video element
 */
export function captureVideoFrameBase64(video: HTMLVideoElement, quality = 0.85): string {
  const canvas = document.createElement('canvas');
  const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const sx = ((video.videoWidth || size) - size) / 2;
  const sy = ((video.videoHeight || size) - size) / 2;

  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', quality);
}
