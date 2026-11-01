/**
 * Uma cor RGBA guardada num único número de 32 bits.
 * A ordem dos bytes (R no byte mais baixo) é a mesma do ImageData
 * lido por um Uint32Array em máquinas little-endian.
 */
export type Rgba = number;

export const TRANSPARENT: Rgba = 0;

export function rgba(r: number, g: number, b: number, a = 255): Rgba {
  return ((a & 255) << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255)) >>> 0;
}

export function channels(c: Rgba): [number, number, number, number] {
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, (c >>> 24) & 255];
}

/** Aceita "#rgb", "#rrggbb" ou "#rrggbbaa". */
export function fromHex(hex: string): Rgba {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  if (h.length === 6) h += 'ff';
  if (!/^[0-9a-fA-F]{8}$/.test(h)) throw new Error(`Cor inválida: ${hex}`);
  const n = parseInt(h, 16);
  return rgba((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
}

export function toHex(c: Rgba): string {
  const [r, g, b, a] = channels(c);
  const p = (v: number) => v.toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}${a === 255 ? '' : p(a)}`;
}

/**
 * Distância entre duas cores, de 0 (iguais) a 1 (máxima).
 * Usada pela tolerância da troca de cores e pela detecção de cores parecidas.
 */
export function distance(a: Rgba, b: Rgba): number {
  const [r1, g1, b1, a1] = channels(a);
  const [r2, g2, b2, a2] = channels(b);
  const d = (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2;
  return Math.sqrt(d) / 510; // 510 = sqrt(4 * 255^2)
}
