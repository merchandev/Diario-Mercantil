import { useState } from 'react'
import { SEO } from '../components/SEO'
import { IconBuilding, IconIdCard, IconMail, IconPhone, IconUser } from '../components/icons'

export const CONTACT_DEPARTMENTS = [
  'Atención al solicitante',
  'Soporte técnico',
  'Administración',
  'Departamento Legal',
  'Ventas y Publicidad',
  'Facturación y Pagos',
  'Ediciones y Publicaciones',
] as const

type ContactForm = {
  nombre: string
  cedula: string
  correo: string
  telefono: string
  departamento: string
}

export function buildContactMessage(form: ContactForm) {
  return [
    'Hola, deseo comunicarme con Diario Mercantil:',
    `· Nombre: ${form.nombre.trim()}`,
    `· Cédula: ${form.cedula.trim().toUpperCase()}`,
    `· Correo: ${form.correo.trim().toLowerCase()}`,
    `· Teléfono: ${form.telefono.trim()}`,
    `· Departamento: ${form.departamento}`,
  ].join('\n')
}

const EMPTY_FORM: ContactForm = {
  nombre: '',
  cedula: '',
  correo: '',
  telefono: '',
  departamento: '',
}

export default function Contacto() {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)

  const update = (field: keyof ContactForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (Object.values(form).some(value => !value.trim())) return

    const url = 'https://wa.me/584120000000?text=' + encodeURIComponent(buildContactMessage(form))
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const fieldClassName = 'input w-full mt-1.5 bg-white'
  const iconClassName = 'h-4 w-4 text-brand-700'

  return (
    <div className="flex flex-1 bg-slate-50">
      <SEO
        title="Contacto y Soporte | Diario Mercantil Venezuela"
        description="Contacta al equipo de Diario Mercantil para soporte técnico, administración, asuntos legales, ventas, publicidad, pagos y publicaciones."
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <header className="mx-auto mb-7 max-w-2xl text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Canal de atención</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contacto</h1>
          <p className="mt-3 text-slate-600">
            Completa tus datos y selecciona el departamento que atenderá tu solicitud.
          </p>
        </header>

        <form onSubmit={onSubmit} className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-brand-700" aria-hidden="true" />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
            <label htmlFor="contacto_nombre" className="block sm:col-span-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <IconUser className={iconClassName} /> Nombre completo
              </span>
              <input
                id="contacto_nombre"
                name="nombre"
                className={fieldClassName}
                autoComplete="name"
                placeholder="Ej.: Juan Gómez"
                value={form.nombre}
                onChange={event => update('nombre', event.target.value)}
                required
              />
            </label>

            <label htmlFor="contacto_cedula" className="block">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <IconIdCard className={iconClassName} /> Cédula
              </span>
              <input
                id="contacto_cedula"
                name="cedula"
                className={fieldClassName}
                autoComplete="off"
                placeholder="Ej.: V-12345678"
                pattern="[VEJPGvejgp]-?\d{6,9}"
                title="Indica el prefijo y entre 6 y 9 dígitos, por ejemplo V-12345678."
                value={form.cedula}
                onChange={event => update('cedula', event.target.value.replace(/\s/g, ''))}
                required
              />
            </label>

            <label htmlFor="contacto_telefono" className="block">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <IconPhone className={iconClassName} /> Teléfono
              </span>
              <input
                id="contacto_telefono"
                name="telefono"
                type="tel"
                inputMode="tel"
                className={fieldClassName}
                autoComplete="tel"
                placeholder="Ej.: 0412-1234567"
                pattern="[+0-9() -]{10,20}"
                title="Indica un número de teléfono válido."
                value={form.telefono}
                onChange={event => update('telefono', event.target.value)}
                required
              />
            </label>

            <label htmlFor="contacto_correo" className="block sm:col-span-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <IconMail className={iconClassName} /> Correo electrónico
              </span>
              <input
                id="contacto_correo"
                name="correo"
                type="email"
                className={fieldClassName}
                autoComplete="email"
                placeholder="Ej.: nombre@correo.com"
                value={form.correo}
                onChange={event => update('correo', event.target.value)}
                required
              />
            </label>

            <label htmlFor="contacto_departamento" className="block sm:col-span-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <IconBuilding className={iconClassName} /> Departamento
              </span>
              <select
                id="contacto_departamento"
                name="departamento"
                className={fieldClassName}
                value={form.departamento}
                onChange={event => update('departamento', event.target.value)}
                required
              >
                <option value="">Selecciona el departamento</option>
                {CONTACT_DEPARTMENTS.map(department => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary flex h-12 w-full items-center justify-center gap-2 text-base">
                <IconPhone className="h-5 w-5" />
                Enviar consulta por WhatsApp
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Se abrirá WhatsApp con tus datos y el departamento seleccionado.
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
