// On-brand, in-page confirm/alert dialogs to replace the browser's native
// window.confirm/alert (which looks out of place: "esraomer.com says…").
// Built with plain DOM + the site's Tailwind classes so it works in both the
// guest app and the admin app without a provider. Returns a Promise.

function openDialog({ message, okText, cancelText }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className =
      'fixed inset-0 z-[90] flex items-center justify-center p-6'
    overlay.style.background = 'rgba(47,62,77,0.35)'
    overlay.style.backdropFilter = 'blur(2px)'

    const card = document.createElement('div')
    card.className = 'card-soft w-full max-w-xs p-6 text-center shadow-xl'

    const msg = document.createElement('p')
    msg.className = 'font-display text-primary text-lg leading-snug'
    msg.textContent = message
    card.appendChild(msg)

    const row = document.createElement('div')
    row.className = 'flex gap-3 justify-center mt-6'

    const finish = (val) => {
      overlay.remove()
      document.removeEventListener('keydown', onKey)
      resolve(val)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false)
      if (e.key === 'Enter') finish(true)
    }

    if (cancelText !== null) {
      const cancel = document.createElement('button')
      cancel.type = 'button'
      cancel.className = 'btn-lux'
      cancel.textContent = cancelText || 'Vazgeç'
      cancel.onclick = () => finish(false)
      row.appendChild(cancel)
    }

    const ok = document.createElement('button')
    ok.type = 'button'
    ok.className = 'btn-lux'
    ok.style.background = 'var(--c-primary)'
    ok.style.color = '#fffdf8'
    ok.style.borderColor = 'var(--c-primary)'
    ok.textContent = okText || 'Tamam'
    ok.onclick = () => finish(true)
    row.appendChild(ok)

    card.appendChild(row)
    overlay.appendChild(card)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false)
    })
    document.addEventListener('keydown', onKey)
    document.body.appendChild(overlay)
    ok.focus()
  })
}

// Returns true if confirmed.
export function confirmDialog(message, { okText = 'Sil', cancelText = 'Vazgeç' } = {}) {
  return openDialog({ message, okText, cancelText })
}

// Single-button notice.
export function alertDialog(message, { okText = 'Tamam' } = {}) {
  return openDialog({ message, okText, cancelText: null })
}
