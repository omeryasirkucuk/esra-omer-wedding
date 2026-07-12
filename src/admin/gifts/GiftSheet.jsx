// The print-styled gift ledger sheet rendered off-screen and rasterized by
// giftExport (PNG / PDF). Fine-stationery look: serif headings, gold hairlines,
// ivory paper — deliberately not a dashboard table. Receives display-ready
// strings; all valuation/formatting happens in the panel via giftModel.
const IVORY = '#fbf7ee'
const INK = '#3d3a34'
const GOLD = '#b08d42'
const MUTED = '#8d8779'
const HAIRLINE = `1px solid ${GOLD}55`

export default function GiftSheet({ innerRef, title, rows, totals, ratesLine, generatedAt }) {
  return (
    <div
      ref={innerRef}
      style={{
        width: 800,
        background: IVORY,
        color: INK,
        padding: '48px 56px',
        fontFamily: "'Jost', sans-serif",
      }}
    >
      <p
        className="font-script"
        style={{ textAlign: 'center', fontSize: 44, color: GOLD, lineHeight: 1.2, margin: 0 }}
      >
        {title}
      </p>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: MUTED,
          margin: '6px 0 0',
        }}
      >
        Hediye Defteri · {generatedAt}
      </p>
      <div style={{ borderBottom: HAIRLINE, margin: '24px 0 0' }} />

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
        <thead>
          <tr>
            {['Kişi', 'Grup', 'Yakınlık', 'Hediye', 'Değer', 'Not'].map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: i >= 3 && i <= 4 ? 'right' : 'left',
                  padding: '10px 8px',
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: GOLD,
                  borderBottom: HAIRLINE,
                  fontWeight: 500,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={cell({ fontFamily: "'Cormorant Garamond', serif", fontSize: 16 })}>
                {r.name}
              </td>
              <td style={cell({ color: MUTED })}>{r.group}</td>
              <td style={cell({ color: MUTED })}>{r.side}</td>
              <td style={cell({ textAlign: 'right', whiteSpace: 'nowrap' })}>{r.gift}</td>
              <td style={cell({ textAlign: 'right', whiteSpace: 'nowrap' })}>{r.value}</td>
              <td style={cell({ color: MUTED, fontSize: 12 })}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: `1px solid ${GOLD}`, marginTop: 4, paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: MUTED }}>
            {totals.people} kişi · {totals.entries} hediye
          </span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24 }}>
            Toplam&nbsp;&nbsp;
            <strong style={{ color: GOLD, fontWeight: 600 }}>{totals.value}</strong>
          </span>
        </div>
        {ratesLine && (
          <p style={{ fontSize: 11, color: MUTED, margin: '10px 0 0', textAlign: 'right' }}>
            {ratesLine}
          </p>
        )}
      </div>
    </div>
  )
}

function cell(extra = {}) {
  return {
    padding: '9px 8px',
    borderBottom: `1px solid ${GOLD}22`,
    verticalAlign: 'top',
    ...extra,
  }
}
