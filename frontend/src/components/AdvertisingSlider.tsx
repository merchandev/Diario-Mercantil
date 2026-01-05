import React, { useEffect, useRef, useState } from 'react'

interface AdvertisingSliderProps {
  heightClass?: string
  className?: string
  slides?: { id: number | string; content: React.ReactNode }[]
  autoPlayInterval?: number
}

const DEFAULT_SLIDES = [
  { id: 1, content: <div className="w-full h-full bg-slate-100 grid place-items-center text-slate-500 font-medium text-lg">ESPACIO PUBLICITARIO 1</div> },
  { id: 2, content: <div className="w-full h-full bg-slate-200 grid place-items-center text-slate-600 font-medium text-lg">ESPACIO PUBLICITARIO 2</div> },
  { id: 3, content: <div className="w-full h-full bg-slate-100 grid place-items-center text-slate-500 font-medium text-lg">ESPACIO PUBLICITARIO 3</div> },
]

export default function AdvertisingSlider({ 
  heightClass = "h-32 md:h-40", 
  className = "",
  slides = DEFAULT_SLIDES,
  autoPlayInterval = 5000
}: AdvertisingSliderProps) {
  const [idx, setIdx] = useState(0)
  const timer = useRef<number|undefined>(undefined)
  
  const go = (n: number) => {
    setIdx(((n % slides.length) + slides.length) % slides.length)
  }

  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    // @ts-ignore
    timer.current = setInterval(() => go(idx + 1), autoPlayInterval)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [idx, autoPlayInterval, slides.length])

  if (!slides || slides.length === 0) return null

  return (
    <div className={`card relative overflow-hidden px-0 ${heightClass} ${className}`}>
      <div 
        className="h-full w-full flex transition-transform duration-500 ease-in-out" 
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="shrink-0 w-full h-full">
            {slide.content}
          </div>
        ))}
      </div>
      
      {/* Navigation Arrows */}
      <button 
        aria-label="Anterior" 
        onClick={() => go(idx - 1)} 
        className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon bg-white/70 backdrop-blur border border-slate-200 hover:bg-white shadow-sm z-10"
      >
        ‹
      </button>
      <button 
        aria-label="Siguiente" 
        onClick={() => go(idx + 1)} 
        className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon bg-white/70 backdrop-blur border border-slate-200 hover:bg-white shadow-sm z-10"
      >
        ›
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1 z-10">
        {slides.map((_, i) => (
          <button 
            key={i} 
            aria-label={`Ir al slide ${i + 1}`} 
            onClick={() => go(i)} 
            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === idx ? 'bg-brand-600 w-4' : 'bg-slate-300 hover:bg-slate-400'}`} 
          />
        ))}
      </div>
    </div>
  )
}
