import { useEffect, useState } from 'react'
import PlayerCard from './components/PlayerCard'
import {
  applyHealthChange,
  applyShieldChange,
  createPlayer,
  nextPlayerId,
  resetPlayer,
} from './gameLogic'
import { loadPlayers, savePlayers } from './storage'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Ambient magical particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-3 tracking-wide bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            Realm Tracker
          </h1>
          <p className="text-purple-300/80 text-lg italic">Chronicle the vitality of heroes and villains</p>
        </header>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={addPlayer}
            className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-amber-950 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all duration-300 flex items-center gap-2 border border-amber-400/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Summon Hero
          </button>
          {players.length > 0 && (
            <button
              onClick={startNewGame}
              className="bg-slate-800/80 hover:bg-slate-700 text-purple-200 font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 border border-purple-400/30 hover:border-purple-300/60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              New Game
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <p className="text-purple-300/70 text-lg italic">The realm awaits its champions...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
