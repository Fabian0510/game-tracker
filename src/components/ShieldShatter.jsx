export const SHATTER_DURATION = 1100

// Shatter geometry in card-percentage coordinates: spokes run from the impact point to fixed
// perimeter points (corners included, so neighbours always share an edge), with an inner ring
// of breaks. Fixed (not random) so renders stay pure.
const IMPACT = [50, 60]
const PERIMETER = [
  [0, 0], [35, 0], [70, 0], [100, 0], [100, 28], [100, 60],
  [100, 100], [62, 100], [28, 100], [0, 100], [0, 70], [0, 34],
]
const RING = PERIMETER.map(([x, y], i) => {
  const t = 0.3 + (i % 3) * 0.06
  return [IMPACT[0] + (x - IMPACT[0]) * t, IMPACT[1] + (y - IMPACT[1]) * t]
})

const TINTS = [
  'linear-gradient(135deg, rgba(207,250,254,0.55), rgba(34,211,238,0.28))',
  'linear-gradient(200deg, rgba(103,232,249,0.45), rgba(37,99,235,0.3))',
  'linear-gradient(90deg, rgba(165,243,252,0.5), rgba(8,145,178,0.32))',
]

const SHARDS = PERIMETER.flatMap((corner, i) => {
  const next = (i + 1) % PERIMETER.length
  return [
    { points: [IMPACT, RING[i], RING[next]], stagger: 0 },
    { points: [RING[i], corner, PERIMETER[next], RING[next]], stagger: 45 },
  ]
}).map(({ points, stagger }, k) => {
  const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length
  const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length
  const dirX = cx - IMPACT[0]
  const dirY = cy - IMPACT[1]
  const length = Math.hypot(dirX, dirY) || 1
  const push = 45 + (k % 4) * 20
  return {
    clipPath: `polygon(${points.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ')})`,
    transformOrigin: `${cx.toFixed(1)}% ${cy.toFixed(1)}%`,
    background: TINTS[k % TINTS.length],
    animationDelay: `${170 + stagger + (k % 3) * 25}ms`,
    '--shard-dx': `${Math.round((dirX / length) * push)}px`,
    '--shard-dy': `${Math.round((dirY / length) * push)}px`,
    '--shard-rot': `${(k % 2 ? 1 : -1) * (15 + (k % 5) * 12)}deg`,
  }
})

// The arcane barrier flashes over the card, cracks from the impact point, then breaks
// into glass shards that fly out and fall. Rendered in front of the card inside its
// `relative isolate` wrapper.
function ShieldShatter() {
  return (
    <div className="shatter-fx absolute inset-0 pointer-events-none" aria-hidden="true">
      {SHARDS.map((style, i) => (
        <div key={i} className="shatter-shard" style={style} />
      ))}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="shatter-cracks absolute inset-0 w-full h-full"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      >
        {PERIMETER.map(([x, y], i) => (
          <line key={i} x1={IMPACT[0]} y1={IMPACT[1]} x2={x} y2={y} vectorEffect="non-scaling-stroke" />
        ))}
        <polygon points={RING.map(point => point.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />
      </svg>
      <div
        className="shatter-shockwave absolute w-24 h-24 -ml-12 -mt-12 rounded-full border-2 border-cyan-200"
        style={{ left: `${IMPACT[0]}%`, top: `${IMPACT[1]}%` }}
      />
    </div>
  )
}

export default ShieldShatter
