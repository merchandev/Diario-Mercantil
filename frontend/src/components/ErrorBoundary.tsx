import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props){
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any){
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any){
    // Log to console for quick inspection
    // eslint-disable-next-line no-console
    console.error('App ErrorBoundary caught error:', error, info)
  }
  render(){
    if (this.state.hasError){
      return (
        <div className="min-h-screen grid place-items-center p-6">
          <div className="card max-w-xl w-full p-6 space-y-3">
            <h1 className="text-xl font-semibold text-red-600">Se produjo un error en la aplicación</h1>
            <p className="text-slate-600">Revisa la consola del navegador para más detalles. Puedes recargar la página.</p>
            <pre className="text-xs bg-slate-50 p-3 rounded border overflow-auto max-h-48">{String(this.state.error)}</pre>
            <div>
              <button className="btn btn-primary" onClick={()=>window.location.reload()}>Recargar</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
