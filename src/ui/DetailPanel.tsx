import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatAltitude, formatSpeed } from '../util/units';
import { getRoute, getAircraftInfo, type RouteInfo, type AircraftInfo } from '../enrich/adsbdb';

export default function DetailPanel() {
  const selectedHex = useStore((s) => s.selectedHex);
  const aircraft = useStore((s) => s.aircraft);
  const units = useStore((s) => s.settings.units);
  const follow = useStore((s) => s.follow);
  const followedHex = useStore((s) => s.followedHex);
  const a = selectedHex ? aircraft.get(selectedHex) : null;
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [info, setInfo] = useState<AircraftInfo | null>(null);

  useEffect(() => {
    setRoute(null); setInfo(null);
    if (!a) return;
    if (a.callsign) getRoute(a.callsign).then(setRoute);
    getAircraftInfo(a.registration ?? a.hex).then(setInfo);
  }, [selectedHex]);

  if (!a) return <div style={{ padding: 12, color: '#6b7280' }}>Select an aircraft.</div>;
  return (
    <div style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
      <h3 style={{ margin: '0 0 6px' }}>{a.callsign ?? a.hex}</h3>
      {info?.photoThumb && <img src={info.photoThumb} alt="" style={{ width: '100%', borderRadius: 6 }} />}
      <table style={{ fontSize: 13, width: '100%' }}><tbody>
        <tr><td>Reg</td><td>{a.registration ?? '—'}</td></tr>
        <tr><td>Type</td><td>{info?.type ?? a.type ?? '—'}</td></tr>
        <tr><td>Owner</td><td>{info?.owner ?? '—'}</td></tr>
        <tr><td>Altitude</td><td>{formatAltitude(a.altitude, units)}</td></tr>
        <tr><td>Speed</td><td>{formatSpeed(a.groundSpeed, units)}</td></tr>
        <tr><td>Heading</td><td>{a.track != null ? `${Math.round(a.track)}°` : '—'}</td></tr>
        <tr><td>Vert. rate</td><td>{a.verticalRate != null ? `${a.verticalRate > 0 ? '+' : ''}${a.verticalRate} ft/min` : '—'}</td></tr>
        <tr><td>Squawk</td><td>{a.squawk ?? '—'}</td></tr>
        {route && <tr><td>Route</td><td>{route.originIata ?? '?'} → {route.destinationIata ?? '?'}</td></tr>}
        {route?.airline && <tr><td>Airline</td><td>{route.airline}</td></tr>}
      </tbody></table>
      <button onClick={() => follow(followedHex === a.hex ? null : a.hex)}>
        {followedHex === a.hex ? 'Unfollow' : 'Follow'}</button>
    </div>
  );
}
