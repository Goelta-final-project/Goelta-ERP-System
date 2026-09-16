import { useRef, useState } from 'react';

// Write before updating the UI; never silently replace corrupt or newer data.
export function usePersistentState<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const value: unknown = raw === null ? fallback : JSON.parse(raw);
      if (!validate(value)) throw Error();
      return { value, raw, error: '' };
    } catch { return { value: fallback, raw: null, error: 'Saved data could not be loaded. Saving is disabled to preserve it. Restore the browser data before continuing.' }; }
  });
  const [value, setValue] = useState<T>(initial.value);
  const [error, setError] = useState(initial.error);
  const current = useRef(initial.value);
  const raw = useRef(initial.raw);
  const commit = (change: T | ((previous: T) => T)) => {
    try {
      if (initial.error) throw Error(initial.error);
      if (localStorage.getItem(key) !== raw.current) throw Error('This data changed in another tab. Refresh before saving to avoid overwriting it.');
      const next = typeof change === 'function' ? (change as (previous: T) => T)(current.current) : change;
      if (!validate(next)) throw Error('The data could not be saved because it contains invalid values.');
      const serialized = JSON.stringify(next);
      localStorage.setItem(key, serialized);
      raw.current = serialized; current.current = next; setValue(next); setError(''); return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Saving failed. Check browser storage and try again.'); return false; }
  };
  return { value, commit, error };
}
