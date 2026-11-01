import { Rgba, distance } from './color';
import { PixelImage } from './image';
import { Sprite, getCel } from './sprite';

/** Onde uma operação de cor vale. */
export interface ColorScope {
  /** Camadas incluídas. Vazio ou ausente = todas. */
  layerIds?: string[];
  /** Frames incluídos. Vazio ou ausente = todos. */
  frameIds?: string[];
  /** Se informada, só pixels dentro da seleção (mesmo tamanho do sprite, valor != 0 = selecionado). */
  selection?: Uint8Array;
}

function* scopedCels(sprite: Sprite, scope: ColorScope): Generator<PixelImage> {
  const layers = scope.layerIds?.length ? sprite.layers.filter((l) => scope.layerIds!.includes(l.id)) : sprite.layers;
  const frames = scope.frameIds?.length ? sprite.frames.filter((f) => scope.frameIds!.includes(f.id)) : sprite.frames;
  for (const l of layers) for (const f of frames) yield getCel(sprite, l.id, f.id);
}

export interface ColorSwap {
  from: Rgba;
  to: Rgba;
}

/**
 * Troca cores no sprite. Aceita várias trocas de uma vez (ex.: uma rampa de pretos
 * por uma rampa de vermelhos). As trocas são aplicadas em uma única passada,
 * então trocar A->B e B->A ao mesmo tempo funciona.
 *
 * `tolerance` vai de 0 (só a cor exata) a 1. Um pixel é trocado pela regra cuja
 * cor de origem estiver mais perto dele, desde que dentro da tolerância.
 *
 * Retorna quantos pixels foram alterados.
 */
export function replaceColors(sprite: Sprite, swaps: ColorSwap[], scope: ColorScope = {}, tolerance = 0): number {
  let changed = 0;
  const exact = new Map(swaps.map((s) => [s.from, s.to]));
  for (const cel of scopedCels(sprite, scope)) {
    const d = cel.data;
    for (let i = 0; i < d.length; i++) {
      if (scope.selection && !scope.selection[i]) continue;
      const px = d[i];
      let to = exact.get(px);
      if (to === undefined && tolerance > 0) {
        let best = Infinity;
        for (const s of swaps) {
          const dist = distance(px, s.from);
          if (dist <= tolerance && dist < best) {
            best = dist;
            to = s.to;
          }
        }
      }
      if (to !== undefined && to !== px) {
        d[i] = to;
        changed++;
      }
    }
  }
  return changed;
}

/** Retorna a máscara (1 = pixel tem a cor) de uma cor dentro do escopo, para destacar no canvas. */
export function maskOfColor(image: PixelImage, color: Rgba, tolerance = 0): Uint8Array {
  const mask = new Uint8Array(image.data.length);
  for (let i = 0; i < image.data.length; i++) {
    const px = image.data[i];
    if (px === color || (tolerance > 0 && distance(px, color) <= tolerance)) mask[i] = 1;
  }
  return mask;
}

export interface UsedColor {
  color: Rgba;
  count: number;
}

/**
 * Paleta automática: todas as cores realmente presentes no escopo,
 * da mais usada para a menos usada. Pixels totalmente transparentes são ignorados.
 */
export function usedColors(sprite: Sprite, scope: ColorScope = {}): UsedColor[] {
  const counts = new Map<Rgba, number>();
  for (const cel of scopedCels(sprite, scope)) {
    for (let i = 0; i < cel.data.length; i++) {
      if (scope.selection && !scope.selection[i]) continue;
      const px = cel.data[i];
      if (px >>> 24 === 0) continue;
      counts.set(px, (counts.get(px) ?? 0) + 1);
    }
  }
  return [...counts].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count || a.color - b.color);
}

/** Pares de cores usadas que são quase iguais, candidatas a serem juntadas. */
export function similarColorPairs(colors: UsedColor[], threshold = 0.03): [UsedColor, UsedColor][] {
  const pairs: [UsedColor, UsedColor][] = [];
  for (let i = 0; i < colors.length; i++)
    for (let j = i + 1; j < colors.length; j++)
      if (distance(colors[i].color, colors[j].color) <= threshold) pairs.push([colors[i], colors[j]]);
  return pairs;
}
