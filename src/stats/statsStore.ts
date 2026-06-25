import { getDb } from '../db/idb';
import { mergeSightings, summarize, type StatsSummary } from './aggregate';
import type { Aircraft, Sighting } from '../types';

export async function recordSightings(current: Aircraft[], now: number): Promise<void> {
  const db = await getDb();
  const prev = await db.getAll('sightings');
  const merged = mergeSightings(prev, current, now);
  const tx = db.transaction('sightings', 'readwrite');
  await Promise.all(merged.map((s) => tx.store.put(s)));
  await tx.done;
}

export async function getSummary(): Promise<StatsSummary> {
  const db = await getDb();
  const all = (await db.getAll('sightings')) as Sighting[];
  return summarize(all);
}

export async function getAllSightings(): Promise<Sighting[]> {
  return (await getDb()).getAll('sightings');
}

export async function clearStats(): Promise<void> {
  await (await getDb()).clear('sightings');
}
