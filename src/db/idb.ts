import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Sighting, AlertRule } from '../types';

interface FlrDB extends DBSchema {
  sightings: { key: string; value: Sighting };
  alerts: { key: string; value: AlertRule };
  enrichCache: { key: string; value: { key: string; data: unknown; ts: number } };
}

let dbPromise: Promise<IDBPDatabase<FlrDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FlrDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FlrDB>('flightradar', 1, {
      upgrade(db) {
        db.createObjectStore('sightings', { keyPath: 'hex' });
        db.createObjectStore('alerts', { keyPath: 'id' });
        db.createObjectStore('enrichCache', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}
