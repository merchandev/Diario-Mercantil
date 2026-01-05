import { getToken } from './api'

export function subscribeEvents(onEvent:(e:any)=>void){
  const token = getToken()
  const url = token ? `/api/events?token=${encodeURIComponent(token)}` : '/api/events'
  const es = new EventSource(url)
  es.addEventListener('file_event', (ev:any)=>{
    try { onEvent(JSON.parse(ev.data)) } catch {}
  })
  return ()=> es.close()
}
