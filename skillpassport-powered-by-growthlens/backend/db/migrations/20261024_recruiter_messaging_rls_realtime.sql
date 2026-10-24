-- Migration: Enable RLS and Supabase Realtime for Recruiter Messaging and Notifications
-- Date: 2026-10-24

-- 1. Configure Replica Identity for Realtime row filtering
ALTER TABLE recruiter_messages REPLICA IDENTITY FULL;
ALTER TABLE user_notifications REPLICA IDENTITY FULL;
ALTER TABLE share_links REPLICA IDENTITY FULL;

-- 2. Add tables to Supabase Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'recruiter_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE recruiter_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'user_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
    END IF;
END $$;

-- 3. Row Level Security for recruiter_messages
ALTER TABLE recruiter_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruiter_messages_recipient_select ON recruiter_messages;
CREATE POLICY recruiter_messages_recipient_select ON recruiter_messages
    FOR SELECT TO authenticated
    USING (auth.uid() = recipient_user_id OR recipient_user_id = '00000000-0000-0000-0000-000000000001'::uuid);

DROP POLICY IF EXISTS recruiter_messages_recipient_update ON recruiter_messages;
CREATE POLICY recruiter_messages_recipient_update ON recruiter_messages
    FOR UPDATE TO authenticated
    USING (auth.uid() = recipient_user_id OR recipient_user_id = '00000000-0000-0000-0000-000000000001'::uuid)
    WITH CHECK (auth.uid() = recipient_user_id OR recipient_user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- 4. Row Level Security for user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_user_select ON user_notifications;
CREATE POLICY user_notifications_user_select ON user_notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

DROP POLICY IF EXISTS user_notifications_user_update ON user_notifications;
CREATE POLICY user_notifications_user_update ON user_notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid)
    WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

DROP POLICY IF EXISTS user_notifications_user_delete ON user_notifications;
CREATE POLICY user_notifications_user_delete ON user_notifications
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

DROP POLICY IF EXISTS user_notifications_user_insert ON user_notifications;
CREATE POLICY user_notifications_user_insert ON user_notifications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- 5. Row Level Security for share_links
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS share_links_owner_policy ON share_links;
CREATE POLICY share_links_owner_policy ON share_links
    FOR ALL TO authenticated
    USING (auth.uid() = owner_user_id OR owner_user_id = '00000000-0000-0000-0000-000000000001'::uuid)
    WITH CHECK (auth.uid() = owner_user_id OR owner_user_id = '00000000-0000-0000-0000-000000000001'::uuid);

DROP POLICY IF EXISTS share_links_anon_select ON share_links;
CREATE POLICY share_links_anon_select ON share_links
    FOR SELECT TO anon
    USING (status = 'active');
