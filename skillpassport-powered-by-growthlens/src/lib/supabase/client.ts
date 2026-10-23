import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uqwztosfuueurevfgsau.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd3p0b3NmdXVldXJldmZnc2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMDg5NzEsImV4cCI6MjEwNTc4NDk3MX0.BfumsfZue1WibQrYc6W5nXDvCQyzCSFvPuWCYFXHg9k";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
