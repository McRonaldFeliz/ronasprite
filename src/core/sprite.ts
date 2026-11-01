import { Rgba } from './color';
import { PixelImage } from './image';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
}

export interface Frame {
  id: string;
  durationMs: number;
}

/**
 * Um sprite tem camadas (eixo vertical da linha do tempo) e frames (eixo horizontal).
 * Cada cruzamento camada x frame é uma "célula" com a sua própria imagem.
 */
export interface Sprite {
  width: number;
  height: number;
  layers: Layer[];
  frames: Frame[];
  /** Chave: `${layerId}:${frameId}` */
  cels: Map<string, PixelImage>;
  palette: Rgba[];
}

let nextId = 1;
const newId = (prefix: string) => `${prefix}${nextId++}`;

export const celKey = (layerId: string, frameId: string) => `${layerId}:${frameId}`;

export function createSprite(width: number, height: number, palette: Rgba[] = []): Sprite {
  const sprite: Sprite = { width, height, layers: [], frames: [], cels: new Map(), palette: [...palette] };
  addFrame(sprite);
  addLayer(sprite, 'Camada 1');
  return sprite;
}

export function addLayer(sprite: Sprite, name = `Camada ${sprite.layers.length + 1}`): Layer {
  const layer: Layer = { id: newId('L'), name, visible: true, opacity: 1 };
  sprite.layers.push(layer);
  for (const f of sprite.frames) sprite.cels.set(celKey(layer.id, f.id), new PixelImage(sprite.width, sprite.height));
  return layer;
}

export function addFrame(sprite: Sprite, durationMs = 100, copyFrom?: Frame): Frame {
  const frame: Frame = { id: newId('F'), durationMs };
  sprite.frames.push(frame);
  for (const l of sprite.layers) {
    const src = copyFrom && sprite.cels.get(celKey(l.id, copyFrom.id));
    sprite.cels.set(celKey(l.id, frame.id), src ? src.clone() : new PixelImage(sprite.width, sprite.height));
  }
  return frame;
}

export function getCel(sprite: Sprite, layerId: string, frameId: string): PixelImage {
  const cel = sprite.cels.get(celKey(layerId, frameId));
  if (!cel) throw new Error(`Célula não encontrada: ${layerId}/${frameId}`);
  return cel;
}

/** Junta as camadas visíveis de um frame numa imagem só (alpha "over"). */
export function flattenFrame(sprite: Sprite, frameId: string): PixelImage {
  const out = new PixelImage(sprite.width, sprite.height);
  for (const layer of sprite.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    const src = getCel(sprite, layer.id, frameId).data;
    for (let i = 0; i < src.length; i++) {
      const s = src[i];
      const sa = ((s >>> 24) / 255) * layer.opacity;
      if (sa === 0) continue;
      const d = out.data[i];
      const da = (d >>> 24) / 255;
      const oa = sa + da * (1 - sa);
      const mix = (shift: number) =>
        Math.round((((s >>> shift) & 255) * sa + ((d >>> shift) & 255) * da * (1 - sa)) / oa);
      out.data[i] = ((Math.round(oa * 255) << 24) | (mix(16) << 16) | (mix(8) << 8) | mix(0)) >>> 0;
    }
  }
  return out;
}
