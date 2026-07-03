import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const PINK = '#EC008C';
const MIN_RECT = 3; // mínimos px (en coords naturales) para contar una zona

/**
 * Modal grande (90% del viewport) para marcar zonas de falla sobre la imagen del archivo,
 * con zoom (rueda / pellizco / botones) y paneo. Las zonas se guardan en coordenadas
 * NATURALES de la imagen, así el compuesto final es exacto a cualquier nivel de zoom.
 *
 * Props:
 *  - thumbUrl: URL de la imagen del archivo
 *  - initialRects: zonas ya marcadas [{x,y,w,h}] (coords naturales) para seguir editando
 *  - onSave(dataUrl, rects): imagen compuesta (JPEG) + zonas
 *  - onClose(): cerrar sin cambios
 */
export default function FallaZoomModal({ thumbUrl, initialRects = [], onSave, onClose }) {
    const wrapRef = useRef(null);
    const canvasRef = useRef(null);
    const imgRef = useRef(null);            // HTMLImageElement cargado
    const [imgOk, setImgOk] = useState(true);
    const [ready, setReady] = useState(false);

    const scaleRef = useRef(1);
    const offsetRef = useRef({ x: 0, y: 0 });
    const minScaleRef = useRef(0.05);
    const rectsRef = useRef(initialRects.map(r => ({ ...r })));
    const draftRef = useRef(null);
    const actionRef = useRef(null);         // { type:'draw'|'pan', ... }
    const pinchRef = useRef(null);          // { dist, cx, cy }

    const [zoomPct, setZoomPct] = useState(100);
    const [mode, setMode] = useState('draw');   // 'draw' | 'pan'
    const modeRef = useRef('draw');
    useEffect(() => { modeRef.current = mode; }, [mode]);

    const screenToImg = (sx, sy) => {
        const s = scaleRef.current, o = offsetRef.current;
        return { x: (sx - o.x) / s, y: (sy - o.y) / s };
    };

    const draw = useCallback(() => {
        const cv = canvasRef.current, img = imgRef.current;
        if (!cv) return;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (!img) return;
        const s = scaleRef.current, o = offsetRef.current;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.scale(s, s);
        ctx.drawImage(img, 0, 0);
        const all = draftRef.current ? [...rectsRef.current, draftRef.current] : rectsRef.current;
        ctx.lineWidth = 2 / s;
        ctx.strokeStyle = PINK;
        ctx.fillStyle = 'rgba(236,0,140,0.12)';
        for (const r of all) {
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
        }
        ctx.restore();
    }, []);

    const fit = useCallback(() => {
        const cv = canvasRef.current, img = imgRef.current;
        if (!cv || !img) return;
        const s = Math.min(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
        minScaleRef.current = Math.min(1, s) * 0.5;
        scaleRef.current = s;
        offsetRef.current = {
            x: (cv.width - img.naturalWidth * s) / 2,
            y: (cv.height - img.naturalHeight * s) / 2,
        };
        setZoomPct(Math.round(s * 100));
        draw();
    }, [draw]);

    const resizeCanvas = useCallback(() => {
        const cv = canvasRef.current, wrap = wrapRef.current;
        if (!cv || !wrap) return;
        cv.width = wrap.clientWidth;
        cv.height = wrap.clientHeight;
        draw();
    }, [draw]);

    // Cargar imagen (offscreen) — mismo origen (/thumbnails) → sin taint del canvas.
    useEffect(() => {
        const img = new Image();
        img.onload = () => { imgRef.current = img; setReady(true); };
        img.onerror = () => setImgOk(false);
        img.src = thumbUrl;
    }, [thumbUrl]);

    // Al estar lista: dimensionar canvas + encuadrar; re-encuadrar en resize de ventana.
    useEffect(() => {
        if (!ready) return;
        resizeCanvas();
        fit();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [ready, resizeCanvas, fit]);

    // Cerrar con Escape.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const zoomAt = (mx, my, factor) => {
        const s = scaleRef.current, o = offsetRef.current;
        const ix = (mx - o.x) / s, iy = (my - o.y) / s;
        const ns = Math.min(12, Math.max(minScaleRef.current, s * factor));
        scaleRef.current = ns;
        offsetRef.current = { x: mx - ix * ns, y: my - iy * ns };
        setZoomPct(Math.round(ns * 100));
        draw();
    };

    // Zoom con rueda (listener nativo no-pasivo para poder preventDefault).
    useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        const onWheel = (e) => {
            e.preventDefault();
            const rect = cv.getBoundingClientRect();
            zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
        };
        cv.addEventListener('wheel', onWheel, { passive: false });
        return () => cv.removeEventListener('wheel', onWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draw]);

    const zoomBtn = (factor) => {
        const cv = canvasRef.current; if (!cv) return;
        zoomAt(cv.width / 2, cv.height / 2, factor);
    };

    const localPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startAction = (pos, forcePan) => {
        if (forcePan || modeRef.current === 'pan') {
            actionRef.current = { type: 'pan', startScreen: pos, startOffset: { ...offsetRef.current } };
        } else {
            actionRef.current = { type: 'draw', startImg: screenToImg(pos.x, pos.y) };
            draftRef.current = null;
        }
    };
    const moveAction = (pos) => {
        const a = actionRef.current; if (!a) return;
        if (a.type === 'pan') {
            offsetRef.current = {
                x: a.startOffset.x + (pos.x - a.startScreen.x),
                y: a.startOffset.y + (pos.y - a.startScreen.y),
            };
            draw();
        } else {
            const p = screenToImg(pos.x, pos.y);
            draftRef.current = {
                x: Math.min(a.startImg.x, p.x), y: Math.min(a.startImg.y, p.y),
                w: Math.abs(p.x - a.startImg.x), h: Math.abs(p.y - a.startImg.y),
            };
            draw();
        }
    };
    const endAction = () => {
        const a = actionRef.current; if (!a) return;
        if (a.type === 'draw' && draftRef.current && draftRef.current.w > MIN_RECT && draftRef.current.h > MIN_RECT) {
            rectsRef.current = [...rectsRef.current, draftRef.current];
        }
        draftRef.current = null; actionRef.current = null; draw();
    };

    // Mouse: down en el canvas; move/up en el overlay (para no perder el drag fuera del canvas).
    const onMouseDown = (e) => { e.preventDefault(); startAction(localPos(e), e.button === 1 || e.shiftKey); };
    const onMouseMove = (e) => { if (actionRef.current) moveAction(localPos(e)); };
    const onMouseUp = () => endAction();

    // Touch: 1 dedo = dibujar/mover según modo; 2 dedos = pellizco para zoom.
    const touchPos = (t) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };
    const onTouchStart = (e) => {
        if (e.touches.length === 2) {
            const [a, b] = e.touches;
            const rect = canvasRef.current.getBoundingClientRect();
            pinchRef.current = {
                dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
                cx: (a.clientX + b.clientX) / 2 - rect.left,
                cy: (a.clientY + b.clientY) / 2 - rect.top,
            };
            actionRef.current = null; draftRef.current = null; draw();
        } else if (e.touches.length === 1) {
            startAction(touchPos(e.touches[0]), false);
        }
    };
    const onTouchMove = (e) => {
        if (e.touches.length === 2 && pinchRef.current) {
            const [a, b] = e.touches;
            const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            zoomAt(pinchRef.current.cx, pinchRef.current.cy, dist / pinchRef.current.dist);
            pinchRef.current.dist = dist;
        } else if (e.touches.length === 1 && actionRef.current) {
            moveAction(touchPos(e.touches[0]));
        }
    };
    const onTouchEnd = (e) => {
        if (pinchRef.current && e.touches.length < 2) pinchRef.current = null;
        if (e.touches.length === 0) endAction();
    };

    const undo = () => { rectsRef.current = rectsRef.current.slice(0, -1); draw(); };
    const clearAll = () => { rectsRef.current = []; draftRef.current = null; draw(); };

    const composite = () => {
        const img = imgRef.current;
        if (!img || rectsRef.current.length === 0) return null;
        const out = document.createElement('canvas');
        out.width = img.naturalWidth; out.height = img.naturalHeight;
        const ctx = out.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = PINK;
        ctx.fillStyle = 'rgba(236,0,140,0.12)';
        ctx.lineWidth = Math.max(2, Math.round(img.naturalWidth / 400));
        for (const r of rectsRef.current) { ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeRect(r.x, r.y, r.w, r.h); }
        try { return out.toDataURL('image/jpeg', 0.9); } catch { return null; }
    };

    const handleSave = () => {
        onSave && onSave(composite(), rectsRef.current.map(r => ({ ...r })));
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-[3vh]"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
        >
            <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '90vw', height: '90vh' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                    <h3 className="text-sm font-black text-[#BD0C7E] uppercase tracking-wide">Marcar zonas de falla</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none px-1">×</button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 shrink-0 flex-wrap">
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                        <button type="button" onClick={() => setMode('draw')} className={`px-3 py-1.5 text-xs font-bold ${mode === 'draw' ? 'bg-[#EC008C] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>✏️ Dibujar</button>
                        <button type="button" onClick={() => setMode('pan')} className={`px-3 py-1.5 text-xs font-bold ${mode === 'pan' ? 'bg-[#EC008C] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>✋ Mover</button>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                        <button type="button" onClick={() => zoomBtn(1 / 1.2)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">−</button>
                        <span className="w-14 text-center text-xs font-bold text-slate-500">{zoomPct}%</span>
                        <button type="button" onClick={() => zoomBtn(1.2)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">+</button>
                        <button type="button" onClick={fit} className="px-3 h-8 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold ml-1 hover:bg-slate-50">Ajustar</button>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                        <button type="button" onClick={undo} className="text-xs font-bold text-slate-500 hover:text-[#BD0C7E]">Deshacer</button>
                        <button type="button" onClick={clearAll} className="text-xs font-bold text-slate-500 hover:text-[#BD0C7E]">Limpiar</button>
                    </div>
                </div>

                {/* Viewport */}
                <div ref={wrapRef} className="relative flex-1 overflow-hidden bg-slate-100">
                    {!imgOk && (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 italic">
                            Sin vista previa disponible para este archivo.
                        </div>
                    )}
                    <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 touch-none ${mode === 'pan' ? 'cursor-grab' : 'cursor-crosshair'}`}
                        onMouseDown={onMouseDown}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 shrink-0">
                    <span className="text-[11px] text-slate-400 hidden sm:block">Rueda o pellizco para zoom · arrastrá para marcar · podés marcar varias zonas</span>
                    <div className="flex items-center gap-2 ml-auto">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200">Cancelar</button>
                        <button type="button" onClick={handleSave} className="px-6 py-2 rounded-xl bg-[#EC008C] text-white font-bold text-sm hover:bg-[#BD0C7E]">Guardar zonas</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
