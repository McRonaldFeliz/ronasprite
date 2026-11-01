import { Rgba } from './color';
import { PixelImage } from './image';

/** Linha de pixels (Bresenham), usada pelo lápis para não deixar buracos ao mover rápido. */
export function drawLine(img: PixelImage, x0: number, y0: number, x1: number, y1: number, c: Rgba): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    img.set(x0, y0, c);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Balde de tinta: preenche a área contígua (4 vizinhos) com a mesma cor. */
export function floodFill(img: PixelImage, x: number, y: number, c: Rgba): void {
  if (!img.inBounds(x, y)) return;
  const target = img.get(x, y);
  if (target === c) return;
  const stack = [y * img.width + x];
  while (stack.length) {
    const i = stack.pop()!;
    if (img.data[i] !== target) continue;
    img.data[i] = c;
    const px = i % img.width;
    if (px > 0) stack.push(i - 1);
    if (px < img.width - 1) stack.push(i + 1);
    if (i >= img.width) stack.push(i - img.width);
    if (i < img.data.length - img.width) stack.push(i + img.width);
  }
}
