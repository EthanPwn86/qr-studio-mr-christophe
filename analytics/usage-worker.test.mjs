import { test } from 'node:test'
import assert from 'node:assert/strict'
import worker from '../public/_worker.js'

function database(fails = false) {
  const batches = []
  return {
    batches,
    prepare(sql) { return { bind: (...values) => ({ sql, values }) } },
    async batch(statements) {
      if (fails) throw new Error('quota reached')
      batches.push(statements)
    },
  }
}
function request(body = { event: 'qr_generated' }, headers = {}) {
  return new Request('https://qrtof.pages.dev/api/usage', {
    method: 'POST',
    headers: { Origin: 'https://qrtof.pages.dev', 'Content-Type': 'text/plain', 'Sec-Fetch-Site': 'same-origin', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('each permitted event produces only daily and total aggregate updates', async () => {
  for (const [event, column, downloads] of [['qr_generated', 'qr_generes', 0], ['download_png', 'telechargements_png', 1], ['download_svg', 'telechargements_svg', 1]]) {
    const db = database()
    const result = await worker.fetch(request({ event }), { USAGE_DB: db })
    assert.equal(result.status, 204)
    assert.equal(result.headers.get('Cache-Control'), 'no-store')
    const statements = db.batches[0]
    assert.equal(statements.length, 2)
    assert.ok(statements[0].sql.includes(`SET ${column} = ${column} + 1`))
    assert.deepEqual(statements[0].values, ['TOTAL', downloads, downloads])
    assert.match(statements[1].values[0], /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(JSON.stringify(statements).includes('https://'), false)
  }
})

test('private totals cannot be read using the public event endpoint', async () => {
  const db = database()
  assert.equal((await worker.fetch(new Request('https://qrtof.pages.dev/api/usage'), { USAGE_DB: db })).status, 405)
  assert.equal(db.batches.length, 0)
})

test('other origins and cross-site submissions are rejected', async () => {
  const db = database()
  for (const headers of [{ Origin: 'https://another.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await worker.fetch(request(undefined, headers), { USAGE_DB: db })).status, 403)
  }
  assert.equal(db.batches.length, 0)
})

test('tracking opt-out signals never write counters', async () => {
  const db = database()
  for (const headers of [{ DNT: '1' }, { 'Sec-GPC': '1' }]) {
    assert.equal((await worker.fetch(request(undefined, headers), { USAGE_DB: db })).status, 204)
  }
  assert.equal(db.batches.length, 0)
})

test('unknown events, URLs, logos, extra fields and malformed bodies are rejected', async () => {
  const db = database()
  for (const body of [{ event: 'qr_generated', url: 'https://private.example' }, { event: 'qr_generated', logo: 'secret' }, { event: 'anything' }, { event: ['qr_generated'] }, null, [], '{broken']) {
    assert.equal((await worker.fetch(request(body), { USAGE_DB: db })).status, 400)
  }
  assert.equal(db.batches.length, 0)
})

test('body and content type limits apply before database access', async () => {
  const db = database()
  assert.equal((await worker.fetch(request('x'.repeat(100)), { USAGE_DB: db })).status, 413)
  assert.equal((await worker.fetch(request(undefined, { 'Content-Length': '1000' }), { USAGE_DB: db })).status, 413)
  assert.equal((await worker.fetch(request(undefined, { 'Content-Type': 'application/json' }), { USAGE_DB: db })).status, 415)
  assert.equal(db.batches.length, 0)
})

test('database failures do not return request contents or exception details', async () => {
  const result = await worker.fetch(request(), { USAGE_DB: database(true) })
  assert.equal(result.status, 503)
  assert.equal(await result.text(), '')
})

test('all static routes remain delegated to Pages assets', async () => {
  const req = new Request('https://qrtof.pages.dev/')
  const result = await worker.fetch(req, { ASSETS: { fetch: original => { assert.equal(original, req); return new Response('app') } } })
  assert.equal(await result.text(), 'app')
})
