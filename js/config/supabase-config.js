export const SUPABASE_CONFIG = Object.freeze({
  url: '',
  publishableKey: '',
  redirectUrl: `${window.location.origin}${window.location.pathname}`
});

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_CONFIG.url.startsWith('https://') &&
    SUPABASE_CONFIG.publishableKey.startsWith('sb_')
  );
}
