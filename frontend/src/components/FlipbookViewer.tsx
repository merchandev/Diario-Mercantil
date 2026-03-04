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
    <div style={{ width: w, height: h, background: page ? '#fff' : 'transparent', overflow: 'hidden', userSelect: 'none', flexShrink: 0, position: 'relative', ...style }}>
      {page && <img src={page.dataUrl} alt={`p${page.num}`} draggable={false}
        style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />}
    </div>
  )
}

// ─── Corner curl indicator ───────────────────────────────────────────────────
function CornerCurl({ side, corner, visible }: { side: 'left' | 'right'; corner: 'top' | 'bottom'; visible: boolean }) {
  const isR = side === 'right'
  const isBot = corner === 'bottom'

  // Realism: use a soft pseudo-curled paper triangle.
  const gradientAngle = isR && isBot ? '135deg'
    : isR ? '225deg'
      : isBot ? '45deg' : '315deg'

  return (
    <div style={{
      position: 'absolute',
      [isBot ? 'bottom' : 'top']: 0,
      [isR ? 'right' : 'left']: 0,
      width: 50, height: 50,
      pointerEvents: 'none', zIndex: 20, overflow: 'hidden',
      opacity: visible ? 1 : 0, transition: 'opacity 0.25s ease',
    }}>
      {/* Drop shadow of the fold onto the page */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(${gradientAngle}, transparent 45%, rgba(0,0,0,0.15) 50%, transparent 60%)`,
      }} />
      {/* The actual folded paper piece */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(${gradientAngle}, #fff 48%, #f0f0f0 50%, transparent 51%)`,
        boxShadow: isR && isBot ? '-4px -4px 10px rgba(0,0,0,0.08)'
          : isR ? '-4px 4px 10px rgba(0,0,0,0.08)'
            : isBot ? '4px -4px 10px rgba(0,0,0,0.08)' : '4px 4px 10px rgba(0,0,0,0.08)',
      }} />
    </div>
  )
}

// ─── FoldingPage ──────────────────────────────────────────────────────────────
/**
 * FoldingPage — Multi-segment cylindrical curve fold with Sweeping Optical Shading.
 * Slices the page into vertical strips. The first strip is strictly anchored 
 * to the spine (0 offset, pure rotateY), guaranteeing it never detaches.
 * Subsequent strips bend progressively.
 */
function FoldingPage({ front, back, angle, side, w, h, dragY = 0.5 }: {
  front?: FlipPage; back?: FlipPage
  angle: number; side: 'right' | 'left'; w: number; h: number
  dragY?: number
}) {
  const isR = side === 'right'
  const sign = isR ? -1 : 1

  // Use 8 segments for high fidelity 3D cylinder
  const N = 8
  const sliceW = w / N

  // overlap to brutally eliminate pixel gaps between DOM slabs
  const overlap = 1.5

  // sin() peaks at 90 deg 
  const curve = Math.sin((angle / 180) * Math.PI)

  // Max paper flexibility
  const maxSway = 50 // reduced slightly to prevent self-intersection "breaking"
  const totalBend = curve * maxSway

  // Absolute pivot of the spine against the table
  const rootBound = Math.min(Math.max(angle + totalBend, 0), 180)

  // Total angle delta that needs to be distributed across the remaining joints
  // to ensure the outer edge physically ends up at `angle`
  const flexLeft = rootBound - angle
  const a_inner = N > 1 ? (-flexLeft / (N - 1)) : 0

  // Optional: slight X-tilt based on dragY
  const tiltDir = (dragY - 0.5) * 2
  const tiltX = curve * 3 * tiltDir

  const castW = 20 + Math.round(curve * 60)
  const castStyle = isR
    ? { right: w, width: castW, background: `linear-gradient(to left, rgba(0,0,0,${curve * 0.45}), transparent)` }
    : { left: w, width: castW, background: `linear-gradient(to right, rgba(0,0,0,${curve * 0.45}), transparent)` }

  // CRITICAL: When flipping a container 180 degrees in CSS 3D space, its internal left/right 
  // coordinate axis inverts.
  const frontProp = isR ? 'left' : 'right'
  const backProp = isR ? 'right' : 'left'

  // OPTICAL SHADING: Instead of rendering 8 individual strip shadows (which causes vertical banding),
  // we render ONE SINGLE majestic highlight gradient covering the full width (w), representing
  // the optical apex (highest curve point) where light hits the folding paper.
  const apexPrc = isR ? 100 - (angle / 180) * 100 : (angle / 180) * 100
  const globalShade = `linear-gradient(to right, 
    rgba(0,0,0,${curve * 0.12}) 0%, 
    rgba(0,0,0,${curve * 0.05}) max(0%, calc(${apexPrc}% - 20%)), 
    rgba(255,255,255,${curve * 0.35}) ${apexPrc}%, 
    rgba(0,0,0,${curve * 0.20}) min(100%, calc(${apexPrc}% + 15%)), 
    rgba(0,0,0,${curve * 0.15}) 100%
  )`

  // Recursively render slices for the cylindrical curve
  const renderSlice = (i: number): React.ReactNode => {
    if (i === N) return null

    // First slice (spine) pivots by rootBound. Inner slices bend relative to their parent.
    const relAngle = i === 0 ? rootBound : a_inner

    // Overlap logic: Render physical DOM node slightly wider, offset left/right slightly negative 
    // to bleed into the parent slice and seal the crack.
    const isInner = i > 0
    const wRender = i < N - 1 ? sliceW + overlap : sliceW
    // Positioning relative to parent slice
    const offsetPos = isInner ? sliceW - (overlap / 2) : 0

    return (
      <div style={{
        position: 'absolute',
        top: 0,
        [isR ? 'left' : 'right']: offsetPos,
        width: wRender,
        height: h,
        transformOrigin: isR ? 'left center' : 'right center',
        // Tilt ONLY the root so the cylinder doesn't twist into a corkscrew (which breaks geometry)
        transform: `rotateY(${sign * relAngle}deg) ${i === 0 ? `rotateX(${tiltX}deg)` : ''}`,
        transformStyle: 'preserve-3d',
      }}>
        {/* Front Face */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', backfaceVisibility: 'hidden',
          transform: 'translateZ(0.1px)' // Prevents Z-fighting gaps
        }}>
          {/* Shift image back by exactly the mathematical coordinate, NOT the rendered width */}
          <div style={{ position: 'absolute', top: 0, [frontProp]: -(i * sliceW + (isInner ? -(overlap / 2) : 0)), width: w, height: h }}>
            <PageFace page={front} w={w} h={h} />
            <div style={{ position: 'absolute', inset: 0, background: globalShade, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Back Face */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg) translateZ(0.1px)' // Prevents Z-fighting
        }}>
          {/* Flip X-axis mapping entirely */}
          <div style={{ position: 'absolute', top: 0, [backProp]: -(i * sliceW + (isInner ? -(overlap / 2) : 0)), width: w, height: h }}>
            <PageFace page={back} w={w} h={h} />
            <div style={{ position: 'absolute', inset: 0, background: globalShade, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Render next slice */}
        {renderSlice(i + 1)}
      </div>
    )
  }

  return (
    <div style={{
      position: 'absolute', top: 0, [isR ? 'right' : 'left']: 0,
      width: w, height: h, zIndex: 8, pointerEvents: 'none', transformStyle: 'preserve-3d',
    }}>
      <div style={{ position: 'absolute', top: 0, height: '100%', ...castStyle, pointerEvents: 'none', zIndex: -1 }} />
      {renderSlice(0)}
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
function NavBtn({ dir, disabled, onClick, isMobile }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void; isMobile?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 7,
      padding: isMobile ? '10px 14px' : '10px 24px', borderRadius: 40,
      border: `1.5px solid ${disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.28)'}`,
      background: disabled ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.06))',
      color: disabled ? 'rgba(255,255,255,0.22)' : '#fff',
      fontSize: isMobile ? 0 : 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      backdropFilter: 'blur(12px)', boxShadow: disabled ? 'none' : '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'all 0.18s', userSelect: 'none', minWidth: isMobile ? 44 : 130, justifyContent: 'center',
      position: 'relative', zIndex: 50,
    }}>
      {dir === 'prev' && <svg width={isMobile ? "20" : "15"} height={isMobile ? "20" : "15"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>}
      {!isMobile && (dir === 'prev' ? 'Anterior' : 'Siguiente')}
      {dir === 'next' && <svg width={isMobile ? "20" : "15"} height={isMobile ? "20" : "15"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>}
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
function FlipEngine({ pages, onPageChange, jumpTo, wrapperHeight }: {
  pages: FlipPage[]; onPageChange?: (idx: number) => void; jumpTo?: number; wrapperHeight?: number
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
  let pageW = isMobile ? Math.min(containerW - 16, 380) : Math.floor((containerW - 60) / 2)
  let pageH = Math.round(pageW / 0.707)

  // Sub-constraint: If it exceeds the explicitly forced wrapper maxHeight, scale it down.
  // 170 accounts for container padding (50) and pagination controls (90) spacing
  if (wrapperHeight) {
    const maxH = Math.max(100, wrapperHeight - 170)
    if (pageH > maxH) {
      pageH = maxH
      pageW = Math.round(pageH * 0.707)
    }
  }
  const maxS = isMobile ? pages.length - 1 : maxSpreadFor(pages)
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
            const realPageIdx = isMobile ? ns : spreadToPageIdx(ns)
            onPageChange?.(realPageIdx)
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

  // ── Unified Pointer Drag (Mouse + Touch) ───────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (transRef.current) return
    if (!bookRef.current) return

    // Attempt to capture the pointer so touching/swiping over the book doesn't scroll the page
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch (err) { }

    const rect = bookRef.current.getBoundingClientRect()
    const relX = e.clientX - rect.left

    // If mobile (single page), clicking right half = next, left half = prev
    // If desktop (two pages), clicking right page = next, left page = prev
    let dir: 'next' | 'prev' = 'next'
    if (isMobile) {
      dir = relX > rect.width / 2 ? 'next' : 'prev'
    } else {
      dir = relX > rect.width / 2 ? 'next' : 'prev'
    }

    if (dir === 'next' && spread >= maxS) return
    if (dir === 'prev' && spread <= 0) return
    if (!isMobile && isCover && dir === 'prev') return

    const capturedPageW = pageW
    const capturedRect = { left: rect.left, right: rect.right, top: rect.top, height: rect.height }
    const initDragY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    const startTrans: Trans = { dir, angle: 0, dragging: true, dragY: initDragY }
    setTrans(startTrans)
    transRef.current = startTrans

    const onMove = (ev: PointerEvent) => {
      let angle: number
      const cx = ev.clientX

      if (isMobile) {
        // En mobile, el bookRef mide 1 solo pageW y está centrado
        if (dir === 'next') {
          const traveled = capturedRect.right - cx
          angle = Math.max(0, Math.min(180, (traveled / capturedPageW) * 180))
        } else {
          const traveled = cx - capturedRect.left
          angle = Math.max(0, Math.min(180, (traveled / capturedPageW) * 180))
        }
      } else {
        if (dir === 'next') {
          const traveled = capturedRect.right - cx
          angle = Math.max(0, Math.min(180, (traveled / capturedPageW) * 180))
        } else {
          const traveled = cx - capturedRect.left
          angle = Math.max(0, Math.min(180, (traveled / capturedPageW) * 180))
        }
      }

      const dragY = Math.max(0, Math.min(1, (ev.clientY - capturedRect.top) / capturedRect.height))
      const updated: Trans = { dir, angle, dragging: true, dragY }
      setTrans(updated)
      transRef.current = updated
    }

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      try { bookRef.current?.releasePointerCapture(ev.pointerId) } catch (err) { }

      const c = transRef.current
      if (!c) return
      const target = c.angle > 90 ? 180 : 0
      animateTo(c.dir, c.angle, target)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [spread, maxS, isCover, pageW, animateTo, isMobile])

  // ── What to show visually ───────────────────────────────────────────────────
  const isFlipping = trans !== null
  const flipDir = trans?.dir ?? null
  const flipAngle = trans?.angle ?? 0

  // Fold math logic varying based on Layout Type
  const totalPages = pages.length
  // Mobile index logic is different since it displays 1 sheet per spread tick
  const mobileCurPageNum = spread + 1
  const desktopCurPageNum = spreadToPageIdx(spread) + 1

  const curPageNum = isMobile ? mobileCurPageNum : desktopCurPageNum
  const curMaxPage = isMobile ? curPageNum : (cur.right ? curPageNum + (cur.left ? 1 : 0) : curPageNum)
  const pct = Math.round((curMaxPage / totalPages) * 100)

  // ── Unified Render Tree ─────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

      {/* Book */}
      <div style={{ marginTop: 50, perspective: '2000px', perspectiveOrigin: '50% 38%', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div
          ref={bookRef}
          onPointerDown={handlePointerDown}
          onPointerMove={(e) => {
            if (trans) return
            const rect = e.currentTarget.getBoundingClientRect()
            setHoverHalf(e.clientX - rect.left > rect.width / (isMobile ? 1 : 2) ? 'right' : 'left')
          }}
          onPointerLeave={() => setHoverHalf(null)}
          style={{
            display: 'flex', position: 'relative',
            transformStyle: 'preserve-3d',
            boxShadow: '0 48px 120px rgba(0,0,0,0.8)',
            cursor: isFlipping ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none' // CRITICAL: Stop mobile from firing pull-to-refresh down-swipes while dragging pages
          }}
        >
          {/* ── Background / idle spread ── */}
          {(() => {
            if (isMobile) {
              // --- MOBILE RENDER (Single Page Face) ---
              // Pages mapping for Mobile (1 sheet at a time)
              const curPage = pages[spread]
              const nxtPage = pages[spread + 1]
              const prvPage = pages[spread - 1]

              if (isFlipping) {
                const bgM = flipDir === 'next' ? nxtPage : prvPage
                return (
                  <div style={{ position: 'relative' }}>
                    <PageFace page={bgM} w={pageW} h={pageH} />
                  </div>
                )
              }
              return (
                <div style={{ position: 'relative' }}>
                  <PageFace page={curPage} w={pageW} h={pageH} />
                  <CornerCurl side="right" corner="bottom" visible={spread < maxS} />
                  <CornerCurl side="left" corner="bottom" visible={spread > 0} />
                </div>
              )
            }

            // --- DESKTOP RENDER (Two Page Spread) ---
            const singleRight = !cur.left && !!cur.right   // cover
            const singleLeft = !!cur.left && !cur.right   // back cover

            const bgLeft = flipDir === 'next' ? cur.left : flipDir === 'prev' ? prv.left : cur.left
            const bgRight = flipDir === 'next' ? nxt.right : flipDir === 'prev' ? cur.right : cur.right

            if (isFlipping) {
              return (
                <>
                  <PageFace page={bgLeft} w={pageW} h={pageH} />
                  <PageFace page={bgRight} w={pageW} h={pageH} />
                </>
              )
            }

            if (singleRight || singleLeft) {
              const page = singleRight ? cur.right : cur.left
              const canNext = singleRight && spread < maxS
              const canPrev = singleLeft && spread > 0
              return (
                <div style={{ position: 'relative', boxShadow: '0 28px 80px rgba(0,0,0,0.72)' }}>
                  <PageFace page={page} w={pageW} h={pageH} />
                  {singleRight && <div style={{ position: 'absolute', top: 0, left: 0, width: 18, height: '100%', background: 'linear-gradient(to right,rgba(0,0,0,0.18),transparent)', pointerEvents: 'none' }} />}
                  {singleLeft && <div style={{ position: 'absolute', top: 0, right: 0, width: 18, height: '100%', background: 'linear-gradient(to left,rgba(0,0,0,0.18),transparent)', pointerEvents: 'none' }} />}
                  <PageCursor side="right" visible={canNext && hoverHalf === 'right'} />
                  <PageCursor side="left" visible={canPrev && hoverHalf === 'left'} />
                </div>
              )
            }

            return (
              <>
                <div style={{ position: 'relative' }}>
                  <PageFace page={cur.left} w={pageW} h={pageH} />
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: '100%', background: 'linear-gradient(to left,rgba(0,0,0,0.14),transparent)', pointerEvents: 'none' }} />
                  <CornerCurl side="left" corner="top" visible={hoverHalf === 'left' && spread > 0} />
                  <CornerCurl side="left" corner="bottom" visible={hoverHalf === 'left' && spread > 0} />
                  <PageCursor side="left" visible={hoverHalf === 'left' && spread > 0} />
                </div>
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
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <FoldingPage
                front={
                  isMobile
                    ? (flipDir === 'next' ? pages[spread] : pages[spread - 1])
                    : (flipDir === 'next' ? cur.right : cur.left)
                }
                back={
                  isMobile
                    ? (flipDir === 'next' ? pages[spread + 1] : pages[spread])
                    : (flipDir === 'next' ? nxt.left : prv.right)
                }
                angle={flipAngle}
                side={isMobile ? (flipDir === 'next' ? 'right' : 'left') : (flipDir === 'next' ? 'right' : 'left')}
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
        display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
        width: '100%', maxWidth: isMobile ? pageW + 30 : pageW * 2 + 60,
        padding: isMobile ? '12px 14px' : '12px 18px', borderRadius: 50,
        background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)', justifyContent: 'space-between',
        boxSizing: 'border-box', position: 'relative', zIndex: 50,
      }}>
        <NavBtn isMobile={isMobile} dir="prev" disabled={spread <= 0 || isFlipping} onClick={() => doFlip('prev')} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 11 : 12, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Pág.&nbsp;{curPageNum}{(!isMobile && cur.left && cur.right) ? `–${curPageNum + 1}` : ''}&nbsp;de&nbsp;{totalPages}
          </span>
          <div style={{ width: '100%', maxWidth: 160, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#e63d3d,#ff6b6b)', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <NavBtn isMobile={isMobile} dir="next" disabled={spread >= maxS || isFlipping} onClick={() => doFlip('next')} />
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
              wrapperHeight={height}
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
