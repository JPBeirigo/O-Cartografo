/* ============================================================
   Cartógrafo — Mapas Interativos Aninhados
   app.jsx — React application (JSX, transpiled by Babel standalone)

   Structure:
     - Helpers & constants (uid, clamp, TOOLS, makeMap, loadImage)
     - Icon components (I.*)
     - Welcome         — landing screen, image/project loader
     - Toolbar         — left sidebar tool switcher
     - TextAnnotation  — in-map italic text labels
     - MapCanvas       — pan/zoom canvas + POI overlay + text layer
     - POIDetails      — right panel: selected point of interest
     - TextDetails     — right panel: selected text annotation
     - MapOverview     — right panel: map-level info & POI list
     - App             — root: state, navigation stack, event wiring
   ============================================================ */

const { useState, useRef, useEffect, useCallback } = React;

/* ============ HELPERS ============ */
const uid = () => Math.random().toString(36).slice(2, 11);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ============ ICONS ============ */
const Ico = ({ d, size = 18, strokeWidth = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);
const I = {
  Cursor: (p) => <Ico {...p} d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="currentColor" strokeWidth="1.5"/>,
  Pin: (p) => <Ico {...p} d={<><path d="M12 22s-7-7-7-13a7 7 0 1114 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></>}/>,
  Type: (p) => <Ico {...p} d={<><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>}/>,
  ZoomIn: (p) => <Ico {...p} d={<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>}/>,
  ZoomOut: (p) => <Ico {...p} d={<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></>}/>,
  Maximize: (p) => <Ico {...p} d={<><path d="M8 3H5a2 2 0 00-2 2v3"/><path d="M21 8V5a2 2 0 00-2-2h-3"/><path d="M3 16v3a2 2 0 002 2h3"/><path d="M16 21h3a2 2 0 002-2v-3"/></>}/>,
  Trash: (p) => <Ico {...p} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></>}/>,
  X: (p) => <Ico {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>,
  Plus: (p) => <Ico {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>,
  Upload: (p) => <Ico {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}/>,
  Download: (p) => <Ico {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}/>,
  ChevronRight: (p) => <Ico {...p} d="M9 18l6-6-6-6"/>,
  ArrowLeft: (p) => <Ico {...p} d={<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>}/>,
  Layers: (p) => <Ico {...p} d={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>}/>,
  Compass: (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>}/>,
  Map: (p) => <Ico {...p} d={<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>}/>,
  Info: (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>}/>,
  Enter: (p) => <Ico {...p} d={<><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>}/>,
  Edit: (p) => <Ico {...p} d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>}/>,
  Menu: (p) => <Ico {...p} d={<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}/>,
  Rotate: (p) => <Ico {...p} d={<><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 11-.57-8.38"/></>}/>,
};

const TOOLS = { SELECT:'select', POI:'poi', TEXT:'text' };

const makeMap = ({ imageUrl, imgW, imgH, name = 'Mapa', parentId = null }) => ({
  id: uid(), name, imageUrl, imgW, imgH, parentId,
  pois: [], texts: [],
});

const loadImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => resolve({ dataUrl: e.target.result, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/* ============ WELCOME ============ */
function Welcome({ onLoad, onImport }) {
  const inputRef = useRef(null);
  const importRef = useRef(null);
  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const { dataUrl, w, h } = await loadImage(file);
    onLoad({ dataUrl, w, h, name: file.name.replace(/\.[^.]+$/, '') });
  };
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-emblem"><I.Compass size={32} strokeWidth={1.6}/></div>
        <h1 className="welcome-title display">O <em>Cartógrafo</em></h1>
        <p className="welcome-sub">
          Mapeando sua Jornada Épica, desde o pequeno vilarejo no interior, até o Ninho do Dragão... que por acaso fica em um vulcão
        </p>
        <div className="welcome-actions">
          <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
            <I.Upload size={16}/> Carregar imagem
          </button>
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>
            <I.Download size={16}/> Importar projeto
          </button>
          <input ref={inputRef} type="file" accept="image/*" style={{display:'none'}}
            onChange={e => handleFile(e.target.files?.[0])}/>
          <input ref={importRef} type="file" accept="application/json,.json" style={{display:'none'}}
            onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              const fr = new FileReader();
              fr.onload = ev => { try { onImport(JSON.parse(ev.target.result)); } catch(err){ alert('Arquivo inválido'); } };
              fr.readAsText(f);
            }}/>
        </div>
        <div className="welcome-features">
          <div className="feat">
            <div className="feat-icon"><I.Pin size={16}/></div>
            <div className="feat-title">Pontos de interesse</div>
            <div className="feat-desc">Marque locais e dê nomes e descrições.</div>
          </div>
          <div className="feat">
            <div className="feat-icon"><I.Layers size={16}/></div>
            <div className="feat-title">Mapas aninhados</div>
            <div className="feat-desc">Cada ponto pode esconder outro mapa em infinitos níveis.</div>
          </div>
          <div className="feat">
            <div className="feat-icon"><I.Type size={16}/></div>
            <div className="feat-title">Textos e legendas</div>
            <div className="feat-desc">Adicione anotações em qualquer lugar do mapa.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ TOOLBAR ============ */
function Toolbar({ tool, setTool, onZoomIn, onZoomOut, onReset }) {
  const Tool = ({ id, label, kbd, children }) => (
    <button className={`tool ${tool === id ? 'active' : ''}`} onClick={() => setTool(id)} aria-label={label}>
      {children}
      <span className="tip">{label}{kbd && <kbd>{kbd}</kbd>}</span>
    </button>
  );
  return (
    <div className="toolbar">
      <Tool id={TOOLS.SELECT} label="Selecionar / mover" kbd="V"><I.Cursor/></Tool>
      <Tool id={TOOLS.POI} label="Adicionar ponto" kbd="P"><I.Pin/></Tool>
      <Tool id={TOOLS.TEXT} label="Adicionar texto" kbd="T"><I.Type/></Tool>
      <div className="tool-sep"/>
      <button className="tool" onClick={onZoomIn} aria-label="Aumentar zoom">
        <I.ZoomIn/><span className="tip">Aumentar zoom<kbd>+</kbd></span>
      </button>
      <button className="tool" onClick={onZoomOut} aria-label="Diminuir zoom">
        <I.ZoomOut/><span className="tip">Diminuir zoom<kbd>−</kbd></span>
      </button>
      <button className="tool" onClick={onReset} aria-label="Centralizar mapa">
        <I.Maximize/><span className="tip">Ajustar à tela<kbd>0</kbd></span>
      </button>
    </div>
  );
}

/* ============ TEXT ANNOTATION (image-space) ============ */
function TextAnnotation({ text, selected, editing, onPointerDown, onClick, onDoubleClick, onCommit, onCancel }) {
  const inputRef = useRef(null);
  const [val, setVal] = useState(text.content);
  useEffect(() => { setVal(text.content); }, [text.content]);
  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const rotation = text.rotation || 0;
  const color = text.color || 'var(--ink)';

  return (
    <div
      className={`text-ann ${selected ? 'selected' : ''}`}
      style={{
        left: `${text.x}px`,
        top: `${text.y}px`,
        fontSize: `${text.size || 18}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        color: selected ? undefined : color,
      }}
      onPointerDown={editing ? undefined : onPointerDown}
      onClick={editing ? undefined : onClick}
      onDoubleClick={editing ? undefined : onDoubleClick}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="text-ann-input"
          value={val}
          style={{ fontSize: `${text.size || 18}px`, color }}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onCommit(val); }
            else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          onBlur={() => onCommit(val)}
        />
      ) : (text.content || 'Texto')}
    </div>
  );
}

/* ============ MAP CANVAS ============ */
function MapCanvas({ map, viewport, setViewport, tool, setTool,
  selection, setSelection, editingTextId, setEditingTextId,
  updateMap, onEnterSubmap }) {

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  // Fit-to-view
  const fitToView = useCallback(() => {
    const wrap = wrapRef.current; if (!wrap || !map) return;
    const rect = wrap.getBoundingClientRect();
    const padding = 40;
    const sx = (rect.width - padding * 2) / map.imgW;
    const sy = (rect.height - padding * 2) / map.imgH;
    const s = Math.min(sx, sy, 1.5);
    const x = (rect.width - map.imgW * s) / 2;
    const y = (rect.height - map.imgH * s) / 2;
    setViewport({ scale: s, x, y });
  }, [map, setViewport]);

  useEffect(() => { if (!viewport) fitToView(); }, [viewport, fitToView]);

  // Wheel zoom centered on cursor
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setViewport(vp => {
        if (!vp) return vp;
        const newScale = clamp(vp.scale * factor, 0.05, 20);
        const f = newScale / vp.scale;
        return { scale: newScale, x: mx - (mx - vp.x) * f, y: my - (my - vp.y) * f };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setViewport]);

  // Screen-to-image conversion
  const screenToImage = (clientX, clientY) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale,
    };
  };

  // Canvas pointerdown: pan or create
  const onCanvasPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.poi') || e.target.closest('.text-ann')) return;

    const startX = e.clientX, startY = e.clientY;
    const startVp = viewport;
    let mode = 'pending';

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (mode === 'pending' && Math.hypot(dx, dy) > 3) {
        mode = 'pan';
        canvasRef.current?.classList.add('dragging');
      }
      if (mode === 'pan') {
        setViewport({ scale: startVp.scale, x: startVp.x + dx, y: startVp.y + dy });
      }
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvasRef.current?.classList.remove('dragging');
      if (mode === 'pending') {
        // It was a click
        const pt = screenToImage(ev.clientX, ev.clientY);
        const inside = pt.x >= 0 && pt.y >= 0 && pt.x <= map.imgW && pt.y <= map.imgH;
        if (tool === TOOLS.POI && inside) {
          const newPoi = { id: uid(), x: pt.x, y: pt.y, name: '', description: '', childMapId: null };
          updateMap(m => ({ ...m, pois: [...m.pois, newPoi] }));
          setSelection({ type: 'poi', id: newPoi.id });
          setTool(TOOLS.SELECT);
        } else if (tool === TOOLS.TEXT && inside) {
          const newText = { id: uid(), x: pt.x, y: pt.y, content: 'Texto', size: 18 };
          updateMap(m => ({ ...m, texts: [...m.texts, newText] }));
          setSelection({ type: 'text', id: newText.id });
          setEditingTextId(newText.id);
          setTool(TOOLS.SELECT);
        } else {
          setSelection(null);
        }
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // POI drag
  const onPoiPointerDown = (poi) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startPoi = { x: poi.x, y: poi.y };
    let moved = false;
    const onMove = (ev) => {
      const sdx = ev.clientX - startX, sdy = ev.clientY - startY;
      if (!moved && Math.hypot(sdx, sdy) > 3) moved = true;
      if (moved) {
        const nx = clamp(startPoi.x + sdx / viewport.scale, 0, map.imgW);
        const ny = clamp(startPoi.y + sdy / viewport.scale, 0, map.imgH);
        updateMap(m => ({ ...m, pois: m.pois.map(p => p.id === poi.id ? { ...p, x: nx, y: ny } : p) }));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Text drag
  const onTextPointerDown = (txt) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startTxt = { x: txt.x, y: txt.y };
    let moved = false;
    const onMove = (ev) => {
      const sdx = ev.clientX - startX, sdy = ev.clientY - startY;
      if (!moved && Math.hypot(sdx, sdy) > 3) moved = true;
      if (moved) {
        const nx = clamp(startTxt.x + sdx / viewport.scale, 0, map.imgW);
        const ny = clamp(startTxt.y + sdy / viewport.scale, 0, map.imgH);
        updateMap(m => ({ ...m, texts: m.texts.map(t => t.id === txt.id ? { ...t, x: nx, y: ny } : t) }));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const zoomAtCenter = (factor) => {
    setViewport(vp => {
      if (!vp) return vp;
      const r = wrapRef.current.getBoundingClientRect();
      const mx = r.width / 2, my = r.height / 2;
      const ns = clamp(vp.scale * factor, 0.05, 20);
      const f = ns / vp.scale;
      return { scale: ns, x: mx - (mx - vp.x) * f, y: my - (my - vp.y) * f };
    });
  };

  if (!viewport) return <div className="canvas-wrap" ref={wrapRef}/>;

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <div
        className={`canvas ${tool === TOOLS.POI ? 'add-mode' : ''} ${tool === TOOLS.TEXT ? 'add-mode-text' : ''}`}
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
      >
        <div className="canvas-content"
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}>
          <img className="map-image" src={map.imageUrl} alt={map.name}
            style={{ width: `${map.imgW}px`, height: `${map.imgH}px` }}
            draggable={false}/>
          {map.texts.map(t => (
            <TextAnnotation key={t.id} text={t}
              selected={selection?.type === 'text' && selection.id === t.id}
              editing={editingTextId === t.id}
              onPointerDown={onTextPointerDown(t)}
              onClick={(e) => { e.stopPropagation(); setSelection({ type: 'text', id: t.id }); }}
              onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(t.id); }}
              onCommit={(val) => {
                updateMap(m => ({ ...m, texts: m.texts.map(x => x.id === t.id ? { ...x, content: val } : x) }));
                setEditingTextId(null);
              }}
              onCancel={() => setEditingTextId(null)}/>
          ))}
        </div>
      </div>

      {/* POI overlay in screen space */}
      <div className="poi-overlay">
        {map.pois.map((p, i) => {
          const sx = viewport.x + p.x * viewport.scale;
          const sy = viewport.y + p.y * viewport.scale;
          const selected = selection?.type === 'poi' && selection.id === p.id;
          return (
            <div
              key={p.id}
              className={`poi ${selected ? 'selected' : ''} ${p.childMapId ? 'has-submap' : ''}`}
              style={{ left: `${sx}px`, top: `${sy}px` }}
              onPointerDown={onPoiPointerDown(p)}
              onClick={(e) => { e.stopPropagation(); setSelection({ type: 'poi', id: p.id }); }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (p.childMapId) onEnterSubmap(p.childMapId);
                else setSelection({ type: 'poi', id: p.id });
              }}
              title={p.name || `Ponto ${i+1}`}
            >
              <div className="poi-dot">
                {p.childMapId ? <I.Layers size={14} strokeWidth={2.2}/>
                  : <span className="poi-num">{i + 1}</span>}
              </div>
              {p.name && <div className="poi-label">{p.name}</div>}
            </div>
          );
        })}
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => zoomAtCenter(1.25)} aria-label="Aumentar zoom"><I.Plus size={16}/></button>
        <div className="zoom-level">{Math.round(viewport.scale * 100)}%</div>
        <button className="zoom-btn" onClick={() => zoomAtCenter(1/1.25)} aria-label="Diminuir zoom"><I.ZoomOut size={16}/></button>
        <button className="zoom-btn" onClick={fitToView} aria-label="Ajustar à tela"><I.Maximize size={15}/></button>
      </div>

      <div className="hint">
        <I.Info size={14} className="hint-icon"/>
        {tool === TOOLS.POI && <span>Clique no mapa para adicionar um <strong>ponto de interesse</strong>.</span>}
        {tool === TOOLS.TEXT && <span>Clique no mapa para adicionar um <strong>texto</strong>.</span>}
        {tool === TOOLS.SELECT && (
          <span>Arraste para mover · <kbd>scroll</kbd> para zoom · clique duplo num ponto para abrir submapa</span>
        )}
      </div>
    </div>
  );
}

/* ============ POI DETAILS ============ */
function POIDetails({ poi, index, updateMap, onEnterSubmap, onCreateSubmap, onRemoveSubmap, onDelete, submap }) {
  const update = (patch) => {
    updateMap(m => ({ ...m, pois: m.pois.map(p => p.id === poi.id ? { ...p, ...patch } : p) }));
  };
  const subInputRef = useRef(null);

  return (
    <>
      <div className="panel-section">
        <div className="field">
          <label className="field-label">Nome</label>
          <input className="field-input" value={poi.name} placeholder={`Ponto ${index + 1}`}
            onChange={e => update({ name: e.target.value })}/>
        </div>
        <div className="field">
          <label className="field-label">Descrição</label>
          <textarea className="field-area" value={poi.description} placeholder="Notas, lendas, observações…"
            onChange={e => update({ description: e.target.value })}/>
        </div>
      </div>

      <div className="divider"/>

      <div className="panel-section">
        <label className="field-label">Mapa aninhado</label>
        {submap ? (
          <div className="submap-card">
            <div className="submap-thumb" style={{ backgroundImage: `url(${submap.imageUrl})` }}/>
            <div className="submap-info">
              <div style={{minWidth:0,flex:1}}>
                <div className="submap-name">{submap.name}</div>
                <div className="submap-meta">{submap.pois.length} pontos · {submap.texts.length} textos</div>
              </div>
              <button className="btn btn-icon" onClick={() => onRemoveSubmap(poi)} aria-label="Remover submapa" title="Remover submapa">
                <I.X size={15}/>
              </button>
            </div>
            <div style={{padding:'0 12px 12px'}}>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}
                onClick={() => onEnterSubmap(submap.id)}>
                <I.Enter size={15}/> Entrar no submapa
              </button>
            </div>
          </div>
        ) : (
          <div className="submap-empty">
            <div className="submap-empty-icon"><I.Layers size={18}/></div>
            <div style={{marginBottom:10}}>Nenhum submapa anexado.<br/>Adicione uma imagem para criar um novo nível.</div>
            <button className="btn btn-ghost" onClick={() => subInputRef.current?.click()}>
              <I.Upload size={15}/> Anexar imagem
            </button>
            <input ref={subInputRef} type="file" accept="image/*" style={{display:'none'}}
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const { dataUrl, w, h } = await loadImage(f);
                onCreateSubmap(poi, { dataUrl, w, h, name: poi.name || f.name.replace(/\.[^.]+$/, '') });
                e.target.value = '';
              }}/>
          </div>
        )}
      </div>

      <div className="divider"/>

      <div className="panel-section">
        <button className="btn btn-danger" onClick={() => onDelete(poi)} style={{justifyContent:'flex-start'}}>
          <I.Trash size={14}/> Excluir ponto
        </button>
      </div>
    </>
  );
}

/* ============ TEXT DETAILS ============ */
const PRESET_COLORS = [
  { label: 'Tinta',    value: '#1c2a3e' },
  { label: 'Terracota', value: '#b85c38' },
  { label: 'Ouro',    value: '#c19b3b' },
  { label: 'Verde',   value: '#4a7a45' },
  { label: 'Azul',    value: '#3a6a9e' },
  { label: 'Vinho',   value: '#7a2a3e' },
  { label: 'Areia',   value: '#8a7455' },
  { label: 'Branco',  value: '#f8f1df' },
];

function TextDetails({ text, updateMap, onDelete, onEdit }) {
  const update = (patch) => {
    updateMap(m => ({ ...m, texts: m.texts.map(t => t.id === text.id ? { ...t, ...patch } : t) }));
  };
  const currentColor = text.color || '#1c2a3e';
  const rotation = text.rotation || 0;

  return (
    <>
      <div className="panel-section">
        <div className="field">
          <label className="field-label">Conteúdo</label>
          <textarea className="field-area" value={text.content}
            onChange={e => update({ content: e.target.value })}/>
        </div>

        <div className="field">
          <label className="field-label">Tamanho da fonte: {text.size || 18}px</label>
          <input type="range" min="10" max="64" value={text.size || 18}
            onChange={e => update({ size: parseInt(e.target.value, 10) })}
            style={{accentColor:'var(--accent)'}}/>
        </div>

        <div className="field">
          <label className="field-label">Rotação: {rotation}°</label>
          <input type="range" min="-180" max="180" value={rotation}
            onChange={e => update({ rotation: parseInt(e.target.value, 10) })}
            style={{accentColor:'var(--accent)'}}/>
          <div style={{display:'flex',gap:6,marginTop:4}}>
            {[-90, -45, 0, 45, 90].map(deg => (
              <button key={deg}
                className={`btn btn-ghost ${rotation === deg ? 'btn-primary' : ''}`}
                style={{flex:1,justifyContent:'center',padding:'4px 0',fontSize:11}}
                onClick={() => update({ rotation: deg })}>
                {deg}°
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" style={{marginBottom:6}}>Cor da fonte</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            {PRESET_COLORS.map(c => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => update({ color: c.value })}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: c.value,
                  border: currentColor === c.value
                    ? '2.5px solid var(--accent)'
                    : '2px solid var(--line)',
                  boxShadow: currentColor === c.value ? '0 0 0 2px var(--accent-bg)' : 'none',
                  transition: 'all .15s',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              />
            ))}
            {/* Custom color picker */}
            <label title="Cor personalizada" style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px dashed var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
              background: 'var(--bg-base)',
            }}>
              <I.Plus size={12}/>
              <input type="color" value={currentColor}
                onChange={e => update({ color: e.target.value })}
                style={{
                  opacity: 0, position: 'absolute',
                  width: 0, height: 0, pointerEvents: 'none',
                }}/>
            </label>
          </div>
          {/* Show current color hex if custom */}
          {!PRESET_COLORS.find(c => c.value === currentColor) && (
            <div style={{
              marginTop: 6, fontSize: 11, color: 'var(--ink-muted)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                background: currentColor, border: '1px solid var(--line)',
                display: 'inline-block', flexShrink: 0,
              }}/>
              Cor personalizada: <code style={{fontFamily:'monospace'}}>{currentColor}</code>
            </div>
          )}
        </div>
      </div>

      <div className="divider"/>
      <div className="panel-section" style={{flexDirection:'row',gap:8}}>
        <button className="btn btn-ghost" onClick={onEdit} style={{flex:1,justifyContent:'center'}}>
          <I.Edit size={14}/> Editar inline
        </button>
        <button className="btn btn-danger" onClick={() => onDelete(text)}>
          <I.Trash size={14}/>
        </button>
      </div>
    </>
  );
}

/* ============ MAP OVERVIEW (nothing selected) ============ */
function MapOverview({ map, updateMap, allMaps, selection, setSelection }) {
  return (
    <>
      <div className="panel-section">
        <div className="field">
          <label className="field-label">Nome do mapa</label>
          <input className="field-input" value={map.name}
            onChange={e => updateMap(m => ({ ...m, name: e.target.value }))}/>
        </div>
      </div>

      <div className="divider"/>

      <div className="panel-section">
        <label className="field-label">Pontos de interesse ({map.pois.length})</label>
        {map.pois.length === 0 ? (
          <div className="empty">
            <div className="empty-display">Nenhum ponto ainda.</div>
            <div>Use a ferramenta <strong>pino</strong> na barra lateral para adicionar.</div>
          </div>
        ) : (
          <div className="poi-list">
            {map.pois.map((p, i) => {
              const active = selection?.type === 'poi' && selection.id === p.id;
              const sm = p.childMapId ? allMaps[p.childMapId] : null;
              return (
                <button key={p.id} className={`poi-list-item ${active ? 'active' : ''}`}
                  onClick={() => setSelection({ type: 'poi', id: p.id })}>
                  <div className={`poi-list-marker ${sm ? 'has-submap' : ''}`}>
                    {sm ? <I.Layers size={11}/> : (i + 1)}
                  </div>
                  <div className="poi-list-info">
                    <div className="poi-list-name">{p.name || `Ponto ${i + 1}`}</div>
                    {sm && <div className="poi-list-sub">↳ {sm.name}</div>}
                  </div>
                  <I.ChevronRight size={14}/>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {map.texts.length > 0 && (
        <>
          <div className="divider"/>
          <div className="panel-section">
            <label className="field-label">Textos ({map.texts.length})</label>
            <div className="poi-list">
              {map.texts.map(t => {
                const active = selection?.type === 'text' && selection.id === t.id;
                return (
                  <button key={t.id} className={`poi-list-item ${active ? 'active' : ''}`}
                    onClick={() => setSelection({ type: 'text', id: t.id })}>
                    <div className="poi-list-marker" style={{background:'var(--gold)'}}>
                      <I.Type size={11}/>
                    </div>
                    <div className="poi-list-info">
                      <div className="poi-list-name">{t.content || 'Texto vazio'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ============ MAIN APP ============ */
function App() {
  const [maps, setMaps] = useState({});
  const [rootMapId, setRootMapId] = useState(null);
  const [stack, setStack] = useState([]);
  const [viewports, setViewports] = useState({});
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [selection, setSelection] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const currentMapId = stack[stack.length - 1] || null;
  const currentMap = currentMapId ? maps[currentMapId] : null;

  const updateMap = useCallback((updater) => {
    setMaps(prev => {
      const m = prev[currentMapId];
      if (!m) return prev;
      const next = typeof updater === 'function' ? updater(m) : { ...m, ...updater };
      return { ...prev, [currentMapId]: next };
    });
  }, [currentMapId]);

  const viewport = currentMapId ? viewports[currentMapId] : null;
  const setViewport = useCallback((updater) => {
    setViewports(prev => {
      const v = prev[currentMapId];
      const nv = typeof updater === 'function' ? updater(v) : updater;
      return { ...prev, [currentMapId]: nv };
    });
  }, [currentMapId]);

  const handleLoadRoot = ({ dataUrl, w, h, name }) => {
    const m = makeMap({ imageUrl: dataUrl, imgW: w, imgH: h, name });
    setMaps({ [m.id]: m });
    setRootMapId(m.id);
    setStack([m.id]);
    setSelection(null);
  };

  const handleExport = () => {
    const data = JSON.stringify({ version: 1, rootMapId, maps }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = maps[rootMapId]?.name || 'cartografo';
    a.download = `${name.replace(/\s+/g, '_')}.cartografo.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = (data) => {
    if (!data || !data.maps || !data.rootMapId) { alert('Arquivo inválido'); return; }
    setMaps(data.maps);
    setRootMapId(data.rootMapId);
    setStack([data.rootMapId]);
    setViewports({});
    setSelection(null);
  };

  const enterSubmap = (mapId) => {
    if (!maps[mapId]) return;
    setStack(s => [...s, mapId]);
    setSelection(null);
    setEditingTextId(null);
  };
  const goBack = () => {
    if (stack.length > 1) {
      setStack(s => s.slice(0, -1));
      setSelection(null);
      setEditingTextId(null);
    }
  };
  const goTo = (index) => {
    setStack(s => s.slice(0, index + 1));
    setSelection(null);
    setEditingTextId(null);
  };

  const createSubmap = (poi, { dataUrl, w, h, name }) => {
    const sm = makeMap({ imageUrl: dataUrl, imgW: w, imgH: h, name, parentId: currentMapId });
    setMaps(prev => ({
      ...prev,
      [sm.id]: sm,
      [currentMapId]: {
        ...prev[currentMapId],
        pois: prev[currentMapId].pois.map(p => p.id === poi.id ? { ...p, childMapId: sm.id } : p),
      },
    }));
  };
  const removeSubmap = (poi) => {
    if (!confirm('Remover o submapa deste ponto? Todo o conteúdo aninhado será apagado.')) return;
    const toDelete = new Set();
    const queue = [poi.childMapId];
    while (queue.length) {
      const id = queue.shift();
      if (!id || toDelete.has(id)) continue;
      toDelete.add(id);
      const mm = maps[id];
      if (mm) mm.pois.forEach(p => { if (p.childMapId) queue.push(p.childMapId); });
    }
    setMaps(prev => {
      const next = { ...prev };
      toDelete.forEach(id => delete next[id]);
      next[currentMapId] = {
        ...prev[currentMapId],
        pois: prev[currentMapId].pois.map(p => p.id === poi.id ? { ...p, childMapId: null } : p),
      };
      return next;
    });
  };

  const deletePoi = (poi) => {
    if (poi.childMapId && !confirm('Este ponto tem um submapa. Excluir tudo?')) return;
    const toDelete = new Set();
    if (poi.childMapId) {
      const queue = [poi.childMapId];
      while (queue.length) {
        const id = queue.shift();
        if (!id || toDelete.has(id)) continue;
        toDelete.add(id);
        const mm = maps[id];
        if (mm) mm.pois.forEach(p => { if (p.childMapId) queue.push(p.childMapId); });
      }
    }
    setMaps(prev => {
      const next = { ...prev };
      toDelete.forEach(id => delete next[id]);
      next[currentMapId] = {
        ...prev[currentMapId],
        pois: prev[currentMapId].pois.filter(p => p.id !== poi.id),
      };
      return next;
    });
    setSelection(null);
  };

  const deleteText = (txt) => {
    updateMap(m => ({ ...m, texts: m.texts.filter(t => t.id !== txt.id) }));
    setSelection(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentMap) return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'v' || e.key === 'V') setTool(TOOLS.SELECT);
      else if (e.key === 'p' || e.key === 'P') setTool(TOOLS.POI);
      else if (e.key === 't' || e.key === 'T') setTool(TOOLS.TEXT);
      else if (e.key === 'Escape') {
        if (editingTextId) setEditingTextId(null);
        else if (selection) setSelection(null);
        else if (tool !== TOOLS.SELECT) setTool(TOOLS.SELECT);
        else if (stack.length > 1) goBack();
      } else if (e.key === '+' || e.key === '=') {
        setViewport(vp => vp && ({ ...vp, scale: clamp(vp.scale * 1.2, 0.05, 20) }));
      } else if (e.key === '-' || e.key === '_') {
        setViewport(vp => vp && ({ ...vp, scale: clamp(vp.scale / 1.2, 0.05, 20) }));
      } else if (e.key === '0') {
        setViewport(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection?.type === 'poi') {
          const p = currentMap.pois.find(x => x.id === selection.id);
          if (p) deletePoi(p);
        } else if (selection?.type === 'text') {
          const t = currentMap.texts.find(x => x.id === selection.id);
          if (t) deleteText(t);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentMap, selection, editingTextId, tool, stack.length, setViewport]);

  if (!currentMap) {
    return <Welcome onLoad={handleLoadRoot} onImport={handleImport}/>;
  }

  const selectedPoi = selection?.type === 'poi' ? currentMap.pois.find(p => p.id === selection.id) : null;
  const selectedText = selection?.type === 'text' ? currentMap.texts.find(t => t.id === selection.id) : null;
  const selectedPoiIndex = selectedPoi ? currentMap.pois.indexOf(selectedPoi) : -1;
  const selectedSubmap = selectedPoi?.childMapId ? maps[selectedPoi.childMapId] : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><I.Compass size={18} strokeWidth={1.7}/></div>
          <div className="brand-text">
            <span className="brand-name">Cartógrafo</span>
            <span className="brand-sub">Mapas aninhados</span>
          </div>
        </div>
        <div className="breadcrumb">
          {stack.length > 1 && (
            <button className="btn btn-icon" onClick={goBack} title="Voltar (Esc)" style={{marginRight:4}}>
              <I.ArrowLeft size={16}/>
            </button>
          )}
          {stack.map((id, i) => {
            const m = maps[id];
            const isLast = i === stack.length - 1;
            return (
              <React.Fragment key={id}>
                {i > 0 && <span className="crumb-sep"><I.ChevronRight size={14}/></span>}
                <button className={`crumb ${isLast ? 'active' : ''}`}
                  onClick={() => !isLast && goTo(i)}
                  disabled={isLast}>
                  {i === 0 ? <I.Map size={13}/> : <I.Layers size={12}/>}
                  {m?.name || 'Mapa'}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="top-actions">
          <button className="btn btn-ghost" onClick={handleExport} title="Exportar projeto">
            <I.Download size={15}/><span>Exportar</span>
          </button>
          <button className="btn btn-ghost" onClick={() => {
            if (confirm('Começar um novo projeto? O atual será perdido se não for exportado.')) {
              setMaps({}); setRootMapId(null); setStack([]); setViewports({}); setSelection(null);
            }
          }} title="Novo projeto">
            <I.Plus size={15}/><span>Novo</span>
          </button>
          <button className="btn btn-icon" onClick={() => setPanelOpen(o => !o)} aria-label="Alternar painel">
            <I.Menu size={16}/>
          </button>
        </div>
      </header>

      <div className={`shell ${!panelOpen ? 'no-panel' : ''}`}>
        <Toolbar tool={tool} setTool={setTool}
          onZoomIn={() => setViewport(vp => vp && ({...vp, scale: clamp(vp.scale * 1.25, 0.05, 20)}))}
          onZoomOut={() => setViewport(vp => vp && ({...vp, scale: clamp(vp.scale / 1.25, 0.05, 20)}))}
          onReset={() => setViewport(null)}/>

        <MapCanvas
          map={currentMap}
          viewport={viewport}
          setViewport={setViewport}
          tool={tool}
          setTool={setTool}
          selection={selection}
          setSelection={setSelection}
          editingTextId={editingTextId}
          setEditingTextId={setEditingTextId}
          updateMap={updateMap}
          onEnterSubmap={enterSubmap}
        />

        {panelOpen && (
          <aside className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <div className="panel-title-icon">
                  {selectedPoi ? <I.Pin size={14}/> :
                   selectedText ? <I.Type size={14}/> :
                   <I.Map size={14}/>}
                </div>
                <span className="panel-title-text">
                  {selectedPoi ? (selectedPoi.name || `Ponto ${selectedPoiIndex + 1}`) :
                   selectedText ? 'Texto' :
                   currentMap.name}
                </span>
              </div>
              {selection && (
                <button className="btn btn-icon" onClick={() => setSelection(null)} title="Fechar">
                  <I.X size={15}/>
                </button>
              )}
            </div>
            <div className="panel-body">
              {selectedPoi ? (
                <POIDetails
                  poi={selectedPoi}
                  index={selectedPoiIndex}
                  updateMap={updateMap}
                  onEnterSubmap={enterSubmap}
                  onCreateSubmap={createSubmap}
                  onRemoveSubmap={removeSubmap}
                  onDelete={deletePoi}
                  submap={selectedSubmap}/>
              ) : selectedText ? (
                <TextDetails
                  text={selectedText}
                  updateMap={updateMap}
                  onDelete={deleteText}
                  onEdit={() => setEditingTextId(selectedText.id)}/>
              ) : (
                <MapOverview
                  map={currentMap}
                  updateMap={updateMap}
                  allMaps={maps}
                  selection={selection}
                  setSelection={setSelection}/>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);