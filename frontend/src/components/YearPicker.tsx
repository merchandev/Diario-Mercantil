import { useState, useRef, useEffect } from 'react'
import { IconCalendar, IconChevronLeft, IconChevronRight } from './icons'

interface YearPickerProps {
    value?: string | number
    onChange: (year: number) => void
    minYear?: number
    maxYear?: number
    placeholder?: string
    className?: string
    disabled?: boolean
}

export default function YearPicker({
    value,
    onChange,
    minYear = 2000,
    maxYear = 2030,
    placeholder = 'Seleccione año',
    className = '',
    disabled = false
}: YearPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Generate years range
    // We want to show them in a grid.
    // We can just generate an array from min to max.
    // But maybe we want to show them in descending order (newest first)? 
    // The user asked for "years available", usually for publication dates it's recent years.
    // Let's do descending order from max to min.
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)

    const handleSelect = (year: number) => {
        onChange(year)
        setIsOpen(false)
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
          flex items-center justify-between w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm 
          text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 cursor-pointer
          ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'hover:border-slate-400'}
        `}
            >
                <span className={value ? 'text-slate-900' : 'text-slate-500'}>
                    {value || placeholder}
                </span>
                <IconCalendar className="w-4 h-4 text-slate-500" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-64 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 grid grid-cols-4 gap-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {years.map(year => (
                            <button
                                key={year}
                                type="button"
                                onClick={() => handleSelect(year)}
                                className={`
                  px-2 py-2 text-sm rounded-md transition-colors 
                  ${Number(value) === year
                                        ? 'bg-brand-600 text-white font-medium'
                                        : 'text-slate-700 hover:bg-slate-100 hover:text-brand-700'
                                    }
                `}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
