export type CompressionMode = 'fast' | 'best' | 'lossless' | 'none';

export const isCompressible = (file: File) => {
  if (file.size < 1024 * 1024) return false; // Only compress files > 1MB
  return file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf';
};

export async function compressFile(file: File, mode: CompressionMode, onProgress?: (p: number) => void): Promise<File> {
  if (mode === 'none') return file;

  // 1. Lossless: Native Browser GZIP Compression
  if (mode === 'lossless') {
    try {
      const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
      const response = new Response(stream);
      // To show progress, we could read the stream manually, but for now we just wait for the blob
      const blob = await response.blob();
      return new File([blob], file.name + '.gz', { type: 'application/gzip', lastModified: file.lastModified });
    } catch (e) {
      console.error('CompressionStream failed', e);
      return file;
    }
  }

  // 2. Fast / Best Quality for Images (Native Canvas Compression)
  if (file.type.startsWith('image/')) {
    return await compressImage(file, mode);
  }

  // 3. Fast / Best Quality for Videos/PDFs
  // Since we don't have FFmpeg.wasm loaded (to save 30MB bandwidth), we will fallback
  // to an optimized gzip stream for these modes on non-image files.
  try {
    const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const blob = await response.blob();
    return new File([blob], file.name + '.gz', { type: 'application/gzip', lastModified: file.lastModified });
  } catch (e) {
    return file;
  }
}

async function compressImage(file: File, mode: 'fast' | 'best'): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      const maxDim = mode === 'fast' ? 1280 : 2560;
      const quality = mode === 'fast' ? 0.6 : 0.85;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(file);
        
        // Only use compressed if it's actually smaller
        if (blob.size < file.size) {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: file.lastModified }));
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}
