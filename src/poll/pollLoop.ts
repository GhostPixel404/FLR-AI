import type { Aircraft } from '../types';
import type { Bounds } from '../util/geo';
import type { FlightProvider } from '../data/provider';

export interface PollSinks {
  onAircraft: (list: Aircraft[]) => void;
  onStats: (list: Aircraft[], now: number) => Promise<void> | void;
  onAlerts: (list: Aircraft[], home: { lat: number; lon: number } | null) => Promise<void> | void;
  home: { lat: number; lon: number } | null;
  onError?: (err: unknown) => void;
}

export async function runOnce(
  provider: FlightProvider, bounds: Bounds, sinks: PollSinks,
): Promise<void> {
  try {
    const list = await provider.poll(bounds);
    sinks.onAircraft(list);
    await sinks.onStats(list, Date.now());
    await sinks.onAlerts(list, sinks.home);
  } catch (err) {
    sinks.onError?.(err);
  }
}

export interface PollHandle { stop: () => void }

/** Start a polling loop driven by the current bounds getter. */
export function startPolling(
  provider: FlightProvider, getBounds: () => Bounds | null,
  sinks: PollSinks, intervalMs: () => number,
): PollHandle {
  let stopped = false;
  let running = false;
  let consecutiveErrors = 0;
  let timer: ReturnType<typeof setTimeout>;

  const wrappedSinks: PollSinks = {
    ...sinks,
    onError: (err: unknown) => {
      consecutiveErrors++;
      sinks.onError?.(err);
    },
  };

  const tick = async () => {
    if (stopped) return;
    if (running) return;
    running = true;
    let lastTickFailed = false;
    const tickSinks: PollSinks = {
      ...wrappedSinks,
      onError: (err: unknown) => {
        lastTickFailed = true;
        wrappedSinks.onError?.(err);
      },
    };
    const bounds = getBounds();
    if (bounds) await runOnce(provider, bounds, tickSinks);
    if (!lastTickFailed) consecutiveErrors = 0;
    running = false;
    if (!stopped) {
      const delay = intervalMs() * Math.min(Math.pow(2, consecutiveErrors), 8);
      timer = setTimeout(tick, delay);
    }
  };

  timer = setTimeout(tick, 0);
  return { stop: () => { stopped = true; clearTimeout(timer); } };
}
