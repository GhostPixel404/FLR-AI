import { useStore } from '../store/useStore';
import { matchesFilters } from '../store/filters';
import { formatAltitude } from '../util/units';
import { PlaneIcon } from './icons';

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
    <div className="list scroll-area">
      <div className="list__count">{list.length} aircraft</div>
      {list.map((a) => (
        <div key={a.hex} className={`row ${a.hex === selectedHex ? 'row--selected' : ''}`} onClick={() => select(a.hex)}>
          <span className="row__icon"><PlaneIcon size={16} /></span>
          <div className="row__main">
            <div className="row__title">{a.callsign ?? a.hex}</div>
            <div className="row__sub">{a.registration ?? '—'}</div>
          </div>
          <div className="row__meta">
            <div className="row__type">{a.type ?? ''}</div>
            <div className="row__alt tabular">{formatAltitude(a.altitude, units)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
