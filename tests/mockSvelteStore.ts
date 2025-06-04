export interface Writable<T> {
  set(value: T): void;
  update(fn: (value: T) => T): void;
  subscribe(run: (value: T) => void): () => void;
}

export function writable<T>(value: T): Writable<T> {
  let current = value;
  const subs = new Set<(value: T) => void>();
  function set(v: T) {
    current = v;
    for (const s of subs) s(v);
  }
  function update(fn: (value: T) => T) { set(fn(current)); }
  function subscribe(run: (value: T) => void) {
    subs.add(run);
    run(current);
    return () => subs.delete(run);
  }
  return { set, update, subscribe };
}

export function get<T>(store: { subscribe(run: (value: T) => void): () => void }): T {
  let val!: T;
  const unsub = store.subscribe(v => { val = v; });
  unsub();
  return val;
}

export function derived<T, U>(store: { subscribe(run: (value: T) => void): () => void }, fn: (value: T) => U) {
  const result = writable(fn(get(store)));
  store.subscribe(v => result.set(fn(v)));
  return {
    subscribe: result.subscribe
  };
}
