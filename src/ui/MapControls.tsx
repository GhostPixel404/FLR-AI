import { useState } from 'react';
import { useStore } from '../store/useStore';
import { locateMe } from '../util/locate';
import { basemapOptions } from '../map/basemaps';
import { LocateIcon, LayersIcon } from './icons';

export default function MapControls() {
  const basemap = useStore((s) => s.settings.basemap);
  const maptilerKey = useStore((s) => s.settings.maptilerKey);
  const update = useStore((s) => s.updateSettings);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="map-controls">
      <button className="map-fab glass" aria-label="Centre on my location" onClick={locateMe}>
        <LocateIcon size={19} />
      </button>

      <div className="map-fab-group">
        <button
          className="map-fab glass" aria-label="Map style"
          aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}
        >
          <LayersIcon size={19} />
        </button>
        {menuOpen && (
          <div className="map-menu glass glass-thick" role="menu">
            <div className="map-menu__label">Map style</div>
            {basemapOptions(maptilerKey).map((o) => (
              <button
                key={o.id} role="menuitemradio" aria-checked={basemap === o.id}
                className={`map-menu__item ${basemap === o.id ? 'is-active' : ''}`}
                onClick={() => { update({ basemap: o.id }); setMenuOpen(false); }}
              >
                {o.label}
                {basemap === o.id && <span className="map-menu__check" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
