import { Outlet } from 'react-router-dom'
import Topbar from '../../components/Topbar'
import Sidebar from '../../components/Sidebar'
import { useState } from 'react'
import PublishChoiceModal from '../../components/PublishChoiceModal'

export default function ApplicantLayout(){
  const [showPublish, setShowPublish] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  return (
    <div className="min-h-screen">
      <Sidebar 
        onPublishClick={()=>setShowPublish(true)} 
        onCollapseChange={setSidebarCollapsed}
      />
      <div className={`grid grid-rows-[auto,1fr] transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Topbar />
        <main className="p-6 space-y-6">
          <Outlet />
        </main>
      </div>
      <PublishChoiceModal open={showPublish} onClose={()=>setShowPublish(false)} />
    </div>
  )
}
