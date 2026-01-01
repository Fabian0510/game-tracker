import { useState } from 'react'
import PlayerCard from './components/PlayerCard'

function App() {
  const [players, setPlayers] = useState([
    { id: 1, name: 'Player 1', health: 10, shields: 0, photo: null }
  ])

  const addPlayer = () => {
    const newId = Math.max(0, ...players.map(p => p.id)) + 1
    setPlayers([...players, {
      id: newId,
      name: `Player ${newId}`,
      health: 10,
      shields: 0,
      photo: null
    }])
  }

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id))
  }

  const updatePlayer = (id, updates) => {
    setPlayers(players.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ))
  }

  const adjustHealth = (id, amount) => {
    setPlayers(players.map(p => {
      if (p.id !== id) return p

      if (amount < 0) {
        // Taking damage - shields absorb first
        let damage = Math.abs(amount)
        let newShields = p.shields
        let newHealth = p.health

        if (newShields > 0) {
          const shieldDamage = Math.min(newShields, damage)
          newShields -= shieldDamage
          damage -= shieldDamage
        }

        newHealth -= damage

        return { ...p, health: newHealth, shields: newShields }
      } else {
        // Healing
        return { ...p, health: p.health + amount }
      }
    }))
  }

  const adjustShields = (id, amount) => {
    setPlayers(players.map(p => {
      if (p.id !== id) return p
      const newShields = Math.max(0, p.shields + amount)
      return { ...p, shields: newShields }
    }))
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

        <div className="flex justify-center mb-10">
          <button
            onClick={addPlayer}
            className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-amber-950 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all duration-300 flex items-center gap-2 border border-amber-400/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Summon Hero
          </button>
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
