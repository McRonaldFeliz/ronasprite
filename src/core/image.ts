import { Rgba, TRANSPARENT } from './color';

/** Uma grade de pixels RGBA. */
export class PixelImage {
  readonly data: Uint32Array;

  constructor(readonly width: number, readonly height: number, data?: Uint32Array) {
    this.data = data ?? new Uint32Array(width * height);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Rgba {
    return this.inBounds(x, y) ? this.data[y * this.width + x] : TRANSPARENT;
  }

  set(x: number, y: number, c: Rgba): void {
    if (this.inBounds(x, y)) this.data[y * this.width + x] = c;
  }

  clone(): PixelImage {
    return new PixelImage(this.width, this.height, this.data.slice());
  }
}
