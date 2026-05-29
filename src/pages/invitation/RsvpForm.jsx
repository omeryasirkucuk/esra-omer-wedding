import { useState } from 'react'
import { api } from '../../lib/api.js'
import Sprig from '../../components/Sprig.jsx'

// Underline-style fields (no boxy inputs) matching the stationery look.
function Field({ label, ...props }) {
  return (
    <input
      aria-label={label}
      placeholder={label}
      className="w-full bg-transparent border-b border-[#cbb98c] py-2 px-0.5 font-display text-primary text-[15px] placeholder:text-[#9aa6b0] focus:outline-none focus:border-gold"
      {...props}
    />
  )
}

export default function RsvpForm() {
  const [form, setForm] = useState({ firstName: '', lastName: '', guests: 1, children: 0 })
  const [state, setState] = useState('idle') // idle | sending | done | error
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) return
    setState('sending')
    try {
      await api.sendRsvp({ ...form, attending: true })
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="text-center">
        <Sprig width={120} />
        <p className="font-display italic text-primary text-xl mt-4 leading-snug px-4">
          Teşekkürler{form.firstName ? `, ${form.firstName}` : ''}!<br />Sizi aramızda görmek için sabırsızlanıyoruz.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xs">
      <div className="space-y-3">
        <Field label="Adınız" value={form.firstName} onChange={set('firstName')} />
        <Field label="Soyadınız" value={form.lastName} onChange={set('lastName')} />
        <div className="flex gap-3">
          <Field label="Kaç kişi?" type="number" min="1" value={form.guests} onChange={set('guests')} />
          <Field label="Çocuk (0-12)" type="number" min="0" value={form.children} onChange={set('children')} />
        </div>
      </div>
      <button type="submit" disabled={state === 'sending'} className="btn-lux w-full mt-5">
        {state === 'sending' ? 'Gönderiliyor…' : 'Geliyorum'}
      </button>
      {state === 'error' && (
        <p className="label mt-3 text-rose">Bir sorun oldu, tekrar deneyin.</p>
      )}
    </form>
  )
}
