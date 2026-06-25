import { useStore } from '../store/useStore';

export default function FilterBar() {
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const clearFilters = useStore((s) => s.clearFilters);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, alignItems: 'center' }}>
      <label><input type="checkbox" checked={filters.military}
        onChange={(e) => setFilters({ military: e.target.checked })} /> Military</label>
      <label><input type="checkbox" checked={filters.emergency}
        onChange={(e) => setFilters({ emergency: e.target.checked })} /> Emergency</label>
      <label><input type="checkbox" checked={filters.onGround === false}
        onChange={(e) => setFilters({ onGround: e.target.checked ? false : null })} /> Airborne only</label>
      <input placeholder="Type (e.g. A320)" value={filters.type ?? ''}
        onChange={(e) => setFilters({ type: e.target.value || null })} style={{ width: 110 }} />
      <input placeholder="Airline (e.g. BAW)" value={filters.airline ?? ''}
        onChange={(e) => setFilters({ airline: e.target.value || null })} style={{ width: 120 }} />
      <button onClick={clearFilters}>Clear</button>
    </div>
  );
}
