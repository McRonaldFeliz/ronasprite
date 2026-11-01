import { PixelImage } from '../core';

/** Desenha uma PixelImage num canvas, sem suavização (pixel art). */
export function paint(canvas: HTMLCanvasElement, img: PixelImage, highlight?: Uint8Array): void {
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  const data = new ImageData(new Uint8ClampedArray(img.data.buffer.slice(0)), img.width, img.height);
  if (highlight) {
    const u32 = new Uint32Array(data.data.buffer);
    for (let i = 0; i < u32.length; i++) if (highlight[i]) u32[i] = 0xffff00ff; // magenta
  }
  ctx.putImageData(data, 0, 0);
}

export function downloadPng(img: PixelImage, name: string): void {
  const c = document.createElement('canvas');
  paint(c, img);
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

/** Lê um arquivo de imagem (PNG etc.) e devolve os pixels. */
export async function readImageFile(file: File): Promise<PixelImage> {
  const bmp = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  const data = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  return new PixelImage(bmp.width, bmp.height, new Uint32Array(data.buffer.slice(0)));
}
