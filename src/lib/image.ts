const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 900;

export async function fileToOptimizedDataUrl(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('PNG・JPEG・WebP形式の画像を選んでください。');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('画像サイズは8MB以下にしてください。');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('画像を読み込めませんでした。'));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('画像を読み込めませんでした。'));
      }
    };
    reader.readAsDataURL(file);
  });

  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('画像を読み込めませんでした。'));
    image.onload = () => {
      const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
      if (largestSide <= MAX_DIMENSION) {
        resolve(dataUrl);
        return;
      }

      const scale = MAX_DIMENSION / largestSide;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('画像の縮小に失敗しました。'));
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    image.src = dataUrl;
  });
}
