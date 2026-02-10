import { createClient } from "@supabase/supabase-js";

// Uses environment variables for configuration
const soupUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const soupKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a single supabase client for interacting with your database
export const supabase = createClient(soupUrl, soupKey);
