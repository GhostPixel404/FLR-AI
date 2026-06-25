import { useStore } from '../store/useStore';

export default function FilterBar() {
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const clearFilters = useStore((s) => s.clearFilters);
  return (
    <div className="chips">
      <button className="chip" aria-pressed={filters.military}
        onClick={() => setFilters({ military: !filters.military })}>Military</button>
      <button className="chip" aria-pressed={filters.emergency}
        onClick={() => setFilters({ emergency: !filters.emergency })}>Emergency</button>
      <button className="chip" aria-pressed={filters.onGround === false}
        onClick={() => setFilters({ onGround: filters.onGround === false ? null : false })}>Airborne only</button>
      <input className="chip-input" placeholder="Type (e.g. A320)" value={filters.type ?? ''}
        onChange={(e) => setFilters({ type: e.target.value || null })} />
      <input className="chip-input" placeholder="Airline (e.g. BAW)" value={filters.airline ?? ''}
        onChange={(e) => setFilters({ airline: e.target.value || null })} />
      <button className="chip" onClick={clearFilters}>Clear</button>
    </div>
  );
}
