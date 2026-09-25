import { MagicCircle } from './Ornaments'

export const SUMMON_DURATION = 1500

// Fixed burst pattern (not random) so renders stay pure
const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * 2 * Math.PI + (i % 2 ? 0.18 : -0.12)
  const distance = 150 + (i % 3) * 55
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance)}px`,
    delay: `${420 + (i % 4) * 45}ms`,
    size: 4 + (i % 3) * 1.5,
  }
})

// Rendered inside the card's `relative isolate` wrapper, after the card itself:
// the circle sits behind the card (-z-10), the light pillar and sparks in front.
function SummonEffect() {
  return (
    <div className="summon-fx absolute inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-summon-circle">
        <MagicCircle className="w-full h-full" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -top-[8%] -bottom-[8%] w-28 bg-gradient-to-b from-transparent via-amber-100/70 to-transparent blur-xl mix-blend-screen animate-summon-beam" />
      {SPARKS.map((spark, i) => (
        <span
          key={i}
          className="summon-spark"
          style={{
            width: spark.size,
            height: spark.size,
            animationDelay: spark.delay,
            '--spark-dx': spark.dx,
            '--spark-dy': spark.dy,
          }}
        />
      ))}
    </div>
  )
}

export default SummonEffect
