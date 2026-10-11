import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/**
 * Sends an old standalone URL into the dashboard, keeping its params.
 *   /pharmacy/attend/123?code=ABC  ->  /dashboard?tab=pharmacy-attend&id=123&code=ABC
 */
export default function DashboardRedirect({ tab }) {
  const params = useParams();
  const [sp] = useSearchParams();

  const next = new URLSearchParams(sp); // keep ?code=... etc.
  next.set('tab', tab);
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== '*') next.set(key, value); // :id, :roomId
  });

  return <Navigate to={`/dashboard?${next.toString()}`} replace />;
}

/**
 * Read a value that is a route param when the page is mounted on its own route
 * (/pharmacy/attend/:id) or a query param when it is shown inside the dashboard
 * (/dashboard?tab=pharmacy-attend&id=123).
 */
export function useParamOrQuery(name) {
  const params = useParams();
  const [sp] = useSearchParams();
  return params[name] ?? sp.get(name) ?? undefined;
}