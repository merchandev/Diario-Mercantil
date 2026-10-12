import { useEffect, useRef } from 'react'
import SwaggerUI from 'swagger-ui-dist/swagger-ui-bundle.js'
import 'swagger-ui-dist/swagger-ui.css'
export default function ApiDocumentation() {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!container.current) return
    SwaggerUI({
      url: '/api/docs/openapi.yaml', domNode: container.current, deepLinking: true,
      requestInterceptor: (request: any) => { request.credentials = 'include'; return request },
      responseInterceptor: (response: any) => {
        if (response.status === 503 && String(response.text).includes('maintenance_required')) window.dispatchEvent(new Event('dm-maintenance-required'))
        return response
      }
    })
    return () => { if (container.current) container.current.replaceChildren() }
  }, [])
  return <main className="bg-white min-h-screen p-4"><h1 className="text-xl font-semibold mb-4">Documentación de la API</h1><div ref={container} /></main>
}
