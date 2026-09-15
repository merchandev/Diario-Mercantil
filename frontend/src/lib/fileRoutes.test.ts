import { describe, expect, it } from 'vitest'
import { fileContentUrl, fileDetailPath } from './fileRoutes'

describe('Rutas del gestor de archivos', () => {
  it('genera la ruta de detalle dentro del panel', () => {
    expect(fileDetailPath(49)).toBe('/dashboard/archivos/49')
  })

  it('genera las rutas de visualización y descarga del backend', () => {
    expect(fileContentUrl(49)).toBe('/api/uploads/49')
    expect(fileContentUrl(49, true)).toBe('/api/uploads/49?download=1')
  })
})
