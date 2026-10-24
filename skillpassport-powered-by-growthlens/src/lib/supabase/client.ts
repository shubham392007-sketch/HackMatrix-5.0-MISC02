import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://igsiwwztcxliwbuylshn.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_YCS6fNh8EvPONKjFxnVb2Q_e8Uq4WVh";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
