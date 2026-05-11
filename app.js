/* ============================================================
   Cartógrafo — Mapas Interativos Aninhados  •  app.js
   Upgrades: dark mode, POI tags, PNG export, map transitions,
             localStorage autosave, URL share, compass fixes
   ============================================================ */
const { useState, useRef, useEffect, useCallback, useMemo } = React;

/* ── HELPERS ── */
const uid = () => Math.random().toString(36).slice(2,11);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

/* ── POI TAGS ── */
const POI_TAGS = [
  { id:'city',     label:'Cidade',    icon:'🏰', bg:'#3a6a9e', fg:'#fff' },
  { id:'dungeon',  label:'Masmorra',  icon:'💀', bg:'#4a2a5e', fg:'#fff' },
  { id:'forest',   label:'Floresta',  icon:'🌲', bg:'#3a6a3a', fg:'#fff' },
  { id:'tavern',   label:'Taverna',   icon:'🍺', bg:'#8a5a2a', fg:'#fff' },
  { id:'temple',   label:'Templo',    icon:'⛩️', bg:'#c19b3b', fg:'#1c2a3e' },
  { id:'port',     label:'Porto',     icon:'⚓', bg:'#2a5a7a', fg:'#fff' },
  { id:'battle',   label:'Batalha',   icon:'⚔️', bg:'#9e3a3a', fg:'#fff' },
  { id:'mystery',  label:'Mistério',  icon:'🔮', bg:'#5a3a7a', fg:'#fff' },
  { id:'camp',     label:'Acampamento',icon:'🏕️',bg:'#6a6a3a', fg:'#fff' },
  { id:'landmark', label:'Marco',     icon:'🏛️', bg:'#6a5a4a', fg:'#fff' },
];
const TAG_MAP = Object.fromEntries(POI_TAGS.map(t=>[t.id,t]));

/* ── ICONS ── */
const Ico = ({ d, size=18, strokeWidth=2, fill='none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {typeof d==='string' ? <path d={d}/> : d}
  </svg>
);
const I = {
  Cursor:   p=><Ico {...p} d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="currentColor" strokeWidth="1.5"/>,
  Pin:      p=><Ico {...p} d={<><path d="M12 22s-7-7-7-13a7 7 0 1114 0c0 6-7 13-7 13z"/><circle cx="12" cy="9" r="2.5"/></>}/>,
  Type:     p=><Ico {...p} d={<><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>}/>,
  ZoomIn:   p=><Ico {...p} d={<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></>}/>,
  ZoomOut:  p=><Ico {...p} d={<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></>}/>,
  Maximize: p=><Ico {...p} d={<><path d="M8 3H5a2 2 0 00-2 2v3"/><path d="M21 8V5a2 2 0 00-2-2h-3"/><path d="M3 16v3a2 2 0 002 2h3"/><path d="M16 21h3a2 2 0 002-2v-3"/></>}/>,
  Trash:    p=><Ico {...p} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></>}/>,
  X:        p=><Ico {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>,
  Plus:     p=><Ico {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>,
  Upload:   p=><Ico {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}/>,
  Download: p=><Ico {...p} d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}/>,
  ChevronRight: p=><Ico {...p} d="M9 18l6-6-6-6"/>,
  ArrowLeft:p=><Ico {...p} d={<><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>}/>,
  Layers:   p=><Ico {...p} d={<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>}/>,
  Compass:  p=><Ico {...p} d={<><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>}/>,
  Map:      p=><Ico {...p} d={<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>}/>,
  Info:     p=><Ico {...p} d={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>}/>,
  Enter:    p=><Ico {...p} d={<><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>}/>,
  Edit:     p=><Ico {...p} d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>}/>,
  Menu:     p=><Ico {...p} d={<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}/>,
  Moon:     p=><Ico {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>,
  Sun:      p=><Ico {...p} d={<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>}/>,
  Image:    p=><Ico {...p} d={<><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>}/>,
  Link:     p=><Ico {...p} d={<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>}/>,
  Check:    p=><Ico {...p} d="M20 6L9 17l-5-5"/>,
  Rotate:   p=><Ico {...p} d={<><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 11-.57-8.38"/></>}/>,
};

const TOOLS = { SELECT:'select', POI:'poi', TEXT:'text' };
const LS_KEY = 'cartografo_v1';

const makeMap = ({ imageUrl, imgW, imgH, name='Mapa', parentId=null }) => ({
  id:uid(), name, imageUrl, imgW, imgH, parentId, pois:[], texts:[],
});

const loadImage = file => new Promise((res,rej) => {
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => res({ dataUrl:e.target.result, w:img.naturalWidth, h:img.naturalHeight });
    img.onerror = rej;
    img.src = e.target.result;
  };
  r.onerror = rej;
  r.readAsDataURL(file);
});

/* ── TOAST ── */
function Toast({ messages }) {
  return (
    <div className="toast-wrap">
      {messages.map(m => (
        <div key={m.id} className="toast">
          {m.icon && <span>{m.icon}</span>}
          {m.text}
        </div>
      ))}
    </div>
  );
}



/* ── WELCOME ── */
function Welcome({ onLoad, onImport }) {
  const imgRef = useRef(null), jsonRef = useRef(null);
  const handleFile = async file => {
    if (!file || !file.type.startsWith('image/')) return;
    const { dataUrl, w, h } = await loadImage(file);
    onLoad({ dataUrl, w, h, name: file.name.replace(/\.[^.]+$/,'') });
  };
  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-emblem"><I.Compass size={32} strokeWidth={1.6}/></div>
        <h1 className="welcome-title display">O <em>Cartógrafo</em></h1>
        <p className="welcome-sub">Mapeando sua Jornada Épica, desde o pequeno vilarejo no interior, até o Ninho do Dragão... que por acaso fica em um vulcão</p>
        <div className="welcome-actions">
          <button className="btn btn-primary" onClick={() => imgRef.current?.click()}><I.Upload size={16}/> Carregar imagem</button>
          <button className="btn btn-ghost" onClick={() => jsonRef.current?.click()}><I.Download size={16}/> Importar projeto</button>
          <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>handleFile(e.target.files?.[0])}/>
          <input ref={jsonRef} type="file" accept="application/json,.json" style={{display:'none'}}
            onChange={e=>{const f=e.target.files?.[0];if(!f)return;const fr=new FileReader();fr.onload=ev=>{try{onImport(JSON.parse(ev.target.result))}catch{alert('Arquivo inválido')}};fr.readAsText(f);}}/>
        </div>
        <div className="welcome-features">
          <div className="feat"><div className="feat-icon"><I.Pin size={16}/></div><div className="feat-title">Pontos de interesse</div><div className="feat-desc">Marque locais com tags, nomes e descrições.</div></div>
          <div className="feat"><div className="feat-icon"><I.Layers size={16}/></div><div className="feat-title">Mapas Interativos</div><div className="feat-desc">Cada ponto pode esconder outro mapa em infinitos níveis.</div></div>
          <div className="feat"><div className="feat-icon"><I.Type size={16}/></div><div className="feat-title">Textos e legendas</div><div className="feat-desc">Anotações com cor, tamanho e rotação.</div></div>
        </div>
      </div>
    </div>
  );
}

/* ── TOOLBAR ── */
function Toolbar({ tool, setTool, onZoomIn, onZoomOut, onReset, darkMode, onToggleDark }) {
  const Tool = ({ id, label, kbd, children }) => (
    <button className={`tool ${tool===id?'active':''}`} onClick={()=>setTool(id)} aria-label={label}>
      {children}<span className="tip">{label}{kbd&&<kbd>{kbd}</kbd>}</span>
    </button>
  );
  return (
    <div className="toolbar">
      <Tool id={TOOLS.SELECT} label="Selecionar / mover" kbd="V"><I.Cursor/></Tool>
      <Tool id={TOOLS.POI} label="Adicionar ponto" kbd="P"><I.Pin/></Tool>
      <Tool id={TOOLS.TEXT} label="Adicionar texto" kbd="T"><I.Type/></Tool>
      <div className="tool-sep"/>
      <button className="tool" onClick={onZoomIn}><I.ZoomIn/><span className="tip">Aumentar zoom<kbd>+</kbd></span></button>
      <button className="tool" onClick={onZoomOut}><I.ZoomOut/><span className="tip">Diminuir zoom<kbd>−</kbd></span></button>
      <button className="tool" onClick={onReset}><I.Maximize/><span className="tip">Ajustar à tela<kbd>0</kbd></span></button>
      <div className="tool-sep"/>
      <button className="tool" onClick={onToggleDark} title={darkMode?'Modo claro':'Modo escuro'}>
        {darkMode ? <I.Sun size={18}/> : <I.Moon size={18}/>}
        <span className="tip">{darkMode?'Modo claro':'Modo escuro'}<kbd>D</kbd></span>
      </button>
    </div>
  );
}

/* ── TEXT ANNOTATION ── */
function TextAnnotation({ text, selected, editing, onPointerDown, onClick, onDoubleClick, onCommit, onCancel }) {
  const inputRef = useRef(null);
  const [val, setVal] = useState(text.content);
  useEffect(()=>{ setVal(text.content); },[text.content]);
  useEffect(()=>{ if(editing&&inputRef.current){inputRef.current.focus();inputRef.current.select();} },[editing]);
  const rotation = text.rotation || 0;
  const color = text.color || 'var(--ink)';
  return (
    <div className={`text-ann ${selected?'selected':''}`}
      style={{ left:`${text.x}px`, top:`${text.y}px`, fontSize:`${text.size||18}px`,
               transform:`translate(-50%,-50%) rotate(${rotation}deg)`,
               color: selected ? undefined : color }}
      onPointerDown={editing?undefined:onPointerDown}
      onClick={editing?undefined:onClick}
      onDoubleClick={editing?undefined:onDoubleClick}>
      {editing ? (
        <input ref={inputRef} className="text-ann-input" value={val}
          style={{fontSize:`${text.size||18}px`,color}}
          onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onCommit(val);}else if(e.key==='Escape'){e.preventDefault();onCancel();}}}
          onBlur={()=>onCommit(val)}/>
      ) : (text.content||'Texto')}
    </div>
  );
}

/* ── MAP CANVAS ── */
function MapCanvas({ map, viewport, setViewport, tool, setTool,
  selection, setSelection, editingTextId, setEditingTextId,
  updateMap, onEnterSubmap, transitioning }) {

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [hintVisible, setHintVisible] = useState(true);
  const hintTimer = useRef(null);

  // Auto-hide hint after 4s; reset whenever tool changes
  useEffect(()=>{
    setHintVisible(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(()=>setHintVisible(false), 4000);
    return ()=>clearTimeout(hintTimer.current);
  },[tool]);

  const fitToView = useCallback(()=>{
    const wrap=wrapRef.current; if(!wrap||!map) return;
    const rect=wrap.getBoundingClientRect();
    const p=40, sx=(rect.width-p*2)/map.imgW, sy=(rect.height-p*2)/map.imgH;
    const s=Math.min(sx,sy,1.5);
    setViewport({ scale:s, x:(rect.width-map.imgW*s)/2, y:(rect.height-map.imgH*s)/2 });
  },[map,setViewport]);

  useEffect(()=>{ if(!viewport) fitToView(); },[viewport,fitToView]);

  useEffect(()=>{
    const el=wrapRef.current; if(!el) return;
    const onWheel=e=>{
      e.preventDefault();
      const rect=el.getBoundingClientRect();
      const mx=e.clientX-rect.left, my=e.clientY-rect.top;
      const factor=Math.exp(-e.deltaY*.0015);
      setViewport(vp=>{
        if(!vp) return vp;
        const ns=clamp(vp.scale*factor,.05,20), f=ns/vp.scale;
        return { scale:ns, x:mx-(mx-vp.x)*f, y:my-(my-vp.y)*f };
      });
    };
    el.addEventListener('wheel',onWheel,{passive:false});
    return ()=>el.removeEventListener('wheel',onWheel);
  },[setViewport]);

  const screenToImage=(cx,cy)=>{
    const rect=wrapRef.current.getBoundingClientRect();
    return { x:(cx-rect.left-viewport.x)/viewport.scale, y:(cy-rect.top-viewport.y)/viewport.scale };
  };

  const onCanvasPointerDown=e=>{
    if(e.button!==0) return;
    if(e.target.closest('.poi')||e.target.closest('.text-ann')) return;
    const sx=e.clientX, sy=e.clientY, startVp=viewport;
    let mode='pending';
    const onMove=ev=>{
      const dx=ev.clientX-sx, dy=ev.clientY-sy;
      if(mode==='pending'&&Math.hypot(dx,dy)>3){ mode='pan'; canvasRef.current?.classList.add('dragging'); }
      if(mode==='pan') setViewport({scale:startVp.scale,x:startVp.x+dx,y:startVp.y+dy});
    };
    const onUp=ev=>{
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      canvasRef.current?.classList.remove('dragging');
      if(mode==='pending'){
        const pt=screenToImage(ev.clientX,ev.clientY);
        const inside=pt.x>=0&&pt.y>=0&&pt.x<=map.imgW&&pt.y<=map.imgH;
        if(tool===TOOLS.POI&&inside){
          const np={id:uid(),x:pt.x,y:pt.y,name:'',description:'',childMapId:null,tagId:null};
          updateMap(m=>({...m,pois:[...m.pois,np]}));
          setSelection({type:'poi',id:np.id}); setTool(TOOLS.SELECT);
        } else if(tool===TOOLS.TEXT&&inside){
          const nt={id:uid(),x:pt.x,y:pt.y,content:'Texto',size:18};
          updateMap(m=>({...m,texts:[...m.texts,nt]}));
          setSelection({type:'text',id:nt.id}); setEditingTextId(nt.id); setTool(TOOLS.SELECT);
        } else { setSelection(null); }
      }
    };
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp);
  };

  const onPoiPointerDown=poi=>e=>{
    if(e.button!==0) return; e.stopPropagation();
    const sx=e.clientX, sy=e.clientY, sp={x:poi.x,y:poi.y};
    let moved=false;
    const onMove=ev=>{
      const dx=(ev.clientX-sx)/viewport.scale, dy=(ev.clientY-sy)/viewport.scale;
      if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>3) moved=true;
      if(moved) updateMap(m=>({...m,pois:m.pois.map(p=>p.id===poi.id?{...p,x:clamp(sp.x+dx,0,map.imgW),y:clamp(sp.y+dy,0,map.imgH)}:p)}));
    };
    const onUp=()=>{ window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onUp); };
    window.addEventListener('pointermove',onMove); window.addEventListener('pointerup',onUp);
  };

  const onTextPointerDown=txt=>e=>{
    if(e.button!==0) return; e.stopPropagation();
    const sx=e.clientX, sy=e.clientY, st={x:txt.x,y:txt.y};
    let moved=false;
    const onMove=ev=>{
      const dx=(ev.clientX-sx)/viewport.scale, dy=(ev.clientY-sy)/viewport.scale;
      if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>3) moved=true;
      if(moved) updateMap(m=>({...m,texts:m.texts.map(t=>t.id===txt.id?{...t,x:clamp(st.x+dx,0,map.imgW),y:clamp(st.y+dy,0,map.imgH)}:t)}));
    };
    const onUp=()=>{ window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onUp); };
    window.addEventListener('pointermove',onMove); window.addEventListener('pointerup',onUp);
  };

  const zoomAtCenter=factor=>setViewport(vp=>{
    if(!vp) return vp;
    const r=wrapRef.current.getBoundingClientRect(), mx=r.width/2, my=r.height/2;
    const ns=clamp(vp.scale*factor,.05,20), f=ns/vp.scale;
    return {scale:ns,x:mx-(mx-vp.x)*f,y:my-(my-vp.y)*f};
  });

  if(!viewport) return <div className="canvas-wrap" ref={wrapRef}/>;

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      {/* transition flash */}
      <div className={`map-flash ${transitioning?'show':''}`}/>

      <div className={`canvas ${tool===TOOLS.POI?'add-mode':''} ${tool===TOOLS.TEXT?'add-mode-text':''}`}
        ref={canvasRef} onPointerDown={onCanvasPointerDown}>
        <div className="canvas-content" style={{transform:`translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`}}>
          <img className="map-image" src={map.imageUrl} alt={map.name}
            style={{width:`${map.imgW}px`,height:`${map.imgH}px`}} draggable={false}/>
          {map.texts.map(t=>(
            <TextAnnotation key={t.id} text={t}
              selected={selection?.type==='text'&&selection.id===t.id}
              editing={editingTextId===t.id}
              onPointerDown={onTextPointerDown(t)}
              onClick={e=>{e.stopPropagation();setSelection({type:'text',id:t.id});}}
              onDoubleClick={e=>{e.stopPropagation();setEditingTextId(t.id);}}
              onCommit={val=>{updateMap(m=>({...m,texts:m.texts.map(x=>x.id===t.id?{...x,content:val}:x)}));setEditingTextId(null);}}
              onCancel={()=>setEditingTextId(null)}/>
          ))}
        </div>
      </div>

      {/* POI overlay — screen space */}
      <div className="poi-overlay">
        {map.pois.map((p,i)=>{
          const sx=viewport.x+p.x*viewport.scale, sy=viewport.y+p.y*viewport.scale;
          const sel=selection?.type==='poi'&&selection.id===p.id;
          const tag=p.tagId?TAG_MAP[p.tagId]:null;
          const dotBg=tag?tag.bg:'var(--accent)';
          const dotShape=p.childMapId?'8px':'50%';
          return (
            <div key={p.id}
              className={`poi ${sel?'selected':''} ${p.childMapId?'has-submap':''}`}
              style={{left:`${sx}px`,top:`${sy}px`}}
              onPointerDown={onPoiPointerDown(p)}
              onClick={e=>{e.stopPropagation();setSelection({type:'poi',id:p.id});}}
              onDoubleClick={e=>{e.stopPropagation();if(p.childMapId)onEnterSubmap(p.childMapId);else setSelection({type:'poi',id:p.id});}}
              title={p.name||`Ponto ${i+1}`}>
              <div className="poi-dot" style={{background:sel?undefined:dotBg,borderRadius:dotShape}}>
                {tag ? <span style={{fontSize:p.childMapId?12:13,lineHeight:1}}>{tag.icon}</span>
                  : <span className="poi-num">{i+1}</span>}
              </div>
              {p.name&&<div className="poi-label">{p.name}</div>}
            </div>
          );
        })}
      </div>

      {/* Right controls column */}
      <div className="map-controls">
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={()=>zoomAtCenter(1.25)}><I.Plus size={16}/></button>
          <div className="zoom-level">{Math.round(viewport.scale*100)}%</div>
          <button className="zoom-btn" onClick={()=>zoomAtCenter(1/1.25)}><I.ZoomOut size={16}/></button>
          <button className="zoom-btn" onClick={fitToView}><I.Maximize size={15}/></button>
        </div>
      </div>

      <div className={`hint ${hintVisible?'hint-show':'hint-hide'}`}>
        <I.Info size={14} className="hint-icon"/>
        {tool===TOOLS.POI&&<span>Clique no mapa para adicionar um <strong>ponto de interesse</strong>.</span>}
        {tool===TOOLS.TEXT&&<span>Clique no mapa para adicionar um <strong>texto</strong>.</span>}
        {tool===TOOLS.SELECT&&<span>Arraste para mover · <kbd>scroll</kbd> para zoom · clique duplo num ponto para abrir submapa</span>}
      </div>

      {/* Info button — only visible when hint is hidden */}
      <button
        className={`hint-info-btn ${hintVisible?'hint-info-hidden':''}`}
        onClick={()=>{
          setHintVisible(true);
          clearTimeout(hintTimer.current);
          hintTimer.current = setTimeout(()=>setHintVisible(false), 4000);
        }}
        title="Mostrar dicas"
      >
        <I.Info size={14}/>
      </button>
    </div>
  );
}

/* ── POI DETAILS ── */
function POIDetails({ poi, index, updateMap, onEnterSubmap, onCreateSubmap, onRemoveSubmap, onDelete, submap }) {
  const update = patch => updateMap(m=>({...m,pois:m.pois.map(p=>p.id===poi.id?{...p,...patch}:p)}));
  const subRef = useRef(null);
  const currentTag = poi.tagId || null;

  return (
    <>
      <div className="panel-section">
        <div className="field">
          <label className="field-label">Nome</label>
          <input className="field-input" value={poi.name} placeholder={`Ponto ${index+1}`}
            onChange={e=>update({name:e.target.value})}/>
        </div>
        <div className="field">
          <label className="field-label">Descrição</label>
          <textarea className="field-area" value={poi.description} placeholder="Notas, lendas, observações…"
            onChange={e=>update({description:e.target.value})}/>
        </div>
        <div className="field">
          <label className="field-label">Categoria</label>
          <div className="tag-grid">
            {POI_TAGS.map(t=>(
              <button key={t.id}
                className={`tag-btn ${currentTag===t.id?'active':''}`}
                style={{background:t.bg,color:t.fg}}
                onClick={()=>update({tagId:currentTag===t.id?null:t.id})}
                title={t.label}>
                <span>{t.icon}</span><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divider"/>

      <div className="panel-section">
        <label className="field-label">Mapa aninhado</label>
        {submap ? (
          <div className="submap-card">
            <div className="submap-thumb" style={{backgroundImage:`url(${submap.imageUrl})`}}/>
            <div className="submap-info">
              <div style={{minWidth:0,flex:1}}>
                <div className="submap-name">{submap.name}</div>
                <div className="submap-meta">{submap.pois.length} pontos · {submap.texts.length} textos</div>
              </div>
              <button className="btn btn-icon" onClick={()=>onRemoveSubmap(poi)} title="Remover submapa"><I.X size={15}/></button>
            </div>
            <div style={{padding:'0 12px 12px'}}>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>onEnterSubmap(submap.id)}>
                <I.Enter size={15}/> Entrar no submapa
              </button>
            </div>
          </div>
        ) : (
          <div className="submap-empty">
            <div className="submap-empty-icon"><I.Layers size={18}/></div>
            <div style={{marginBottom:10}}>Nenhum submapa anexado.<br/>Adicione uma imagem para criar um novo nível.</div>
            <button className="btn btn-ghost" onClick={()=>subRef.current?.click()}><I.Upload size={15}/> Anexar imagem</button>
            <input ref={subRef} type="file" accept="image/*" style={{display:'none'}}
              onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const{dataUrl,w,h}=await loadImage(f);onCreateSubmap(poi,{dataUrl,w,h,name:poi.name||f.name.replace(/\.[^.]+$/,'')});e.target.value='';}}/>
          </div>
        )}
      </div>

      <div className="divider"/>
      <div className="panel-section">
        <button className="btn btn-danger" onClick={()=>onDelete(poi)} style={{justifyContent:'flex-start'}}>
          <I.Trash size={14}/> Excluir ponto
        </button>
      </div>
    </>
  );
}

/* ── TEXT DETAILS ── */
const PRESET_COLORS = [
  {label:'Tinta',   value:'#1c2a3e'},{label:'Terracota',value:'#b85c38'},
  {label:'Ouro',    value:'#c19b3b'},{label:'Verde',    value:'#4a7a45'},
  {label:'Azul',    value:'#3a6a9e'},{label:'Vinho',    value:'#7a2a3e'},
  {label:'Areia',   value:'#8a7455'},{label:'Branco',   value:'#f8f1df'},
];
function TextDetails({ text, updateMap, onDelete, onEdit }) {
  const update = patch => updateMap(m=>({...m,texts:m.texts.map(t=>t.id===text.id?{...t,...patch}:t)}));
  const color = text.color||'#1c2a3e', rotation = text.rotation||0;
  return (
    <>
      <div className="panel-section">
        <div className="field">
          <label className="field-label">Conteúdo</label>
          <textarea className="field-area" value={text.content} onChange={e=>update({content:e.target.value})}/>
        </div>
        <div className="field">
          <label className="field-label">Tamanho: {text.size||18}px</label>
          <input type="range" min="10" max="64" value={text.size||18} onChange={e=>update({size:parseInt(e.target.value,10)})} style={{accentColor:'var(--accent)'}}/>
        </div>
        <div className="field">
          <label className="field-label">Rotação: {rotation}°</label>
          <input type="range" min="-180" max="180" value={rotation} onChange={e=>update({rotation:parseInt(e.target.value,10)})} style={{accentColor:'var(--accent)'}}/>
          <div style={{display:'flex',gap:6,marginTop:4}}>
            {[-90,-45,0,45,90].map(d=>(
              <button key={d} className={`btn btn-ghost ${rotation===d?'btn-primary':''}`}
                style={{flex:1,justifyContent:'center',padding:'4px 0',fontSize:11}}
                onClick={()=>update({rotation:d})}>{d}°</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label" style={{marginBottom:6}}>Cor da fonte</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            {PRESET_COLORS.map(c=>(
              <button key={c.value} title={c.label} onClick={()=>update({color:c.value})}
                style={{width:24,height:24,borderRadius:'50%',background:c.value,border:color===c.value?'2.5px solid var(--accent)':'2px solid var(--line)',boxShadow:color===c.value?'0 0 0 2px var(--accent-bg)':'none',transition:'all .15s',flexShrink:0,cursor:'pointer'}}/>
            ))}
            <label title="Cor personalizada" style={{width:24,height:24,borderRadius:'50%',border:'2px dashed var(--line)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',flexShrink:0,background:'var(--bg-base)'}}>
              <I.Plus size={12}/>
              <input type="color" value={color} onChange={e=>update({color:e.target.value})} style={{opacity:0,position:'absolute',width:0,height:0,pointerEvents:'none'}}/>
            </label>
          </div>
          {!PRESET_COLORS.find(c=>c.value===color)&&(
            <div style={{marginTop:6,fontSize:11,color:'var(--ink-muted)',display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:12,height:12,borderRadius:'50%',background:color,border:'1px solid var(--line)',display:'inline-block',flexShrink:0}}/>
              Cor personalizada: <code style={{fontFamily:'monospace'}}>{color}</code>
            </div>
          )}
        </div>
      </div>
      <div className="divider"/>
      <div className="panel-section" style={{flexDirection:'row',gap:8}}>
        <button className="btn btn-ghost" onClick={onEdit} style={{flex:1,justifyContent:'center'}}><I.Edit size={14}/> Editar inline</button>
        <button className="btn btn-danger" onClick={()=>onDelete(text)}><I.Trash size={14}/></button>
      </div>
    </>
  );
}

/* ── MAP OVERVIEW ── */
function MapOverview({ map, updateMap, allMaps, selection, setSelection, onExportPNG, onShareURL }) {
  return (
    <>
      <div className="panel-section">
        <div className="field">
          <label className="field-label">Nome do mapa</label>
          <input className="field-input" value={map.name} onChange={e=>updateMap(m=>({...m,name:e.target.value}))}/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onExportPNG} title="Exportar mapa como PNG">
            <I.Image size={14}/> Exportar PNG
          </button>
          <button className="btn btn-ghost" style={{flex:1,justifyContent:'center'}} onClick={onShareURL} title="Copiar link compartilhável">
            <I.Link size={14}/> Compartilhar
          </button>
        </div>
      </div>
      <div className="divider"/>
      <div className="panel-section">
        <label className="field-label">Pontos de interesse ({map.pois.length})</label>
        {map.pois.length===0 ? (
          <div className="empty"><div className="empty-display">Nenhum ponto ainda.</div><div>Use a ferramenta <strong>pino</strong> na barra lateral.</div></div>
        ) : (
          <div className="poi-list">
            {map.pois.map((p,i)=>{
              const active=selection?.type==='poi'&&selection.id===p.id;
              const sm=p.childMapId?allMaps[p.childMapId]:null;
              const tag=p.tagId?TAG_MAP[p.tagId]:null;
              return (
                <button key={p.id} className={`poi-list-item ${active?'active':''}`} onClick={()=>setSelection({type:'poi',id:p.id})}>
                  <div className={`poi-list-marker ${sm?'has-submap':''}`} style={{background:tag?tag.bg:undefined,borderRadius:sm?'5px':'50%'}}>
                    {tag?<span style={{fontSize:12}}>{tag.icon}</span>:(i+1)}
                  </div>
                  <div className="poi-list-info">
                    <div className="poi-list-name">{p.name||`Ponto ${i+1}`}</div>
                    {sm&&<div className="poi-list-sub">↳ {sm.name}</div>}
                    {tag&&!sm&&<div className="poi-list-sub">{tag.label}</div>}
                  </div>
                  <I.ChevronRight size={14}/>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {map.texts.length>0&&(
        <>
          <div className="divider"/>
          <div className="panel-section">
            <label className="field-label">Textos ({map.texts.length})</label>
            <div className="poi-list">
              {map.texts.map(t=>{
                const active=selection?.type==='text'&&selection.id===t.id;
                return (
                  <button key={t.id} className={`poi-list-item ${active?'active':''}`} onClick={()=>setSelection({type:'text',id:t.id})}>
                    <div className="poi-list-marker" style={{background:'var(--gold)'}}><I.Type size={11}/></div>
                    <div className="poi-list-info"><div className="poi-list-name">{t.content||'Texto vazio'}</div></div>
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

/* ── EXPORT PNG ── */
async function exportMapAsPNG(map) {
  return new Promise((resolve,reject)=>{
    const canvas = document.createElement('canvas');
    canvas.width = map.imgW; canvas.height = map.imgH;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin='anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      // Draw text annotations
      map.texts.forEach(t=>{
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(((t.rotation||0)*Math.PI)/180);
        ctx.font = `italic ${t.size||18}px 'Georgia',serif`;
        ctx.fillStyle = t.color || '#1c2a3e';
        ctx.shadowColor='rgba(248,241,223,.8)'; ctx.shadowBlur=4;
        ctx.fillText(t.content||'', 0, 0);
        ctx.restore();
      });
      // Draw POI markers
      map.pois.forEach((p,i)=>{
        const tag = p.tagId ? TAG_MAP[p.tagId] : null;
        const r = p.childMapId ? 16 : 14;
        ctx.save();
        ctx.beginPath();
        if(p.childMapId){
          const x=p.x-r, y=p.y-r, s=r*2;
          ctx.roundRect?ctx.roundRect(x,y,s,s,r/2):ctx.rect(x,y,s,s);
        } else { ctx.arc(p.x,p.y,r,0,Math.PI*2); }
        ctx.fillStyle = tag?tag.bg:'#b85c38';
        ctx.fill();
        ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
        // Label
        if(tag){
          ctx.font=`${r}px serif`;
          ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.shadowColor='none'; ctx.shadowBlur=0;
          ctx.fillText(tag.icon,p.x,p.y);
        } else {
          ctx.font=`bold ${r*.8}px 'Georgia',serif`;
          ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.shadowColor='none'; ctx.shadowBlur=0;
          ctx.fillText(String(i+1),p.x,p.y);
        }
        if(p.name){
          ctx.font=`12px sans-serif`; ctx.fillStyle='#1c2a3e';
          ctx.textAlign='center'; ctx.textBaseline='top';
          const tw=ctx.measureText(p.name).width+14;
          ctx.fillStyle='rgba(248,241,223,.9)';
          ctx.beginPath(); ctx.roundRect?ctx.roundRect(p.x-tw/2,p.y+r+4,tw,18,4):ctx.rect(p.x-tw/2,p.y+r+4,tw,18);
          ctx.fill();
          ctx.fillStyle='#1c2a3e';
          ctx.fillText(p.name, p.x, p.y+r+5);
        }
        ctx.restore();
      });
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror=reject;
    img.src=map.imageUrl;
  });
}

/* ── MAIN APP ── */
function App() {
  const [maps, setMaps] = useState({});
  const [rootMapId, setRootMapId] = useState(null);
  const [stack, setStack] = useState([]);
  const [viewports, setViewports] = useState({});
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [selection, setSelection] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [toasts, setToasts] = useState([]);

  const currentMapId = stack[stack.length-1] || null;
  const currentMap = currentMapId ? maps[currentMapId] : null;

  /* ── dark mode sync ── */
  useEffect(()=>{
    document.body.classList.toggle('dark', darkMode);
  },[darkMode]);

  /* ── toast helper ── */
  const toast = useCallback((text, icon='') => {
    const id = uid();
    setToasts(t => [...t, { id, text, icon }]);
    setTimeout(() => setToasts(t => t.filter(m => m.id !== id)), 3000);
  }, []);

  /* ── localStorage autosave ── */
  const saveTimer = useRef(null);
  useEffect(()=>{
    if(!rootMapId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>{
      try {
        const data = JSON.stringify({ version:1, rootMapId, maps });
        localStorage.setItem(LS_KEY, data);
      } catch(e) {/* quota exceeded — silently skip */}
    }, 800);
    return ()=>clearTimeout(saveTimer.current);
  },[maps, rootMapId]);

  /* ── load from URL or localStorage on mount ── */
  useEffect(()=>{
    const tryLoad = (raw, imageRegistry) => {
      try {
        const data = JSON.parse(raw);
        if (!data?.maps || !data?.rootMapId) return false;
        // Restore images from registry if available
        if (imageRegistry) {
          Object.keys(data.maps).forEach(id => {
            if (imageRegistry[id]) data.maps[id].imageUrl = imageRegistry[id];
          });
        }
        setMaps(data.maps);
        setRootMapId(data.rootMapId);
        setStack([data.rootMapId]);
        return true;
      } catch { return false; }
    };

    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        if (hash.startsWith('s:')) {
          // New compact format: s:<shareKey>:<base64>
          const parts = hash.split(':');
          const shareKey = parts[1];
          const encoded = parts.slice(2).join(':'); // in case base64 has colons
          const raw = decodeURIComponent(escape(atob(encoded)));
          // Try to restore images from local registry (same-browser share)
          let imageRegistry = null;
          try { imageRegistry = JSON.parse(localStorage.getItem(`cartografo_img_${shareKey}`)); } catch {}
          const loaded = tryLoad(raw, imageRegistry);
          if (loaded) {
            const hasMissingImages = !imageRegistry || Object.values(JSON.parse(raw).maps).some(m => !imageRegistry[m.id]);
            if (imageRegistry && !hasMissingImages) {
              toast('Projeto carregado via link', '🔗');
            } else {
              toast('Estrutura carregada — reimporte as imagens dos mapas', '🔗');
            }
            window.location.hash = ''; // clean URL
            return;
          }
        } else {
          // Legacy format: plain base64
          const raw = decodeURIComponent(atob(hash));
          if (tryLoad(raw, null)) {
            toast('Projeto carregado via link', '🔗');
            window.location.hash = '';
            return;
          }
        }
      } catch {}
    }

    // Fallback: localStorage autosave
    const saved = localStorage.getItem(LS_KEY);
    if (saved && tryLoad(saved, null)) {
      toast('Projeto restaurado automaticamente', '💾');
    }
  }, []);

  const updateMap = useCallback(updater=>{
    setMaps(prev=>{
      const m=prev[currentMapId]; if(!m) return prev;
      const next=typeof updater==='function'?updater(m):{...m,...updater};
      return {...prev,[currentMapId]:next};
    });
  },[currentMapId]);

  const viewport = currentMapId ? viewports[currentMapId] : null;
  const setViewport = useCallback(updater=>{
    setViewports(prev=>{
      const v=prev[currentMapId];
      const nv=typeof updater==='function'?updater(v):updater;
      return {...prev,[currentMapId]:nv};
    });
  },[currentMapId]);

  /* ── transition helper ── */
  const withTransition = (fn) => {
    setTransitioning(true);
    setTimeout(()=>{ fn(); setTransitioning(false); }, 240);
  };

  const handleLoadRoot = ({ dataUrl, w, h, name }) => {
    const m = makeMap({ imageUrl:dataUrl, imgW:w, imgH:h, name });
    setMaps({ [m.id]:m }); setRootMapId(m.id); setStack([m.id]); setSelection(null);
  };

  const handleExport = () => {
    const data = JSON.stringify({ version:1, rootMapId, maps }, null, 2);
    const blob = new Blob([data],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`${(maps[rootMapId]?.name||'cartografo').replace(/\s+/g,'_')}.cartografo.json`;
    a.click(); URL.revokeObjectURL(url);
    toast('Projeto exportado','📦');
  };
  const handleImport = (data) => {
    if(!data||!data.maps||!data.rootMapId){ alert('Arquivo inválido'); return; }
    setMaps(data.maps); setRootMapId(data.rootMapId); setStack([data.rootMapId]); setViewports({}); setSelection(null);
    toast('Projeto importado','✅');
  };

  const handleExportPNG = async () => {
    if(!currentMap) return;
    try {
      const dataUrl = await exportMapAsPNG(currentMap);
      const a = document.createElement('a');
      a.href=dataUrl; a.download=`${currentMap.name.replace(/\s+/g,'_')}.png`;
      a.click();
      toast('Mapa exportado como PNG','🖼️');
    } catch(e){ toast('Erro ao exportar PNG','❌'); }
  };

  /* ── SHARE URL (compact) ──────────────────────────────────────────────────
     Images (base64) are the bulk of the data — they can't go in a URL.
     Strategy:
       1. Strip imageUrl from every map → store stripped project in URL hash
       2. Persist a separate imageRegistry { [mapId]: imageUrl } in localStorage
          under a short share-key so the recipient can restore images after load
       3. URL format: #s:<shareKey>:<base64(stripped JSON)>
     The recipient opens the URL → app detects the #s: prefix → loads stripped
     project from hash, looks up images from localStorage (same browser) OR
     shows a "images not available" banner if the registry is missing.
     For same-browser sharing (hand-off via link between tabs / bookmark) this
     is seamless.  For cross-device sharing the structure / POIs / texts come
     through perfectly; only map images are missing (banner prompts re-upload).
  ── */
  const handleShareURL = () => {
    try {
      // 1. Build stripped project (no imageUrl fields — just dimensions + all other data)
      const strippedMaps = {};
      const imageRegistry = {};
      Object.entries(maps).forEach(([id, m]) => {
        imageRegistry[id] = m.imageUrl;
        const { imageUrl, ...rest } = m;
        strippedMaps[id] = rest;
      });

      // 2. Persist image registry in localStorage under a short random key
      const shareKey = uid().slice(0, 6);
      const regKey = `cartografo_img_${shareKey}`;
      try { localStorage.setItem(regKey, JSON.stringify(imageRegistry)); } catch {}

      // 3. Build compact payload: stripped project JSON → base64
      const payload = JSON.stringify({ version:1, rootMapId, maps: strippedMaps, shareKey });
      const encoded = btoa(unescape(encodeURIComponent(payload)));

      // 4. Build URL
      const url = `${window.location.origin}${window.location.pathname}#s:${shareKey}:${encoded}`;

      // 5. Size check — warn if still oversized (>200 KB in URL is risky)
      if (url.length > 200_000) {
        toast('Projeto grande demais para URL mesmo sem imagens — use Exportar JSON','⚠️');
        return;
      }

      navigator.clipboard.writeText(url)
        .then(() => toast(`Link copiado! (${Math.round(url.length/1024)}KB)`, '🔗'))
        .catch(() => {
          // Fallback: show URL in a prompt so user can copy manually
          window.prompt('Copie o link abaixo:', url);
        });
    } catch(e) {
      toast('Erro ao gerar link','❌');
    }
  };

  const enterSubmap = (mapId) => {
    if(!maps[mapId]) return;
    withTransition(()=>{ setStack(s=>[...s,mapId]); setSelection(null); setEditingTextId(null); });
  };
  const goBack = () => {
    if(stack.length>1) withTransition(()=>{ setStack(s=>s.slice(0,-1)); setSelection(null); setEditingTextId(null); });
  };
  const goTo = (index) => {
    withTransition(()=>{ setStack(s=>s.slice(0,index+1)); setSelection(null); setEditingTextId(null); });
  };

  const createSubmap = (poi, { dataUrl, w, h, name }) => {
    const sm = makeMap({ imageUrl:dataUrl, imgW:w, imgH:h, name, parentId:currentMapId });
    setMaps(prev=>({ ...prev, [sm.id]:sm,
      [currentMapId]:{ ...prev[currentMapId], pois:prev[currentMapId].pois.map(p=>p.id===poi.id?{...p,childMapId:sm.id}:p) }
    }));
  };
  const removeSubmap = (poi) => {
    if(!confirm('Remover o submapa? Todo o conteúdo aninhado será apagado.')) return;
    const toDelete=new Set(), queue=[poi.childMapId];
    while(queue.length){ const id=queue.shift(); if(!id||toDelete.has(id))continue; toDelete.add(id); maps[id]?.pois.forEach(p=>p.childMapId&&queue.push(p.childMapId)); }
    setMaps(prev=>{ const next={...prev}; toDelete.forEach(id=>delete next[id]); next[currentMapId]={...prev[currentMapId],pois:prev[currentMapId].pois.map(p=>p.id===poi.id?{...p,childMapId:null}:p)}; return next; });
  };
  const deletePoi = (poi) => {
    if(poi.childMapId&&!confirm('Este ponto tem um submapa. Excluir tudo?')) return;
    const toDelete=new Set();
    if(poi.childMapId){ const queue=[poi.childMapId]; while(queue.length){ const id=queue.shift(); if(!id||toDelete.has(id))continue; toDelete.add(id); maps[id]?.pois.forEach(p=>p.childMapId&&queue.push(p.childMapId)); } }
    setMaps(prev=>{ const next={...prev}; toDelete.forEach(id=>delete next[id]); next[currentMapId]={...prev[currentMapId],pois:prev[currentMapId].pois.filter(p=>p.id!==poi.id)}; return next; });
    setSelection(null);
  };
  const deleteText = txt => { updateMap(m=>({...m,texts:m.texts.filter(t=>t.id!==txt.id)})); setSelection(null); };

  /* ── keyboard shortcuts ── */
  useEffect(()=>{
    if(!currentMap) return;
    const onKey = e => {
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
      if(e.key==='v'||e.key==='V') setTool(TOOLS.SELECT);
      else if(e.key==='p'||e.key==='P') setTool(TOOLS.POI);
      else if(e.key==='t'||e.key==='T') setTool(TOOLS.TEXT);
      else if(e.key==='d'||e.key==='D') setDarkMode(v=>!v);
      else if(e.key==='Escape'){
        if(editingTextId) setEditingTextId(null);
        else if(selection) setSelection(null);
        else if(tool!==TOOLS.SELECT) setTool(TOOLS.SELECT);
        else if(stack.length>1) goBack();
      } else if(e.key==='+'||e.key==='=') setViewport(vp=>vp&&({...vp,scale:clamp(vp.scale*1.2,.05,20)}));
      else if(e.key==='-'||e.key==='_') setViewport(vp=>vp&&({...vp,scale:clamp(vp.scale/1.2,.05,20)}));
      else if(e.key==='0') setViewport(null);
      else if(e.key==='Delete'||e.key==='Backspace'){
        if(selection?.type==='poi'){ const p=currentMap.pois.find(x=>x.id===selection.id); if(p) deletePoi(p); }
        else if(selection?.type==='text'){ const t=currentMap.texts.find(x=>x.id===selection.id); if(t) deleteText(t); }
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[currentMap,selection,editingTextId,tool,stack.length,setViewport,darkMode]);

  if(!currentMap) return <Welcome onLoad={handleLoadRoot} onImport={handleImport}/>;

  const selectedPoi   = selection?.type==='poi'  ? currentMap.pois.find(p=>p.id===selection.id)  : null;
  const selectedText  = selection?.type==='text' ? currentMap.texts.find(t=>t.id===selection.id) : null;
  const selectedPoiIdx = selectedPoi ? currentMap.pois.indexOf(selectedPoi) : -1;
  const selectedSubmap = selectedPoi?.childMapId ? maps[selectedPoi.childMapId] : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><I.Compass size={18} strokeWidth={1.7}/></div>
          <div className="brand-text"><span className="brand-name">Cartógrafo</span><span className="brand-sub">Mapas Interativos</span></div>
        </div>
        <div className="breadcrumb">
          {stack.length>1&&<button className="btn btn-icon" onClick={goBack} title="Voltar (Esc)" style={{marginRight:4}}><I.ArrowLeft size={16}/></button>}
          {stack.map((id,i)=>{
            const m=maps[id], isLast=i===stack.length-1;
            return (
              <React.Fragment key={id}>
                {i>0&&<span className="crumb-sep"><I.ChevronRight size={14}/></span>}
                <button className={`crumb ${isLast?'active':''}`} onClick={()=>!isLast&&goTo(i)} disabled={isLast}>
                  {i===0?<I.Map size={13}/>:<I.Layers size={12}/>}{m?.name||'Mapa'}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="top-actions">
          <button className="btn btn-ghost" onClick={handleExport} title="Exportar projeto JSON"><I.Download size={15}/><span>Exportar</span></button>
          <button className="btn btn-ghost" onClick={()=>{if(confirm('Começar novo projeto? O atual será perdido se não exportado.')){setMaps({});setRootMapId(null);setStack([]);setViewports({});setSelection(null);localStorage.removeItem(LS_KEY);window.location.hash='';}}}>
            <I.Plus size={15}/><span>Novo</span>
          </button>
          <button className="btn btn-icon" onClick={()=>setPanelOpen(o=>!o)} aria-label="Alternar painel"><I.Menu size={16}/></button>
        </div>
      </header>

      <div className={`shell ${!panelOpen?'no-panel':''}`}>
        <Toolbar tool={tool} setTool={setTool}
          onZoomIn={()=>setViewport(vp=>vp&&({...vp,scale:clamp(vp.scale*1.25,.05,20)}))}
          onZoomOut={()=>setViewport(vp=>vp&&({...vp,scale:clamp(vp.scale/1.25,.05,20)}))}
          onReset={()=>setViewport(null)}
          darkMode={darkMode} onToggleDark={()=>setDarkMode(v=>!v)}/>

        <MapCanvas map={currentMap} viewport={viewport} setViewport={setViewport}
          tool={tool} setTool={setTool}
          selection={selection} setSelection={setSelection}
          editingTextId={editingTextId} setEditingTextId={setEditingTextId}
          updateMap={updateMap} onEnterSubmap={enterSubmap}
          transitioning={transitioning}/>

        {panelOpen&&(
          <aside className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <div className="panel-title-icon">
                  {selectedPoi?<I.Pin size={14}/>:selectedText?<I.Type size={14}/>:<I.Map size={14}/>}
                </div>
                <span className="panel-title-text">
                  {selectedPoi?(selectedPoi.name||`Ponto ${selectedPoiIdx+1}`):selectedText?'Texto':currentMap.name}
                </span>
              </div>
              {selection&&<button className="btn btn-icon" onClick={()=>setSelection(null)} title="Fechar"><I.X size={15}/></button>}
            </div>
            <div className="panel-body">
              {selectedPoi ? (
                <POIDetails poi={selectedPoi} index={selectedPoiIdx} updateMap={updateMap}
                  onEnterSubmap={enterSubmap} onCreateSubmap={createSubmap}
                  onRemoveSubmap={removeSubmap} onDelete={deletePoi} submap={selectedSubmap}/>
              ) : selectedText ? (
                <TextDetails text={selectedText} updateMap={updateMap} onDelete={deleteText} onEdit={()=>setEditingTextId(selectedText.id)}/>
              ) : (
                <MapOverview map={currentMap} updateMap={updateMap} allMaps={maps}
                  selection={selection} setSelection={setSelection}
                  onExportPNG={handleExportPNG} onShareURL={handleShareURL}/>
              )}
            </div>
          </aside>
        )}
      </div>

      <Toast messages={toasts}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);