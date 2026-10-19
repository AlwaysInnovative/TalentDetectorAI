-- Support an explicit processing state so concurrent queue workers cannot
-- claim and send the same pending email at the same time.
ALTER TABLE public.email_queue
  DROP CONSTRAINT IF EXISTS email_queue_status_check;

ALTER TABLE public.email_queue
  ADD CONSTRAINT email_queue_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed'));

CREATE INDEX IF NOT EXISTS idx_email_queue_processing
  ON public.email_queue (status, created_at)
  WHERE status IN ('pending', 'processing');
