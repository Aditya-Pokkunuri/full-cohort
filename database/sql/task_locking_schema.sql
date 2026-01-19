-- =====================================================
-- Time-Based Task Locking System
-- Schema Changes and Support Tables
-- =====================================================

-- 1. Add timer tracking columns to tasks table
-- =====================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS elapsed_work_seconds INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_timer_start TIMESTAMPTZ;

COMMENT ON COLUMN tasks.elapsed_work_seconds IS 'Total seconds worked on this task (only during check-in periods)';
COMMENT ON COLUMN tasks.remaining_seconds IS 'Seconds remaining before task is considered overdue';
COMMENT ON COLUMN tasks.is_overdue IS 'True if allocated time has been exceeded';
COMMENT ON COLUMN tasks.is_locked IS 'True if task is locked due to being overdue';
COMMENT ON COLUMN tasks.last_timer_start IS 'Timestamp when timer was last started (on check-in)';

-- 2. Create extension requests table
-- =====================================================
CREATE TABLE IF NOT EXISTS extension_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES profiles(id) NOT NULL,
    reason TEXT NOT NULL,
    additional_hours NUMERIC(5,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    org_id UUID
);

ALTER TABLE extension_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read extension_requests" ON extension_requests FOR SELECT USING (true);
CREATE POLICY "Write extension_requests" ON extension_requests FOR ALL USING (true);

-- 3. Function to start task timers on check-in
-- =====================================================
CREATE OR REPLACE FUNCTION start_task_timers(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Set last_timer_start for all non-completed, non-locked tasks assigned to the user
    UPDATE tasks
    SET last_timer_start = NOW()
    WHERE assigned_to = p_user_id
      AND status NOT IN ('completed', 'closed')
      AND (is_locked IS NULL OR is_locked = FALSE)
      AND last_timer_start IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to stop task timers on check-out
-- =====================================================
CREATE OR REPLACE FUNCTION stop_task_timers(p_user_id UUID)
RETURNS void AS $$
DECLARE
    r RECORD;
    session_seconds INTEGER;
    new_elapsed INTEGER;
    total_allocated_seconds INTEGER;
    new_remaining INTEGER;
BEGIN
    FOR r IN 
        SELECT id, allocated_hours, elapsed_work_seconds, last_timer_start
        FROM tasks
        WHERE assigned_to = p_user_id
          AND last_timer_start IS NOT NULL
    LOOP
        -- Calculate seconds worked this session
        session_seconds := EXTRACT(EPOCH FROM (NOW() - r.last_timer_start))::INTEGER;
        new_elapsed := COALESCE(r.elapsed_work_seconds, 0) + session_seconds;
        
        -- Calculate remaining seconds
        total_allocated_seconds := COALESCE(r.allocated_hours, 8) * 3600; -- Default 8 hours if not set
        new_remaining := total_allocated_seconds - new_elapsed;
        
        -- Update the task
        UPDATE tasks 
        SET 
            elapsed_work_seconds = new_elapsed,
            remaining_seconds = new_remaining,
            is_overdue = (new_remaining <= 0),
            is_locked = (new_remaining <= 0),
            last_timer_start = NULL,
            updated_at = NOW()
        WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to approve extension request
-- =====================================================
CREATE OR REPLACE FUNCTION approve_extension_request(
    p_request_id UUID,
    p_approver_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_additional_seconds INTEGER;
BEGIN
    -- Get the request
    SELECT * INTO v_request FROM extension_requests WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found');
    END IF;
    
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request already processed');
    END IF;
    
    -- Calculate additional seconds
    v_additional_seconds := (v_request.additional_hours * 3600)::INTEGER;
    
    -- Update the task
    UPDATE tasks
    SET 
        remaining_seconds = COALESCE(remaining_seconds, 0) + v_additional_seconds,
        allocated_hours = COALESCE(allocated_hours, 0) + v_request.additional_hours,
        is_overdue = FALSE,
        is_locked = FALSE,
        updated_at = NOW()
    WHERE id = v_request.task_id;
    
    -- Update the request
    UPDATE extension_requests
    SET 
        status = 'approved',
        approved_by = p_approver_id,
        reviewer_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Extension approved');
END;
$$ LANGUAGE plpgsql;

-- 6. Function to reject extension request
-- =====================================================
CREATE OR REPLACE FUNCTION reject_extension_request(
    p_request_id UUID,
    p_approver_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- Get the request
    SELECT * INTO v_request FROM extension_requests WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found');
    END IF;
    
    IF v_request.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request already processed');
    END IF;
    
    -- Update the request
    UPDATE extension_requests
    SET 
        status = 'rejected',
        approved_by = p_approver_id,
        reviewer_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Extension rejected');
END;
$$ LANGUAGE plpgsql;

-- 7. Initialize remaining_seconds for existing tasks
-- =====================================================
UPDATE tasks 
SET remaining_seconds = COALESCE(allocated_hours, 8) * 3600 - COALESCE(elapsed_work_seconds, 0)
WHERE remaining_seconds IS NULL AND status NOT IN ('completed', 'closed');
