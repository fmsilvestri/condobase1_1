import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export let supabase: SupabaseClient | null = null;
export let isSupabaseConfigured = false;

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

async function initializeSupabase() {
  if (supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isSupabaseConfigured = true;
    return;
  }

  try {
    const response = await fetch("/api/supabase-config");
    const config = await response.json();
    
    if (config.url && config.anonKey && isValidUrl(config.url)) {
      supabaseUrl = config.url;
      supabaseAnonKey = config.anonKey;
      supabase = createClient(supabaseUrl, supabaseAnonKey);
      isSupabaseConfigured = true;
    }
  } catch (error) {
    console.warn("Could not fetch Supabase config from server");
  }
}

export const supabaseReady = initializeSupabase();
