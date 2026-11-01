import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  History, Rgba, addFrame, addLayer, createSprite, drawLine, flattenFrame, floodFill, fromHex,
  getCel, maskOfColor, replaceColors, similarColorPairs, toHex, usedColors, TRANSPARENT,
} from '../core';
import { downloadPng, paint } from './render';

type Tool = 'lapis' | 'borracha' | 'balde' | 'contagotas';
type ColorScopeKind = 'camada' | 'frame' | 'tudo';

const START_PALETTE = ['#000000', '#ffffff', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad'].map(fromHex);
const ZOOM = 16;

export function App() {
  const sprite = useMemo(() => createSprite(32, 32, START_PALETTE), []);
  const history = useMemo(() => new History(), []);
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  const [layerIdx, setLayerIdx] = useState(0);
  const [frameIdx, setFrameIdx] = useState(0);
  const [tool, setTool] = useState<Tool>('lapis');
  const [color, setColor] = useState<Rgba>(START_PALETTE[0]);
  const [highlightColor, setHighlightColor] = useState<Rgba | null>(null);
  const [replaceTo, setReplaceTo] = useState('#c0392b');
  const [scopeKind, setScopeKind] = useState<ColorScopeKind>('tudo');
  const [tolerance, setTolerance] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [previewIdx, setPreviewIdx] = useState(0);

  const layer = sprite.layers[layerIdx];
  const frame = sprite.frames[frameIdx];
  const cel = getCel(sprite, layer.id, frame.id);

  const scope = scopeKind === 'camada'
    ? { layerIds: [layer.id], frameIds: [frame.id] }
    : scopeKind === 'frame' ? { frameIds: [frame.id] } : {};

  const editorRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<[number, number] | null>(null);

  // Canvas principal
  const flat = flattenFrame(sprite, frame.id);
  const highlight = highlightColor !== null ? maskOfColor(flat, highlightColor, tolerance) : undefined;
  useEffect(() => {
    if (editorRef.current) paint(editorRef.current, flat, highlight);
  });

  // Preview em loop
  useEffect(() => {
    if (!playing) return;
    const f = sprite.frames[previewIdx % sprite.frames.length];
    const t = setTimeout(() => setPreviewIdx((i) => (i + 1) % sprite.frames.length), f.durationMs);
    return () => clearTimeout(t);
  }, [playing, previewIdx, sprite.frames]);
  useEffect(() => {
    const f = sprite.frames[previewIdx % sprite.frames.length];
    if (previewRef.current) paint(previewRef.current, flattenFrame(sprite, f.id));
  });

  // Atalhos de desfazer/refazer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey ? history.redo() : history.undo()) refresh();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / ZOOM), Math.floor((e.clientY - r.top) / ZOOM)];
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = pos(e);
    if (tool === 'contagotas') {
      const c = flat.get(x, y);
      if (c >>> 24) setColor(c);
      return;
    }
    history.begin([cel]);
    if (tool === 'balde') {
      floodFill(cel, x, y, color);
      history.commit();
    } else {
      e.currentTarget.setPointerCapture(e.pointerId);
      cel.set(x, y, tool === 'borracha' ? TRANSPARENT : color);
      last.current = [x, y];
    }
    refresh();
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return;
    const [x, y] = pos(e);
    drawLine(cel, last.current[0], last.current[1], x, y, tool === 'borracha' ? TRANSPARENT : color);
    last.current = [x, y];
    refresh();
  };
  const onUp = () => {
    if (!last.current) return;
    last.current = null;
    history.commit();
    refresh();
  };

  const used = usedColors(sprite, scope);
  const similar = similarColorPairs(used);

  const doReplace = (from: Rgba) => {
    const cels = [...sprite.cels.values()];
    history.begin(cels);
    replaceColors(sprite, [{ from, to: fromHex(replaceTo) }], scope, tolerance);
    history.commit();
    setHighlightColor(null);
    refresh();
  };

  const mergeSimilar = (keep: Rgba, drop: Rgba) => {
    history.begin([...sprite.cels.values()]);
    replaceColors(sprite, [{ from: drop, to: keep }], scope);
    history.commit();
    refresh();
  };

  return (
    <div className="app">
      <header>
        <strong>Ronasprite</strong>
        <div className="tools">
          {(['lapis', 'borracha', 'balde', 'contagotas'] as Tool[]).map((t) => (
            <button key={t} className={t === tool ? 'on' : ''} onClick={() => setTool(t)}>{t}</button>
          ))}
          <button onClick={() => history.undo() && refresh()}>desfazer</button>
          <button onClick={() => history.redo() && refresh()}>refazer</button>
          <button onClick={() => downloadPng(flat, 'sprite.png')}>exportar PNG</button>
        </div>
      </header>

      <aside className="left">
        <h3>Paleta</h3>
        <div className="swatches">
          {sprite.palette.map((c, i) => (
            <button key={i} className={`sw ${c === color ? 'on' : ''}`} style={{ background: toHex(c) }}
              title={toHex(c)} onClick={() => setColor(c)} />
          ))}
        </div>
        <input type="color" value={toHex(color).slice(0, 7)} onChange={(e) => setColor(fromHex(e.target.value))} />

        <h3>Cores da imagem</h3>
        <label>Onde:{' '}
          <select value={scopeKind} onChange={(e) => setScopeKind(e.target.value as ColorScopeKind)}>
            <option value="tudo">sprite inteiro</option>
            <option value="frame">frame atual</option>
            <option value="camada">camada atual (neste frame)</option>
          </select>
        </label>
        <label>Tolerância: {Math.round(tolerance * 100)}%
          <input type="range" min={0} max={0.3} step={0.01} value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))} />
        </label>
        <ul className="used">
          {used.map(({ color: c, count }) => (
            <li key={c} className={c === highlightColor ? 'on' : ''}>
              <button className="sw" style={{ background: toHex(c) }}
                onClick={() => setHighlightColor(c === highlightColor ? null : c)} title="destacar no desenho" />
              <span>{toHex(c)} · {count}px</span>
              <button onClick={() => setColor(c)} title="usar esta cor">usar</button>
              {!sprite.palette.includes(c) && (
                <button onClick={() => { sprite.palette.push(c); refresh(); }} title="mandar para a paleta">+paleta</button>
              )}
            </li>
          ))}
        </ul>
        {highlightColor !== null && (
          <div className="replace">
            Trocar {toHex(highlightColor)} por{' '}
            <input type="color" value={replaceTo} onChange={(e) => setReplaceTo(e.target.value)} />
            <button onClick={() => doReplace(highlightColor)}>trocar</button>
          </div>
        )}
        {similar.length > 0 && (
          <div className="similar">
            <h4>Cores quase iguais</h4>
            {similar.map(([a, b]) => (
              <div key={`${a.color}-${b.color}`}>
                <span className="sw" style={{ background: toHex(a.color) }} />
                <span className="sw" style={{ background: toHex(b.color) }} />
                <button onClick={() => mergeSimilar(a.color, b.color)}>juntar</button>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main>
        <canvas ref={editorRef} className="editor" style={{ width: sprite.width * ZOOM, height: sprite.height * ZOOM }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      </main>

      <aside className="right">
        <h3>Preview</h3>
        <canvas ref={previewRef} className="preview" style={{ width: sprite.width * 4, height: sprite.height * 4 }} />
        <button onClick={() => setPlaying((p) => !p)}>{playing ? 'pausar' : 'tocar'}</button>

        <h3>Camadas</h3>
        <ul className="layers">
          {[...sprite.layers].map((l, i) => ({ l, i })).reverse().map(({ l, i }) => (
            <li key={l.id} className={i === layerIdx ? 'on' : ''} onClick={() => setLayerIdx(i)}>
              <input type="checkbox" checked={l.visible} onClick={(e) => e.stopPropagation()}
                onChange={() => { l.visible = !l.visible; refresh(); }} />
              {l.name}
            </li>
          ))}
        </ul>
        <button onClick={() => { addLayer(sprite); setLayerIdx(sprite.layers.length - 1); }}>+ camada</button>
      </aside>

      <footer>
        <div className="frames">
          {sprite.frames.map((f, i) => (
            <FrameThumb key={f.id} img={flattenFrame(sprite, f.id)} active={i === frameIdx} onClick={() => setFrameIdx(i)} label={i + 1} />
          ))}
          <button onClick={() => { addFrame(sprite, 100, frame); setFrameIdx(sprite.frames.length - 1); }}>+ frame (cópia)</button>
          <button onClick={() => { addFrame(sprite); setFrameIdx(sprite.frames.length - 1); }}>+ frame vazio</button>
        </div>
      </footer>
    </div>
  );
}

function FrameThumb(props: { img: ReturnType<typeof flattenFrame>; active: boolean; onClick: () => void; label: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) paint(ref.current, props.img); });
  return (
    <button className={`thumb ${props.active ? 'on' : ''}`} onClick={props.onClick}>
      <canvas ref={ref} />
      <span>{props.label}</span>
    </button>
  );
}
