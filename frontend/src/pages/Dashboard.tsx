import StatsCards from '../components/StatsCards'
import BcvCard from '../components/BcvCard'
import { useEffect, useState } from 'react'
import { listFiles } from '../lib/api'
import FileTable from '../components/FileTable'

export default function Dashboard(){
  const [rows, setRows] = useState<any[]>([])
  useEffect(()=>{(async()=>{ setRows((await listFiles()).items.slice(0,10)) })()},[])
  return (
    <div className="space-y-6">
      <BcvCard/>
      <StatsCards/>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recientes</h2>
      </div>
      <FileTable rows={rows}/>
    </div>
  )
}
