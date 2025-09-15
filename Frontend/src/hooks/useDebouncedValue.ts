import { useEffect, useState } from 'react';

// Returns a debounced version of a value that only updates after `delay` milliseconds
export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Debounced callback helper (fire only after user stops calling for `delay` ms)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<F extends (...args: any[]) => void>(fn: F, delay: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let timer: any;
  return ((...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as F;
}
