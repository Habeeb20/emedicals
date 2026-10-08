import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';     // adjust: must expose { user, token }
import { getSocket } from './socket';

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** useFetch(() => api('/x'), [deps]) -> { data, meta, loading, error, reload (silent), refetch, setData } */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await ref.current();
      setState({ data: r.data, meta: r.meta, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => { load(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    ...state,
    reload: () => load(true),
    refetch: () => load(false),
    setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })),
  };
}

export function useSocket() {
  const { token: ctxToken } = useAuth();
  const token = ctxToken ?? localStorage.getItem('token');
  const [socket, setSocket] = useState(null);
  useEffect(() => { if (token) setSocket(getSocket(token)); }, [token]);
  return socket;
}

export function useSocketEvent(event, handler) {
  const socket = useSocket();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => ref.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}
