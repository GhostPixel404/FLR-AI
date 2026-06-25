import { useState } from 'react';
import { useStore } from '../store/useStore';
import { SearchIcon } from './icons';

export default function SearchBox() {
  const [q, setQ] = useState('');
  const aircraft = useStore((s) => s.aircraft);
  const select = useStore((s) => s.select);
  const follow = useStore((s) => s.follow);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const needle = q.trim().toUpperCase();
    if (!needle) return;
    for (const a of aircraft.values()) {
      if ([a.callsign, a.registration, a.hex].some((v) => (v ?? '').toUpperCase().includes(needle))) {
        select(a.hex); follow(a.hex); break;
      }
    }
  };
  return (
    <form onSubmit={submit}>
      <div className="search">
        <SearchIcon className="search__icon" />
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search callsign / reg / hex" />
      </div>
    </form>
  );
}
