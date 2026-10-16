export type UsageEvent = 'qr_generated' | 'download_png' | 'download_svg'

/** Aggregate counters only. Never pass QR contents, URLs, images or identifiers. */
export function recordUsage(event: UsageEvent) {
  if (!navigator.onLine || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return
  if (!['qrtof.pages.dev', 'localhost', '127.0.0.1'].includes(location.hostname)) return
  try { void fetch('/api/usage', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ event }),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    redirect: 'error',
    cache: 'no-store',
    keepalive: true,
    signal: AbortSignal.timeout(4000),
  }).catch(() => { /* Statistics never block generation, storage or export. */ }) }
  catch { /* Older browsers may lack keepalive or AbortSignal.timeout. */ }
}
