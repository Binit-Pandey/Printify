import { useCallback, useEffect, useRef } from 'react';
import { DATA_CHANGED_EVENT, type DataChangedDetail } from '../services/api';

/**
 * Keeps a page's own data in step with the rest of the app.
 *
 * `refresh` is called once on mount, whenever a write to any of `watch`ed
 * endpoints succeeds (from this page or another), and whenever the window
 * comes back to the foreground — which is when the data is most likely to have
 * drifted from the server.
 *
 * @param refresh  Loader to call. Should swallow its own errors.
 * @param watch    Endpoint path prefixes that should trigger a refresh.
 */
export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  watch: string[] = []
) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const watchKey = watch.join('|');

  // Guards against overlapping refreshes: a burst of writes would otherwise
  // start a loader per event and race them into a stale final state.
  const inFlight = useRef(false);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await refreshRef.current();
    } catch (error) {
      console.warn('Auto refresh failed:', error);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    run();

    const onDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<DataChangedDetail>).detail;
      const prefixes = watchKey ? watchKey.split('|') : [];
      if (prefixes.length === 0 || prefixes.some((p) => detail?.path?.startsWith(p))) {
        run();
      }
    };

    const onFocus = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener(DATA_CHANGED_EVENT, onDataChanged);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, onDataChanged);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [run, watchKey]);
}