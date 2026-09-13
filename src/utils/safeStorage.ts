// Safe Storage Manager to avoid localStorage QuotaExceededError
// Automatically compresses photos, manages storage quotas, and cleans obsolete temporary items

export async function compressBase64Image(
  base64: string,
  maxWidth = 240,
  maxHeight = 240,
  quality = 0.60
): Promise<string> {
  return new Promise((resolve) => {
    if (!base64 || !base64.startsWith('data:image')) {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width || maxWidth;
      let height = img.height || maxHeight;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(base64);
    };

    img.src = base64;
  });
}

/**
 * Compacts a facial vector (reducing float precision to 2 decimals) to minimize JSON size
 */
export function compactVector(vector: number[]): number[] {
  if (!vector || !Array.isArray(vector)) return [];
  return vector.map(v => Math.round(v * 100) / 100);
}

/**
 * Safely saves data to localStorage, freeing space automatically if quota is exceeded
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`localStorage quota warning while saving "${key}":`, err);

    // Free up space by cleaning old access attempts with heavy photos
    try {
      cleanupStorageSpace();
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr: any) {
      console.error(`Falha crítica de quota ao salvar "${key}":`, retryErr);
      
      // Emergency: strip photos from all access attempts
      try {
        const attemptsRaw = localStorage.getItem('access_attempts');
        if (attemptsRaw) {
          const parsed = JSON.parse(attemptsRaw);
          if (Array.isArray(parsed)) {
            const stripped = parsed.slice(0, 5).map(att => ({ ...att, photoBase64: null }));
            localStorage.setItem('access_attempts', JSON.stringify(stripped));
          }
        }
        localStorage.setItem(key, value);
        return true;
      } catch (lastErr) {
        console.error('Incapaz de gravar mesmo após limpeza de emergência:', lastErr);
        return false;
      }
    }
  }
}

/**
 * Cleans obsolete/bulky logs from localStorage to keep available quota
 */
export function cleanupStorageSpace() {
  try {
    const attemptsRaw = localStorage.getItem('access_attempts');
    if (attemptsRaw) {
      const parsed = JSON.parse(attemptsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Keep only the latest 10 attempts and strip photo from older ones
        const optimized = parsed.slice(0, 10).map((item, index) => {
          if (index >= 3) {
            return { ...item, photoBase64: null };
          }
          return item;
        });
        localStorage.setItem('access_attempts', JSON.stringify(optimized));
      }
    }
  } catch (e) {
    console.warn('Erro ao limpar espaço de armazenamento:', e);
  }
}
