import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowDownToLine, ArrowRight, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, ExternalLink, ImagePlus, Infinity as InfinityIcon, Link2, LoaderCircle, LockKeyhole, MonitorSmartphone, Plus, RotateCcw, ShieldCheck, Sparkles, Trash2, WifiOff, X } from 'lucide-react'
import type QRCodeStyling from 'qr-code-styling'
import type { CornerSquareType, DotType } from 'qr-code-styling'
import { contrast, defaults, filename, readLogo, validateUrl, type Design, type Entry } from './model'
import { history, saveEntry, deleteEntries } from './storage'
import { decodeBlob, downloadBlob, makeQr, withTimeout } from './qr'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
type Ready = { url: string; design: Design; thumbnail: string }
const palettes = ['#164c3b', '#182230', '#5844a4', '#194faa', '#923650', '#a84b18']
const styles: { value: DotType; label: string; className: string }[] = [
  { value: 'square', label: 'Classique', className: 'square' },
  { value: 'rounded', label: 'Arrondi', className: 'rounded' },
  { value: 'dots', label: 'Points', className: 'dots' },
  { value: 'classy-rounded', label: 'Élégant', className: 'classy' },
]

function Mark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true"><i /><i /><i /><span><b /><b /><b /></span></span>
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return <label className="color-control"><span>{label}</span><div className="color-input"><input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={`Choisir la ${label.toLowerCase()}`} /><input aria-label={`${label} hexadécimale`} value={draft.toUpperCase()} maxLength={7} spellCheck={false} onChange={e => { setDraft(e.target.value); if (/^#[a-f\d]{6}$/i.test(e.target.value)) onChange(e.target.value) }} onBlur={() => setDraft(value)} /></div></label>
}

export default function App() {
  const [input, setInput] = useState('')
  const [design, setDesign] = useState<Design>({ ...defaults })
  const [resolution, setResolution] = useState(1536)
  const [entries, setEntries] = useState<Entry[]>([])
  const [status, setStatus] = useState<'empty' | 'checking' | 'ready' | 'failed'>('empty')
  const [ready, setReady] = useState<Ready | null>(null)
  const [renderError, setRenderError] = useState('')
  const [logoError, setLogoError] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [offlineReady, setOfflineReady] = useState(false)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [helpTab, setHelpTab] = useState<'install' | 'privacy' | 'help'>('help')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const preview = useRef<HTMLDivElement>(null)
  const linkInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const helpDialog = useRef<HTMLDialogElement>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const sessionId = useRef<string>(crypto.randomUUID())
  const created = useRef(Date.now())
  const qrRef = useRef<QRCodeStyling | null>(null)
  const logoSequence = useRef(0)
  const { url, error } = validateUrl(input)
  const safety = contrast(design)
  const contrastWarning = safety.inverted ? 'Gardez les modules plus foncés que le fond pour faciliter la lecture.' : safety.ratio < 4.5 ? 'Ces couleurs manquent de contraste. Choisissez un QR plus foncé ou un fond plus clair.' : ''
  const disabled = status !== 'ready' || !ready || ready.url !== url || ready.design !== design || !!contrastWarning || exporting || importing

  useEffect(() => { history().then(setEntries).catch(() => setStorageError(true)) }, [])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const network = () => setOnline(navigator.onLine)
    const cached = () => setOfflineReady(true)
    const failed = () => setNotice('Le cache hors connexion n’a pas pu être installé. Réessayez en rechargeant la page avec une connexion.')
    const installPrompt = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent) }
    const installed = () => { setInstall(null); setNotice('QR Studio est installé sur votre appareil.') }
    window.addEventListener('online', network); window.addEventListener('offline', network)
    window.addEventListener('qr-offline-ready', cached); window.addEventListener('qr-offline-failed', failed)
    window.addEventListener('beforeinstallprompt', installPrompt); window.addEventListener('appinstalled', installed)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) cached()
    return () => {
      window.removeEventListener('online', network); window.removeEventListener('offline', network)
      window.removeEventListener('qr-offline-ready', cached); window.removeEventListener('qr-offline-failed', failed)
      window.removeEventListener('beforeinstallprompt', installPrompt); window.removeEventListener('appinstalled', installed)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    qrRef.current = null; setReady(null); setRenderError('')
    preview.current?.replaceChildren()
    if (!url) { setStatus('empty'); return }
    setStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const qr = makeQr(url, design)
        if (cancelled) return
        if (preview.current) qr.append(preview.current)
        const blob = await withTimeout(qr.getRawData('png'))
        if (!(blob instanceof Blob)) throw new Error('L’image n’a pas pu être créée.')
        const decoded = await decodeBlob(blob)
        if (cancelled) return
        if (decoded.data !== url) {
          setStatus('failed'); setRenderError('La lecture automatique échoue avec ces réglages. Réduisez le logo ou restaurez les couleurs et le style par défaut.')
          return
        }
        qrRef.current = qr
        setReady({ url, design, thumbnail: decoded.thumbnail }); setStatus('ready')
      } catch {
        if (!cancelled) { setStatus('failed'); setRenderError('Impossible de générer ce QR. Essayez un lien plus court ou restaurez les paramètres.') }
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [url, design])

  useEffect(() => {
    if (!ready || contrastWarning) return
    const id = sessionId.current
    const timestamp = created.current
    const timer = setTimeout(() => {
      const entry: Entry = { id, url: ready.url, design: ready.design, created: timestamp, thumbnail: ready.thumbnail }
      saveEntry(entry).then(() => history()).then(setEntries).catch(() => setStorageError(true))
    }, 1200)
    return () => clearTimeout(timer)
  }, [ready, contrastWarning])

  function change<K extends keyof Design>(key: K, value: Design[K]) { setDesign(current => ({ ...current, [key]: value })) }
  function newQr() {
    logoSequence.current++
    setImporting(false)
    sessionId.current = crypto.randomUUID(); created.current = Date.now()
    setInput(''); setDesign({ ...defaults }); setLogoError(''); linkInput.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function restore() { logoSequence.current++; setImporting(false); setDesign({ ...defaults }); setLogoError(''); setNotice('Les paramètres par défaut ont été restaurés.') }
  async function importLogo(file?: File) {
    if (!file) return
    const sequence = ++logoSequence.current
    setImporting(true); setLogoError('')
    try {
      const data = await readLogo(file)
      if (sequence === logoSequence.current) setDesign(current => ({ ...current, logo: data, logoName: file.name.slice(0, 255) }))
    } catch (err) { if (sequence === logoSequence.current) setLogoError((err as Error).message) }
    finally { if (sequence === logoSequence.current) setImporting(false); if (fileInput.current) fileInput.current.value = '' }
  }
  function removeLogo() { logoSequence.current++; setImporting(false); setDesign(current => ({ ...current, logo: '', logoName: '' })); setLogoError('') }
  async function exportQr(extension: 'png' | 'svg', item?: Entry) {
    const selected = item ? { url: item.url, design: item.design, thumbnail: item.thumbnail } : ready
    if (!selected || exporting) return
    setExporting(true)
    try {
      const qr = item || extension === 'png' ? makeQr(selected.url, selected.design, extension === 'png' ? resolution : 768) : qrRef.current!
      const blob = await withTimeout(qr.getRawData(extension), 15_000)
      if (!(blob instanceof Blob)) throw new Error()
      downloadBlob(blob, filename(selected.url, extension))
      setNotice(`${extension.toUpperCase()} téléchargé${extension === 'png' ? ` · ${resolution} × ${resolution} px` : ' · qualité vectorielle'}.`)
      if (!item) {
        await saveEntry({ ...selected, id: sessionId.current, created: created.current }).then(() => history()).then(setEntries).catch(() => setStorageError(true))
      }
    } catch { setNotice('Le téléchargement a échoué. Réessayez ou choisissez une résolution inférieure.') }
    finally { setExporting(false) }
  }
  function loadEntry(entry: Entry) {
    logoSequence.current++
    sessionId.current = entry.id; created.current = entry.created
    setInput(entry.url); setDesign({ ...entry.design }); setLogoError('')
    window.scrollTo({ top: 0, behavior: 'smooth' }); linkInput.current?.focus()
    setNotice('QR retrouvé. Vos modifications seront enregistrées automatiquement.')
  }
  async function deleteHistory() {
    if (!confirmDelete) return
    try {
      await deleteEntries(confirmDelete === 'all' ? undefined : confirmDelete)
      // Cancel pending writes when deleting the QR currently being edited.
      if (confirmDelete === 'all' || confirmDelete === sessionId.current) newQr()
      setEntries(await history()); setNotice(confirmDelete === 'all' ? 'L’historique a été effacé.' : 'Le QR a été supprimé de l’historique.')
    } catch { setNotice('La suppression a échoué. Le stockage local est peut-être désactivé.') }
    deleteDialog.current?.close(); setConfirmDelete(null)
  }
  function askDelete(id: string) { setConfirmDelete(id); deleteDialog.current?.showModal() }
  function help(tab: typeof helpTab) { setHelpTab(tab); helpDialog.current?.showModal() }
  async function installApp() {
    if (!install) { help('install'); return }
    try { await install.prompt(); const choice = await install.userChoice; if (choice.outcome === 'accepted') setInstall(null) }
    catch { help('install') }
  }

  return <>
    <a className="skip" href="#studio">Aller au générateur</a>
    <header className="site-header"><a className="brand" href="/" aria-label="QR Studio, accueil"><Mark /><span>QR<span className="brand-light"> Studio</span><small>by Mr Christophe</small></span></a><nav aria-label="Navigation principale"><a href="#recent" aria-label="Mes QR codes"><Clock3 size={16} />Mes QR codes{entries.length > 0 && <span className="nav-count">{entries.length}</span>}</a><button className="install-button" aria-label="Installer l’application" onClick={installApp}><MonitorSmartphone size={16} /><span>Installer l’application</span><ArrowDownToLine size={14} /></button></nav></header>
    {!online && <div className="offline-banner" role="status"><WifiOff size={15} />Vous êtes hors connexion. Le studio reste disponible ; les liens encodés nécessitent Internet pour être ouverts.</div>}
    <main>
      <section className="hero"><div className="eyebrow"><span />LE LIEN ENTRE VOS IDÉES ET LE MONDE</div><h1>Un lien. Un QR.<br className="mobile-break" /> <em>Et c’est tout.</em></h1><p>Créez un QR code à votre image, en quelques secondes.<br />Gratuit, sans compte, et à vous pour toujours.</p><div className="hero-benefits"><span><InfinityIcon size={15} />Créations illimitées</span><span><ShieldCheck size={15} />Sans expiration</span><span><LockKeyhole size={14} />100 % sur votre appareil</span></div><span className="hero-decoration" aria-hidden="true">✳</span></section>

      <div id="studio" className="studio-grid">
        <div className="settings-column">
          <section className="card link-card"><div className="section-heading"><span className="step">01</span><h2>Tout commence par un lien</h2><Link2 size={18} /></div><label className="field-label" htmlFor="url">L’adresse de votre site ou de votre page</label><div className={`url-field ${error ? 'invalid' : ''}`}><Link2 size={18} /><input ref={linkInput} id="url" type="url" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="https://votre-site.com" value={input} onChange={e => setInput(e.target.value)} aria-invalid={!!error} aria-describedby="url-help" />{input && <button aria-label="Effacer le lien" onClick={() => { setInput(''); linkInput.current?.focus() }}><X size={16} /></button>}</div><div id="url-help" className={error ? 'field-error' : 'field-hint'}>{error || <>Un lien en http:// ou https://. C’est tout ce qu’il vous faut.</>}</div>{!input && <button className="example-link" onClick={() => setInput('https://www.wikipedia.org/')}><Sparkles size={13} />Essayer avec un exemple<ArrowRight size={13} /></button>}</section>

          <section className="card customize-card"><div className="section-heading"><span className="step">02</span><h2>Donnez-lui votre style</h2><button className="icon-button" onClick={restore} title="Restaurer les paramètres par défaut" aria-label="Restaurer les paramètres par défaut"><RotateCcw size={16} /></button></div><div className="color-row"><ColorControl label="Couleur du QR" value={design.foreground} onChange={value => change('foreground', value)} /><ColorControl label="Couleur du fond" value={design.background} onChange={value => change('background', value)} /></div><div className="palette-row"><span>Un peu d’inspiration</span><div>{palettes.map(color => <button key={color} className={`swatch ${design.foreground === color ? 'selected' : ''}`} style={{ backgroundColor: color }} aria-label={`Couleur ${color}`} aria-pressed={design.foreground === color} onClick={() => change('foreground', color)}>{design.foreground === color && <Check size={12} />}</button>)}</div></div><div className="divider" /><fieldset><legend>Style des modules</legend><div className="style-grid">{styles.map(style => <button key={style.value} className={`style-choice ${design.dots === style.value ? 'active' : ''}`} aria-pressed={design.dots === style.value} onClick={() => change('dots', style.value)}><span className={`module-sample ${style.className}`} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span><span>{style.label}</span></button>)}</div></fieldset><fieldset className="corner-field"><legend>Forme des coins</legend><div className="corner-grid">{([{ value: 'square', label: 'Carrés' }, { value: 'extra-rounded', label: 'Arrondis' }, { value: 'dot', label: 'Ronds' }] as { value: CornerSquareType; label: string }[]).map(corner => <button className={`corner-choice ${design.corners === corner.value ? 'active' : ''}`} key={corner.value} aria-pressed={design.corners === corner.value} onClick={() => change('corners', corner.value)}><span className={`corner-sample ${corner.value}`} aria-hidden="true" />{corner.label}</button>)}</div></fieldset></section>

          <section className="card logo-card"><div className="section-heading"><span className="step">03</span><h2>La petite touche personnelle</h2><span className="optional">Facultatif</span></div><input ref={fileInput} data-testid="logo-input" type="file" className="visually-hidden" accept="image/png,image/jpeg,image/webp" onChange={e => importLogo(e.target.files?.[0])} tabIndex={-1} />{design.logo ? <><div className="imported-logo"><img src={design.logo} alt="Votre logo importé" /><div><strong>{design.logoName}</strong><span>Votre logo, au centre du QR</span></div><button className="icon-button" onClick={removeLogo} aria-label="Retirer le logo"><Trash2 size={17} /></button></div><label className="range-label" htmlFor="logo-size">Taille du logo<span>{Math.round(design.logoSize * 100)} %</span></label><input id="logo-size" type="range" min="0.1" max="0.28" step="0.01" value={design.logoSize} onChange={e => change('logoSize', Number(e.target.value))} /><p className="field-hint">Surface maximale réservée au logo. Un petit logo se scanne plus facilement.</p></> : <button className="upload-zone" disabled={importing} onClick={() => fileInput.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); importLogo(e.dataTransfer.files[0]) }}>{importing ? <LoaderCircle className="spin" size={22} /> : <ImagePlus size={23} />}<span><strong>Ajoutez votre logo</strong><small>Glissez une image ou cliquez pour la choisir</small></span><span className="file-types">PNG, JPG, WebP · 5 Mo max.</span></button>}{logoError && <p className="field-error" role="alert">{logoError}</p>}<p className="logo-note"><ShieldCheck size={13} />Correction d’erreur élevée, pour une meilleure lisibilité.</p></section>
        </div>

        <aside className="preview-column" aria-label="Prévisualisation et téléchargement"><section className="preview-card"><div className="preview-header"><span><i />APERÇU EN DIRECT</span><span className="live-badge">{status === 'checking' ? 'Création…' : status === 'ready' ? 'Prêt à partager' : 'Votre prochain QR'}</span></div><div className={`qr-stage ${url ? 'has-qr' : ''}`}><div className="scan-corner top-left" /><div className="scan-corner top-right" /><div className="scan-corner bottom-left" /><div className="scan-corner bottom-right" /><div className="qr-render" ref={preview} data-testid="qr-preview" style={{ display: url ? 'block' : 'none' }} />{!url && <div className="qr-placeholder"><Mark /><span>Votre idée prend forme ici.</span><small>Ajoutez un lien pour commencer</small></div>}{status === 'checking' && <div className="checking-overlay"><LoaderCircle className="spin" size={22} /><span>Vérification de la lecture</span></div>}</div><div className={`scan-status ${status === 'failed' || contrastWarning ? 'warning-text' : ''}`} aria-live="polite">{status === 'ready' && !contrastWarning ? <><CheckCheck size={15} />Lecture automatique vérifiée</> : status === 'checking' ? <><LoaderCircle size={14} className="spin" />Un instant, on vérifie votre QR…</> : status === 'failed' || contrastWarning ? <><CircleHelp size={15} />Quelques réglages à ajuster</> : <><ArrowDown size={14} />Personnalisez. Téléchargez. Partagez.</>}</div>{url && <div className="destination"><Link2 size={13} /><span title={url}>{url}</span></div>}<div className="preview-divider" /><div className="download-heading"><h2>À vous de le partager.</h2><span>Sans filigrane. Sans limite.</span></div><label className="resolution-label" htmlFor="resolution">Résolution PNG<span className="select-wrap"><select id="resolution" value={resolution} onChange={e => setResolution(Number(e.target.value))}><option value={768}>768 × 768 px</option><option value={1536}>1 536 × 1 536 px</option><option value={3072}>3 072 × 3 072 px</option></select><ChevronDown size={14} /></span></label><button className="primary-button" disabled={disabled} onClick={() => exportQr('png')}>{exporting ? <LoaderCircle size={18} className="spin" /> : <ArrowDownToLine size={18} />}Télécharger le PNG<ArrowRight size={18} /></button><button className="secondary-button" disabled={disabled} onClick={() => exportQr('svg')}><ArrowDownToLine size={16} />Télécharger le SVG<span>Vectoriel</span></button><p className="export-note">Parfait pour le web, le papier et vos grandes idées.</p>{(contrastWarning || renderError) && <p className="safety-warning" role="alert">{contrastWarning || renderError}</p>}<p className="scan-tip">Avant d’imprimer, testez toujours votre QR avec votre téléphone.</p></section><div className="privacy-note"><span className="privacy-icon"><LockKeyhole size={18} /></span><div><strong>Vos liens restent vos liens.</strong><p>Aucun compte, aucun suivi. Vos QR et vos logos restent dans votre navigateur.</p></div></div></aside>
      </div>

      <section className="history-section" id="recent"><div className="history-heading"><div><span className="eyebrow">VOTRE ESPACE PERSONNEL</span><h2>Vos dernières créations<span>{entries.length.toString().padStart(2, '0')}</span></h2><p>Retrouvez vos QR, prêts à être modifiés ou partagés.</p></div><div className="history-actions"><button className="new-button" onClick={newQr}><Plus size={16} />Nouveau QR</button>{entries.length > 0 && <button className="text-button" onClick={() => askDelete('all')}><Trash2 size={14} />Tout effacer</button>}</div></div>{storageError && <div className="storage-warning" role="alert">L’historique ne peut pas être enregistré sur cet appareil. Vérifiez que le stockage du navigateur est autorisé. Vous pouvez toujours générer et télécharger vos QR.</div>}{entries.length ? <div className="history-grid">{entries.map(entry => <article className="history-card" key={entry.id}><button className="history-main" onClick={() => loadEntry(entry)} aria-label={`Modifier le QR de ${entry.url}`}><img src={entry.thumbnail} alt="Aperçu du QR enregistré" /><div><strong>{new URL(entry.url).hostname}</strong><span title={entry.url}>{entry.url}</span><small>{new Date(entry.created).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })}{entry.design.logo ? ' · Avec logo' : ' · QR statique'}</small></div></button><div className="history-buttons"><button onClick={() => loadEntry(entry)}>Modifier<ArrowRight size={13} /></button><button disabled={exporting} className="icon-button" onClick={() => exportQr('png', entry)} aria-label={`Télécharger le QR de ${entry.url}`}><ArrowDownToLine size={16} /></button><button className="icon-button" onClick={() => askDelete(entry.id)} aria-label={`Supprimer le QR de ${entry.url}`}><Trash2 size={15} /></button></div></article>)}</div> : <div className="empty-history"><span><Clock3 size={24} /></span><div><strong>Le début d’une belle collection.</strong><p>Vos QR sont enregistrés ici automatiquement, sur cet appareil.</p></div><span className="local-badge"><LockKeyhole size={12} />Stockage local</span></div>}<p className="history-footnote"><LockKeyhole size={12} />Les 50 créations les plus récentes sont conservées ici. Effacer les données du navigateur efface aussi cet historique.</p></section>

      <section className="bottom-strip"><div><InfinityIcon /><span><strong>Vraiment gratuit.</strong><small>Autant de QR que d’idées.</small></span></div><div><ShieldCheck /><span><strong>Créé pour durer.</strong><small>Des QR statiques, sans expiration.</small></span></div><div><MonitorSmartphone /><span><strong>Partout avec vous.</strong><small>Sur ordinateur, iPhone et Android.</small></span></div></section>
    </main>
    <footer><div className="footer-credit"><img src="/brand/mr-christophe.png" alt="Logo officiel Mr Christophe" width="58" height="58" /><div><strong>QR Studio</strong><span>by Mr Christophe</span></div></div><p>Les bonnes idées méritent d’être partagées.</p><div className="footer-links"><button onClick={() => help('privacy')}>Confidentialité</button><button onClick={() => help('help')}>Un coup de main ?<ExternalLink size={12} /></button><span className="offline-indicator" title={offlineReady ? 'Les ressources sont disponibles hors connexion' : 'La mise en cache sera disponible après le premier chargement en production'}><span className={offlineReady ? 'cached' : ''} />{offlineReady ? 'Prêt hors connexion' : 'Généré sur votre appareil'}</span></div></footer>
    {notice && <div className="toast" role="status"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Fermer la notification"><X size={15} /></button></div>}

    <dialog ref={helpDialog} className="help-dialog"><button className="dialog-close icon-button" onClick={() => helpDialog.current?.close()} aria-label="Fermer"><X size={20} /></button><span className="eyebrow">QR STUDIO · BY MR CHRISTOPHE</span>{helpTab === 'install' ? <><h2>Votre studio, à portée de main.</h2><p>QR Studio s’installe gratuitement et fonctionne hors connexion après le premier chargement complet.</p><ol><li><strong>Sur iPhone ou iPad :</strong> ouvrez cette page dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».</li><li><strong>Sur Android :</strong> dans Chrome, ouvrez le menu ⋮ puis « Ajouter à l’écran d’accueil » ou « Installer l’application ».</li><li><strong>Sur ordinateur :</strong> dans Chrome ou Edge, utilisez l’icône d’installation dans la barre d’adresse ou le menu du navigateur.</li></ol><p className="dialog-note">Firefox et certains navigateurs intégrés ne proposent pas l’installation. Le site y reste utilisable. Le cache peut être supprimé par le système si l’espace manque. Les sites pointés par vos QR peuvent nécessiter Internet.</p></> : helpTab === 'privacy' ? <><h2>Votre vie privée, simplement.</h2><p>La génération, l’import du logo et les exports se font dans votre navigateur. L’application n’envoie ni vos liens, ni vos images, ni votre historique à un serveur.</p><p>Les 50 dernières créations sont conservées dans IndexedDB sur cet appareil. Le cache technique de la PWA permet le fonctionnement hors connexion. Aucun outil publicitaire, cookie de suivi ou analyse de fréquentation n’est intégré.</p><p>L’hébergeur reçoit les requêtes techniques nécessaires à l’accès au site, comme pour toute page web. Une fois le site en cache, la création de QR fonctionne sans réseau.</p><p>Vous pouvez supprimer une création, tout l’historique, ou les données du site dans votre navigateur.</p></> : <><h2>De votre lien au premier scan.</h2><ol><li><strong>Collez un lien complet</strong> commençant par https:// ou http://. Le QR apparaît automatiquement.</li><li><strong>Choisissez votre style.</strong> Gardez un QR foncé sur un fond clair. Votre propre logo est facultatif ; limitez sa taille pour préserver la lecture.</li><li><strong>Téléchargez.</strong> Le PNG est une image prête à partager. Le SVG reste net à toute taille et intègre aussi votre logo.</li><li><strong>Testez avec votre téléphone</strong> avant toute impression. La vérification automatique aide, mais chaque appareil et chaque support d’impression diffère.</li></ol><p>Un QR statique ne change pas après téléchargement. Son lien reste valable tant que la page de destination existe. Modifier un ancien QR ici crée un nouveau fichier à télécharger ; les fichiers déjà distribués restent identiques.</p><p className="dialog-note">La création est illimitée. La capacité technique d’un QR en correction élevée limite ici les liens à 1 200 octets. Le bouton ↺ restaure tous les paramètres, y compris le retrait de votre logo.</p></>}<button className="primary-button" onClick={() => helpDialog.current?.close()}>C’est compris<Check size={17} /></button></dialog>
    <dialog ref={deleteDialog} className="delete-dialog" onCancel={() => setConfirmDelete(null)}><h2>{confirmDelete === 'all' ? 'Effacer votre historique ?' : 'Supprimer cette création ?'}</h2><p>{confirmDelete === 'all' ? 'Les créations enregistrées sur cet appareil seront supprimées.' : 'Ce QR sera retiré de l’historique de cet appareil.'} Les fichiers déjà téléchargés restent disponibles.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => { deleteDialog.current?.close(); setConfirmDelete(null) }}>Annuler</button><button className="danger-button" onClick={deleteHistory}><Trash2 size={16} />Supprimer</button></div></dialog>
  </>
}
