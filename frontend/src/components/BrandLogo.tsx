export default function BrandLogo({className="", compact=false}:{className?:string; compact?:boolean}){
  return (
    <div className={["inline-flex items-center gap-3", className].join(" ")}>      
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#g)" />
        <text x="24" y="29" textAnchor="middle" fontSize="18" fontWeight="700" fill="white" fontFamily="ui-sans-serif, system-ui">DM</text>
      </svg>
      {!compact && (
        <div className="leading-tight">
          <div className="text-xl font-semibold tracking-wide text-slate-800">Diario Mercantil</div>
          <div className="text-[10px] tracking-[0.28em] text-slate-500 uppercase">de Venezuela</div>
        </div>
      )}
    </div>
  )
}
