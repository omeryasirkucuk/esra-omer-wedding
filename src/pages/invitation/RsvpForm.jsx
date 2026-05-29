import { useState } from 'react'
import { api } from '../../lib/api.js'
import AddToCalendar from '../../components/AddToCalendar.jsx'

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
  // Adults/children start empty so the placeholders show (not "1"/"0").
  const [form, setForm] = useState({ firstName: '', lastName: '', guests: '', children: '' })
  const [state, setState] = useState('idle') // idle | sending | done | error
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.firstName.trim()) return // surname optional
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
      <div className="flex flex-col items-center text-center">
        <p className="font-display italic text-primary text-xl md:text-2xl leading-snug px-4 max-w-sm">
          Teşekkürler{form.firstName ? `, ${form.firstName}` : ''}!<br />Sizi aramızda görmek için sabırsızlanıyoruz.
        </p>
        <div className="mt-6">
          <AddToCalendar />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xs">
      <div className="space-y-3">
        <Field label="Adınız" value={form.firstName} onChange={set('firstName')} />
        <Field label="Soyadınız (opsiyonel)" value={form.lastName} onChange={set('lastName')} />
        <div className="flex gap-3">
          <Field label="Yetişkin" type="number" min="1" value={form.guests} onChange={set('guests')} />
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
