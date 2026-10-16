import type { DotType, CornerSquareType } from 'qr-code-styling'

export type Design = {
  foreground: string
  background: string
  dots: DotType
  corners: CornerSquareType
  logo: string
  logoName: string
  logoSize: number
}
export type Entry = { id: string; url: string; design: Design; created: number; thumbnail: string }
export const defaults: Design = {
  foreground: '#0b3550', background: '#ffffff', dots: 'square', corners: 'extra-rounded',
  logo: '', logoName: '', logoSize: 0.2,
}

export function validateUrl(input: string): { url: string; error: string } {
  if (!input.trim()) return { url: '', error: '' }
  if (!/^https?:\/\//i.test(input.trim())) return { url: '', error: 'Commencez votre lien par https:// ou http://.' }
  try {
    if (/\s/.test(input.trim())) throw new Error()
    const parsed = new URL(input.trim())
    if (!parsed.hostname || parsed.username || parsed.password) throw new Error()
    const url = parsed.href
    if (new TextEncoder().encode(url).length > 1200) return { url: '', error: 'Ce lien est trop long pour un QR avec correction élevée (1 200 octets maximum). Utilisez un lien plus court de votre propre site.' }
    return { url, error: '' }
  } catch { return { url: '', error: 'Ce lien ne semble pas valide. Vérifiez son adresse et retirez les espaces.' } }
}

function luminance(hex: string) {
  const values = hex.slice(1).match(/.{2}/g)!.map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}
export function contrast(design: Design) {
  const foreground = luminance(design.foreground)
  const background = luminance(design.background)
  return { ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05), inverted: foreground >= background }
}

export function validDesign(value: unknown): value is Design {
  if (!value || typeof value !== 'object') return false
  const d = value as Design
  return /^#[\da-f]{6}$/i.test(d.foreground) && /^#[\da-f]{6}$/i.test(d.background)
    && ['square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'].includes(d.dots)
    && ['square', 'dot', 'extra-rounded'].includes(d.corners)
    && typeof d.logo === 'string' && d.logo.length < 3_000_000
    && (!d.logo || /^data:image\/(png|jpeg|webp);base64,/.test(d.logo))
    && typeof d.logoName === 'string' && d.logoName.length <= 255
    && typeof d.logoSize === 'number' && d.logoSize >= 0.1 && d.logoSize <= 0.28
}

export function filename(url: string, extension: string) {
  const domain = new URL(url).hostname.replace(/[^a-z0-9.-]/gi, '-')
  return `qr-studio-${domain}-${new Date().toISOString().slice(0, 10)}.${extension}`
}

export async function readLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choisissez une image PNG, JPEG ou WebP.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Cette image dépasse 5 Mo. Choisissez un fichier plus léger.')
  // Check the signature as well as the declared MIME type.
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const signature = file.type === 'image/png' ? bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71
    : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!signature) throw new Error('Le contenu du fichier ne correspond pas à une image valide.')
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Impossible de lire cette image. Essayez un autre fichier.') })
  try {
    if (bitmap.width * bitmap.height > 25_000_000) throw new Error('Cette image est trop grande. Réduisez-la à moins de 25 mégapixels.')
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally { bitmap.close() }
}
