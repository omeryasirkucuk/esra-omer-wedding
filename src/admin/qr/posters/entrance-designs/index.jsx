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
import ChampagneFeast from './ChampagneFeast'
import Meadow from './Meadow'
import Clouds from './Clouds'
import StringLights from './StringLights'

// Adapter so the existing QR poster fits the shared prop bag (it expects
// `eyebrow` for the date line).
const Classic = forwardRef(function Classic(props, ref) {
  return <EntrancePoster ref={ref} {...props} eyebrow={props.dateText} />
})

// `swatch` is the design's own base background, used only to paint the "Mevcut"
// chip in the background-colour picker (each Component still owns its inline
// default; this is just the picker preview, so the small duplication is fine).
export const ENTRANCE_DESIGNS = [
  { id: 'classic', label: 'Klasik · QR', qrless: false, Component: Classic, swatch: '#fbf7ee' },
  { id: 'wildflowers', label: 'Kır Çiçekleri', qrless: true, Component: Wildflowers, swatch: '#fbf7ee' },
  { id: 'ribbon', label: 'Yeşil Kurdele', qrless: true, Component: RibbonTable, swatch: '#f7f1e4' },
  { id: 'feast', label: 'Bahçe Şöleni', qrless: true, Component: GardenFeast, swatch: '#f7f1e4' },
  { id: 'champagne', label: 'Şampanya Şöleni', qrless: true, Component: ChampagneFeast, swatch: '#f7f1e4' },
  { id: 'meadow', label: 'Çiçek Tarlası', qrless: true, Component: Meadow, swatch: '#cfe1e8' },
  { id: 'clouds', label: 'Bulut Tarlası', qrless: true, Component: Clouds, swatch: '#bdd5e1' },
  { id: 'lights', label: 'Işıklar Altında', qrless: true, Component: StringLights, swatch: '#f8f3e8' },
]

export function getEntranceDesign(id) {
  return ENTRANCE_DESIGNS.find((d) => d.id === id) || ENTRANCE_DESIGNS[0]
}
