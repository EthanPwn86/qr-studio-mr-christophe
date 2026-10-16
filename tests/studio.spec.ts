import { test, expect, type Page } from '@playwright/test'
import sharp from 'sharp'
import jsQR from 'jsqr'
import ZXing from '@zxing/library'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const origin = process.env.QR_TEST_URL || 'http://127.0.0.1:4173'
const { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } = ZXing
const logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" rx="25" fill="#c0449b"/><path d="M55 60H145V140H55z" fill="#fff"/><circle cx="100" cy="100" r="22" fill="#c0449b"/></svg>'
let logo: Buffer
async function ready(page: Page, url = 'https://example.com/') {
  await page.locator('#url').fill(url)
  await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Télécharger le PNG', exact: true })).toBeEnabled()
}
async function decode(bytes: Buffer) {
  const image = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const quick = jsQR(new Uint8ClampedArray(image.data), image.info.width, image.info.height, { inversionAttempts: 'attemptBoth' })?.data
  if (quick) return quick
  const retry = await sharp(bytes).resize(1024, 1024).ensureAlpha().raw().toBuffer()
  const sampled = jsQR(new Uint8ClampedArray(retry), 1024, 1024, { inversionAttempts: 'attemptBoth' })?.data
  if (sampled) return sampled
  const gray = new Uint8ClampedArray(image.info.width * image.info.height)
  for (let i = 0; i < gray.length; i++) gray[i] = (image.data[i * 4] + 2 * image.data[i * 4 + 1] + image.data[i * 4 + 2]) / 4
  return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(gray, image.info.width, image.info.height))), new Map([[DecodeHintType.TRY_HARDER, true]])).getText()
}
async function exported(page: Page, kind: 'PNG' | 'SVG', name: string) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: new RegExp(`Télécharger le ${kind}`) }).first().click()
  const result = await download
  await result.saveAs(`artifacts/${name}.${kind.toLowerCase()}`)
  const data = await readFile(`artifacts/${name}.${kind.toLowerCase()}`)
  expect(result.suggestedFilename()).toMatch(/^qr-studio-.*-\d{4}-\d{2}-\d{2}\.(png|svg)$/)
  return data
}

test.beforeAll(async () => {
  await mkdir('artifacts', { recursive: true })
  logo = await sharp(Buffer.from(logoSvg)).png().toBuffer()
  await writeFile('artifacts/test-logo.png', logo)
})
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(() => window.addEventListener('beforeinstallprompt', event => event.stopImmediatePropagation()))
  // Cloudflare reads _headers, while Vite preview does not. Apply the exact
  // production CSP to the first local document so image import is tested with it.
  if (origin.startsWith('http:')) {
    const headers = await readFile('public/_headers', 'utf8')
    const csp = headers.match(/Content-Security-Policy: (.*)/)![1]
    await page.route(`${origin}/`, async route => {
      const response = await route.fetch()
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } })
    }, { times: 1 })
  }
  await page.goto('/')
  ;(page as Page & { testErrors?: string[] }).testErrors = errors
})
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({ path: `artifacts/failure-${testInfo.testId.replace(/[^a-z0-9]/gi, '').slice(0, 30)}.png`, fullPage: true }).catch(() => {})
    console.log(await page.locator('.scan-status').textContent().catch(() => ''))
    console.log(await page.locator('.style-choice.active,.corner-choice.active,.safety-warning').allTextContents().catch(() => []))
  }
  expect((page as Page & { testErrors?: string[] }).testErrors).toEqual([])
})

test('génération réelle et export PNG lisible, tailles et zone de silence', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Télécharger le PNG', exact: true })).toBeDisabled()
  await ready(page)
  await page.screenshot({ path: origin.startsWith('https:') ? 'artifacts/public-desktop.png' : 'artifacts/desktop.png', fullPage: true })
  if (origin.startsWith('https:')) await page.screenshot({ path: 'artifacts/public-proof.png', fullPage: false })
  for (const size of [768, 1536, 3072]) {
    await page.locator('#resolution').selectOption(String(size))
    const data = await exported(page, 'PNG', `qr-${size}`)
    const metadata = await sharp(data).metadata()
    expect(metadata.width).toBe(size); expect(metadata.height).toBe(size)
    expect(await decode(data)).toBe('https://example.com/')
    const corner = await sharp(data).extract({ left: 0, top: 0, width: 30, height: 30 }).raw().toBuffer()
    expect([...corner].every(value => value === 255)).toBeTruthy()
  }
})

test('URL HTTP, caractères spéciaux, IDN et lien long', async ({ page }) => {
  const urls = [
    'http://example.com/',
    'https://example.com/café/été?q=bonjour%20monde&emoji=🎨#à-propos',
    'https://例え.テスト/こんにちは?clé=été',
    'https://example.com/?contenu=' + 'abcdef0123456789'.repeat(65),
  ]
  for (const [i, url] of urls.entries()) {
    await ready(page, url)
    await page.locator('#resolution').selectOption('1536')
    expect(await decode(await exported(page, 'PNG', `url-${i}`))).toBe(new URL(url).href)
  }
})

test('tous les styles de modules et de coins restent lisibles', async ({ page }) => {
  await ready(page)
  for (const module of ['Classique', 'Arrondi', 'Points', 'Élégant']) {
    await page.getByRole('button', { name: module, exact: true }).click()
    for (const corner of ['Carrés', 'Arrondis', 'Ronds']) {
      await page.getByRole('button', { name: corner, exact: true }).click()
      await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Télécharger le PNG', exact: true })).toBeEnabled()
    }
  }
})

test('import logo PNG/JPEG/WebP, couleurs et logo intégrés aux deux exports, retrait et restauration', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Couleur #5844a4', exact: true }).click()
  await page.getByRole('textbox', { name: 'Couleur du fond hexadécimale', exact: true }).fill('#fff6df')
  for (const type of ['png', 'jpeg', 'webp'] as const) {
    const image = await sharp(logo)[type]().toBuffer()
    await page.getByTestId('logo-input').setInputFiles({ name: `logo.${type}`, mimeType: `image/${type}`, buffer: image })
    await expect(page.getByAltText('Votre logo importé')).toBeVisible()
    await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  }
  await page.locator('#logo-size').fill('0.28')
  await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  const png = await exported(page, 'PNG', 'custom-logo')
  const svg = await exported(page, 'SVG', 'custom-logo')
  expect(await decode(png)).toBe('https://example.com/')
  expect(await decode(svg)).toBe('https://example.com/')
  const text = svg.toString()
  expect(text).toContain('#5844a4'); expect(text).toContain('#fff6df')
  expect(text).toMatch(/<image[^>]+data:image\/png;base64,/)
  expect(text).not.toMatch(/(?:href|src)="https?:/)
  const pixels = await sharp(png).extract({ left: 768, top: 768, width: 1, height: 1 }).raw().toBuffer()
  // The last imported fixture is WebP; its lossy color conversion may shift channels slightly.
  expect(Math.abs(pixels[0] - 192)).toBeLessThanOrEqual(3); expect(Math.abs(pixels[1] - 68)).toBeLessThanOrEqual(3); expect(Math.abs(pixels[2] - 155)).toBeLessThanOrEqual(3)
  await page.getByRole('button', { name: 'Retirer le logo', exact: true }).click()
  await expect(page.getByAltText('Votre logo importé')).toHaveCount(0)
  await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  expect((await exported(page, 'SVG', 'without-logo')).toString()).not.toContain('<image')
  await page.getByRole('button', { name: 'Restaurer les paramètres par défaut', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Couleur du QR hexadécimale', exact: true })).toHaveValue('#164C3B')
  await expect(page.getByRole('textbox', { name: 'Couleur du fond hexadécimale', exact: true })).toHaveValue('#FFFFFF')
})

test('erreurs de liens, fichiers falsifiés ou trop lourds, contraste et fond sombre', async ({ page }) => {
  for (const value of ['example.com', 'javascript:alert(1)', 'ftp://example.com', 'https://', 'https://a b.com', 'https://u:p@example.com/', 'https://example.com/?q=' + 'x'.repeat(1200)]) {
    await page.locator('#url').fill(value)
    await expect(page.locator('#url')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('button', { name: 'Télécharger le PNG', exact: true })).toBeDisabled()
  }
  await ready(page)
  await page.getByTestId('logo-input').setInputFiles({ name: 'evil.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByText('Choisissez une image PNG, JPEG ou WebP.')).toBeVisible()
  await page.getByTestId('logo-input').setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(page.getByText('Le contenu du fichier ne correspond pas à une image valide.')).toBeVisible()
  await page.getByTestId('logo-input').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
  await expect(page.getByText('Cette image dépasse 5 Mo. Choisissez un fichier plus léger.')).toBeVisible()
  await page.getByRole('textbox', { name: 'Couleur du QR hexadécimale', exact: true }).fill('#eeeeee')
  await expect(page.getByText(/Ces couleurs manquent de contraste/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Télécharger le PNG', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Couleur du fond hexadécimale', exact: true }).fill('#111111')
  await expect(page.getByText(/Gardez les modules plus foncés/)).toBeVisible()
})

test('historique persistant avec logo, reprise, modification, téléchargement et suppressions', async ({ page }) => {
  await ready(page)
  await page.getByTestId('logo-input').setInputFiles({ name: 'mon-logo.png', mimeType: 'image/png', buffer: logo })
  await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  await expect(page.locator('.history-card')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.history-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await expect(page.getByAltText('Votre logo importé')).toBeVisible()
  await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  await page.getByRole('button', { name: 'Couleur #194faa', exact: true }).click()
  await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  await exported(page, 'SVG', 'history-modified')
  await expect(page.locator('.history-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Nouveau QR', exact: true }).click()
  await ready(page, 'https://www.wikipedia.org/')
  await expect(page.locator('.history-card')).toHaveCount(2)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger le QR de https://example.com/', exact: true }).click()
  const result = await download
  await result.saveAs('artifacts/history-download.png')
  expect(await decode(await readFile('artifacts/history-download.png'))).toBe('https://example.com/')
  await page.getByRole('button', { name: 'Supprimer le QR de https://example.com/', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.locator('.history-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Tout effacer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.locator('.history-card')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.history-card')).toHaveCount(0)
})

test('responsive 390 px et 320 px, contrôles tactiles et dialogues accessibles', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await ready(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
    await page.screenshot({ path: `artifacts/mobile-${width}.png`, fullPage: true })
  }
  await page.getByRole('button', { name: 'Installer l’application', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText(/Sur iPhone ou iPad/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Confidentialité', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'C’est compris', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('PWA installable, ressources locales, vrai rechargement et exports hors connexion', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBeTruthy()
  await expect(page.getByText('Prêt hors connexion', { exact: true })).toBeVisible()
  const manifest = await page.request.get('/manifest.webmanifest')
  const json = await manifest.json()
  expect(json.display).toBe('standalone')
  for (const icon of json.icons) expect((await page.request.get(icon.src)).ok()).toBeTruthy()
  const session = await context.newCDPSession(page)
  await session.send('Page.enable')
  const appManifest = await session.send('Page.getAppManifest')
  expect(appManifest.errors).toEqual([])
  const foreignRequests: string[] = []
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) foreignRequests.push(request.url()) })
  await context.setOffline(true)
  await session.send('Network.enable')
  await session.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  const offlinePage = await page.reload()
  expect(offlinePage?.fromServiceWorker()).toBeTruthy()
  await expect(page.locator('#url')).toBeVisible()
  await ready(page, 'https://example.com/offline?test=ok')
  await page.getByTestId('logo-input').setInputFiles({ name: 'offline-logo.png', mimeType: 'image/png', buffer: logo })
  await expect(page.getByText('Lecture automatique vérifiée')).toBeVisible()
  expect(await decode(await exported(page, 'PNG', 'offline'))).toBe('https://example.com/offline?test=ok')
  expect(await decode(await exported(page, 'SVG', 'offline'))).toBe('https://example.com/offline?test=ok')
  expect(foreignRequests).toEqual([])
  await context.setOffline(false)
})
