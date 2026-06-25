export function newId(): string {
  return `r${Date.now().toString(36)}${Math.floor(performance.now()).toString(36)}`;
}
