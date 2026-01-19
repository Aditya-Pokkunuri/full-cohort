-- Add missing total_hours column to attendance table
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS total_hours numeric;

-- Optional: Add a comment to describe the column
COMMENT ON COLUMN public.attendance.total_hours IS 'Total working hours for the day';
