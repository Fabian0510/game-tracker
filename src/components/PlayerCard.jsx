import { useRef, useState, useEffect, useCallback } from 'react'

function PlayerCard({ player, onRemove, onUpdate, onAdjustHealth, onAdjustShields }) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(player.name)
  const [healthAnimation, setHealthAnimation] = useState(null)
  const [floatingNumber, setFloatingNumber] = useState(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const prevHealthRef = useRef(player.health)
  const prevShieldsRef = useRef(player.shields)

  useEffect(() => {
    const healthDiff = player.health - prevHealthRef.current
    const shieldsDiff = player.shields - prevShieldsRef.current

    if (healthDiff < 0) {
      setHealthAnimation('damage')
      setFloatingNumber({ value: healthDiff, type: 'damage' })
    } else if (healthDiff > 0) {
      setHealthAnimation('heal')
      setFloatingNumber({ value: `+${healthDiff}`, type: 'heal' })
    } else if (shieldsDiff < 0 && prevShieldsRef.current > 0) {
      setHealthAnimation('shield-break')
      setFloatingNumber({ value: shieldsDiff, type: 'shield' })
    }

    prevHealthRef.current = player.health
    prevShieldsRef.current = player.shields

    if (healthDiff !== 0 || shieldsDiff < 0) {
      const timer = setTimeout(() => {
        setHealthAnimation(null)
        setFloatingNumber(null)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [player.health, player.shields])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setIsCameraOpen(true)
  }, [])

  // Set up video stream when camera opens
  useEffect(() => {
    if (!isCameraOpen) return

    let cancelled = false

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        })
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        console.error('Camera error:', err)
        if (!cancelled) {
          setCameraError('Could not access camera. Please ensure camera permissions are granted.')
        }
      }
    }

    initCamera()

    return () => {
      cancelled = true
    }
  }, [isCameraOpen])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
    setCameraError(null)
  }, [])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('Video not ready yet')
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')

      // Mirror the image horizontally to match the preview
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)

      const photoData = canvas.toDataURL('image/jpeg', 0.8)
      onUpdate({ photo: photoData })
      stopCamera()
    }
  }, [onUpdate, stopCamera])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onUpdate({ photo: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNameSubmit = () => {
    onUpdate({ name: nameInput || 'Player' })
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setNameInput(player.name)
      setIsEditingName(false)
    }
  }

  const getHealthColor = () => {
    if (player.health <= 0) return 'from-gray-600 to-gray-800'
    if (player.health <= 3) return 'from-red-500 to-red-700'
    if (player.health <= 6) return 'from-amber-500 to-orange-600'
    return 'from-emerald-400 to-green-600'
  }

  const getHealthGlow = () => {
    if (player.health <= 0) return 'shadow-gray-900/50'
    if (player.health <= 3) return 'shadow-red-500/50'
    if (player.health <= 6) return 'shadow-amber-500/50'
    return 'shadow-emerald-500/50'
  }

  const getAnimationClass = () => {
    if (healthAnimation === 'damage') return 'animate-damage'
    if (healthAnimation === 'heal') return 'animate-heal'
    if (healthAnimation === 'shield-break') return 'animate-shield-break'
    return ''
  }

  return (
    <div className={`relative bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-900/30 hover:border-amber-500/50 transition-all duration-300 ${getAnimationClass()}`}>
      {/* Ornate corner decorations */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500/40 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500/40 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500/40 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500/40 rounded-br-2xl" />

      {/* Floating damage/heal number */}
      {floatingNumber && (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-float-up
          ${floatingNumber.type === 'damage' ? 'text-red-500' : floatingNumber.type === 'heal' ? 'text-emerald-400' : 'text-blue-400'}
          text-5xl font-bold drop-shadow-[0_0_10px_currentColor]`}
        >
          {floatingNumber.value}
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Photo Section */}
      <div className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800 group">
        {isCameraOpen ? (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-4">
                <p className="text-red-400 text-sm text-center">{cameraError}</p>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-2 bg-gradient-to-t from-black/80 to-transparent">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  capturePhoto()
                }}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-amber-950 font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Capture
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  stopCamera()
                }}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : player.photo ? (
          <img
            src={player.photo}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-amber-400 transition-colors pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">Add portrait photo</span>
          </div>
        )}

        {/* Photo options overlay */}
        {!isCameraOpen && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                startCamera()
              }}
              className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Camera
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload
            </button>
          </div>
        )}

        {/* Remove Button */}
        {!isCameraOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="absolute top-2 right-2 bg-red-900/80 hover:bg-red-700 text-red-300 hover:text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all border border-red-700 z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Player Info */}
      <div className="p-4">
        {/* Name Section */}
        <div className="mb-4">
          {isEditingName ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              autoFocus
              className="w-full bg-slate-700 text-amber-100 text-xl font-bold px-3 py-2 rounded-lg border border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <h2
              onClick={() => setIsEditingName(true)}
              className="text-xl font-bold text-amber-100 cursor-pointer hover:text-amber-300 transition-colors truncate tracking-wide"
              title="Click to edit name"
            >
              {player.name}
            </h2>
          )}
        </div>

        {/* Health Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-200/70 text-sm font-medium flex items-center gap-2 uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Vitality
            </span>
            <div className={`relative bg-gradient-to-r ${getHealthColor()} text-white text-3xl font-bold px-4 py-1 rounded-lg shadow-lg ${getHealthGlow()} min-w-[4rem] text-center`}>
              <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{player.health}</span>
              <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onAdjustHealth(-5)}
              className="flex-1 bg-gradient-to-b from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 text-red-200 font-bold py-2.5 px-3 rounded-lg transition-all border border-red-700/50 hover:border-red-500 shadow-lg hover:shadow-red-900/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">-5</span>
            </button>
            <button
              onClick={() => onAdjustHealth(-1)}
              className="flex-1 bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-200 font-bold py-2.5 px-3 rounded-lg transition-all border border-red-600/50 hover:border-red-400 shadow-lg hover:shadow-red-800/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">-1</span>
            </button>
            <button
              onClick={() => onAdjustHealth(1)}
              className="flex-1 bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-emerald-100 font-bold py-2.5 px-3 rounded-lg transition-all border border-emerald-500/50 hover:border-emerald-400 shadow-lg hover:shadow-emerald-800/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">+1</span>
            </button>
            <button
              onClick={() => onAdjustHealth(5)}
              className="flex-1 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-emerald-100 font-bold py-2.5 px-3 rounded-lg transition-all border border-emerald-400/50 hover:border-emerald-300 shadow-lg hover:shadow-emerald-700/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">+5</span>
            </button>
          </div>
        </div>

        {/* Shields Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-200/70 text-sm font-medium flex items-center gap-2 uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-cyan-400 ${player.shields > 0 ? 'animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
              </svg>
              Arcane Shield
            </span>
            <div className={`relative bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-3xl font-bold px-4 py-1 rounded-lg min-w-[4rem] text-center ${player.shields > 0 ? 'shadow-lg shadow-cyan-500/50 animate-shield-glow' : 'opacity-50'}`}>
              <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{player.shields}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onAdjustShields(-1)}
              className="flex-1 bg-gradient-to-b from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 text-slate-300 font-bold py-2.5 px-3 rounded-lg transition-all border border-slate-500/50 hover:border-slate-400 shadow-lg active:scale-95"
            >
              -1
            </button>
            <button
              onClick={() => onAdjustShields(1)}
              className="flex-1 bg-gradient-to-b from-cyan-600 to-blue-800 hover:from-cyan-500 hover:to-blue-700 text-cyan-100 font-bold py-2.5 px-3 rounded-lg transition-all border border-cyan-500/50 hover:border-cyan-400 shadow-lg hover:shadow-cyan-800/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">+1</span>
            </button>
            <button
              onClick={() => onAdjustShields(3)}
              className="flex-1 bg-gradient-to-b from-cyan-500 to-blue-700 hover:from-cyan-400 hover:to-blue-600 text-cyan-100 font-bold py-2.5 px-3 rounded-lg transition-all border border-cyan-400/50 hover:border-cyan-300 shadow-lg hover:shadow-cyan-700/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">+3</span>
            </button>
          </div>
          {player.shields > 0 && (
            <p className="text-xs text-cyan-400/60 mt-2 text-center italic">
              Magical barrier absorbs damage
            </p>
          )}
        </div>
      </div>

      {/* Damage overlay flash */}
      {healthAnimation === 'damage' && (
        <div className="absolute inset-0 bg-red-500/30 pointer-events-none animate-flash" />
      )}
      {healthAnimation === 'heal' && (
        <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none animate-flash" />
      )}
      {healthAnimation === 'shield-break' && (
        <div className="absolute inset-0 bg-cyan-500/30 pointer-events-none animate-flash" />
      )}
    </div>
  )
}

export default PlayerCard
