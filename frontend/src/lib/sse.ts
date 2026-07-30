export function subscribeEvents(onEvent:(e:any)=>void){
  const url = '/api/events'
  const es = new EventSource(url, { withCredentials: true })
  es.addEventListener('file_event', (ev:any)=>{
    try { onEvent(JSON.parse(ev.data)) } catch {}
  })
  return ()=> es.close()
}
