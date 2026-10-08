import { useCallback, useEffect, useState } from 'react';
import api from "./api.js";


/** Paginated, debounced list fetcher. */
export function useList(path, filters) {
  const [state, setState] = useState({ rows: [], pagination: null, loading: true, error: '' });
  const [page, setPage] = useState(1);
  const key = JSON.stringify(filters);

  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    page,
    limit: 10,
  }).toString();

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const d = await api(`${path}?${qs}`);
      setState({ rows: d.data.data, pagination: d.pagination, loading: false, error: '' });
      console.log("data", d.data)
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [path, qs]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => setPage(1), [key]);

  return { ...state, setPage, reload: load };
}

/** Runs a mutation, shows a toast, refreshes the list. Resolves true on success. */
export function useAction(reload, notify, onChanged) {
  return useCallback(
    async (path, opts, confirmText) => {
      if (confirmText && !window.confirm(confirmText)) return false;
      try {
        const r = await api(path, opts);
        notify(r.message || 'Done');
        reload();
        onChanged?.();
        return true;
      } catch (e) {
        notify(e.message, 'error');
        return false;
      }
    },
    [reload, notify, onChanged]
  );
}