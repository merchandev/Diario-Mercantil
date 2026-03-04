/**
 * FlipbookViewer — Premium magazine-style PDF viewer
 *
 * • Portada (página 1) sola al inicio
 * • Spreads dobles (2 páginas) en adelante
 * • Animación CSS 3D propia (rotateY + backface-visibility)
 * • Sombra dinámica que simula doblado del papel
 * • Corner-peel interactivo con el ratón
 * • Tilt suave siguiendo el cursor
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

// ─── Spread helpers ───────────────────────────────────────────────────────────
//
//  Spread 0 → cover: left=undefined, right=pages[0]
//  Spread 1 → pages[1] (left)  + pages[2] (right)
//  Spread N → pages[2N-1] (left) + pages[2N] (right)
//

function spreadPages(pages: FlipPage[], s: number) {
  if (s === 0) return { left: undefined, right: pages[0] }
  const base = 2 * s - 1
  return { left: pages[base], right: pages[base + 1] }
}

function maxSpreadFor(pages: FlipPage[]) {
  if (pages.length === 0) return 0
  // spread 0 = 1 page, then each spread = 2 more
  return Math.ceil((pages.length - 1) / 2)
}

function spreadToPageIdx(s: number) {
  return s === 0 ? 0 : 2 * s - 1
}

// ─── Easing ───────────────────────────────────────────────────────────────────

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 18px',
  borderRadius: 30,
  border: '1px solid rgba(255,255,255,0.2)',
  background: disabled ? 'transparent' : 'rgba(255,255,255,0.09)',
  color: disabled ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.88)',
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.18s',
  letterSpacing: '0.04em',
  whiteSpace: 'nowrap',
})

const iconBtn: React.CSSProperties = {
  width: 34, height: 34,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.65)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
  flexShrink: 0,
}

// ─── Single page face ─────────────────────────────────────────────────────────

const PageFace = ({
  page, w, h, style = {},
}: { page?: FlipPage; w: number; h: number; style?: React.CSSProperties }) => (
  <div style={{
    width: w, height: h,
    background: page ? '#fff' : 'transparent',
    overflow: 'hidden',
    userSelect: 'none',
    flexShrink: 0,
    ...style,
  }}>
    {page && (
      <img
        src={page.dataUrl}
        alt={`Página ${page.num}`}
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
      />
    )}
  </div>
)

// ─── Folding page (module-level so React keeps stable identity) ───────────────

interface FoldProps {
  frontPage?: FlipPage
  backPage?: FlipPage
  flipAngle: number           // 0 → 180
  side: 'right' | 'left'     // which side of book folds
  pageW: number
  pageH: number
}

function FoldingPage({ frontPage, backPage, flipAngle, side, pageW, pageH }: FoldProps) {
  // Shadow peaks at 90° (edge-on)
  const shadowT = flipAngle < 90 ? flipAngle / 90 : (180 - flipAngle) / 90
  const shadowA = shadowT * 0.45
  const rotateY = side === 'right' ? -flipAngle : flipAngle
  const origin = side === 'right' ? 'left center' : 'right center'

  const shadowFront = side === 'right'
    ? `linear-gradient(to left, rgba(0,0,0,${shadowA}), transparent 55%)`
    : `linear-gradient(to right, rgba(0,0,0,${shadowA}), transparent 55%)`
  const shadowBack = side === 'right'
    ? `linear-gradient(to right, rgba(0,0,0,${shadowA}), transparent 55%)`
    : `linear-gradient(to left, rgba(0,0,0,${shadowA}), transparent 55%)`

  return (
    <div style={{
      position: 'absolute',
      [side === 'right' ? 'right' : 'left']: 0,
      top: 0,
      width: pageW, height: pageH,
      transformOrigin: origin,
      transform: `rotateY(${rotateY}deg)`,
      transformStyle: 'preserve-3d',
      zIndex: 8,
    }}>
      {/* Front face */}
      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
        <PageFace page={frontPage} w={pageW} h={pageH} />
        <div style={{ position: 'absolute', inset: 0, background: shadowFront, pointerEvents: 'none' }} />
      </div>
      {/* Back face (mirror of destination page) */}
      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', overflow: 'hidden' }}>
        <PageFace page={backPage} w={pageW} h={pageH} style={{ transform: 'scaleX(-1)' }} />
        <div style={{ position: 'absolute', inset: 0, background: shadowBack, transform: 'scaleX(-1)', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

// ─── Corner peel ornament ────────────────────────────────────────────────────

function CornerPeel({ side, amount, onClick }: { side: 'right' | 'left'; amount: number; onClick: () => void }) {
  const size = 48 + amount * 52
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute', bottom: 0,
        [side]: 0,
        width: size, height: size,
        zIndex: 20, cursor: 'pointer', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', bottom: 0, [side]: 0,
        width: 0, height: 0,
        borderStyle: 'solid',
        borderWidth: side === 'right' ? `${size}px 0 0 ${size}px` : `${size}px ${size}px 0 0`,
        borderColor: `transparent transparent transparent rgba(0,0,0,${0.07 + amount * 0.14})`,
        filter: 'drop-shadow(-2px -2px 6px rgba(0,0,0,0.25))',
      }} />
    </div>
  )
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

function ReadOverlay({ pages, startIdx, onClose }: { pages: FlipPage[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>Página {idx + 1} / {pages.length}</span>
        <button onClick={onClose} style={{ ...iconBtn, color: '#fff', fontSize: 16 }}>✕</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' }}>
        {pages[idx] && <img src={pages[idx].dataUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }} />}
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: '#fff', fontWeight: 700 }}>Todas las páginas</span>
        <button onClick={onClose} style={{ ...iconBtn, color: '#fff', fontSize: 16 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8 }}>
        {pages.map((p, i) => (
          <button
            key={p.num}
            onClick={() => { onSelect(i); onClose() }}
            style={{ border: i === currentIdx ? '2px solid #e63d3d' : '2px solid rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden', padding: 0, background: 'none', cursor: 'pointer' }}
          >
            <img src={p.dataUrl} alt="" style={{ width: '100%', display: 'block' }} />
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 10, padding: '2px 0', background: 'rgba(0,0,0,0.55)' }}>{p.num}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── FlipEngine ───────────────────────────────────────────────────────────────

function FlipEngine({ pages, onPageChange }: { pages: FlipPage[]; onPageChange?: (idx: number) => void }) {
  const [spread, setSpread] = useState(0)
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null)
  const [flipAngle, setFlipAngle] = useState(0)
  const [mouseTilt, setMouseTilt] = useState(0)
  const [peelSide, setPeelSide] = useState<'right' | 'left' | null>(null)
  const [peelAmt, setPeelAmt] = useState(0)

  const raf = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(900)

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

  const cur = spreadPages(pages, spread)
  const nxt = spreadPages(pages, spread + 1)
  const prv = spreadPages(pages, spread - 1)

  // ── animate flip ────────────────────────────────────────────────────────────
  const doFlip = useCallback((dir: 'next' | 'prev') => {
    if (flipping) return
    if (dir === 'next' && spread >= maxS) return
    if (dir === 'prev' && spread <= 0) return
    setPeelSide(null)
    setFlipping(dir)
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 680, 1)
      setFlipAngle(easeInOut(p) * 180)
      if (p < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        setFlipAngle(0)
        setFlipping(null)
        setSpread(s => {
          const ns = dir === 'next' ? s + 1 : s - 1
          onPageChange?.(spreadToPageIdx(ns))
          return ns
        })
      }
    }
    raf.current = requestAnimationFrame(tick)
  }, [flipping, spread, maxS, onPageChange])

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') doFlip('next')
      if (e.key === 'ArrowLeft') doFlip('prev')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [doFlip])

  // Mouse tilt + corner peel
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (flipping || isMobile) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / rect.width
    const cy = (e.clientY - rect.top) / rect.height
    setMouseTilt((cx - 0.5) * 6)
    const nearRight = cx > 0.70 && cy > 0.60 && spread < maxS
    const nearLeft = cx < 0.30 && cy > 0.60 && spread > 0
    if (nearRight) {
      setPeelSide('right')
      setPeelAmt(Math.min(1, ((cx - 0.70) / 0.30) * ((cy - 0.60) / 0.40)))
    } else if (nearLeft) {
      setPeelSide('left')
      setPeelAmt(Math.min(1, ((0.30 - cx) / 0.30) * ((cy - 0.60) / 0.40)))
    } else {
      setPeelSide(null); setPeelAmt(0)
    }
  }
  const onMouseLeave = () => { setMouseTilt(0); setPeelSide(null); setPeelAmt(0) }

  const totalPages = pages.length
  const curPageNum = spreadToPageIdx(spread) + 1
  const curMaxPage = cur.right ? curPageNum + (cur.left ? 1 : 0) : curPageNum
  const pct = Math.round((curMaxPage / totalPages) * 100)

  // ── Background pages during flip ─────────────────────────────────────────
  // When flipping NEXT: bg shows current-left + next-left (destination)
  // When flipping PREV: bg shows prev-right + current-right (destination)
  const bgLeft = flipping === 'next' ? cur.left : flipping === 'prev' ? prv.left : cur.left
  const bgRight = flipping === 'next' ? nxt.left : flipping === 'prev' ? cur.right : cur.right

  // What folds: NEXT → current right page folds to left (side='right')
  //             PREV → current left page folds to right (side='left')
  const foldFront = flipping === 'next' ? cur.right : cur.left
  const foldBack = flipping === 'next' ? nxt.left : prv.right

  // ── Render ───────────────────────────────────────────────────────────────

  // Mobile: single page view
  if (isMobile) {
    const visiblePage = cur.left ?? cur.right
    return (
      <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
          <PageFace page={visiblePage} w={pageW} h={pageH} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button disabled={spread <= 0} onClick={() => doFlip('prev')} style={btnStyle(spread <= 0)}>‹ Anterior</button>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{curPageNum}/{totalPages}</span>
          <button disabled={spread >= maxS} onClick={() => doFlip('next')} style={btnStyle(spread >= maxS)}>Siguiente ›</button>
        </div>
      </div>
    )
  }

  // Desktop spread
  const isCover = spread === 0  // cover spread: only right page, left is empty

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      {/* Perspective wrapper + mouse tracking */}
      <div
        style={{ perspective: '1800px', perspectiveOrigin: '50% 40%', width: '100%', display: 'flex', justifyContent: 'center' }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {/* Book block */}
        <div style={{
          display: 'flex',
          transform: !flipping ? `rotateY(${mouseTilt}deg) rotateX(-1deg)` : 'none',
          transition: flipping ? 'none' : 'transform 0.22s ease-out',
          transformStyle: 'preserve-3d',
          position: 'relative',
          boxShadow: '0 44px 110px rgba(0,0,0,0.75)',
        }}>
          {/* ── Background pages (shown behind the fold) ── */}
          {flipping ? (
            <>
              {/* Left bg */}
              <PageFace page={bgLeft} w={pageW} h={pageH} />
              {/* Spine */}
              <div style={{ width: 3, background: 'linear-gradient(to right,rgba(0,0,0,0.22),rgba(0,0,0,0.08),transparent)', flexShrink: 0 }} />
              {/* Right bg */}
              <PageFace page={bgRight} w={pageW} h={pageH} />
            </>
          ) : (
            <>
              {/* Normal idle spread */}
              {isCover
                ? (
                  /* Cover: empty left half + right (cover page) */
                  <>
                    <div style={{ width: pageW, height: pageH, background: 'rgba(0,0,0,0.18)', flexShrink: 0 }} />
                    <div style={{ width: 3, background: 'rgba(0,0,0,0.2)', flexShrink: 0 }} />
                    <div style={{ position: 'relative' }}>
                      <PageFace page={cur.right} w={pageW} h={pageH} />
                      {peelSide === 'right' && <CornerPeel side="right" amount={peelAmt} onClick={() => doFlip('next')} />}
                    </div>
                  </>
                )
                : (
                  <>
                    <div style={{ position: 'relative' }}>
                      <PageFace page={cur.left} w={pageW} h={pageH} />
                      {/* Spine shadow on right edge of left page */}
                      <div style={{ position: 'absolute', top: 0, right: 0, width: 22, height: '100%', background: 'linear-gradient(to left,rgba(0,0,0,0.16),transparent)', pointerEvents: 'none' }} />
                      {peelSide === 'left' && <CornerPeel side="left" amount={peelAmt} onClick={() => doFlip('prev')} />}
                    </div>
                    <div style={{ width: 3, background: 'linear-gradient(to right,rgba(0,0,0,0.22),rgba(0,0,0,0.07),transparent)', flexShrink: 0 }} />
                    <div style={{ position: 'relative' }}>
                      <PageFace page={cur.right} w={pageW} h={pageH} />
                      {/* Spine shadow on left edge of right page */}
                      <div style={{ position: 'absolute', top: 0, left: 0, width: 22, height: '100%', background: 'linear-gradient(to right,rgba(0,0,0,0.16),transparent)', pointerEvents: 'none' }} />
                      {peelSide === 'right' && <CornerPeel side="right" amount={peelAmt} onClick={() => doFlip('next')} />}
                    </div>
                  </>
                )
              }
            </>
          )}

          {/* ── Folding page overlay ── */}
          {flipping && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              <FoldingPage
                frontPage={foldFront}
                backPage={foldBack}
                flipAngle={flipAngle}
                side={flipping === 'next' ? 'right' : 'left'}
                pageW={pageW}
                pageH={pageH}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', maxWidth: pageW * 2 + 60,
        padding: '9px 16px',
        borderRadius: 22,
        background: 'rgba(0,0,0,0.42)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(18px)',
        justifyContent: 'space-between',
      }}>
        <button disabled={spread <= 0} onClick={() => doFlip('prev')} style={btnStyle(spread <= 0)}>‹ Anterior</button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em' }}>
            Pág.&nbsp;{curPageNum}{cur.left && cur.right ? `–${curPageNum + 1}` : ''}&nbsp;de&nbsp;{totalPages}
          </span>
          <div style={{ width: '100%', maxWidth: 180, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#e63d3d,#ff8080)', borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <button disabled={spread >= maxS} onClick={() => doFlip('next')} style={btnStyle(spread >= maxS)}>Siguiente ›</button>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function FlipbookViewer({ src, minHeight = 480, height, className = '', onPageChange }: Props) {
  const [pages, setPages] = useState<FlipPage[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showRead, setShowRead] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFs, setIsFs] = useState(false)

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
        cv.width = vp.width
        cv.height = vp.height
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
  const viewerH = height ?? Math.max(minHeight, pageH + 130)

  const toggleFs = () => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen().catch(() => { })
    else document.exitFullscreen()
  }

  return (
    <>
      {/* Global keyframes */}
      <style>{`
        @keyframes fb-spin { to { transform: rotate(360deg) } }
        @keyframes fb-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes fb-badge {
          0%  { opacity:0; transform:translate(10px,-6px) scale(.88) }
          12% { opacity:1; transform:translate(0,0) scale(1) }
          72% { opacity:1; transform:translate(0,0) scale(1) }
          100%{ opacity:0; transform:translate(4px,-3px) scale(.96) }
        }
        .fb-badge { animation: fb-badge 6.5s cubic-bezier(.4,0,.2,1) forwards; pointer-events:none }
      `}</style>

      <div
        ref={rootRef}
        className={`relative w-full select-none overflow-hidden ${className}`}
        style={{
          minHeight: isFs ? '100vh' : viewerH,
          height: isFs ? '100vh' : undefined,
          background: 'linear-gradient(150deg,#6a1010 0%,#7c1515 38%,#3d0808 100%)',
          borderRadius: isFs ? 0 : 26,
          boxShadow: isFs ? 'none' : '0 40px 120px rgba(0,0,0,0.65)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '20px 14px 16px', gap: 0,
        }}
      >
        {/* Ambient glow */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 18% 5%, rgba(255,130,130,0.07) 0%, transparent 55%)' }} />

        {/* Top-right action buttons */}
        {!loading && pages.length > 0 && (
          <>
            {/* Brand badge */}
            <div className="fb-badge" style={{ position: 'absolute', top: 14, right: 14, zIndex: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 30, background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e63d3d', boxShadow: '0 0 6px #e63d3d' }} />
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>Visor · Espressivo PDF</span>
              </div>
            </div>

            {/* Fullscreen + grid + read */}
            <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 30, display: 'flex', gap: 6 }}>
              <button title="Ver en cuadrícula" onClick={() => setShowGrid(true)} style={iconBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              </button>
              <button title="Modo lectura" onClick={() => setShowRead(true)} style={iconBtn}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              </button>
              <button title={isFs ? 'Salir pantalla completa' : 'Pantalla completa'} onClick={toggleFs} style={iconBtn}>
                {isFs
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                }
              </button>
            </div>
          </>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.75)', animation: 'fb-spin 0.85s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}>{progress}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, margin: 0 }}>Preparando edición digital…</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '4px 0 0' }}>Procesando páginas del documento</p>
            </div>
            <div style={{ width: 180, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#e63d3d,#ff8080)', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <p style={{ color: '#fca5a5', fontWeight: 600, margin: 0 }}>No se pudo cargar el PDF</p>
            <p style={{ color: 'rgba(252,165,165,0.7)', fontSize: 12, margin: '4px 0 16px' }}>{error}</p>
            <button onClick={loadPdf} style={btnStyle(false)}>Reintentar</button>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && pages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No hay páginas disponibles.</p>
        )}

        {/* FLIPBOOK */}
        {!loading && pages.length > 0 && (
          <FlipEngine
            pages={pages}
            onPageChange={(idx) => { setCurrentIdx(idx); onPageChange?.(idx) }}
          />
        )}
      </div>

      {showRead && <ReadOverlay pages={pages} startIdx={currentIdx} onClose={() => setShowRead(false)} />}
      {showGrid && <GridOverlay pages={pages} currentIdx={currentIdx} onSelect={setCurrentIdx} onClose={() => setShowGrid(false)} />}
    </>
  )
}
