import { useEffect, useState } from 'react'
import { listFiles } from '../lib/api'

export default function StatsCards(){
  const [count, setCount] = useState({all:0, failed:0, completed:0})
  useEffect(()=>{(async()=>{
    const r = await listFiles();
    const items = r.items
    setCount({
      all: items.length,
      failed: items.filter(x=>x.status.includes('failed')).length,
      completed: items.filter(x=>x.status==='completed').length,
    })
  })()},[])
  const Card = ({title, value}:{title:string; value:any}) => (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card title="Archivos totales" value={count.all} />
      <Card title="Completados" value={count.completed} />
      <Card title="Fallidos" value={count.failed} />
    </div>
  )
}
