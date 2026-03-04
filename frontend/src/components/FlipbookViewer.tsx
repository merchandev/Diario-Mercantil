import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { fetchAuth } from '../lib/api'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// ─── Types ───────────────────────────────────────────────────────────────────

type FlipPage = { num: number; dataUrl: string }

type Props = {
  src: string
  minHeight?: number
  height?: number
  className?: string
  onPageChange?: (pageIndex: number) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RENDER_SCALE = 2.2
const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

// ─── Custom 3-D Flip Engine ──────────────────────────────────────────────────

function FlipEngine({
  pages,
  onPageChange,
}: {
  pages: FlipPage[]
  onPageChange?: (idx: number) => void
}) {
  // Spread = pair of pages; spread 0 → pages 0+1, spread 1 → pages 2+3 …
  const [spread, setSpread] = useState(0)
  const [flipping, setFlipping] = useState<'next' | 'prev' | null>(null)
  const [flipAngle, setFlipAngle] = useState(0)   // 0 → 180
  const [mouseAngle, setMouseAngle] = useState(0)  // subtle hover tilt
  const [peelSide, setPeelSide] = useState<'right' | 'left' | null>(null)
  const [peelAmt, setPeelAmt] = useState(0)
  const [fs, setFs] = useState(false)

  const raf = useRef<number | null>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(880)

  // Watch container width
  useEffect(() => {
    if (!bookRef.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(bookRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = w < 640
  const pageW = isMobile ? Math.min(w - 24, 400) : Math.floor((w - 80) / 2)
  const pageH = Math.round(pageW / 0.707)
  const maxSpread = Math.ceil(pages.length / 2) - 1

  const L = (s: number) => pages[s * 2]
  const R = (s: number) => pages[s * 2 + 1]
  const nL = (s: number) => pages[(s + 1) * 2]
  const nR = (s: number) => pages[(s + 1) * 2 + 1]
  const pR = (s: number) => pages[(s - 1) * 2 + 1]

  const flip = (dir: 'next' | 'prev') => {
    if (flipping) return
    if (dir === 'next' && spread >= maxSpread) return
    if (dir === 'prev' && spread <= 0) return
    setPeelSide(null)
    setPeelAmt(0)
    setFlipping(dir)
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - start) / 680, 1)
      setFlipAngle(ease(p) * 180)
      if (p < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        setFlipAngle(0)
        setFlipping(null)
        if (dir === 'next') setSpread(s => { const nxt = s + 1; onPageChange?.(nxt * 2); return nxt })
        else setSpread(s => { const prv = s - 1; onPageChange?.(prv * 2); return prv })
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') flip('next')
      if (e.key === 'ArrowLeft') flip('prev')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [spread, flipping])

  // Mouse hover → subtle tilt + corner peel
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (flipping || isMobile) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = (e.clientX - rect.left) / rect.width   // 0–1 left→right
    setMouseAngle((cx - 0.5) * 8)  // ±4 deg tilt
    // Corner peel detection
    const cy = (e.clientY - rect.top) / rect.height
    const rightEdge = cx > 0.72 && cy > 0.65
    const leftEdge = cx < 0.28 && cy > 0.65
    if (rightEdge && spread < maxSpread) {
      setPeelSide('right')
      setPeelAmt(Math.min(1, (cx - 0.72) / 0.28) * Math.min(1, (cy - 0.65) / 0.35))
    } else if (leftEdge && spread > 0) {
      setPeelSide('left')
      setPeelAmt(Math.min(1, (0.28 - cx) / 0.28) * Math.min(1, (cy - 0.65) / 0.35))
    } else {
      setPeelSide(null); setPeelAmt(0)
    }
  }
  const onMouseLeave = () => { setMouseAngle(0); setPeelSide(null); setPeelAmt(0) }

  // Fullscreen
  const toggleFs = () => {
    if (!document.fullscreenElement) bookRef.current?.parentElement?.requestFullscreen().catch(() => { })
    else document.exitFullscreen()
  }
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // Total progress
  const totalPages = pages.length
  const curPage = spread * 2
  const pct = totalPages > 0 ? Math.round(((curPage + (isMobile ? 1 : 2)) / totalPages) * 100) : 0

  // Shadow intensity helper
  const foldShadow = (angle: number) => {
    const t = angle / 90
    return t <= 1 ? t : 2 - t  // peaks at 90°
  }

  // Page component
  const PageFace = ({ page, style = {} }: { page?: FlipPage; style?: React.CSSProperties }) => (
    <div
      style={{
        width: pageW, height: pageH,
        background: '#fff',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 2px 24px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      {page
        ? <img src={page.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none' }} draggable={false} />
        : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #f0f0f0, #e8e8e8)' }} />
      }
    </div>
  )

  // Folding page during flip-next : right page folds left (rotateY 0→-180)
  const FoldNextRight = () => {
    const angle = flipAngle
    const shadow = foldShadow(angle)
    return (
      <div
        style={{
          position: 'absolute',
          right: 0, top: 0,
          width: pageW, height: pageH,
          transformOrigin: 'left center',
          transform: `rotateY(${-angle}deg)`,
          transformStyle: 'preserve-3d',
          zIndex: 10,
        }}
      >
        {/* Front face: current right page */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
          <PageFace page={R(spread)} style={{ boxShadow: 'none' }} />
          {/* Shadow that darkens toward the fold edge */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(to left, rgba(0,0,0,${shadow * 0.45}), transparent 60%)`,
          }} />
        </div>
        {/* Back face: next-left page (mirrored) */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          overflow: 'hidden',
        }}>
          <PageFace page={nL(spread)} style={{ boxShadow: 'none', transform: 'scaleX(-1)' }} />
          {/* Shadow on back face */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(to right, rgba(0,0,0,${shadow * 0.45}), transparent 60%)`,
            transform: 'scaleX(-1)',
          }} />
        </div>
      </div>
    )
  }

  // Folding page during flip-prev: left page folds right (rotateY 0→+180)
  const FoldPrevLeft = () => {
    const angle = flipAngle
    const shadow = foldShadow(angle)
    return (
      <div
        style={{
          position: 'absolute',
          left: 0, top: 0,
          width: pageW, height: pageH,
          transformOrigin: 'right center',
          transform: `rotateY(${angle}deg)`,
          transformStyle: 'preserve-3d',
          zIndex: 10,
        }}
      >
        {/* Front: current left page */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden' }}>
          <PageFace page={L(spread)} style={{ boxShadow: 'none' }} />
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(to right, rgba(0,0,0,${shadow * 0.45}), transparent 60%)`,
          }} />
        </div>
        {/* Back: prev-right page (mirrored) */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          overflow: 'hidden',
        }}>
          <PageFace page={pR(spread)} style={{ boxShadow: 'none', transform: 'scaleX(-1)' }} />
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `linear-gradient(to left, rgba(0,0,0,${shadow * 0.45}), transparent 60%)`,
            transform: 'scaleX(-1)',
          }} />
        </div>
      </div>
    )
  }

  // Corner peel element
  const CornerPeel = ({ side }: { side: 'right' | 'left' }) => {
    const size = 60 + peelAmt * 40
    return (
      <div
        onClick={() => flip(side === 'right' ? 'next' : 'prev')}
        style={{
          position: 'absolute',
          bottom: 0,
          [side]: 0,
          width: size, height: size,
          cursor: 'pointer',
          zIndex: 20,
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute',
          bottom: 0,
          [side]: 0,
          width: 0, height: 0,
          borderStyle: 'solid',
          borderWidth: side === 'right'
            ? `${size}px 0 0 ${size}px`
            : `${size}px ${size}px 0 0`,
          borderColor: side === 'right'
            ? `transparent transparent transparent rgba(0,0,0,${0.08 + peelAmt * 0.15})`
            : `transparent transparent transparent transparent`,
          filter: 'drop-shadow(-2px -2px 4px rgba(0,0,0,0.3))',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 4, [side]: 4,
          color: 'rgba(0,0,0,0.25)',
          fontSize: 10,
          fontWeight: 700,
          userSelect: 'none',
        }}>
          {side === 'right' ? '›' : '‹'}
        </div>
      </div>
    )
  }

  // ── MOBILE: Single-page swipe view ─────────────────────────────────────────
  if (isMobile) {
    const curMobilePage = pages[spread * 2] ?? pages[spread * 2 + 1]
    return (
      <div ref={bookRef} style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: pageW, height: pageH,
            boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <PageFace page={curMobilePage} style={{ boxShadow: 'none' }} />
          </div>
          {/* Mobile controls */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => flip('prev')}
              disabled={spread <= 0}
              style={btnStyle(spread <= 0)}
            >‹ Anterior</button>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {spread * 2 + 1} / {pages.length}
            </span>
            <button
              onClick={() => flip('next')}
              disabled={spread >= maxSpread}
              style={btnStyle(spread >= maxSpread)}
            >Siguiente ›</button>
          </div>
        </div>
      </div>
    )
  }

  // ── DESKTOP: Double-page spread ────────────────────────────────────────────
  return (
    <div
      ref={bookRef}
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
    >
      {/* Book wrapper with perspective */}
      <div
        style={{
          perspective: '1800px',
          perspectiveOrigin: '50% 40%',
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {/* Book block — tilts subtly with mouse */}
        <div
          style={{
            display: 'flex',
            transform: !flipping ? `rotateY(${mouseAngle}deg) rotateX(-1.5deg)` : undefined,
            transition: flipping ? 'none' : 'transform 0.25s ease-out',
            transformStyle: 'preserve-3d',
            position: 'relative',
            boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* ── Background spread (visible during flip) ── */}
          {flipping === 'next' && (
            <>
              <PageFace page={L(spread)} />
              <div style={{ width: 2, background: 'rgba(0,0,0,0.15)', flexShrink: 0 }} />
              <PageFace page={nL(spread)} />
            </>
          )}
          {flipping === 'prev' && (
            <>
              <PageFace page={pR(spread)} />
              <div style={{ width: 2, background: 'rgba(0,0,0,0.15)', flexShrink: 0 }} />
              <PageFace page={R(spread)} />
            </>
          )}

          {/* ── Idle spread ── */}
          {!flipping && (
            <>
              <div style={{ position: 'relative' }}>
                <PageFace page={L(spread)} />
                {peelSide === 'left' && <CornerPeel side="left" />}
                {/* Left edge shadow (spine) */}
                <div style={{
                  position: 'absolute', top: 0, right: 0, width: 24, height: '100%', pointerEvents: 'none',
                  background: 'linear-gradient(to left, rgba(0,0,0,0.18), transparent)',
                }} />
              </div>
              <div style={{ width: 2, background: 'rgba(0,0,0,0.18)', flexShrink: 0 }} />
              <div style={{ position: 'relative' }}>
                <PageFace page={R(spread)} />
                {peelSide === 'right' && <CornerPeel side="right" />}
                {/* Right inner shadow (spine) */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: 24, height: '100%', pointerEvents: 'none',
                  background: 'linear-gradient(to right, rgba(0,0,0,0.18), transparent)',
                }} />
              </div>
            </>
          )}

          {/* ── Folding page on top ── */}
          {flipping === 'next' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              <FoldNextRight />
            </div>
          )}
          {flipping === 'prev' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
              <FoldPrevLeft />
            </div>
          )}

          {/* Spine line */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: '50%',
            width: 3,
            background: 'linear-gradient(to right, rgba(0,0,0,0.25), rgba(0,0,0,0.08), transparent)',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 5,
          }} />
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, width: '100%', maxWidth: pageW * 2 + 40,
        padding: '10px 16px',
        borderRadius: 20,
        background: 'rgba(0,0,0,0.40)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(16px)',
      }}>
        <button onClick={() => flip('prev')} disabled={spread <= 0} style={btnStyle(spread <= 0)}>
          ‹ Anterior
        </button>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}>
            Pág. {curPage + 1}{R(spread) ? `–${curPage + 2}` : ''} de {totalPages}
          </span>
          <div style={{ width: '100%', maxWidth: 200, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #e63d3d, #ff8080)', transition: 'width 0.4s ease', borderRadius: 2 }} />
          </div>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button title="Pantalla completa" onClick={toggleFs} style={iconBtnStyle}>
            {fs
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
            }
          </button>
        </div>

        <button onClick={() => flip('next')} disabled={spread >= maxSpread} style={btnStyle(spread >= maxSpread)}>
          Siguiente ›
        </button>
      </div>
    </div>
  )
}

// Shared button styles
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 16px',
  borderRadius: 30,
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.08)',
  color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)',
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.18s ease',
  letterSpacing: '0.04em',
})

const iconBtnStyle: React.CSSProperties = {
  width: 34, height: 34,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.07)',
  color: 'rgba(255,255,255,0.65)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
}

// ─── Read-mode overlay ────────────────────────────────────────────────────────

function ReadOverlay({ pages, startIdx, onClose }: { pages: FlipPage[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx)
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.97)',
      display: 'flex', flexDirection: 'column',
      animation: 'flipbook-fadein 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Página {idx + 1} / {pages.length}</span>
        <button onClick={onClose} style={{ ...iconBtnStyle, color: '#fff' }}>✕</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
        {pages[idx] && <img src={pages[idx].dataUrl} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={btnStyle(idx === 0)}>‹ Anterior</button>
        <button onClick={() => setIdx(i => Math.min(pages.length - 1, i + 1))} disabled={idx >= pages.length - 1} style={btnStyle(idx >= pages.length - 1)}>Siguiente ›</button>
      </div>
    </div>
  )
}

// ─── Grid overlay ─────────────────────────────────────────────────────────────

function GridOverlay({ pages, currentIdx, onSelect, onClose }: { pages: FlipPage[]; currentIdx: number; onSelect: (i: number) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: '#fff', fontWeight: 600 }}>Todas las páginas</span>
        <button onClick={onClose} style={{ ...iconBtnStyle, color: '#fff' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
        {pages.map((p, i) => (
          <button
            key={p.num}
            onClick={() => { onSelect(i); onClose() }}
            style={{
              border: i === currentIdx ? '2px solid #e63d3d' : '2px solid transparent',
              borderRadius: 8, overflow: 'hidden', padding: 0, background: 'none', cursor: 'pointer',
              boxShadow: i === currentIdx ? '0 0 0 3px rgba(230,61,61,0.3)' : 'none',
            }}
          >
            <img src={p.dataUrl} alt="" style={{ width: '100%', display: 'block' }} />
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 10, padding: '2px 0', background: 'rgba(0,0,0,0.6)' }}>{p.num}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function BrandBadge() {
  return (
    <>
      <style>{`
        @keyframes badge-enter {
          0%   { opacity:0; transform: translate(10px,-6px) scale(0.88); }
          12%  { opacity:1; transform: translate(0,0) scale(1); }
          72%  { opacity:1; transform: translate(0,0) scale(1); }
          100% { opacity:0; transform: translate(4px,-3px) scale(0.96); }
        }
        .fb-badge { animation: badge-enter 6.5s cubic-bezier(.4,0,.2,1) forwards; pointer-events: none; }
        @keyframes flipbook-fadein { from{opacity:0} to{opacity:1} }
        @keyframes flipbook-spin { to{transform:rotate(360deg)} }
      `}</style>
      <div className="fb-badge" style={{ position: 'absolute', top: 14, right: 16, zIndex: 30 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 30,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e63d3d', boxShadow: '0 0 6px #e63d3d' }} />
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.42em', color: 'rgba(255,255,255,0.65)', fontWeight: 700 }}>
            Visor · Espressivo PDF
          </span>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FlipbookViewer({ src, minHeight = 500, height, className = '', onPageChange }: Props) {
  const [pages, setPages] = useState<FlipPage[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showRead, setShowRead] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(900)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const loadAndRender = useCallback(async () => {
    if (!src) return
    setLoading(true); setError(null); setPages([]); setProgress(0)
    try {
      const isSameOrigin = !src.startsWith('http') || src.startsWith(window.location.origin)
      let buffer: ArrayBuffer
      if (isSameOrigin) {
        const res = await fetchAuth(src.startsWith('http') ? src : new URL(src, window.location.origin).toString(), undefined, true)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        buffer = await res.arrayBuffer()
      } else {
        const res = await fetch(src)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        buffer = await res.arrayBuffer()
      }
      const copy = new ArrayBuffer(buffer.byteLength)
      new Uint8Array(copy).set(new Uint8Array(buffer))
      const pdf = await pdfjs.getDocument({ data: copy }).promise
      const total = pdf.numPages
      const out: FlipPage[] = []
      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: RENDER_SCALE * dpr })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (!ctx) continue
        await page.render({ canvasContext: ctx, viewport } as any).promise
        out.push({ num: i, dataUrl: canvas.toDataURL('image/jpeg', 0.92) })
        setProgress(Math.round((i / total) * 100))
      }
      setPages(out)
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar el PDF')
    } finally {
      setLoading(false)
    }
  }, [src])

  useEffect(() => { loadAndRender() }, [loadAndRender])

  const isMobile = containerW < 640
  const pageW = isMobile ? Math.min(containerW - 24, 400) : Math.floor((containerW - 80) / 2)
  const pageH = Math.round(pageW / 0.707)
  const viewerH = height ?? Math.max(minHeight, pageH + 130)

  return (
    <>
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden select-none ${className}`}
        style={{
          minHeight: isFullscreen ? '100vh' : viewerH,
          height: isFullscreen ? '100vh' : undefined,
          background: 'linear-gradient(150deg, #6b1111 0%, #7d1616 35%, #3e0808 100%)',
          borderRadius: isFullscreen ? 0 : 28,
          boxShadow: isFullscreen ? 'none' : '0 40px 120px rgba(0,0,0,0.65)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '20px 12px 16px',
          gap: 0,
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 18% 0%, rgba(255,130,130,0.07) 0%, transparent 55%), radial-gradient(ellipse at 82% 100%, rgba(0,0,0,0.35) 0%, transparent 55%)',
        }} />

        {/* Brand badge */}
        {!loading && pages.length > 0 && <BrandBadge />}

        {/* Grid + Read buttons */}
        {!loading && pages.length > 0 && (
          <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 30, display: 'flex', gap: 6 }}>
            <button title="Ver todas las páginas" onClick={() => setShowGrid(true)} style={iconBtnStyle}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </button>
            <button title="Leer página" onClick={() => setShowRead(true)} style={iconBtnStyle}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                border: '4px solid rgba(255,255,255,0.1)',
                borderTopColor: 'rgba(255,255,255,0.75)',
                animation: 'flipbook-spin 0.85s linear infinite',
              }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}>
                {progress}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, margin: 0 }}>Preparando edición digital…</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '4px 0 0' }}>Procesando páginas del documento</p>
            </div>
            <div style={{ width: 180, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#e63d3d,#ff8080)', transition: 'width 0.3s', borderRadius: 2 }} />
            </div>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <p style={{ color: '#fca5a5', fontWeight: 600, margin: 0 }}>No se pudo cargar el PDF</p>
            <p style={{ color: 'rgba(252,165,165,0.7)', fontSize: 12, margin: '4px 0 16px' }}>{error}</p>
            <button onClick={loadAndRender} style={btnStyle(false)}>Reintentar</button>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && pages.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No hay páginas disponibles.</p>
        )}

        {/* FLIPBOOK ENGINE */}
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
