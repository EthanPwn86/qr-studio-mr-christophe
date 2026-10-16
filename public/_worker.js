const ORIGIN = 'https://qrtof.pages.dev'
const events = {
  qr_generated: 'qr_generes',
  download_png: 'telechargements_png',
  download_svg: 'telechargements_svg',
}

function response(status) {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== '/api/usage') return env.ASSETS.fetch(request)
    if (request.method !== 'POST') return response(405)
    if (request.headers.get('Origin') !== ORIGIN) return response(403)
    if (request.headers.get('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site') !== 'same-origin') return response(403)
    if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') return response(204)
    if (request.headers.get('Content-Type') !== 'text/plain') return response(415)
    if (Number(request.headers.get('Content-Length')) > 64) return response(413)
    // Read a bounded body even when Content-Length is absent or incorrect.
    const reader = request.body?.getReader()
    if (!reader) return response(400)
    let size = 0
    const chunks = []
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 64) { await reader.cancel(); return response(413) }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      let data
      try { data = JSON.parse(new TextDecoder().decode(bytes)) } catch { return response(400) }
      if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 1 || typeof data.event !== 'string' || !Object.hasOwn(events, data.event)) return response(400)
      const column = events[data.event]
      const downloads = data.event.startsWith('download_') ? 1 : 0
      const day = new Date().toISOString().slice(0, 10)
      // Only a date, an event category and aggregate counts are stored.
      // No per-person rows, request headers, IPs, QR contents or URLs.
      const statement = `INSERT INTO statistiques (periode, ${column}, telechargements_total) VALUES (?, 1, ?) ON CONFLICT(periode) DO UPDATE SET ${column} = ${column} + 1, telechargements_total = telechargements_total + ?`
      await env.USAGE_DB.batch(['TOTAL', day].map(period => env.USAGE_DB.prepare(statement).bind(period, downloads, downloads)))
      return response(204)
    } catch {
      // Free-tier quota exhaustion or database outages leave the app usable.
      // Do not log requests or payloads.
      return response(503)
    }
  },
}
