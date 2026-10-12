import type { Settings } from '../lib/api'
export default function InstitutionalFields({ value, onChange, dark = false }: { value: Partial<Settings>; onChange: (value: Partial<Settings>) => void; dark?: boolean }) {
  const fields = [['operator_legal_name', 'Razón social del operador', 'text', ''], ['operator_rif', 'RIF del operador', 'text', ''], ['operator_address', 'Dirección de atención', 'text', ''], ['contact_email', 'Correo de atención', 'email', ''], ['contact_whatsapp', 'WhatsApp de atención [código de país y número]', 'tel', 'Ej.: 584121234567'], ['social_instagram', 'Instagram [URL]', 'url', 'https://'], ['social_facebook', 'Facebook [URL]', 'url', 'https://'], ['social_x', 'X [URL]', 'url', 'https://'], ['social_linkedin', 'LinkedIn [URL]', 'url', 'https://']]
  return <fieldset className={dark ? 'bg-gray-800/50 border border-purple-500/30 rounded-2xl p-6 md:col-span-2 text-white' : 'bg-slate-50 border border-slate-200 rounded-lg p-4'}>
    <legend className="font-semibold px-2">Datos institucionales y contacto</legend>
    <p className="text-sm mb-4">Complete los datos oficiales. Los campos vacíos no se muestran al público.</p>
    <div className="grid md:grid-cols-2 gap-4">{fields.map(([key, label, type, placeholder]) => <label className="text-sm block" key={key}>
      <span className="block mb-1">{label}</span>
      <input className={dark ? 'w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white' : 'input w-full'} type={type}
        value={String(value[key as keyof Settings] || '')} placeholder={placeholder} maxLength={256}
        onChange={e => onChange({ ...value, [key]: e.target.value })} />
    </label>)}</div>
  </fieldset>
}
