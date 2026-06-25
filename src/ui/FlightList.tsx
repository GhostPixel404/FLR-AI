import { useStore } from '../store/useStore';
import { matchesFilters } from '../store/filters';
import { formatAltitude } from '../util/units';

export default function FlightList() {
  const aircraft = useStore((s) => s.aircraft);
  const filters = useStore((s) => s.filters);
  const units = useStore((s) => s.settings.units);
  const select = useStore((s) => s.select);
  const selectedHex = useStore((s) => s.selectedHex);
  const list = Array.from(aircraft.values())
    .filter((a) => matchesFilters(a, filters))
    .sort((a, b) => (a.distanceNm ?? 1e9) - (b.distanceNm ?? 1e9))
    .slice(0, 200);
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={{ padding: '4px 8px', fontSize: 12, color: '#6b7280' }}>{list.length} shown</div>
      {list.map((a) => (
        <div key={a.hex} onClick={() => select(a.hex)}
          style={{ padding: '6px 8px', cursor: 'pointer', borderLeft: '3px solid',
            borderLeftColor: a.hex === selectedHex ? '#f59e0b' : 'transparent',
            background: a.hex === selectedHex ? '#f3f4f6' : 'transparent' }}>
          <strong>{a.callsign ?? a.hex}</strong>
          <span style={{ float: 'right', color: '#6b7280' }}>{a.type ?? ''}</span>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {formatAltitude(a.altitude, units)} · {a.registration ?? ''}</div>
        </div>
      ))}
    </div>
  );
}
