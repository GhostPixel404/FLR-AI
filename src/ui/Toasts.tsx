import { useEffect, useState } from 'react';

export default function Toasts() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      const id = ++n;
      setItems((s) => [...s, { id, text }]);
      setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 6000);
    };
    window.addEventListener('flr-toast', handler);
    return () => window.removeEventListener('flr-toast', handler);
  }, []);
  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, display: 'grid', gap: 8 }}>
      {items.map((i) => (
        <div key={i.id} style={{ background: '#111827', color: '#fff', padding: '8px 12px',
          borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.3)', maxWidth: 280 }}>{i.text}</div>
      ))}
    </div>
  );
}
