-- Library cards: show author display name only when the professor opts in (no synthetic names).

ALTER TABLE public.professors
  ADD COLUMN IF NOT EXISTS library_show_display_name boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.professors.library_show_display_name IS
  'When true and name is non-empty, public library may show professors.name on simulation cards.';

CREATE OR REPLACE FUNCTION public.library_author_display_names(prof_ids uuid[])
RETURNS TABLE (professor_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id AS professor_id,
    CASE
      WHEN COALESCE(p.library_show_display_name, false)
        AND NULLIF(trim(p.name), '') IS NOT NULL
      THEN trim(p.name)
      ELSE NULL::text
    END AS display_name
  FROM public.professors p
  WHERE p.id = ANY(prof_ids)
    AND EXISTS (
      SELECT 1 FROM public.simulations s
      WHERE s.professor_id = p.id AND s.is_public = true
    );
$$;

REVOKE ALL ON FUNCTION public.library_author_display_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.library_author_display_names(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.library_author_display_names(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.library_author_display_names(uuid[]) TO service_role;
