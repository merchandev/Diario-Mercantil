/**
 * FlipbookViewer — Magazine PDF viewer
 * • Drag right half → next page  |  Drag left half → prev page
 * • Release > 90° → complete flip |  Release < 90° → snap back
 * • Buttons Anterior / Siguiente  |  Keyboard ← →
 * • Fixed 3D CSS animation (no mirror bug)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAuth } from '../lib/api'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// ─── Types ────────────────────────────────────────────────────────────────────
type FlipPage = { num: number; dataUrl: string }
type Props = {
  src: string
  minHeight?: number
  height?: number
  className?: string
  onPageChange?: (pageIndex: number) => void
}
type Trans = { dir: 'next' | 'prev'; angle: number; dragging: boolean; dragY?: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function spreadPages(pages: FlipPage[], s: number) {
  if (s === 0) return { left: undefined, right: pages[0] }
  const base = 2 * s - 1
  return { left: pages[base], right: pages[base + 1] }
}
function maxSpreadFor(p: FlipPage[]) {
  return p.length === 0 ? 0 : Math.ceil((p.length - 1) / 2)
}
function spreadToPageIdx(s: number) { return s === 0 ? 0 : 2 * s - 1 }
function ease(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

// ─── PageFace ─────────────────────────────────────────────────────────────────
function PageFace({ page, w, h, style = {} }: { page?: FlipPage; w: number; h: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: w, height: h, background: page ? '#fff' : 'transparent', overflow: 'hidden', userSelect: 'none', flexShrink: 0, ...style }}>
      {page && <img src={page.dataUrl} alt={`p${page.num}`} draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />}
    </div>
  )
}

// ─── Corner curl indicator ───────────────────────────────────────────────────
function CornerCurl({ side, corner, visible }: { side: 'left' | 'right'; corner: 'top' | 'bottom'; visible: boolean }) {
  const isR = side === 'right'
  const isBot = corner === 'bottom'
  return (
    <div style={{
      position: 'absolute',
      [isBot ? 'bottom' : 'top']: 0,
      [isR ? 'right' : 'left']: 0,
      width: 44, height: 44,
      pointerEvents: 'none', zIndex: 20, overflow: 'hidden',
      opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease',
    }}>
      {/* Shadow line */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isR && isBot
          ? 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.25) 50%)'
          : isR
            ? 'linear-gradient(225deg, transparent 50%, rgba(0,0,0,0.25) 50%)'
            : isBot
              ? 'linear-gradient(45deg, transparent 50%, rgba(0,0,0,0.25) 50%)'
              : 'linear-gradient(315deg, transparent 50%, rgba(0,0,0,0.25) 50%)',
      }} />
      {/* Folded flap */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isR && isBot
          ? 'linear-gradient(135deg, rgba(235,235,235,0.95) 50%, transparent 50%)'
          : isR
            ? 'linear-gradient(225deg, rgba(235,235,235,0.95) 50%, transparent 50%)'
            : isBot
              ? 'linear-gradient(45deg, rgba(235,235,235,0.95) 50%, transparent 50%)'
              : 'linear-gradient(315deg, rgba(235,235,235,0.95) 50%, transparent 50%)',
        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.12)',
      }} />
    </div>
  )
}

// ─── FoldingPage ──────────────────────────────────────────────────────────────
/**
 * FoldingPage — corner-peel aware 3D fold.
 *
 * dragY (0=top, 1=bottom, default 0.5=middle):
 *   • Moves the transform-origin vertically so the fold radiates from where
 *     the user grabbed the page corner.
 *   • Applies a skewY that bends the page top/bottom depending on grab point:
 *     dragY=0 → top corner leads (bottom of page trails behind)
 *     dragY=1 → bottom corner leads (top of page trails behind)
 *     dragY=0.5 → uniform fold (no skew)
 *
 * perspective(600px) inline gives strong local 3D distortion.
 * background:#fff on both faces prevents transparency.
 */
function FoldingPage({ front, back, angle, side, w, h, dragY = 0.5 }: {
  front?: FlipPage; back?: FlipPage
  angle: number; side: 'right' | 'left'; w: number; h: number
  dragY?: number
}) {
  const isR = side === 'right'
  const sign = isR ? -1 : 1

  // Stable origin: prevents crazy CSS 3D scaling deformations
  const origin = isR ? 'left center' : 'right center'

  // sin() peaks at 90° for shadow and physics intensity
  const curve = Math.sin((angle / 180) * Math.PI)   // 0→1→0

  // Corner peel physics: grabbing near top/bottom produces a slight twist
  const skewDir = (dragY - 0.5) * 2    // -1 (top) to +1 (bottom)

  // Small multi-axis tilt for organic peel without distortion
  const maxTiltX = 8   // 8 degrees max twist
  const maxSkewY = 4   // 4 degrees max skew

  // X tilt pulls the grab-corner toward the user
  const tiltX = curve * maxTiltX * skewDir
  // Y skew adds a bit of curvature
  const skewY = sign * curve * maxSkewY * skewDir

  const fSh = curve * 0.65
  const creaseBright = curve * 0.30

  const frontGrad = isR
    ? `linear-gradient(to left,  rgba(0,0,0,${fSh}) 0%, rgba(0,0,0,${fSh * 0.3}) 50%, transparent 90%)`
    : `linear-gradient(to right, rgba(0,0,0,${fSh}) 0%, rgba(0,0,0,${fSh * 0.3}) 50%, transparent 90%)`
  const backGrad = isR
    ? `linear-gradient(to right, rgba(0,0,0,${fSh}) 0%, rgba(0,0,0,${fSh * 0.3}) 50%, transparent 90%)`
    : `linear-gradient(to left,  rgba(0,0,0,${fSh}) 0%, rgba(0,0,0,${fSh * 0.3}) 50%, transparent 90%)`

  const creaseX = isR ? '2%' : '98%'
  const crease = `radial-gradient(ellipse 16px 100% at ${creaseX} 50%, rgba(255,255,255,${creaseBright}), transparent 60%)`

  const castW = Math.round(curve * 44)
  const castStyle = isR
    ? { right: w, width: castW, background: `linear-gradient(to left, rgba(0,0,0,${curve * 0.35}), transparent)` }
    : { left: w, width: castW, background: `linear-gradient(to right, rgba(0,0,0,${curve * 0.35}), transparent)` }

  return (
    <div style={{
      position: 'absolute', top: 0, [isR ? 'right' : 'left']: 0,
      width: w, height: h, zIndex: 8, pointerEvents: 'none', transformStyle: 'preserve-3d',
    }}>
      <div style={{ position: 'absolute', top: 0, height: '100%', ...castStyle, pointerEvents: 'none', zIndex: -1 }} />

      <div style={{
        position: 'absolute', inset: 0,
        transformOrigin: origin,
        // The rotation chain: Y for main flip, X for corner lifting, skewY for slight bending
        transform: `rotateY(${sign * angle}deg) rotateX(${tiltX}deg) skewY(${skewY}deg)`,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}>
        {/* Front face */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: '#fff', overflow: 'hidden' }}>
          <PageFace page={front} w={w} h={h} />
          <div style={{ position: 'absolute', inset: 0, background: frontGrad, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: crease, pointerEvents: 'none' }} />
        </div>
        {/* Back face */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#fff', overflow: 'hidden' }}>
          <PageFace page={back} w={w} h={h} />
          <div style={{ position: 'absolute', inset: 0, background: backGrad, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: crease, pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  )
}






function ReadOverlay({ pages, startIdx, onClose }: { pages: FlipPage[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  const btnStyle = (dis: boolean): React.CSSProperties => ({
    padding: '7px 20px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.2)',
    background: dis ? 'transparent' : 'rgba(255,255,255,0.1)',
    color: dis ? 'rgba(255,255,255,0.2)' : '#fff', fontSize: 13, fontWeight: 600,
    cursor: dis ? 'not-allowed' : 'pointer',
  })
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Página {idx + 1} / {pages.length}</span>
        <button onClick={onClose} style={{ ...btnStyle(false), padding: '4px 12px' }}>✕</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' }}>
        {pages[idx] && <img src={pages[idx].dataUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button disabled={idx === 0} onClick={() => setIdx(i => i - 1)} style={btnStyle(idx === 0)}>‹ Anterior</button>
        <button disabled={idx >= pages.length - 1} onClick={() => setIdx(i => i + 1)} style={btnStyle(idx >= pages.length - 1)}>Siguiente ›</button>
      </div>
    </div>
  )
}

function GridOverlay({ pages, currentIdx, onSelect, onClose }: { pages: FlipPage[]; currentIdx: number; onSelect: (i: number) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#090910', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 20, borderRadius: 2, background: '#e63d3d' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '0.01em' }}>Todas las páginas</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 500 }}>({pages.length} páginas)</span>
        </div>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
          color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* Grid — 4 fixed columns */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, alignContent: 'start' }}>
        {pages.map((p, i) => {
          const isActive = i === currentIdx
          return (
            <button
              key={p.num}
              onClick={() => { onSelect(i); onClose() }}
              style={{
                border: isActive ? '2.5px solid #e63d3d' : '2px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                overflow: 'hidden',
                padding: 0,
                background: isActive ? 'rgba(230,61,61,0.08)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                boxShadow: isActive ? '0 0 0 1px #e63d3d, 0 8px 32px rgba(230,61,61,0.25)' : '0 4px 16px rgba(0,0,0,0.4)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.6)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = isActive ? '0 0 0 1px #e63d3d, 0 8px 32px rgba(230,61,61,0.25)' : '0 4px 16px rgba(0,0,0,0.4)' }}
            >
              {/* Thumbnail */}
              <div style={{ width: '100%', background: '#fff', position: 'relative', overflow: 'hidden' }}>
                <img src={p.dataUrl} alt={`Pág. ${p.num}`} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                {isActive && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: '#e63d3d', borderRadius: 6, padding: '2px 7px', fontSize: 10, color: '#fff', fontWeight: 700 }}>
                    Actual
                  </div>
                )}
              </div>
              {/* Page number label */}
              <div style={{
                textAlign: 'center',
                color: isActive ? '#ff8080' : 'rgba(255,255,255,0.55)',
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                padding: '8px 0',
                background: isActive ? 'rgba(230,61,61,0.12)' : 'transparent',
                letterSpacing: '0.04em',
              }}>
                Pág. {p.num}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}


// ─── NavButton ────────────────────────────────────────────────────────────────
function NavBtn({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '10px 24px', borderRadius: 40,
      border: `1.5px solid ${disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)'}`,
      background: disabled ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.06))',
      color: disabled ? 'rgba(255,255,255,0.22)' : '#fff',
      fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      backdropFilter: 'blur(12px)', boxShadow: disabled ? 'none' : '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'all 0.18s', userSelect: 'none', minWidth: 130, justifyContent: 'center',
      position: 'relative', zIndex: 50,
    }}>
      {dir === 'prev' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>}
      {dir === 'prev' ? 'Anterior' : 'Siguiente'}
      {dir === 'next' && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>}
    </button>
  )
}

// ─── Cursor hint overlay on pages ─────────────────────────────────────────────
function PageCursor({ side, visible }: { side: 'left' | 'right'; visible: boolean }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'absolute', bottom: 14,
      [side]: 14,
      zIndex: 12, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', gap: 5,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
      padding: '5px 10px', borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.15)',
      color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600,
      opacity: visible ? 1 : 0, transition: 'opacity 0.2s',
    }}>
      {side === 'right'
        ? <><span>Arrastra para pasar</span><span>→</span></>
        : <><span>←</span><span>Arrastra para regresar</span></>}
    </div>
  )
}

// ─── FlipEngine ───────────────────────────────────────────────────────────────
function FlipEngine({ pages, onPageChange, jumpTo }: {
  pages: FlipPage[]; onPageChange?: (idx: number) => void; jumpTo?: number
}) {
  const [spread, setSpread] = useState(0)
  // trans: active page-turn (drag or auto-anim)
  const [trans, setTrans] = useState<Trans | null>(null)
  const transRef = useRef<Trans | null>(null)          // mirrors trans for event callbacks
  const rafRef = useRef<number | null>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(900)
  const [hoverHalf, setHoverHalf] = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = containerW < 620
  const pageW = isMobile ? Math.min(containerW - 16, 380) : Math.floor((containerW - 60) / 2)
  const pageH = Math.round(pageW / 0.707)
  const maxS = maxSpreadFor(pages)
  const isCover = spread === 0

  const cur = spreadPages(pages, spread)
  const nxt = spreadPages(pages, spread + 1)
  const prv = spreadPages(pages, spread - 1)

  // Cancel any running RAF
  const cancelRaf = () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null } }

  // Jump to spread when instructed from outside (grid selection)
  useEffect(() => {
    if (jumpTo !== undefined && jumpTo !== spread) {
      cancelRaf()
      setTrans(null)
      transRef.current = null
      setSpread(jumpTo)
      onPageChange?.(spreadToPageIdx(jumpTo))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo])

  // Keep transRef in sync
  useEffect(() => { transRef.current = trans }, [trans])

  // (cancelRaf already declared above)

  // Auto-animate from `fromAngle` to `toAngle`, then settle
  const animateTo = useCallback((dir: 'next' | 'prev', fromAngle: number, toAngle: number) => {
    cancelRaf()
    const t0 = performance.now()
    const duration = Math.max(80, (Math.abs(toAngle - fromAngle) / 180) * 680)
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const a = fromAngle + (toAngle - fromAngle) * ease(p)
      const next: Trans = { dir, angle: a, dragging: false }
      setTrans(next)
      transRef.current = next
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
        setTrans(null)
        transRef.current = null
        if (toAngle >= 170) {
          setSpread(s => {
            const ns = dir === 'next' ? s + 1 : s - 1
            onPageChange?.(spreadToPageIdx(ns))
            return ns
          })
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [onPageChange])

  // Button / keyboard flip
  const doFlip = useCallback((dir: 'next' | 'prev') => {
    if (transRef.current) return
    if (dir === 'next' && spread >= maxS) return
    if (dir === 'prev' && spread <= 0) return
    animateTo(dir, 0, 180)
  }, [spread, maxS, animateTo])

  useEffect(() => () => cancelRaf(), [])

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') doFlip('next')
      if (e.key === 'ArrowLeft') doFlip('prev')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [doFlip])

  // ── Mouse drag ──────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (transRef.current) return
    if (!bookRef.current) return
    const rect = bookRef.current.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const dir: 'next' | 'prev' = relX > rect.width / 2 ? 'next' : 'prev'
    if (dir === 'next' && spread >= maxS) return
    if (dir === 'prev' && spread <= 0) return
    if (isCover && dir === 'prev') return

    const capturedPageW = pageW
    const capturedRect = { left: rect.left, right: rect.right, top: rect.top, height: rect.height }
    // Capture initial Y position relative to the page (0=top, 1=bottom)
    const initDragY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    const startTrans: Trans = { dir, angle: 0, dragging: true, dragY: initDragY }
    setTrans(startTrans)
    transRef.current = startTrans

    const onMove = (ev: MouseEvent) => {
      let angle: number
      if (dir === 'next') {
        angle = Math.min(175, Math.max(0, 180 * (capturedRect.right - ev.clientX) / capturedPageW))
      } else {
        angle = Math.min(175, Math.max(0, 180 * (ev.clientX - capturedRect.left) / capturedPageW))
      }
      // Update dragY as user moves (allows mid-drag adjustment, clamped)
      const dragY = Math.max(0, Math.min(1, (ev.clientY - capturedRect.top) / capturedRect.height))
      const updated: Trans = { dir, angle, dragging: true, dragY }
      setTrans(updated)
      transRef.current = updated
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const cur = transRef.current
      if (!cur) return
      const target = cur.angle > 90 ? 180 : 0
      animateTo(cur.dir, cur.angle, target)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [spread, maxS, isCover, pageW, animateTo])

  // ── What to show visually ───────────────────────────────────────────────────
  const isFlipping = trans !== null
  const flipDir = trans?.dir ?? null
  const flipAngle = trans?.angle ?? 0

  // Background (stationary pages behind the fold)
  const bgLeft = flipDir === 'next' ? cur.left : flipDir === 'prev' ? prv.left : cur.left
  const bgRight = flipDir === 'next' ? nxt.right : flipDir === 'prev' ? cur.right : cur.right

  // Fold: front = lifting page, back = destination page
  const foldFront = flipDir === 'next' ? cur.right : cur.left
  const foldBack = flipDir === 'next' ? nxt.left : prv.right

  const totalPages = pages.length
  const curPageNum = spreadToPageIdx(spread) + 1
  const curMaxPage = cur.right ? curPageNum + (cur.left ? 1 : 0) : curPageNum
  const pct = Math.round((curMaxPage / totalPages) * 100)

  // ── Mobile ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    const visiblePage = cur.left ?? cur.right
    return (
      <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
          <PageFace page={visiblePage} w={pageW} h={pageH} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <NavBtn dir="prev" disabled={spread <= 0 || isFlipping} onClick={() => doFlip('prev')} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>{curPageNum}/{totalPages}</span>
          <NavBtn dir="next" disabled={spread >= maxS || isFlipping} onClick={() => doFlip('next')} />
        </div>
      </div>
    )
  }

  // ── Desktop ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

      {/* Book */}
      <div style={{ perspective: '2000px', perspectiveOrigin: '50% 38%', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={bookRef}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => {
            if (trans) return
            const rect = e.currentTarget.getBoundingClientRect()
            setHoverHalf(e.clientX - rect.left > rect.width / 2 ? 'right' : 'left')
          }}
          onMouseLeave={() => setHoverHalf(null)}
          style={{
            display: 'flex', position: 'relative',
            transformStyle: 'preserve-3d',
            boxShadow: '0 48px 120px rgba(0,0,0,0.8)',
            cursor: isFlipping ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {/* ── Background / idle spread ── */}
          {(() => {
            // Detect single-page situations
            const singleRight = !cur.left && !!cur.right   // cover (spread 0)
            const singleLeft = !!cur.left && !cur.right   // last page on odd total

            if (isFlipping) {
              return (
                <>
                  <PageFace page={bgLeft} w={pageW} h={pageH} />
                  <div style={{ width: 3, background: 'linear-gradient(to right,rgba(0,0,0,0.25),rgba(0,0,0,0.08),transparent)', flexShrink: 0 }} />
                  <PageFace page={bgRight} w={pageW} h={pageH} />
                </>
              )
            }

            // ── Single page — centered ──────────────────────────────────────
            if (singleRight || singleLeft) {
              const page = singleRight ? cur.right : cur.left
              const canNext = singleRight && spread < maxS
              const canPrev = singleLeft && spread > 0
              return (
                <div style={{ position: 'relative', boxShadow: '0 28px 80px rgba(0,0,0,0.72)' }}>
                  <PageFace page={page} w={pageW} h={pageH} />
                  {/* Subtle spine shadow on the correct side */}
                  {singleRight && <div style={{ position: 'absolute', top: 0, left: 0, width: 18, height: '100%', background: 'linear-gradient(to right,rgba(0,0,0,0.18),transparent)', pointerEvents: 'none' }} />}
                  {singleLeft && <div style={{ position: 'absolute', top: 0, right: 0, width: 18, height: '100%', background: 'linear-gradient(to left,rgba(0,0,0,0.18),transparent)', pointerEvents: 'none' }} />}
                  <PageCursor side="right" visible={canNext && hoverHalf === 'right'} />
                  <PageCursor side="left" visible={canPrev && hoverHalf === 'left'} />
                </div>
              )
            }

            // ── Two-page spread ─────────────────────────────────────────────
            return (
              <>
                <div style={{ position: 'relative' }}>
                  <PageFace page={cur.left} w={pageW} h={pageH} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: '100%', background: 'linear-gradient(to left,rgba(0,0,0,0.14),transparent)', pointerEvents: 'none' }} />
                  <CornerCurl side="left" corner="top" visible={hoverHalf === 'left' && spread > 0} />
                  <CornerCurl side="left" corner="bottom" visible={hoverHalf === 'left' && spread > 0} />
                  <PageCursor side="left" visible={hoverHalf === 'left' && spread > 0} />
                </div>
                <div style={{ width: 3, background: 'linear-gradient(to right,rgba(0,0,0,0.25),rgba(0,0,0,0.07),transparent)', flexShrink: 0 }} />
                <div style={{ position: 'relative' }}>
                  <PageFace page={cur.right} w={pageW} h={pageH} />
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 22, height: '100%', background: 'linear-gradient(to right,rgba(0,0,0,0.14),transparent)', pointerEvents: 'none' }} />
                  <CornerCurl side="right" corner="top" visible={hoverHalf === 'right' && spread < maxS} />
                  <CornerCurl side="right" corner="bottom" visible={hoverHalf === 'right' && spread < maxS} />
                  <PageCursor side="right" visible={hoverHalf === 'right' && spread < maxS} />
                </div>
              </>
            )
          })()}

          {/* ── Folding overlay ── */}
          {isFlipping && flipDir && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex' }}>
              <FoldingPage
                front={foldFront}
                back={foldBack}
                angle={flipAngle}
                side={flipDir === 'next' ? 'right' : 'left'}
                w={pageW}
                h={pageH}
                dragY={trans?.dragY ?? 0.5}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', maxWidth: pageW * 2 + 60,
        padding: '12px 18px', borderRadius: 50,
        background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)', justifyContent: 'space-between',
        boxSizing: 'border-box', position: 'relative', zIndex: 50,
      }}>
        <NavBtn dir="prev" disabled={spread <= 0 || isFlipping} onClick={() => doFlip('prev')} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>
            Pág.&nbsp;{curPageNum}{cur.left && cur.right ? `–${curPageNum + 1}` : ''}&nbsp;de&nbsp;{totalPages}
          </span>
          <div style={{ width: '100%', maxWidth: 160, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#e63d3d,#ff6b6b)', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <NavBtn dir="next" disabled={spread >= maxS || isFlipping} onClick={() => doFlip('next')} />
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

export default function FlipbookViewer({ src, minHeight = 480, height, className = '', onPageChange }: Props) {
  const [pages, setPages] = useState<FlipPage[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showRead, setShowRead] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFs, setIsFs] = useState(false)
  const [jumpToSpread, setJumpToSpread] = useState<number | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const [rootW, setRootW] = useState(900)

  useEffect(() => {
    if (!rootRef.current) return
    const ro = new ResizeObserver(([e]) => setRootW(e.contentRect.width))
    ro.observe(rootRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const loadPdf = useCallback(async () => {
    if (!src) return
    setLoading(true); setError(null); setPages([]); setProgress(0)
    try {
      const isSameOrigin = !src.startsWith('http') || src.startsWith(window.location.origin)
      let buf: ArrayBuffer
      if (isSameOrigin) {
        const url = src.startsWith('http') ? src : new URL(src, window.location.origin).toString()
        const res = await fetchAuth(url, undefined, true)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        buf = await res.arrayBuffer()
      } else {
        const res = await fetch(src)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        buf = await res.arrayBuffer()
      }
      const copy = new ArrayBuffer(buf.byteLength)
      new Uint8Array(copy).set(new Uint8Array(buf))
      const pdf = await pdfjs.getDocument({ data: copy }).promise
      const total = pdf.numPages
      const out: FlipPage[] = []
      for (let i = 1; i <= total; i++) {
        const pg = await pdf.getPage(i)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const vp = pg.getViewport({ scale: 2.2 * dpr })
        const cv = document.createElement('canvas')
        cv.width = vp.width; cv.height = vp.height
        const ctx = cv.getContext('2d')
        if (!ctx) continue
        await pg.render({ canvasContext: ctx, viewport: vp } as any).promise
        out.push({ num: i, dataUrl: cv.toDataURL('image/jpeg', 0.92) })
        setProgress(Math.round((i / total) * 100))
      }
      setPages(out)
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [src])

  useEffect(() => { loadPdf() }, [loadPdf])

  const isMobile = rootW < 620
  const pageW = isMobile ? Math.min(rootW - 16, 380) : Math.floor((rootW - 60) / 2)
  const pageH = Math.round(pageW / 0.707)
  const viewerH = height ?? Math.max(minHeight, pageH + 165)

  return (
    <>
      <style>{`
        @keyframes fb-spin { to { transform: rotate(360deg) } }
        @keyframes fb-badge {
          0%  { opacity:0; transform:translate(10px,-6px) scale(.88) }
          12% { opacity:1; transform:translate(0,0) scale(1) }
          72% { opacity:1; transform:translate(0,0) scale(1) }
          100%{ opacity:0; transform:translate(4px,-3px) scale(.96) }
        }
        .fb-badge { animation: fb-badge 6.5s ease forwards; pointer-events:none }
      `}</style>

      <div ref={rootRef} className={`relative w-full select-none ${className}`} style={{
        minHeight: isFs ? '100vh' : viewerH,
        height: isFs ? '100vh' : undefined,
        background: 'linear-gradient(150deg,#5a0c0c 0%,#7c1515 40%,#3d0808 100%)',
        borderRadius: isFs ? 0 : 24,
        boxShadow: isFs ? 'none' : '0 40px 120px rgba(0,0,0,0.65)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '28px 16px 22px', gap: 0,
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
          background: 'radial-gradient(ellipse at 20% 5%,rgba(255,120,120,0.08) 0%,transparent 55%)'
        }} />

        {/* Top buttons */}
        {!loading && pages.length > 0 && (
          <>
            <div className="fb-badge" style={{ position: 'absolute', top: 14, right: 14, zIndex: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 30, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e63d3d', boxShadow: '0 0 6px #e63d3d' }} />
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Diario Mercantil · PDF</span>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 30, display: 'flex', gap: 6 }}>
              <button title="Cuadrícula" onClick={() => setShowGrid(true)} style={iconBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button title="Modo lectura" onClick={() => setShowRead(true)} style={iconBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              </button>
              <button title={isFs ? 'Salir' : 'Pantalla completa'} onClick={() => !document.fullscreenElement ? rootRef.current?.requestFullscreen().catch(() => { }) : document.exitFullscreen()} style={iconBtn}>
                {isFs
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 0 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>}
              </button>
            </div>
          </>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.75)', animation: 'fb-spin 0.85s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}>{progress}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, margin: 0 }}>Preparando edición digital…</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '4px 0 0' }}>Procesando páginas</p>
            </div>
            <div style={{ width: 180, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#e63d3d,#ff8080)', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <p style={{ color: '#fca5a5', fontWeight: 600, margin: 0 }}>No se pudo cargar el PDF</p>
            <p style={{ color: 'rgba(252,165,165,0.7)', fontSize: 12, margin: '4px 0 16px' }}>{error}</p>
            <button onClick={loadPdf} style={{ padding: '7px 18px', borderRadius: 30, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && pages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No hay páginas disponibles.</p>
        )}

        {/* Viewer */}
        {!loading && pages.length > 0 && (
          <div style={{ width: '100%' }}>
            <FlipEngine
              pages={pages}
              jumpTo={jumpToSpread ?? undefined}
              onPageChange={(idx) => { setCurrentIdx(idx); onPageChange?.(idx) }}
            />
          </div>
        )}
      </div>

      {showRead && <ReadOverlay pages={pages} startIdx={currentIdx} onClose={() => setShowRead(false)} />}
      {showGrid && <GridOverlay
        pages={pages}
        currentIdx={currentIdx}
        onSelect={(i) => {
          // Convert page index → spread index, then jump
          const targetSpread = i === 0 ? 0 : Math.ceil(i / 2)
          setCurrentIdx(i)
          setJumpToSpread(targetSpread)
          // Reset after one render so the same value can be re-triggered
          setTimeout(() => setJumpToSpread(null), 100)
        }}
        onClose={() => setShowGrid(false)}
      />}
    </>
  )
}
