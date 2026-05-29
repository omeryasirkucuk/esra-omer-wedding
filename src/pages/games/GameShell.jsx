// Shared chrome for every game screen: the recurring emblem on top, a thin
// "back to games" link, an elegant label/title block, and a centered column.
// Keeps each individual game file focused on its own play logic.
import Emblem from '../../components/Emblem.jsx'
import Sprig from '../../components/Sprig.jsx'
import { Link } from 'react-router-dom'

export default function GameShell({ label, title, children }) {
  return (
    <div className="paper min-h-[100svh] px-6 pt-6 pb-16 flex flex-col items-center">
      <div className="w-full max-w-md md:max-w-lg flex items-center justify-between">
        <Link to="/oyunlar" className="label-gold no-underline">
          ‹ Oyunlar
        </Link>
        <Emblem className="w-11 md:w-14" linkHome />
        <span className="w-16" aria-hidden="true" />
      </div>

      <header className="text-center mt-6">
        {label && <p className="label">{label}</p>}
        {title && (
          <h1 className="font-display italic text-primary text-3xl md:text-4xl mt-1">{title}</h1>
        )}
        <Sprig width={120} className="mx-auto mt-2" />
      </header>

      <main className="w-full max-w-md md:max-w-lg mt-6 flex flex-col items-center">{children}</main>
    </div>
  )
}
