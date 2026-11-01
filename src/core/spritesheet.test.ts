import { describe, expect, it } from 'vitest';
import { PixelImage, addAnimation, addFrame, createSprite, exportSpritesheet, fromHex, getCel, importSpritesheet, animationOf } from './index';

const RED = fromHex('#ff0000');
const BLUE = fromHex('#0000ff');

describe('animações em linhas', () => {
  it('sprite novo tem uma animação com um frame; frames novos entram na linha certa', () => {
    const s = createSprite(4, 4);
    expect(s.animations).toHaveLength(1);
    expect(s.animations[0].frameIds).toEqual([s.frames[0].id]);
    const walk = addAnimation(s, 'andar', 3);
    expect(walk.frameIds).toHaveLength(3);
    const f = addFrame(s, 100, s.frames[0]);
    expect(animationOf(s, f.id)).toBe(s.animations[0]);
  });
});

describe('spritesheet', () => {
  it('importa linhas como animações, ignorando quadros e linhas vazias', () => {
    // folha 3x3 quadros de 2x2: linha 0 com 2 quadros, linha 1 vazia, linha 2 com 3
    const sheet = new PixelImage(6, 6);
    sheet.set(0, 0, RED);
    sheet.set(2, 0, RED);
    sheet.set(4, 5, BLUE);
    sheet.set(0, 4, BLUE);
    const s = importSpritesheet(sheet, { cellWidth: 2, cellHeight: 2, names: ['parado', 'andar'] });
    expect(s.width).toBe(2);
    expect(s.animations.map((a) => [a.name, a.frameIds.length])).toEqual([['parado', 2], ['andar', 3]]);
    const lid = s.layers[0].id;
    expect(getCel(s, lid, s.animations[1].frameIds[2]).get(0, 1)).toBe(BLUE);
  });

  it('exportar e importar de novo dá o mesmo resultado', () => {
    const s = createSprite(2, 2);
    addFrame(s);
    const a2 = addAnimation(s, 'b', 1);
    const lid = s.layers[0].id;
    getCel(s, lid, s.animations[0].frameIds[1]).set(1, 1, RED);
    getCel(s, lid, a2.frameIds[0]).set(0, 0, BLUE);
    const sheet = exportSpritesheet(s);
    expect([sheet.width, sheet.height]).toEqual([4, 4]);
    expect(sheet.get(3, 1)).toBe(RED);
    expect(sheet.get(0, 2)).toBe(BLUE);
    const back = importSpritesheet(sheet, { cellWidth: 2, cellHeight: 2 });
    expect(back.animations.map((a) => a.frameIds.length)).toEqual([2, 1]);
  });
});
