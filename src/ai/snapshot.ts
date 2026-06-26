import { EMERGENCY_SQUAWKS, type Aircraft } from '../types';
import { airlineFromCallsign } from '../data/airlines';

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
  const byAirline = new Map<string, number>();
  let mil = 0, emerg = 0, ground = 0;
  for (const a of all) {
    byType.set(a.type ?? 'unknown', (byType.get(a.type ?? 'unknown') ?? 0) + 1);
    const airline = airlineFromCallsign(a.callsign);
    if (airline) byAirline.set(airline, (byAirline.get(airline) ?? 0) + 1);
    if (a.military) mil++;
    if (isEmerg(a)) emerg++;
    if (a.onGround) ground++;
  }
  const topTypes = [...byType.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12)
    .map(([t, c]) => `${t}×${c}`).join(', ');
  const topAirlines = [...byAirline.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12)
    .map(([t, c]) => `${t}×${c}`).join(', ');
  const dist = (a: Aircraft) => (a.distanceNm != null ? `${Math.round(a.distanceNm)}nm` : '?');
  const byDist = (a: Aircraft, b: Aircraft) => (a.distanceNm ?? Infinity) - (b.distanceNm ?? Infinity);
  const line = (a: Aircraft) => {
    const airline = airlineFromCallsign(a.callsign);
    const flags: string[] = [];
    if (isEmerg(a)) flags.push(`EMERGENCY${a.squawk ? ` squawk ${a.squawk}` : ''}`);
    if (a.military) flags.push('MILITARY');
    if (a.onGround) flags.push('on ground');
    return `${a.callsign ?? a.hex}${airline ? ` (${airline})` : ''} | ${a.type ?? '?'} | ${a.altitude != null ? Math.round(a.altitude) + 'ft' : 'ground'}`
      + ` | ${a.groundSpeed != null ? Math.round(a.groundSpeed) + 'kt' : '-'} | ${dist(a)}`
      + `${a.registration ? ` | ${a.registration}` : ''}${flags.length ? ` | [${flags.join(', ')}]` : ''}`;
  };

  const list = [...all].sort(byDist).slice(0, 25).map(line).join('\n');

  // Emergencies and military are important — list ALL of them regardless of the
  // 25-row cap, so the assistant never misses one the user can see on the map.
  const emergencies = all.filter(isEmerg).sort(byDist);
  const military = all.filter((a) => a.military).sort(byDist);
  const emergBlock = emergencies.length
    ? `\nEMERGENCY aircraft (squawking 7500/7600/7700 or flagged) — ALL ${emergencies.length} listed:\n${emergencies.map(line).join('\n')}`
    : '\nNo emergency aircraft are on the map right now.';
  const milBlock = military.length
    ? `\nMILITARY aircraft — ALL ${military.length} listed:\n${military.slice(0, 30).map(line).join('\n')}`
    : '';

  return `${all.length} aircraft are currently on the user's map `
    + `(${mil} military, ${emerg} emergency, ${ground} on the ground). `
    + `Distances are from the user's location; altitudes in feet, speeds in knots.\n`
    + `By type: ${topTypes}.\n`
    + (topAirlines ? `By airline: ${topAirlines}.\n` : '')
    + `Nearest ${Math.min(25, all.length)} (callsign (airline) | type | altitude | speed | distance | reg | [flags]):\n${list}`
    + emergBlock
    + milBlock;
}
