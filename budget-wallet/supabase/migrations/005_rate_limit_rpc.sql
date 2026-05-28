-- Atomic rate limit increment function
CREATE OR REPLACE FUNCTION public.rate_limit_increment(p_key text, p_window_ms bigint)
RETURNS TABLE(count integer, window_start timestamptz) AS $$
DECLARE
  now_ts timestamptz := now();
  cutoff timestamptz := now_ts - (p_window_ms || ' milliseconds')::interval;
BEGIN
  LOOP
    -- Try to increment existing row inside window
    UPDATE public.rate_limits
    SET count = rate_limits.count + 1
    WHERE key = p_key AND window_start >= cutoff
    RETURNING rate_limits.count, rate_limits.window_start INTO count, window_start;
    IF FOUND THEN
      RETURN NEXT;
      RETURN;
    END IF;

    -- Otherwise try to insert a fresh row; if there's a conflict, retry
    BEGIN
      INSERT INTO public.rate_limits(key, count, window_start) VALUES (p_key, 1, now_ts)
      RETURNING count, window_start INTO count, window_start;
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- concurrent insert, retry the loop
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;
