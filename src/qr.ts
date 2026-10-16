import QRCodeStyling from 'qr-code-styling'
import qrcode from 'qrcode-generator'
import jsQR from 'jsqr'
import type { Design } from './model'

export function makeQr(url: string, design: Design, size = 768) {
  const measure = qrcode(0, 'H')
  measure.addData(url, 'Byte')
  measure.make()
  const margin = Math.ceil(4 * size / (measure.getModuleCount() + 8))
  return new QRCodeStyling({
    width: size, height: size, type: 'svg', data: url, margin,
    qrOptions: { errorCorrectionLevel: 'H', mode: 'Byte' },
    dotsOptions: { color: design.foreground, type: design.dots },
    cornersSquareOptions: { color: design.foreground, type: design.corners },
    cornersDotOptions: { color: design.foreground, type: design.corners === 'dot' ? 'dot' : 'square' },
    backgroundOptions: { color: design.background },
    image: design.logo || undefined,
    // Logos already are self-contained data URLs. Re-fetching them with XHR would
    // violate connect-src 'self' on the public host and stall the library promise.
    imageOptions: { hideBackgroundDots: true, imageSize: design.logoSize, margin: Math.round(size * 0.008), saveAsBlob: false, crossOrigin: 'anonymous' },
  })
}

export async function withTimeout<T>(promise: Promise<T>, milliseconds = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Le délai de création est dépassé.')), milliseconds) })])
  } finally { clearTimeout(timer) }
}

export async function decodeBlob(blob: Blob): Promise<{ data: string; thumbnail: string }> {
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(bitmap, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let data = jsQR(pixels.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })?.data || ''
    if (!data) {
      // Retry a second sampling scale to avoid false finder matches in dense QR codes.
      const retry = document.createElement('canvas')
      retry.width = 1024; retry.height = 1024
      const retryContext = retry.getContext('2d', { willReadFrequently: true })!
      retryContext.drawImage(bitmap, 0, 0, 1024, 1024)
      data = jsQR(retryContext.getImageData(0, 0, 1024, 1024).data, 1024, 1024, { inversionAttempts: 'attemptBoth' })?.data || ''
    }
    // Independent decoder fallback: rounded finders and very dense codes can confuse jsQR.
    if (!data) {
      const { BinaryBitmap, DecodeHintType, HybridBinarizer, QRCodeReader, RGBLuminanceSource } = await import('@zxing/library')
      const luminance = new Uint8ClampedArray(canvas.width * canvas.height)
      for (let i = 0; i < luminance.length; i++) luminance[i] = (pixels.data[i * 4] + 2 * pixels.data[i * 4 + 1] + pixels.data[i * 4 + 2]) / 4
      try {
        data = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, canvas.width, canvas.height))), new Map([[DecodeHintType.TRY_HARDER, true]])).getText()
      } catch { /* An unreadable QR is reported by the caller. */ }
    }
    const thumb = document.createElement('canvas')
    thumb.width = 160; thumb.height = 160
    thumb.getContext('2d')!.drawImage(canvas, 0, 0, 160, 160)
    return { data, thumbnail: thumb.toDataURL('image/png') }
  } finally { bitmap.close() }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name
  document.body.append(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
