import { useEffect, useState } from 'react'
import PlayerCard from './components/PlayerCard'
import { Divider, MagicCircle } from './components/Ornaments'
import {
  applyHealthChange,
  applyShieldChange,
  createPlayer,
  nextPlayerId,
  resetPlayer,
} from './gameLogic'
import { loadPlayers, savePlayers } from './storage'

// Fixed (not random) so renders stay pure and the drift looks the same on every load
const EMBERS = [
  { left: '4%', size: 3, duration: '17s', delay: '0s', drift: '40px' },
  { left: '11%', size: 2, duration: '22s', delay: '6s', drift: '-30px' },
  { left: '19%', size: 4, duration: '19s', delay: '11s', drift: '25px' },
  { left: '27%', size: 2, duration: '25s', delay: '3s', drift: '-45px' },
  { left: '35%', size: 3, duration: '20s', delay: '14s', drift: '35px' },
  { left: '44%', size: 2, duration: '23s', delay: '8s', drift: '-20px' },
  { left: '52%', size: 3, duration: '18s', delay: '1s', drift: '50px' },
  { left: '60%', size: 2, duration: '26s', delay: '16s', drift: '-35px' },
  { left: '68%', size: 4, duration: '21s', delay: '5s', drift: '30px' },
  { left: '76%', size: 2, duration: '24s', delay: '12s', drift: '-50px' },
  { left: '84%', size: 3, duration: '19s', delay: '9s', drift: '20px' },
  { left: '92%', size: 2, duration: '22s', delay: '2s', drift: '-25px' },
]

function App() {
  const [players, setPlayers] = useState(() => loadPlayers() ?? [createPlayer(1)])

  useEffect(() => {
    savePlayers(players)
  }, [players])

  const addPlayer = () => {
    setPlayers(prev => [...prev, createPlayer(nextPlayerId(prev))])
  }

  const removePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const updatePlayer = (id, updates) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  const adjustHealth = (id, amount) => {
    setPlayers(prev => prev.map(p => (p.id === id ? applyHealthChange(p, amount) : p)))
  }

  const adjustShields = (id, amount) => {
    setPlayers(prev => prev.map(p => (p.id === id ? applyShieldChange(p, amount) : p)))
  }

  const startNewGame = () => {
    if (window.confirm('Start a new game? Every hero is restored to full vitality and loses their shields.')) {
      setPlayers(prev => prev.map(resetPlayer))
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#2a1640_0%,#140b1f_45%,#07050b_100%)] relative overflow-hidden">
      {/* Ambient layer: magic circle, glows, embers, vignette */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-[-18rem] -translate-x-1/2 w-[min(1100px,160vw)] aspect-square text-amber-300/[0.08]">
          <MagicCircle className="w-full h-full animate-spin-slow" />
        </div>
        <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/5 right-1/5 w-96 h-96 bg-amber-500/[0.06] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        {EMBERS.map((ember, i) => (
          <span
            key={i}
            className="ember"
            style={{
              left: ember.left,
              width: ember.size,
              height: ember.size,
              animationDuration: ember.duration,
              animationDelay: ember.delay,
              '--ember-drift': ember.drift,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-grain opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      <div className="container mx-auto px-4 py-10 relative z-10">
        <header className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-wide bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(251,191,36,0.35)]">
            Realm Tracker
          </h1>
          <Divider className="w-72 max-w-full h-4 mx-auto mt-4 text-amber-500/70" />
          <p className="text-amber-100/70 text-xl italic mt-3">Chronicle the vitality of heroes and villains</p>
        </header>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <button
            onClick={addPlayer}
            className="font-heading uppercase tracking-[0.18em] text-sm font-bold text-amber-950 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 hover:from-amber-100 hover:via-amber-300 hover:to-amber-600 py-3 px-7 rounded-md border border-amber-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_0_24px_rgba(251,191,36,0.25)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_0_32px_rgba(251,191,36,0.45)] transition-all duration-300 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 1l2.2 6.8L19 10l-6.8 2.2L10 19l-2.2-6.8L1 10l6.8-2.2z" />
            </svg>
            Summon Hero
          </button>
          {players.length > 0 && (
            <button
              onClick={startNewGame}
              className="font-heading uppercase tracking-[0.18em] text-sm font-bold text-amber-200 bg-gradient-to-b from-[#2a1a33] to-[#130c19] hover:from-[#352042] py-3 px-6 rounded-md border border-amber-500/40 hover:border-amber-400/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_14px_rgba(0,0,0,0.5)] transition-all duration-300 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              New Game
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onRemove={() => removePlayer(player.id)}
              onUpdate={(updates) => updatePlayer(player.id, updates)}
              onAdjustHealth={(amount) => adjustHealth(player.id, amount)}
              onAdjustShields={(amount) => adjustShields(player.id, amount)}
            />
          ))}
        </div>

        {players.length === 0 && (
          <div className="text-center py-16">
            <p className="text-amber-100/60 text-2xl italic">The realm awaits its champions...</p>
            <Divider className="w-48 h-4 mx-auto mt-4 text-amber-500/40" />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
