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
    for (const s of Array.from(subs)) s(v);
  }
  function update(fn: (value: T) => T) {
    set(fn(current));
  }
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

export function derived(stores: any, fn: (...args: any[]) => any) {
  if (Array.isArray(stores)) {
    const values = new Array(stores.length);
    let ready = false;
    const result = writable<any>(undefined);

    stores.forEach((s, i) => {
      s.subscribe((val: any) => {
        values[i] = val;
        if (ready) {
          result.set(fn(values));
        }
      });
    });

    ready = true;
    result.set(fn(values));

    return { subscribe: result.subscribe };
  } else {
    let ready = false;
    let singleVal: any;
    const result = writable<any>(undefined);

    stores.subscribe((val: any) => {
      singleVal = val;
      if (ready) {
        result.set(fn(singleVal));
      }
    });

    ready = true;
    result.set(fn(singleVal));

    return { subscribe: result.subscribe };
  }
}
