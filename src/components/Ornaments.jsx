import { useId } from 'react'

// Decorative SVGs. All use currentColor, so tint them with a text-* class.

export function CornerFiligree({ className = '' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M3 34V10a7 7 0 0 1 7-7h24" strokeWidth="1.5" />
      <path d="M9 24v-9a6 6 0 0 1 6-6h9" strokeWidth="1" opacity="0.7" />
      <path d="M34 3c5 0 7.5 3.5 5 7-1.8 2.5-5.2 1.2-4.2-1.2" strokeWidth="1.2" />
      <path d="M3 34c0 5 3.5 7.5 7 5 2.5-1.8 1.2-5.2-1.2-4.2" strokeWidth="1.2" />
      <path d="M15 11l4 4-4 4-4-4z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Divider({ className = '' }) {
  const fadeId = useId()
  return (
    <svg viewBox="0 0 240 16" className={className} fill="none" aria-hidden="true">
      <defs>
        {/* userSpaceOnUse: a bounding-box gradient cannot paint a zero-height line */}
        <linearGradient id={fadeId} gradientUnits="userSpaceOnUse" x1="0" x2="240" y1="8" y2="8">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.35" stopColor="currentColor" />
          <stop offset="0.65" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 8h103M137 8h103" stroke={`url(#${fadeId})`} strokeWidth="1" />
      <path d="M120 1l7 7-7 7-7-7z" fill="currentColor" />
      <path d="M107 8l3-3 3 3-3 3zM127 8l3-3 3 3-3 3z" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

export function ShieldEmblem({ active, className = '' }) {
  const fillId = useId()
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={active ? '#67e8f9' : '#57534e'} />
          <stop offset="0.55" stopColor={active ? '#0891b2' : '#3f3a45'} />
          <stop offset="1" stopColor={active ? '#1e3a8a' : '#1c1622'} />
        </linearGradient>
      </defs>
      <path
        d="M20 2l17 6v14c0 12-8 20-17 24C11 42 3 34 3 22V8z"
        fill={`url(#${fillId})`}
        stroke={active ? '#a5f3fc' : '#a8a29e'}
        strokeOpacity={active ? 0.9 : 0.4}
        strokeWidth="1.5"
      />
      <path d="M20 6l13 4.6V22c0 9.6-6.2 16-13 19.4C13.2 38 7 31.6 7 22V10.6z" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.8" />
    </svg>
  )
}

// Heptagram and rune-ring geometry, computed once
const STAR_POINTS = Array.from({ length: 7 }, (_, i) => {
  const angle = (((i * 3) % 7) * 2 * Math.PI) / 7 - Math.PI / 2
  return `${(70 * Math.cos(angle)).toFixed(2)},${(70 * Math.sin(angle)).toFixed(2)}`
}).join(' ')

const STAR_VERTICES = Array.from({ length: 7 }, (_, i) => {
  const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
  return [70 * Math.cos(angle), 70 * Math.sin(angle)]
})

const RING_TICKS = Array.from({ length: 56 }, (_, i) => {
  const angle = (i * 2 * Math.PI) / 56
  const inner = i % 4 === 0 ? 84 : 88
  return [inner * Math.cos(angle), inner * Math.sin(angle), 92 * Math.cos(angle), 92 * Math.sin(angle)]
})

export function MagicCircle({ className = '' }) {
  return (
    <svg viewBox="-100 -100 200 200" className={className} fill="none" stroke="currentColor" aria-hidden="true">
      <circle r="98" strokeWidth="0.6" />
      <circle r="92" strokeWidth="0.4" />
      {RING_TICKS.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.4" />
      ))}
      <circle r="80" strokeWidth="0.4" strokeDasharray="1 3" />
      <circle r="70" strokeWidth="0.5" />
      <polygon points={STAR_POINTS} strokeWidth="0.5" />
      {STAR_VERTICES.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" strokeWidth="0.5" />
      ))}
      <circle r="30" strokeWidth="0.5" />
      <circle r="26" strokeWidth="0.3" strokeDasharray="2 2" />
    </svg>
  )
}
