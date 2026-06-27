import { useEffect, useRef, useState } from 'react';
import ChatPanel from './ChatPanel';

interface Geom { x: number; y: number; w: number; h: number }
const KEY = 'flr.aiwin';

function loadGeom(): Geom {
  const def: Geom = { x: Math.max(12, window.innerWidth - 416), y: 120, w: 384, h: 500 };
  try {
    const v = localStorage.getItem(KEY);
    const g = v ? { ...def, ...JSON.parse(v) } : def;
    // Keep it on-screen even if the window was resized smaller since last time.
    g.x = Math.min(Math.max(0, g.x), window.innerWidth - 80);
    g.y = Math.min(Math.max(0, g.y), window.innerHeight - 40);
    return g;
  } catch { return def; }
}

export default function AiWindow({ flyTo, onOpenSettings, onClose }: {
  flyTo: (lat: number, lon: number, zoom: number) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const [g, setG] = useState<Geom>(loadGeom);
  const drag = useRef<{ mode: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(g)); }, [g]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d.mode === 'move') {
        const x = Math.min(Math.max(0, d.ox + (e.clientX - d.sx)), window.innerWidth - 80);
        const y = Math.min(Math.max(0, d.oy + (e.clientY - d.sy)), window.innerHeight - 40);
        setG((p) => ({ ...p, x, y }));
      } else {
        const w = Math.min(Math.max(300, d.ox + (e.clientX - d.sx)), window.innerWidth - 24);
        const h = Math.min(Math.max(340, d.oy + (e.clientY - d.sy)), window.innerHeight - 24);
        setG((p) => ({ ...p, w, h }));
      }
    };
    const onUp = () => { drag.current = null; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const startMove = (e: React.MouseEvent) => {
    drag.current = { mode: 'move', sx: e.clientX, sy: e.clientY, ox: g.x, oy: g.y };
    document.body.style.userSelect = 'none';
  };
  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    drag.current = { mode: 'resize', sx: e.clientX, sy: e.clientY, ox: g.w, oy: g.h };
    document.body.style.userSelect = 'none';
  };

  return (
    <section className="ai-window glass" style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
      <ChatPanel flyTo={flyTo} onOpenSettings={onOpenSettings} onClose={onClose} onDragStart={startMove} />
      <div className="ai-window__resize" onMouseDown={startResize} aria-hidden />
    </section>
  );
}
