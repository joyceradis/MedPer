const appUrl = new URL('./app.html', window.location.href).href;

export const SUPABASE_CONFIG = Object.freeze({
  url: '',
  publishableKey: '',
  redirectUrl: appUrl
});

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_CONFIG.url.startsWith('https://') &&
    SUPABASE_CONFIG.publishableKey.startsWith('sb_')
  );
}
