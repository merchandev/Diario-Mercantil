import React, { useEffect, useRef, useState } from 'react'
import { getSettings } from '../lib/api'

type AdvertisingSlide = { id: number | string; content: React.ReactNode }
type BannerSettingKey = 'banner_history_1' | 'banner_history_2' | 'banner_history_3'

interface AdvertisingSliderProps {
  heightClass?: string
  className?: string
  slides?: AdvertisingSlide[]
  settingKeys?: BannerSettingKey[]
  autoPlayInterval?: number
}

const DEFAULT_SETTING_KEYS: BannerSettingKey[] = [
  'banner_history_1',
  'banner_history_2',
  'banner_history_3',
]

export default function AdvertisingSlider({
  heightClass = 'h-32 md:h-40',
  className = '',
  slides,
  settingKeys = DEFAULT_SETTING_KEYS,
  autoPlayInterval = 5000,
}: AdvertisingSliderProps) {
  const [idx, setIdx] = useState(0)
  const [configuredSlides, setConfiguredSlides] = useState<AdvertisingSlide[]>([])
  const timer = useRef<number | undefined>(undefined)
  const keySignature = settingKeys.join('|')
  const resolvedSlides = slides ?? configuredSlides

  useEffect(() => {
    if (slides) return
    let active = true
    getSettings()
      .then(response => {
        if (!active) return
        const items = settingKeys.flatMap((key, position): AdvertisingSlide[] => {
          const value = response.settings[key]
          if (typeof value !== 'string' || !value.trim()) return []
          return [{
            id: key,
            content: (
              <img
                src={value}
                alt={`Publicidad ${position + 1}`}
                className="w-full h-full object-cover"
              />
            ),
          }]
        })
        setConfiguredSlides(items)
        setIdx(0)
      })
      .catch(() => {
        if (active) setConfiguredSlides([])
      })
    return () => { active = false }
  }, [slides, keySignature])

  useEffect(() => {
    if (idx >= resolvedSlides.length) setIdx(0)
  }, [idx, resolvedSlides.length])

  const go = (next: number) => {
    if (resolvedSlides.length === 0) return
    setIdx(((next % resolvedSlides.length) + resolvedSlides.length) % resolvedSlides.length)
  }

  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (resolvedSlides.length > 1) {
      timer.current = window.setInterval(() => go(idx + 1), autoPlayInterval)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [idx, autoPlayInterval, resolvedSlides.length])

  if (resolvedSlides.length === 0) return null
  const showControls = resolvedSlides.length > 1

  return (
    <div className={`card relative overflow-hidden px-0 ${heightClass} ${className}`}>
      <div
        className="h-full w-full flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {resolvedSlides.map(slide => (
          <div key={slide.id} className="shrink-0 w-full h-full">
            {slide.content}
          </div>
        ))}
      </div>

      {showControls && (
        <>
          <button aria-label="Anterior" onClick={() => go(idx - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon bg-white/70 backdrop-blur border border-slate-200 hover:bg-white shadow-sm z-10">‹</button>
          <button aria-label="Siguiente" onClick={() => go(idx + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon bg-white/70 backdrop-blur border border-slate-200 hover:bg-white shadow-sm z-10">›</button>
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1 z-10">
            {resolvedSlides.map((_, position) => (
              <button
                key={position}
                aria-label={`Ir al slide ${position + 1}`}
                onClick={() => go(position)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${position === idx ? 'bg-brand-600 w-4' : 'bg-slate-300 hover:bg-slate-400'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
