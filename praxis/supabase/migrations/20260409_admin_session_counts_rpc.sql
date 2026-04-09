-- Aggregated session counts per simulation (non-preview only) for admin analytics.
-- Callable only by service_role; avoids loading every session row into the app.

CREATE OR REPLACE FUNCTION public.admin_session_counts_by_simulation()
RETURNS TABLE (simulation_id uuid, session_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.simulation_id, COUNT(*)::bigint AS session_count
  FROM public.sessions s
  WHERE s.is_preview = false
  GROUP BY s.simulation_id
  ORDER BY session_count DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.admin_session_counts_by_simulation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_session_counts_by_simulation() TO service_role;
