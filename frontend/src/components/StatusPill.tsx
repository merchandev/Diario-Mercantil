export default function StatusPill({status}:{status:string}){
  const map:any = {
    uploaded: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    processing_failed: 'bg-red-100 text-red-700',
    validation_failed: 'bg-amber-100 text-amber-800',
  }
  const cls = map[status] || 'bg-slate-100 text-slate-700'
  return <span className={`pill ${cls}`}>{status}</span>
}
