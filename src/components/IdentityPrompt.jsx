import { useState } from 'react'
import Emblem from './Emblem.jsx'
import { saveProfile } from '../lib/identity.js'

// "Seni Tanıyalım" — asked once, then remembered on the device (never re-asked
// on refresh). Name is only a label; access is keyed by the device id, so two
// guests with the same name never collide.
export default function IdentityPrompt({ onDone }) {
  const [firstName, setFirst] = useState('')
  const [lastName, setLast] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    onDone(saveProfile({ firstName, lastName }))
  }

  return (
    <section className="min-h-[100svh] flex flex-col items-center justify-center px-7 text-center">
      <Emblem size={48} linkHome />
      <p className="label mt-5 mb-1">Seni Tanıyalım</p>
      <p className="font-display italic text-primary text-xl mx-6 mb-7 leading-snug">
        Albüm ve panoda adın görünsün
      </p>
      <form onSubmit={submit} className="w-full max-w-xs">
        <input
          aria-label="Adınız"
          placeholder="Adınız"
          value={firstName}
          onChange={(e) => setFirst(e.target.value)}
          className="w-full bg-transparent border-b border-[#cbb98c] py-2 mb-4 font-display text-primary text-[15px] placeholder:text-[#9aa6b0] focus:outline-none focus:border-gold"
        />
        <input
          aria-label="Soyadınız"
          placeholder="Soyadınız"
          value={lastName}
          onChange={(e) => setLast(e.target.value)}
          className="w-full bg-transparent border-b border-[#cbb98c] py-2 mb-2 font-display text-primary text-[15px] placeholder:text-[#9aa6b0] focus:outline-none focus:border-gold"
        />
        <button type="submit" className="btn-lux w-full mt-6">
          Devam
        </button>
      </form>
    </section>
  )
}
