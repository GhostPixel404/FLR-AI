import { useStore } from '../store/useStore';

function toast(text: string) {
  window.dispatchEvent(new CustomEvent('flr-toast', { detail: text }));
}

/**
 * Request the device location. On success, stores it as `myLocation` (the map
 * draws a marker and recenters) and as the `home` setting (used by distance
 * alerts). On failure, shows a clear toast explaining why.
 */
export function locateMe(): void {
  if (!('geolocation' in navigator)) {
    toast('Geolocation is not supported on this device');
    return;
  }
  toast('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      useStore.getState().setMyLocation(loc);
      useStore.getState().updateSettings({ home: loc });
      toast('Centred on your location');
    },
    (err) => {
      const msg =
        err.code === err.PERMISSION_DENIED
          ? 'Location blocked — allow location access for this site in your browser'
          : err.code === err.POSITION_UNAVAILABLE
            ? 'Location is unavailable right now'
            : 'Location request timed out — try again';
      toast(msg);
    },
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
  );
}
