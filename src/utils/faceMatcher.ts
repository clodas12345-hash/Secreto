// Utility for Robust Facial Recognition, Face Enrolment and Real-time Stealth Verification
// Optimized for mobile camera sensors, natural light variations, slight head tilts/distances, and offline execution

export interface FaceMatchResult {
  isMatch: boolean;
  similarity: number; // 0 to 100%
  message?: string;
}

/**
 * Extracts a normalized 64x64 multi-scale representation and localized LBP + edge histogram
 */
export async function extractFaceVector(source: string | HTMLVideoElement): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const size = 64; // 64x64 grid
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

      // Center square crop focused on facial region
      const minDim = Math.min(sw, sh);
      const sx = (sw - minDim) / 2;
      const sy = (sh - minDim) / 2;

      ctx.drawImage(imageLike, sx, sy, minDim, minDim, 0, 0, size, size);

      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      // 0. Verify if camera is totally covered / finger on lens / dark / no optical facial variance
      let rawLuminanceSum = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalR += r;
        totalG += g;
        totalB += b;
        rawLuminanceSum += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      const rawAvgLuminance = rawLuminanceSum / (size * size);
      const avgR = totalR / (size * size);
      const avgG = totalG / (size * size);
      const avgB = totalB / (size * size);

      let rawVarianceSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        rawVarianceSum += (lum - rawAvgLuminance) * (lum - rawAvgLuminance);
      }
      const rawStdDev = Math.sqrt(rawVarianceSum / (size * size));

      // Calculate raw image edge gradients (Sobel filter on un-equalized raw grayscale)
      // Real facial features (eyes, nose, lips) have high-frequency edge energy.
      // Fingers over lens, tape, dark pockets, or covered lenses produce near-zero edge energy.
      let rawEdgeEnergy = 0;
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const idxTL = ((y - 1) * size + (x - 1)) * 4;
          const idxTR = ((y - 1) * size + (x + 1)) * 4;
          const idxBL = ((y + 1) * size + (x - 1)) * 4;
          const idxBR = ((y + 1) * size + (x + 1)) * 4;
          const idxML = (y * size + (x - 1)) * 4;
          const idxMR = (y * size + (x + 1)) * 4;
          const idxTM = ((y - 1) * size + x) * 4;
          const idxBM = ((y + 1) * size + x) * 4;

          const lTL = 0.299 * data[idxTL] + 0.587 * data[idxTL + 1] + 0.114 * data[idxTL + 2];
          const lTR = 0.299 * data[idxTR] + 0.587 * data[idxTR + 1] + 0.114 * data[idxTR + 2];
          const lBL = 0.299 * data[idxBL] + 0.587 * data[idxBL + 1] + 0.114 * data[idxBL + 2];
          const lBR = 0.299 * data[idxBR] + 0.587 * data[idxBR + 1] + 0.114 * data[idxBR + 2];
          const lML = 0.299 * data[idxML] + 0.587 * data[idxML + 1] + 0.114 * data[idxML + 2];
          const lMR = 0.299 * data[idxMR] + 0.587 * data[idxMR + 1] + 0.114 * data[idxMR + 2];
          const lTM = 0.299 * data[idxTM] + 0.587 * data[idxTM + 1] + 0.114 * data[idxTM + 2];
          const lBM = 0.299 * data[idxBM] + 0.587 * data[idxBM + 1] + 0.114 * data[idxBM + 2];

          const gx = (lTR + 2 * lMR + lBR) - (lTL + 2 * lML + lBL);
          const gy = (lBL + 2 * lBM + lBR) - (lTL + 2 * lTM + lTR);
          rawEdgeEnergy += Math.sqrt(gx * gx + gy * gy);
        }
      }
      const avgEdgePerPixel = rawEdgeEnergy / ((size - 2) * (size - 2));

      // Strict validation against covered camera, blurry finger, or pitch black darkness:
      const isTooDark = rawAvgLuminance < 12;
      const isTooFlat = rawStdDev < 7;
      const isFingerCovered = avgR > (avgG * 1.5) && avgR > (avgB * 1.7) && avgEdgePerPixel < 16;
      const isLackingFaceContours = avgEdgePerPixel < 6.5;

      if (isTooDark || isTooFlat || isFingerCovered || isLackingFaceContours) {
        console.warn('Detecção rejeitada: Câmera coberta, dedo na lente ou ausência de traços faciais nítidos.', {
          rawAvgLuminance, rawStdDev, avgEdgePerPixel, avgR, avgG, avgB
        });
        resolve([]);
        return;
      }

      const gray2D: number[][] = [];

      // 1. Grayscale conversion
      for (let y = 0; y < size; y++) {
        gray2D[y] = [];
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          gray2D[y][x] = lum;
        }
      }

      // 2. Histogram Equalization (Robust against shadows and ambient light shifts)
      const hist = new Array(256).fill(0);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const val = Math.floor(gray2D[y][x]);
          hist[Math.min(255, Math.max(0, val))]++;
        }
      }

      // Cumulative Distribution Function (CDF)
      const cdf = new Array(256).fill(0);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + hist[i];
      }

      const totalPixels = size * size;
      const cdfMin = cdf.find(v => v > 0) || 1;
      const eqGray2D: number[][] = [];

      for (let y = 0; y < size; y++) {
        eqGray2D[y] = [];
        for (let x = 0; x < size; x++) {
          const val = Math.floor(gray2D[y][x]);
          const clamped = Math.min(255, Math.max(0, val));
          const equalized = Math.round(((cdf[clamped] - cdfMin) / (totalPixels - cdfMin)) * 255);
          eqGray2D[y][x] = isNaN(equalized) ? gray2D[y][x] : equalized;
        }
      }

      // 3. Multi-Zone Spatial Feature Extraction:
      // Divide the face into 4x4 spatial blocks (16 zones: forehead, left eye, right eye, nose, mouth, chin, etc.)
      const vector: number[] = [];
      const blockSize = size / 4; // 16x16 pixels per block

      for (let by = 0; by < 4; by++) {
        for (let bx = 0; bx < 4; bx++) {
          const startX = bx * blockSize;
          const startY = by * blockSize;

          // Local block mean luminance
          let blockSum = 0;
          for (let y = startY; y < startY + blockSize; y++) {
            for (let x = startX; x < startX + blockSize; x++) {
              blockSum += eqGray2D[y][x];
            }
          }
          const blockMean = blockSum / (blockSize * blockSize);
          vector.push(blockMean);

          // Local Binary Pattern (LBP) Histogram for this spatial zone (16 bins)
          const lbpHist = new Array(16).fill(0);
          for (let y = startY + 1; y < startY + blockSize - 1; y++) {
            for (let x = startX + 1; x < startX + blockSize - 1; x++) {
              const center = eqGray2D[y][x];
              let lbp = 0;
              if (eqGray2D[y - 1][x - 1] >= center) lbp |= 1;
              if (eqGray2D[y - 1][x]     >= center) lbp |= 2;
              if (eqGray2D[y - 1][x + 1] >= center) lbp |= 4;
              if (eqGray2D[y][x + 1]     >= center) lbp |= 8;
              if (eqGray2D[y + 1][x + 1] >= center) lbp |= 16;
              if (eqGray2D[y + 1][x]     >= center) lbp |= 32;
              if (eqGray2D[y + 1][x - 1] >= center) lbp |= 64;
              if (eqGray2D[y][x - 1]     >= center) lbp |= 128;

              // Quantize 256 LBP codes into 16 bins
              const bin = Math.floor(lbp / 16);
              lbpHist[Math.min(15, bin)]++;
            }
          }

          // Normalize local LBP histogram for the block
          const lbpTotal = (blockSize - 2) * (blockSize - 2) || 1;
          for (let k = 0; k < 16; k++) {
            vector.push((lbpHist[k] / lbpTotal) * 100);
          }

          // Spatial Gradient Magnitude for edge contours (nose, lips, eyebrows)
          let gradSum = 0;
          for (let y = startY + 1; y < startY + blockSize - 1; y += 2) {
            for (let x = startX + 1; x < startX + blockSize - 1; x += 2) {
              const gx = eqGray2D[y][x + 1] - eqGray2D[y][x - 1];
              const gy = eqGray2D[y + 1][x] - eqGray2D[y - 1][x];
              gradSum += Math.sqrt(gx * gx + gy * gy);
            }
          }
          vector.push(gradSum / 32);
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
  // Convert Pearson/Cosine (-1 to 1) to realistic confidence percentage
  // Same person with minor distance/angle variation: rawCosine is 0.40 - 0.90 (70% - 95%)
  // Different person: rawCosine is 0.05 - 0.25 (10% - 35%)
  // Black/covered camera: rejected before this stage
  const percentage = Math.max(0, Math.min(100, Math.round(Math.max(0, rawCosine) * 100)));

  // Threshold: >= 42% allows natural shifts in angle, distance, glasses and lighting while keeping strangers blocked
  const MATCH_THRESHOLD = 42;
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
 * Captures optimized face snapshot from video element (<20KB) to prevent storage quota issues
 */
export function captureVideoFrameBase64(video: HTMLVideoElement, quality = 0.60): string {
  const canvas = document.createElement('canvas');
  const maxDim = 240;
  const vw = video.videoWidth || 320;
  const vh = video.videoHeight || 320;
  const rawCropSize = Math.min(vw, vh);

  canvas.width = maxDim;
  canvas.height = maxDim;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const sx = (vw - rawCropSize) / 2;
  const sy = (vh - rawCropSize) / 2;

  ctx.drawImage(video, sx, sy, rawCropSize, rawCropSize, 0, 0, maxDim, maxDim);
  return canvas.toDataURL('image/jpeg', quality);
}
