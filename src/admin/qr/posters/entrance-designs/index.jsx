// Registry of entrance-sign designs. The first (classic) keeps the QR block; the
// rest are QR-less decorative welcome signs. Each Component is a forwardRef that
// takes the same shared prop bag — { orientation, names, dateText, welcome,
// headline, description, qrUrl, photoUrl, thumb } — and uses what it needs.
// EntranceForm shows a picker, swaps the active Component, and hides the
// QR-only fields when the chosen design is `qrless`.
import { forwardRef } from 'react'
import EntrancePoster from '../EntrancePoster'
import Wildflowers from './Wildflowers'
import RibbonTable from './RibbonTable'
import GardenFeast from './GardenFeast'
import Meadow from './Meadow'
import Clouds from './Clouds'
import StringLights from './StringLights'

// Adapter so the existing QR poster fits the shared prop bag (it expects
// `eyebrow` for the date line).
const Classic = forwardRef(function Classic(props, ref) {
  return <EntrancePoster ref={ref} {...props} eyebrow={props.dateText} />
})

export const ENTRANCE_DESIGNS = [
  { id: 'classic', label: 'Klasik · QR', qrless: false, Component: Classic },
  { id: 'wildflowers', label: 'Kır Çiçekleri', qrless: true, Component: Wildflowers },
  { id: 'ribbon', label: 'Yeşil Kurdele', qrless: true, Component: RibbonTable },
  { id: 'feast', label: 'Bahçe Şöleni', qrless: true, Component: GardenFeast },
  { id: 'meadow', label: 'Çiçek Tarlası', qrless: true, Component: Meadow },
  { id: 'clouds', label: 'Bulut Tarlası', qrless: true, Component: Clouds },
  { id: 'lights', label: 'Işıklar Altında', qrless: true, Component: StringLights },
]

export function getEntranceDesign(id) {
  return ENTRANCE_DESIGNS.find((d) => d.id === id) || ENTRANCE_DESIGNS[0]
}
