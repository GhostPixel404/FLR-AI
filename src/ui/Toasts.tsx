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
    <div className="toasts">
      {items.map((i) => (
        <div key={i.id} className="toast glass glass-thick">{i.text}</div>
      ))}
    </div>
  );
}
