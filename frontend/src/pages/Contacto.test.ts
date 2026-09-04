import { describe, expect, it } from 'vitest'
import { buildContactMessage, CONTACT_DEPARTMENTS } from './Contacto'

describe('Formulario institucional de contacto', () => {
  it('expone los departamentos propios del Diario Mercantil', () => {
    expect(CONTACT_DEPARTMENTS).toEqual([
      'Atención al solicitante',
      'Soporte técnico',
      'Administración',
      'Departamento Legal',
      'Ventas y Publicidad',
      'Facturación y Pagos',
      'Ediciones y Publicaciones',
    ])
  })

  it('genera el mensaje con todos los datos del contacto', () => {
    const message = buildContactMessage({
      nombre: '  Ana Pérez  ',
      cedula: 'v-12345678',
      correo: 'ANA@EJEMPLO.COM ',
      telefono: '0412-1234567',
      departamento: 'Departamento Legal',
    })

    expect(message).toContain('Nombre: Ana Pérez')
    expect(message).toContain('Cédula: V-12345678')
    expect(message).toContain('Correo: ana@ejemplo.com')
    expect(message).toContain('Teléfono: 0412-1234567')
    expect(message).toContain('Departamento: Departamento Legal')
  })
})
