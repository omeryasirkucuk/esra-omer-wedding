// The wedding mark: a floral arch with the couple silhouette and their cat.
// Used as the logo at the top of every page and as the favicon. Tapping it
// (when linkHome) navigates home.
//
// Sizing: pass a `size` (px) for a fixed size, or a width utility in
// `className` (e.g. "w-14 md:w-20") for a responsive logo. When className sets
// the width, the SVG fills it.
import { useNavigate } from 'react-router-dom'

export default function Emblem({ size = 52, tone = 'default', linkHome = false, className = '' }) {
  const navigate = useNavigate()
  const palette =
    tone === 'light'
      ? { arch: '#cdd2c4', flower: '#e7c2d1', fig: '#f0e9dd' }
      : { arch: '#8a9a7b', flower: '#b98ca0', fig: '#5b5048' }

  const usesClassWidth = /\bw-/.test(className)
  const style = usesClassWidth ? undefined : { width: size }

  const svg = (
    <svg viewBox="0 0 90 78" className="w-full h-auto block" aria-hidden="true">
      <path
        d="M18 74 Q19 40 31 26 Q45 12 59 26 Q71 40 72 74"
        fill="none"
        stroke={palette.arch}
        strokeWidth="1.7"
        opacity="0.75"
      />
      <g fill={palette.flower} opacity="0.9">
        <circle className="eo-flower" cx="31" cy="26" r="3" />
        <circle className="eo-flower" cx="37" cy="21" r="2.3" />
        <circle className="eo-flower" cx="59" cy="26" r="3" />
        <circle className="eo-flower" cx="53" cy="21" r="2.3" />
      </g>
      <g fill={palette.fig} opacity={tone === 'light' ? 1 : 0.88}>
        {/* couple silhouette — stays still */}
        <path d="M40 74 L40 50 Q40 44 44 43 L44 74 Z" />
        <path d="M50 74 L50 50 Q50 43 46 43 L46 74 Z" />
        <circle cx="42" cy="39" r="3.4" />
        <circle cx="48" cy="39" r="3.4" />
        {/* cat — breathes in place, tail flicks */}
        <g className="eo-cat">
          <path d="M62 74 C56 74 56 64 59 60 C61 57 65 57 66 60 C69 64 69 74 64 74 Z" />
          <circle cx="63.5" cy="57" r="3.4" />
          <path d="M60.8 55 L60 50 L64 53.5 Z" />
          <path d="M66.2 55 L67 50 L63 53.5 Z" />
          <path
            className="eo-tail"
            d="M57 73 C51 72 53 65 58 66.5"
            fill="none"
            stroke={palette.fig}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
      </g>
      {/* drifting rose petals — subtle on tiny logos, lovely on the big one */}
      <g fill="#c2a0b0">
        <ellipse className="eo-petal" cx="38" cy="24" rx="1.5" ry="2.2" style={{ '--eo-drift': '-5px', '--eo-fall': '54px', animationDelay: '0s', animationDuration: '6s' }} />
        <ellipse className="eo-petal" cx="52" cy="22" rx="1.3" ry="2" style={{ '--eo-drift': '6px', '--eo-fall': '56px', animationDelay: '2s', animationDuration: '6.8s' }} />
        <ellipse className="eo-petal" cx="45" cy="20" rx="1.4" ry="2.1" style={{ '--eo-drift': '2px', '--eo-fall': '58px', animationDelay: '4s', animationDuration: '7.2s' }} />
      </g>
      {/* gold sparkles near the crown */}
      <g fill="#c2a25c">
        <circle className="eo-sparkle" cx="45" cy="13" r="1.1" style={{ animationDelay: '0.3s' }} />
        <circle className="eo-sparkle" cx="35" cy="20" r="0.9" style={{ animationDelay: '1.4s' }} />
        <circle className="eo-sparkle" cx="56" cy="20" r="0.9" style={{ animationDelay: '2.1s' }} />
      </g>
    </svg>
  )

  if (linkHome) {
    return (
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Ana sayfa"
        style={style}
        className={`inline-flex items-center justify-center ${className}`}
      >
        {svg}
      </button>
    )
  }
  return (
    <span style={style} className={`inline-flex ${className}`}>
      {svg}
    </span>
  )
}
