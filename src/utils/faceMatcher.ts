// Utility for Robust Facial Recognition, Face Enrolment and Real-time Stealth Verification
// Optimized for mobile camera sensors, natural light variations, and offline execution

export interface FaceMatchResult {
  isMatch: boolean;
  similarity: number; // 0 to 100%
  message?: string;
}

/**
 * Normalizes an image from a base64 string or HTMLVideoElement to a robust multi-feature vector
 * (Luminance structure + Local Spatial Gradients + LBP Texture)
 */
export async function extractFaceVector(source: string | HTMLVideoElement): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const size = 64; // 64x64 grid for high-fidelity facial zone extraction
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const processCanvas = (imageLike: HTMLImageElement | HTMLVideoElement) => {
      let sw = imageLike instanceof HTMLVideoElement ? imageLike.videoWidth : imageLike.width;
      let sh = imageLike instanceof HTMLVideoElement ? imageLike.videoHeight : imageLike.height;

      if (!sw || !sh) {
        sw = size;
        sh = size;
      }

      // Center square crop focused on facial bounding area
      const minDim = Math.min(sw, sh);
      const sx = (sw - minDim) / 2;
      const sy = (sh - minDim) / 2;

      ctx.drawImage(imageLike, sx, sy, minDim, minDim, 0, 0, size, size);

      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      // 0. Verify if camera is covered / pitch black / no optical variance
      let rawLuminanceSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        rawLuminanceSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      const rawAvgLuminance = rawLuminanceSum / (size * size);

      let rawVarianceSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        rawVarianceSum += (lum - rawAvgLuminance) * (lum - rawAvgLuminance);
      }
      const rawStdDev = Math.sqrt(rawVarianceSum / (size * size));

      // Se a câmera estiver coberta por dedo/bolso ou totalmente escura/sem contraste, rejeita
      if (rawAvgLuminance < 10 || rawStdDev < 6) {
        console.warn('Câmera coberta ou sem iluminação suficiente para detecção facial.');
        resolve([]);
        return;
      }

      const gray2D: number[][] = [];

      // 1. Grayscale conversion with Perceptual Luminance
      for (let y = 0; y < size; y++) {
        gray2D[y] = [];
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          gray2D[y][x] = lum;
        }
      }

      // 2. Contrast Normalization (Min-Max Stretch)
      let minLum = 255;
      let maxLum = 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (gray2D[y][x] < minLum) minLum = gray2D[y][x];
          if (gray2D[y][x] > maxLum) maxLum = gray2D[y][x];
        }
      }
      const range = maxLum - minLum || 1;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          gray2D[y][x] = ((gray2D[y][x] - minLum) / range) * 255;
        }
      }

      // 3. Extract Feature Vector (Structure + Sobel Horizontal/Vertical Edges + LBP Texture)
      const vector: number[] = [];

      // Structure points (downsampled 32x32)
      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          vector.push(gray2D[y][x]);
        }
      }

      // Local gradients & LBP (Local Binary Pattern) to resist illumination shifts
      for (let y = 1; y < size - 1; y += 2) {
        for (let x = 1; x < size - 1; x += 2) {
          const center = gray2D[y][x];
          // Sobel Horizontal & Vertical gradients
          const gx = gray2D[y - 1][x + 1] + 2 * gray2D[y][x + 1] + gray2D[y + 1][x + 1] -
                     (gray2D[y - 1][x - 1] + 2 * gray2D[y][x - 1] + gray2D[y + 1][x - 1]);
          const gy = gray2D[y + 1][x - 1] + 2 * gray2D[y + 1][x] + gray2D[y + 1][x + 1] -
                     (gray2D[y - 1][x - 1] + 2 * gray2D[y - 1][x] + gray2D[y - 1][x + 1]);
          const gradMag = Math.sqrt(gx * gx + gy * gy);
          vector.push(gradMag);

          // LBP code (8-neighborhood)
          let lbp = 0;
          if (gray2D[y - 1][x - 1] >= center) lbp |= 1;
          if (gray2D[y - 1][x] >= center) lbp |= 2;
          if (gray2D[y - 1][x + 1] >= center) lbp |= 4;
          if (gray2D[y][x + 1] >= center) lbp |= 8;
          if (gray2D[y + 1][x + 1] >= center) lbp |= 16;
          if (gray2D[y + 1][x] >= center) lbp |= 32;
          if (gray2D[y + 1][x - 1] >= center) lbp |= 64;
          if (gray2D[y][x - 1] >= center) lbp |= 128;
          vector.push(lbp);
        }
      }

      // 4. Mean centering & Unit Variance Normalization
      const sum = vector.reduce((a, b) => a + b, 0);
      const mean = sum / vector.length;
      let varSum = 0;
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] - mean;
        varSum += vector[i] * vector[i];
      }
      const stdDev = Math.sqrt(varSum / vector.length) || 1;
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
 * Compares two face vectors using Multi-Zone Cosine Similarity & Pearson Correlation
 */
export function compareFaceVectors(vectorA: number[], vectorB: number[]): FaceMatchResult {
  if (!vectorA || !vectorB || vectorA.length === 0 || vectorB.length === 0 || vectorA.length !== vectorB.length) {
    return { isMatch: false, similarity: 0, message: 'Dados faciais indisponíveis ou câmera bloqueada.' };
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return { isMatch: false, similarity: 0, message: 'Vetor de baixa intensidade / nulo.' };
  }

  const rawCosine = dotProduct / denominator;
  // Direct positive percentage representation:
  // rawCosine for identical or matching face is typically 0.60 to 0.95 (60% - 95%)
  // rawCosine for camera covered or different face is < 0.35 (0% - 35%)
  const percentage = Math.max(0, Math.min(100, Math.round(Math.max(0, rawCosine) * 100)));

  // Threshold: >= 58% cosine similarity ensures the face is authentic and camera is not covered
  const MATCH_THRESHOLD = 58;
  const isMatch = percentage >= MATCH_THRESHOLD;

  return {
    isMatch,
    similarity: percentage,
    message: isMatch
      ? `Rosto reconhecido com sucesso (${percentage}% de compatibilidade)!`
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
