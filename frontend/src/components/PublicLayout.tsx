import React from 'react'
import { Outlet } from 'react-router-dom'
import PublicHeader from './PublicHeader'

export default function PublicLayout(){
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <Outlet />
    </div>
  )
}
