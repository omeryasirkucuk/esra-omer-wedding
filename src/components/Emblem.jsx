// The wedding mark: a floral arch with the couple silhouette and their cat.
// Used as the logo at the top of every page and as the favicon. Tapping it
// (when `to` is set) navigates home.
import { useNavigate } from 'react-router-dom'

export default function Emblem({ size = 52, tone = 'default', linkHome = false, className = '' }) {
  const navigate = useNavigate()
  const palette =
    tone === 'light'
      ? { arch: '#cdd2c4', flower: '#e7c2d1', fig: '#f0e9dd' }
      : { arch: '#8a9a7b', flower: '#b98ca0', fig: '#5b5048' }

  const svg = (
    <svg viewBox="0 0 90 78" width={size} height={size * 0.86} aria-hidden="true">
      <path
        d="M18 74 Q19 40 31 26 Q45 12 59 26 Q71 40 72 74"
        fill="none"
        stroke={palette.arch}
        strokeWidth="1.7"
        opacity="0.75"
      />
      <g fill={palette.flower} opacity="0.9">
        <circle cx="31" cy="26" r="3" />
        <circle cx="37" cy="21" r="2.3" />
        <circle cx="59" cy="26" r="3" />
        <circle cx="53" cy="21" r="2.3" />
      </g>
      <g fill={palette.fig} opacity={tone === 'light' ? 1 : 0.88}>
        <path d="M40 74 L40 50 Q40 44 44 43 L44 74 Z" />
        <path d="M50 74 L50 50 Q50 43 46 43 L46 74 Z" />
        <circle cx="42" cy="39" r="3.4" />
        <circle cx="48" cy="39" r="3.4" />
        <path d="M62 74 C56 74 56 64 59 60 C61 57 65 57 66 60 C69 64 69 74 64 74 Z" />
        <circle cx="63.5" cy="57" r="3.4" />
        <path d="M60.8 55 L60 50 L64 53.5 Z" />
        <path d="M66.2 55 L67 50 L63 53.5 Z" />
        <path
          d="M57 73 C51 72 53 65 58 66.5"
          fill="none"
          stroke={palette.fig}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )

  if (linkHome) {
    return (
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Ana sayfa"
        className={`inline-flex items-center justify-center ${className}`}
      >
        {svg}
      </button>
    )
  }
  return <span className={`inline-flex ${className}`}>{svg}</span>
}
