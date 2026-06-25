import type { Aircraft } from '../types';
import type { Bounds } from '../util/geo';

export interface FlightProvider {
  /** Fetch aircraft within the given map bounds. Throws on network/HTTP error. */
  poll(bounds: Bounds): Promise<Aircraft[]>;
}
