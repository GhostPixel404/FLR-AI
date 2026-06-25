import { getDb } from '../db/idb';
import { findMatches, type AlertHit } from './engine';
import type { Aircraft, AlertRule } from '../types';

const lastFired = new Map<string, number>();   // `${ruleId}:${hex}` -> epoch ms
const DEBOUNCE_MS = 5 * 60 * 1000;

export async function listRules(): Promise<AlertRule[]> {
  return (await getDb()).getAll('alerts');
}
export async function saveRule(rule: AlertRule): Promise<void> {
  await (await getDb()).put('alerts', rule);
}
export async function deleteRule(id: string): Promise<void> {
  await (await getDb()).delete('alerts', id);
}

export function notify(hit: AlertHit): void {
  const title = `✈ ${hit.rule.name}`;
  const body = `${hit.aircraft.callsign ?? hit.aircraft.hex} (${hit.aircraft.type ?? '?'})`;
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
  window.dispatchEvent(new CustomEvent('flr-toast', { detail: `${title}: ${body}` }));
}

/** Evaluate rules against current aircraft, firing (debounced) notifications. */
export async function evaluateAlerts(
  list: Aircraft[], home: { lat: number; lon: number } | null,
): Promise<void> {
  const rules = await listRules();
  const hits = findMatches(list, rules, home);
  const now = Date.now();
  for (const hit of hits) {
    const key = `${hit.rule.id}:${hit.aircraft.hex}`;
    const prev = lastFired.get(key) ?? 0;
    if (now - prev < DEBOUNCE_MS) continue;
    lastFired.set(key, now);
    notify(hit);
  }
}
