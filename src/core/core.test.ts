import { describe, expect, it } from 'vitest';
import {
  History, createNewImage, snapSize, addFrame, addLayer, createSprite, drawLine, floodFill, flattenFrame, fromHex, getCel,
  maskOfColor, replaceColors, rgba, similarColorPairs, toHex, usedColors,
} from './index';

const BLACK = fromHex('#000000');
const RED = fromHex('#c0392b');
const WHITE = fromHex('#ffffff');

describe('cores', () => {
  it('converte hex nos dois sentidos', () => {
    expect(toHex(fromHex('#c0392b'))).toBe('#c0392b');
    expect(toHex(fromHex('#fff'))).toBe('#ffffff');
    expect(toHex(rgba(1, 2, 3, 4))).toBe('#01020304');
  });
});

describe('troca de cores', () => {
  it('troca todo #000000 por vermelho em todas as camadas e frames', () => {
    const s = createSprite(4, 4);
    addLayer(s);
    addFrame(s);
    for (const cel of s.cels.values()) cel.set(1, 1, BLACK);
    getCel(s, s.layers[0].id, s.frames[0].id).set(2, 2, WHITE);

    const changed = replaceColors(s, [{ from: BLACK, to: RED }]);

    expect(changed).toBe(4);
    for (const cel of s.cels.values()) expect(cel.get(1, 1)).toBe(RED);
    expect(getCel(s, s.layers[0].id, s.frames[0].id).get(2, 2)).toBe(WHITE);
  });

  it('respeita o escopo de camada e frame', () => {
    const s = createSprite(2, 2);
    const l2 = addLayer(s);
    for (const cel of s.cels.values()) cel.set(0, 0, BLACK);
    replaceColors(s, [{ from: BLACK, to: RED }], { layerIds: [l2.id] });
    expect(getCel(s, s.layers[0].id, s.frames[0].id).get(0, 0)).toBe(BLACK);
    expect(getCel(s, l2.id, s.frames[0].id).get(0, 0)).toBe(RED);
  });

  it('respeita a seleção', () => {
    const s = createSprite(2, 1);
    const cel = getCel(s, s.layers[0].id, s.frames[0].id);
    cel.set(0, 0, BLACK);
    cel.set(1, 0, BLACK);
    replaceColors(s, [{ from: BLACK, to: RED }], { selection: Uint8Array.from([0, 1]) });
    expect(cel.get(0, 0)).toBe(BLACK);
    expect(cel.get(1, 0)).toBe(RED);
  });

  it('com tolerância pega tons parecidos', () => {
    const s = createSprite(2, 1);
    const cel = getCel(s, s.layers[0].id, s.frames[0].id);
    cel.set(0, 0, fromHex('#050505'));
    cel.set(1, 0, WHITE);
    expect(replaceColors(s, [{ from: BLACK, to: RED }])).toBe(0);
    expect(replaceColors(s, [{ from: BLACK, to: RED }], {}, 0.05)).toBe(1);
    expect(cel.get(0, 0)).toBe(RED);
    expect(cel.get(1, 0)).toBe(WHITE);
  });

  it('várias trocas ao mesmo tempo, inclusive inverter duas cores', () => {
    const s = createSprite(2, 1);
    const cel = getCel(s, s.layers[0].id, s.frames[0].id);
    cel.set(0, 0, BLACK);
    cel.set(1, 0, WHITE);
    replaceColors(s, [{ from: BLACK, to: WHITE }, { from: WHITE, to: BLACK }]);
    expect(cel.get(0, 0)).toBe(WHITE);
    expect(cel.get(1, 0)).toBe(BLACK);
  });

  it('gera a máscara de destaque de uma cor', () => {
    const s = createSprite(3, 1);
    const cel = getCel(s, s.layers[0].id, s.frames[0].id);
    cel.set(1, 0, BLACK);
    expect([...maskOfColor(cel, BLACK)]).toEqual([0, 1, 0]);
  });
});

describe('paleta automática da imagem', () => {
  it('lista todas as cores usadas com a contagem, ignorando transparente', () => {
    const s = createSprite(3, 1);
    const cel = getCel(s, s.layers[0].id, s.frames[0].id);
    cel.set(0, 0, RED);
    cel.set(1, 0, RED);
    cel.set(2, 0, WHITE);
    expect(usedColors(s)).toEqual([
      { color: RED, count: 2 },
      { color: WHITE, count: 1 },
    ]);
  });

  it('acha cores quase iguais', () => {
    const pairs = similarColorPairs([
      { color: BLACK, count: 10 },
      { color: fromHex('#030303'), count: 1 },
      { color: WHITE, count: 5 },
    ]);
    expect(pairs).toHaveLength(1);
  });
});

describe('ferramentas e histórico', () => {
  it('lápis em linha, balde e desfazer/refazer', () => {
    const s = createSprite(4, 4);
    const cel = getCel(s, s.layers[0].id, s.frames[0].id);
    const h = new History();

    h.begin([cel]);
    drawLine(cel, 0, 0, 3, 3, BLACK);
    h.commit();
    expect([0, 1, 2, 3].every((i) => cel.get(i, i) === BLACK)).toBe(true);

    h.begin([cel]);
    floodFill(cel, 3, 0, RED);
    h.commit();
    expect(cel.get(3, 0)).toBe(RED);
    expect(cel.get(0, 3)).toBe(0); // o outro lado da diagonal não é atingido

    h.undo();
    expect(cel.get(3, 0)).toBe(0);
    h.redo();
    expect(cel.get(3, 0)).toBe(RED);
  });

  it('junta camadas visíveis com opacidade', () => {
    const s = createSprite(1, 1);
    const top = addLayer(s);
    getCel(s, s.layers[0].id, s.frames[0].id).set(0, 0, WHITE);
    getCel(s, top.id, s.frames[0].id).set(0, 0, BLACK);
    expect(flattenFrame(s, s.frames[0].id).get(0, 0)).toBe(BLACK);
    top.visible = false;
    expect(flattenFrame(s, s.frames[0].id).get(0, 0)).toBe(WHITE);
  });
});

describe('imagem nova em múltiplos de 16', () => {
  it('arredonda para o múltiplo de 16 mais próximo, entre 16 e 1024', () => {
    expect([0, 7, 9, 16, 20, 24, 33, 100, 5000].map(snapSize)).toEqual([16, 16, 16, 16, 16, 32, 32, 96, 1024]);
  });
  it('cria a imagem já ajustada', () => {
    const s = createNewImage(30, 50);
    expect([s.width, s.height]).toEqual([32, 48]);
  });
});
