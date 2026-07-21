// The value inputs of a gift form — the "Cinsi" (kind) select and the fields it
// switches between: a single "Tutar" for cash, or subtype + karat + piece count
// + grams for gold (karat and grams pre-fill per subtype but stay editable).
// Controlled: `values` holds the current form state and `onPatch` merges a
// partial change back. Shared by the add form (GiftForm) and the edit form
// (GiftEditForm) so the two never drift apart.
import Field from '../Field.jsx'
import {
  KIND_OPTIONS,
  GOLD_TYPE_OPTIONS,
  KARAT_OPTIONS,
  defaultGrams,
  defaultKarat,
} from './giftModel.js'

const INPUT_CLASS =
  'w-full box-border bg-bg border border-line rounded px-3 py-2 text-ink outline-none focus:border-gold'

export default function GiftValueFields({ values, onPatch }) {
  const gold = values.kind === 'gold'

  // Switching subtype re-seeds the customary karat and per-piece grams, which
  // the user can then override (bracelets/jewelry vary).
  function handleGoldTypeChange(goldType) {
    const grams = defaultGrams(goldType)
    onPatch({
      goldType,
      karat: String(defaultKarat(goldType)),
      grams: grams == null ? '' : String(grams),
    })
  }

  return (
    <>
      <Field label="Cinsi" className="w-full sm:w-28">
        <select
          value={values.kind}
          onChange={(e) => onPatch({ kind: e.target.value })}
          className={INPUT_CLASS}
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      {gold ? (
        <>
          <Field label="Tür" className="w-full sm:w-32">
            <select
              value={values.goldType}
              onChange={(e) => handleGoldTypeChange(e.target.value)}
              className={INPUT_CLASS}
            >
              {GOLD_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Ayar" className="w-full sm:w-28">
            <select
              value={values.karat}
              onChange={(e) => onPatch({ karat: e.target.value })}
              className={INPUT_CLASS}
            >
              {KARAT_OPTIONS.map((o) => (
                <option key={o.value} value={String(o.value)}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Adet" className="w-full sm:w-20">
            <input
              type="number"
              min="1"
              value={values.count}
              onChange={(e) => onPatch({ count: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Gram" className="w-full sm:w-24">
            <input
              type="number"
              min="0"
              step="any"
              value={values.grams}
              onChange={(e) => onPatch({ grams: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>
        </>
      ) : (
        <Field label="Tutar" className="w-full sm:w-32">
          <input
            type="number"
            min="0"
            step="any"
            value={values.amount}
            onChange={(e) => onPatch({ amount: e.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
      )}
    </>
  )
}
