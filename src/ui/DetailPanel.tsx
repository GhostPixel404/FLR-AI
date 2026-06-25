import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatAltitude, formatSpeed } from '../util/units';
import { getRoute, getAircraftInfo, type RouteInfo, type AircraftInfo } from '../enrich/adsbdb';
import { ArrowRightIcon } from './icons';

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

  if (!a) return <div className="detail__empty">Select an aircraft to see details.</div>;
  return (
    <div className="detail">
      {info?.photoThumb && <img className="detail__photo" src={info.photoThumb} alt={`${a.type ?? 'Aircraft'} photo`} />}
      <div className="detail__head">
        <span className="detail__call">{a.callsign ?? a.hex}</span>
        <span className="detail__type">{info?.type ?? a.type ?? ''}</span>
      </div>
      {route && (route.originIata || route.destinationIata) && (
        <div className="detail__route">
          <span>{route.originIata ?? '?'}<small>{route.originName ?? ''}</small></span>
          <ArrowRightIcon />
          <span>{route.destinationIata ?? '?'}<small>{route.destinationName ?? ''}</small></span>
        </div>
      )}
      <dl className="detail__grid">
        <dt>Reg</dt><dd>{a.registration ?? '—'}</dd>
        <dt>Owner</dt><dd>{info?.owner ?? '—'}</dd>
        <dt>Altitude</dt><dd>{formatAltitude(a.altitude, units)}</dd>
        <dt>Speed</dt><dd>{formatSpeed(a.groundSpeed, units)}</dd>
        <dt>Heading</dt><dd>{a.track != null ? `${Math.round(a.track)}°` : '—'}</dd>
        <dt>Vert. rate</dt><dd>{a.verticalRate != null ? `${a.verticalRate > 0 ? '+' : ''}${a.verticalRate} ft/min` : '—'}</dd>
        <dt>Squawk</dt><dd>{a.squawk ?? '—'}</dd>
        {route?.airline && <><dt>Airline</dt><dd>{route.airline}</dd></>}
      </dl>
      <button className="btn btn--accent btn--block" onClick={() => follow(followedHex === a.hex ? null : a.hex)}>
        {followedHex === a.hex ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  );
}
