import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatAltitude, formatSpeed } from '../util/units';
import { isEmergency } from '../store/filters';
import { getRoute, getAircraftInfo, type RouteInfo, type AircraftInfo } from '../enrich/adsbdb';
import { ArrowRightIcon, CloseIcon, LocateIcon } from './icons';

export default function DetailPanel() {
  const selectedHex = useStore((s) => s.selectedHex);
  const aircraft = useStore((s) => s.aircraft);
  const units = useStore((s) => s.settings.units);
  const select = useStore((s) => s.select);
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

  if (!a) return null;

  const following = followedHex === a.hex;
  const vrate = a.verticalRate;
  const close = () => { select(null); if (following) follow(null); };

  return (
    <section className="detail-card glass" role="dialog" aria-label="Selected aircraft">
      <button className="detail__close" onClick={close} aria-label="Close">
        <CloseIcon size={15} />
      </button>

      {info?.photoThumb && (
        <img className="detail__photo" src={info.photoThumb} alt={`${a.type ?? 'Aircraft'} photo`} loading="lazy" />
      )}

      <div className="detail__body">
        <div className="detail__head">
          <div>
            <div className="detail__call">{a.callsign ?? a.hex}</div>
            <div className="detail__sub">{a.registration ?? a.hex}{(info?.type || a.type) ? ` · ${info?.type ?? a.type}` : ''}</div>
          </div>
        </div>

        {(isEmergency(a) || a.military || a.onGround) && (
          <div className="detail__chips">
            {isEmergency(a) && <span className="tag tag--danger">Emergency</span>}
            {a.military && <span className="tag tag--mil">Military</span>}
            {a.onGround && <span className="tag">On ground</span>}
          </div>
        )}

        <div className="stat-trio">
          <div className="stat"><span className="stat__v tabular">{formatAltitude(a.altitude, units)}</span><span className="stat__k">Altitude</span></div>
          <div className="stat"><span className="stat__v tabular">{formatSpeed(a.groundSpeed, units)}</span><span className="stat__k">Speed</span></div>
          <div className="stat">
            <span className={`stat__v tabular ${vrate ? (vrate > 0 ? 'is-climb' : 'is-descend') : ''}`}>
              {vrate ? `${vrate > 0 ? '↑' : '↓'} ${Math.abs(vrate)}` : '—'}
            </span>
            <span className="stat__k">ft/min</span>
          </div>
        </div>

        {route && (route.originIata || route.destinationIata) && (
          <div className="detail__route">
            <span>{route.originIata ?? '?'}<small>{route.originName ?? ''}</small></span>
            <ArrowRightIcon />
            <span>{route.destinationIata ?? '?'}<small>{route.destinationName ?? ''}</small></span>
          </div>
        )}

        <dl className="detail__grid">
          <dt>Heading</dt><dd className="tabular">{a.track != null ? `${Math.round(a.track)}°` : '—'}</dd>
          <dt>Squawk</dt><dd className="tabular">{a.squawk ?? '—'}</dd>
          {info?.owner && <><dt>Owner</dt><dd>{info.owner}</dd></>}
          {route?.airline && <><dt>Airline</dt><dd>{route.airline}</dd></>}
          {info?.manufacturer && <><dt>Built by</dt><dd>{info.manufacturer}</dd></>}
        </dl>

        <button className={`btn btn--block ${following ? 'btn--accent' : ''}`} onClick={() => follow(following ? null : a.hex)}>
          <LocateIcon size={16} /> {following ? 'Following' : 'Follow'}
        </button>
      </div>
    </section>
  );
}
