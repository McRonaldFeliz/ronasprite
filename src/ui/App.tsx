import { useEffect, useReducer, useRef, useState } from 'react';
import {
  History, PixelImage, Rgba, Sprite, addAnimation, addFrame, addLayer, animationOf, createNewImage, snapSize, SIZE_STEP, MAX_NEW_SIZE, drawLine,
  exportSpritesheet, flattenFrame, floodFill, fromHex, getCel, getFrame, importSpritesheet, maskOfColor,
  replaceColors, similarColorPairs, RONA64, toHex, usedColors, TRANSPARENT,
} from '../core';
import { downloadPng, paint, readImageFile } from './render';
import { Icon } from './icons';

type Tool = 'lapis' | 'borracha' | 'balde' | 'contagotas';
const TOOL_NAMES: Record<Tool, string> = { lapis: 'Lápis', borracha: 'Borracha', balde: 'Balde de tinta', contagotas: 'Conta-gotas' };
type ColorScopeKind = 'camada' | 'frame' | 'tudo';

const START_PALETTE = [...RONA64];

function newDoc(sprite: Sprite) {
  return { sprite, history: new History() };
}

export function App() {
  const [doc, setDoc] = useState(() => newDoc(createNewImage(16, 16, START_PALETTE)));
  const { sprite, history } = doc;
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  const [layerIdx, setLayerIdx] = useState(0);
  const [frameId, setFrameId] = useState(() => doc.sprite.frames[0].id);
  const [newW, setNewW] = useState(16);
  const [newH, setNewH] = useState(16);
  const [cellW, setCellW] = useState(32);
  const [cellH, setCellH] = useState(32);
  const [importError, setImportError] = useState('');
  const [tool, setTool] = useState<Tool>('lapis');
  const [color, setColorState] = useState<Rgba>(START_PALETTE[0]);
  /** Escolhe a cor de desenho e guarda em "Cores escolhidas" (as 16 mais recentes). */
  const setColor = (c: Rgba) => {
    setColorState(c);
    setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, 16));
  };
  const [highlightColor, setHighlightColor] = useState<Rgba | null>(null);
  const [replaceTo, setReplaceTo] = useState('#c0392b');
  const [scopeKind, setScopeKind] = useState<ColorScopeKind>('tudo');
  const [tolerance, setTolerance] = useState(0);
  const [imageColorsOpen, setImageColorsOpen] = useState(false);
  const [recent, setRecent] = useState<Rgba[]>([]);
  const [playing, setPlaying] = useState(true);
  const [previewIdx, setPreviewIdx] = useState(0);

  const layer = sprite.layers[Math.min(layerIdx, sprite.layers.length - 1)];
  const frame = getFrame(sprite, frameId);
  const anim = animationOf(sprite, frame.id)!;
  const cel = getCel(sprite, layer.id, frame.id);
  const ZOOM = Math.max(2, Math.floor(512 / Math.max(sprite.width, sprite.height)));

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

  // Preview em loop da animação (linha) atual
  const previewFrameId = anim.frameIds[previewIdx % anim.frameIds.length];
  useEffect(() => {
    if (!playing) return;
    const f = getFrame(sprite, previewFrameId);
    const t = setTimeout(() => setPreviewIdx((i) => (i + 1) % anim.frameIds.length), f.durationMs);
    return () => clearTimeout(t);
  }, [playing, previewIdx, previewFrameId, anim, sprite]);
  useEffect(() => {
    if (previewRef.current) paint(previewRef.current, flattenFrame(sprite, previewFrameId));
  });

  const newImage = () => {
    const s = createNewImage(newW, newH, sprite.palette);
    setNewW(s.width);
    setNewH(s.height);
    setDoc(newDoc(s));
    setLayerIdx(0);
    setFrameId(s.frames[0].id);
    setPreviewIdx(0);
  };

  const importSheet = async (file: File) => {
    try {
      const img: PixelImage = await readImageFile(file);
      const s = importSpritesheet(img, { cellWidth: cellW, cellHeight: cellH, palette: sprite.palette });
      setDoc(newDoc(s));
      setLayerIdx(0);
      setFrameId(s.frames[0].id);
      setPreviewIdx(0);
      setImportError('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

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

  const used = imageColorsOpen ? usedColors(sprite, scope) : [];
  const similar = imageColorsOpen ? similarColorPairs(used) : [];
  const closeImageColors = () => { setImageColorsOpen(false); setHighlightColor(null); };

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
          {(Object.keys(TOOL_NAMES) as Tool[]).map((t) => (
            <button key={t} className={`icon ${t === tool ? 'on' : ''}`} title={TOOL_NAMES[t]} aria-label={TOOL_NAMES[t]}
              onClick={() => setTool(t)}><Icon name={t} /></button>
          ))}
          <span className="sep" />
          <button className="icon" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" onClick={() => history.undo() && refresh()}><Icon name="desfazer" /></button>
          <button className="icon" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" onClick={() => history.redo() && refresh()}><Icon name="refazer" /></button>
          <span className="sep" />
          <button className={`icon ${imageColorsOpen ? 'on' : ''}`} title="Cores da imagem" aria-label="Cores da imagem"
            onClick={() => (imageColorsOpen ? closeImageColors() : setImageColorsOpen(true))}><Icon name="coresImagem" /></button>
          <span className="sep" />
          <button className="icon" title="Exportar frame (PNG)" aria-label="Exportar frame" onClick={() => downloadPng(flat, 'frame.png')}><Icon name="exportarFrame" /></button>
          <button className="icon" title="Exportar spritesheet (PNG)" aria-label="Exportar spritesheet" onClick={() => downloadPng(exportSpritesheet(sprite), 'spritesheet.png')}><Icon name="exportarFolha" /></button>
        </div>
        <div className="new-image">
          <SizeInput value={newW} onChange={setNewW} />
          ×
          <SizeInput value={newH} onChange={setNewH} />
          <button onClick={newImage}>nova imagem</button>
          <datalist id="tamanhos16">{SIZE_OPTIONS.map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <div className="import">
          quadro
          <input type="number" min={1} value={cellW} onChange={(e) => setCellW(Number(e.target.value))} />
          ×
          <input type="number" min={1} value={cellH} onChange={(e) => setCellH(Number(e.target.value))} />
          <label className="file">importar folha
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) importSheet(f); e.target.value = ''; }} />
          </label>
          {importError && <span className="error">{importError}</span>}
        </div>
      </header>

      <aside className="left">
        <h3>Paleta <small className="muted">Rona64</small></h3>
        <div className="swatches">
          {sprite.palette.map((c, i) => (
            <button key={i} className={`sw ${c === color ? 'on' : ''}`} style={{ background: toHex(c) }}
              title={toHex(c)} onClick={() => setColor(c)} />
          ))}
        </div>
        <input type="color" value={toHex(color).slice(0, 7)} onChange={(e) => setColor(fromHex(e.target.value))} />

        {imageColorsOpen ? (
          <div className="image-colors">
            <div className="panel-title">
              <h3>Cores da imagem</h3>
              <button className="small" title="Fechar" aria-label="Fechar" onClick={closeImageColors}>✕</button>
            </div>
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
                <li key={c} className={c === highlightColor ? 'on' : ''} title={toHex(c)}>
                  <button className="sw" style={{ background: toHex(c) }}
                    onClick={() => setHighlightColor(c === highlightColor ? null : c)} title={`${toHex(c)} · clique para destacar`} />
                  <span>{`${count} ${count === 1 ? "pixel" : "pixels"}`}</span>
                  <button onClick={() => setColor(c)} title="usar esta cor">usar</button>
                  {!sprite.palette.includes(c) && (
                    <button onClick={() => { sprite.palette.push(c); refresh(); }} title="mandar para a paleta">+paleta</button>
                  )}
                </li>
              ))}
            </ul>
            {highlightColor !== null && (
              <div className="replace">
                Trocar <span className="sw" style={{ background: toHex(highlightColor) }} title={toHex(highlightColor)} /> por{' '}
                <input type="color" title={replaceTo} value={replaceTo} onChange={(e) => setReplaceTo(e.target.value)} />
                <button onClick={() => doReplace(highlightColor)}>trocar</button>
              </div>
            )}
            {similar.length > 0 && (
              <div className="similar">
                <h4>Cores quase iguais</h4>
                {similar.map(([a, b]) => (
                  <div key={`${a.color}-${b.color}`}>
                    <span className="sw" style={{ background: toHex(a.color) }} title={toHex(a.color)} />
                    <span className="sw" style={{ background: toHex(b.color) }} title={toHex(b.color)} />
                    <button onClick={() => mergeSimilar(a.color, b.color)}>juntar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
        <h3>Cores escolhidas</h3>
        {recent.length === 0
          ? <p className="muted">As cores que você usar aparecem aqui.</p>
          : <div className="swatches">
              {recent.map((c) => (
                <button key={c} className={`sw ${c === color ? 'on' : ''}`} style={{ background: toHex(c) }}
                  title={toHex(c)} onClick={() => setColor(c)} />
              ))}
            </div>}
          </>
        )}
      </aside>

      <section className="sheet">
        <h3>Spritesheet</h3>
        {sprite.animations.map((a) => (
          <div key={a.id} className={`row ${a === anim ? 'on' : ''}`}>
            <input className="name" value={a.name} onChange={(e) => { a.name = e.target.value; refresh(); }} />
            <div className="cells">
              {a.frameIds.map((fid) => (
                <FrameThumb key={fid} img={flattenFrame(sprite, fid)} active={fid === frame.id}
                  onClick={() => { setFrameId(fid); setPreviewIdx(0); }} />
              ))}
              <button title="frame vazio" onClick={() => { const f = addFrame(sprite, 100, undefined, a); setFrameId(f.id); }}>+</button>
              {a === anim && (
                <button title="copiar o frame atual" onClick={() => { const f = addFrame(sprite, 100, frame, a); setFrameId(f.id); }}>+ cópia</button>
              )}
            </div>
          </div>
        ))}
        <button onClick={() => { const a = addAnimation(sprite); setFrameId(a.frameIds[0]); setPreviewIdx(0); }}>+ linha (animação)</button>
      </section>

      <main>
        <canvas ref={editorRef} className="editor" style={{ width: sprite.width * ZOOM, height: sprite.height * ZOOM }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      </main>

      <aside className="right">
        <h3>Preview: {anim.name}</h3>
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

    </div>
  );
}

const SIZE_OPTIONS = Array.from({ length: 512 / SIZE_STEP }, (_, i) => (i + 1) * SIZE_STEP);

/** Escolha de tamanho sempre em múltiplos de 16. Aceita digitar outro múltiplo; o valor é ajustado ao sair do campo. */
function SizeInput(props: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(props.value));
  useEffect(() => setText(String(props.value)), [props.value]);
  return (
    <>
      <input type="number" list="tamanhos16" min={SIZE_STEP} max={MAX_NEW_SIZE} step={SIZE_STEP} value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { const n = snapSize(Number(text)); setText(String(n)); props.onChange(n); }} />
    </>
  );
}

function FrameThumb(props: { img: PixelImage; active: boolean; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) paint(ref.current, props.img); });
  return (
    <button className={`thumb ${props.active ? 'on' : ''}`} onClick={props.onClick}>
      <canvas ref={ref} />
    </button>
  );
}
