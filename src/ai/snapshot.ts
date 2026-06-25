import { EMERGENCY_SQUAWKS, type Aircraft } from '../types';

function isEmerg(a: Aircraft): boolean {
  if (a.squawk && (EMERGENCY_SQUAWKS as readonly string[]).includes(a.squawk)) return true;
  return a.emergency != null && a.emergency !== 'none' && a.emergency !== '';
}

/**
 * A compact text snapshot of the aircraft currently on the map. Fed to the model
 * every turn so it can answer "what's on my screen" questions even when the model
 * can't (or doesn't) call tools.
 */
export function buildSnapshot(all: Aircraft[]): string {
  if (all.length === 0) {
    return "The map currently shows NO aircraft (the user may be zoomed out, over a quiet area, or data hasn't loaded). Say so rather than inventing flights.";
  }
  const byType = new Map<string, number>();
  let mil = 0, emerg = 0, ground = 0;
  for (const a of all) {
    byType.set(a.type ?? 'unknown', (byType.get(a.type ?? 'unknown') ?? 0) + 1);
    if (a.military) mil++;
    if (isEmerg(a)) emerg++;
    if (a.onGround) ground++;
  }
  const topTypes = [...byType.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12)
    .map(([t, c]) => `${t}×${c}`).join(', ');
  const list = [...all].sort((a, b) => (a.distanceNm ?? Infinity) - (b.distanceNm ?? Infinity))
    .slice(0, 25)
    .map((a) => `${a.callsign ?? a.hex} | ${a.type ?? '?'} | ${a.altitude != null ? Math.round(a.altitude) + 'ft' : 'ground'}`
      + ` | ${a.groundSpeed != null ? Math.round(a.groundSpeed) + 'kt' : '-'}`
      + `${a.distanceNm != null ? ` | ${Math.round(a.distanceNm)}nm` : ''}`
      + `${a.registration ? ` | ${a.registration}` : ''}`)
    .join('\n');
  return `${all.length} aircraft are currently on the user's map `
    + `(${mil} military, ${emerg} emergency, ${ground} on the ground). `
    + `Distances are from the map centre; altitudes in feet, speeds in knots.\n`
    + `By type: ${topTypes}.\n`
    + `Nearest ${Math.min(25, all.length)} (callsign | type | altitude | speed | distance | reg):\n${list}`;
}
