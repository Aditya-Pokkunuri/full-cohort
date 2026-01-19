-- Enable Realtime for notifications table
-- Using DO block to handle potential errors if it's already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore errors (e.g., if table is already in publication)
      NULL;
  END;
END $$;
