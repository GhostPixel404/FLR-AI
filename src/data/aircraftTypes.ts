// Map common spoken aircraft names ("777", "a320", "747") to the ICAO type codes
// the feed actually uses ("B77W", "A20N", "B744"), so type queries match.
const TYPE_ALIASES: Record<string, string[]> = {
  '717': ['B712'], '727': ['B721', 'B722'],
  '737': ['B731', 'B732', 'B733', 'B734', 'B735', 'B736', 'B737', 'B738', 'B739', 'B37M', 'B38M', 'B39M', 'B3XM'],
  '747': ['B741', 'B742', 'B743', 'B744', 'B748', 'B74R', 'B74S', 'B74D'],
  '757': ['B752', 'B753'], '767': ['B762', 'B763', 'B764'],
  '777': ['B772', 'B773', 'B77L', 'B77W', 'B778', 'B779'],
  '787': ['B788', 'B789', 'B78X'],
  a220: ['BCS1', 'BCS3'], a300: ['A306', 'A30B'], a310: ['A310'],
  a318: ['A318'], a319: ['A319', 'A19N'], a320: ['A320', 'A20N'], a321: ['A321', 'A21N'],
  a330: ['A332', 'A333', 'A338', 'A339'], a340: ['A342', 'A343', 'A345', 'A346'],
  a350: ['A359', 'A35K'], a380: ['A388'],
  e170: ['E170'], e175: ['E75L', 'E75S', 'E175'], e190: ['E190', 'E290'], e195: ['E195', 'E295'],
  crj: ['CRJ1', 'CRJ2', 'CRJ7', 'CRJ9', 'CRJX'],
  atr: ['AT43', 'AT45', 'AT46', 'AT72', 'AT73', 'AT75', 'AT76'],
  q400: ['DH8A', 'DH8B', 'DH8C', 'DH8D'],
};

/** Does an ICAO type code match a user's spoken query? Handles aliases + variants. */
export function matchesType(typeCode: string | null | undefined, query: string): boolean {
  if (!typeCode) return false;
  const t = typeCode.toUpperCase();
  const norm = query.trim().toLowerCase().replace(/[\s-]/g, '').replace(/^boeing/, '').replace(/^airbus/, '');
  if (!norm) return false;
  if (t.toLowerCase() === norm) return true;

  const keys = new Set([norm]);
  if (/^b\d/.test(norm)) keys.add(norm.slice(1)); // "b777" -> "777"
  if (/^\d{3}$/.test(norm)) keys.add('a' + norm);  // "320" -> "a320"
  for (const k of keys) {
    if (TYPE_ALIASES[k]?.includes(t)) return true;
  }
  return t.toLowerCase().includes(norm); // substring fallback (e.g. "a32" -> A320)
}
