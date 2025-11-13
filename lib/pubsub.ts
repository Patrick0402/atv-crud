type Callback = (...args: any[]) => void;

const channels: Record<string, Callback[]> = {};

export function subscribe(channel: string, cb: Callback) {
  if (!channels[channel]) channels[channel] = [];
  channels[channel].push(cb);
  return () => unsubscribe(channel, cb);
}

export function unsubscribe(channel: string, cb: Callback) {
  if (!channels[channel]) return;
  channels[channel] = channels[channel].filter((c) => c !== cb);
}

export function publish(channel: string, ...args: any[]) {
  const list = channels[channel] ?? [];
  for (const cb of list) cb(...args);
}
