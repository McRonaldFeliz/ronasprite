import { PixelImage } from './image';
import { Rgba } from './color';
import { Sprite, addAnimation, createSprite, flattenFrame, getCel } from './sprite';

export interface ImportOptions {
  cellWidth: number;
  cellHeight: number;
  /** Nome de cada linha, na ordem. As que faltarem viram "Animação N". */
  names?: string[];
  palette?: Rgba[];
}

function copyCell(src: PixelImage, dst: PixelImage, sx: number, sy: number): boolean {
  let hasPixel = false;
  for (let y = 0; y < dst.height; y++)
    for (let x = 0; x < dst.width; x++) {
      const c = src.get(sx + x, sy + y);
      if (c >>> 24) hasPixel = true;
      dst.set(x, y, c);
    }
  return hasPixel;
}

/**
 * Corta uma imagem de spritesheet em quadros de cellWidth x cellHeight.
 * Cada linha da folha vira uma animação. Quadros vazios no fim de uma linha
 * e linhas totalmente vazias são descartados.
 */
export function importSpritesheet(sheet: PixelImage, opts: ImportOptions): Sprite {
  const { cellWidth: w, cellHeight: h } = opts;
  if (w <= 0 || h <= 0) throw new Error('O tamanho do quadro precisa ser maior que zero');
  const cols = Math.floor(sheet.width / w);
  const rows = Math.floor(sheet.height / h);
  if (!cols || !rows) throw new Error('O quadro é maior que a imagem');

  const sprite = createSprite(w, h, opts.palette);
  sprite.animations = [];
  sprite.frames = [];
  sprite.cels.clear();
  const layer = sprite.layers[0];

  for (let r = 0; r < rows; r++) {
    const cells: PixelImage[] = [];
    let lastFilled = -1;
    for (let c = 0; c < cols; c++) {
      const cell = new PixelImage(w, h);
      if (copyCell(sheet, cell, c * w, r * h)) lastFilled = c;
      cells.push(cell);
    }
    if (lastFilled < 0) continue;
    const anim = addAnimation(sprite, opts.names?.[sprite.animations.length], lastFilled + 1);
    anim.frameIds.forEach((fid, i) => getCel(sprite, layer.id, fid).data.set(cells[i].data));
  }
  if (!sprite.animations.length) addAnimation(sprite);
  return sprite;
}

/** Monta a spritesheet: uma linha por animação, um quadro por frame (camadas visíveis juntas). */
export function exportSpritesheet(sprite: Sprite): PixelImage {
  const cols = Math.max(1, ...sprite.animations.map((a) => a.frameIds.length));
  const out = new PixelImage(cols * sprite.width, sprite.animations.length * sprite.height);
  sprite.animations.forEach((anim, r) =>
    anim.frameIds.forEach((fid, c) => {
      const img = flattenFrame(sprite, fid);
      for (let y = 0; y < sprite.height; y++)
        for (let x = 0; x < sprite.width; x++) out.set(c * sprite.width + x, r * sprite.height + y, img.get(x, y));
    }),
  );
  return out;
}
