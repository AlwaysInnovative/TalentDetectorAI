-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Trigger to notify manager when agency responds
CREATE OR REPLACE FUNCTION notify_manager_on_proposal_response()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT 
            NEW.manager_id,
            'proposal_' || NEW.status,
            'Agency ' || CASE WHEN NEW.status = 'accepted' THEN 'Accepted' ELSE 'Rejected' END || ' Proposal',
            (SELECT full_name FROM profiles WHERE id = NEW.agency_id) || 
            ' has ' || NEW.status || ' your job proposal for ' ||
            (SELECT title FROM jobs WHERE id = NEW.job_id),
            jsonb_build_object(
                'proposal_id', NEW.id,
                'job_id', NEW.job_id,
                'agency_id', NEW.agency_id,
                'status', NEW.status
            );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_manager_trigger ON commission_proposals;
CREATE TRIGGER notify_manager_trigger
    AFTER UPDATE ON commission_proposals
    FOR EACH ROW
    EXECUTE FUNCTION notify_manager_on_proposal_response();
