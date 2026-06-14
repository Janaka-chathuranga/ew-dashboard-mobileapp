-- Enable Supabase Realtime for notifications. Client hooks subscribe filtered
-- by recipient_id = auth.uid(); RLS still governs which rows are delivered.
-- (issues / comments can be added here in their feature phases.)

alter publication supabase_realtime add table public.notifications;
