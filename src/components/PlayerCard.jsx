import { useRef, useState, useEffect } from 'react'
import { describeChange, getHealthTier } from '../gameLogic'
import { fileToPortraitDataUrl, toPortraitDataUrl } from '../imageUtils'

const HEALTH_STYLES = {
  defeated: { color: 'from-gray-600 to-gray-800', glow: 'shadow-gray-900/50' },
  critical: { color: 'from-red-500 to-red-700', glow: 'shadow-red-500/50' },
  warning: { color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/50' },
  healthy: { color: 'from-emerald-400 to-green-600', glow: 'shadow-emerald-500/50' },
}

const EFFECT_STYLES = {
  damage: { card: 'animate-damage', flash: 'bg-red-500/30', text: 'text-red-500 text-5xl', duration: 600 },
  heal: { card: 'animate-heal', flash: 'bg-emerald-500/20', text: 'text-emerald-400 text-5xl', duration: 600 },
  'shield-break': { card: 'animate-shield-break', flash: 'bg-cyan-500/30', text: 'text-blue-400 text-5xl', duration: 600 },
  death: { card: 'animate-death', flash: 'bg-gray-900/60', text: 'text-gray-400 text-4xl', duration: 1000 },
}

const CARD_STYLES = {
  defeated: {
    card: 'bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 border-gray-600/50 opacity-70 grayscale',
    corner: 'border-gray-600/40',
  },
  shielded: {
    card: 'bg-gradient-to-b from-slate-800 to-slate-900 border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:shadow-[0_0_40px_rgba(34,211,238,0.8)]',
    corner: 'border-cyan-400/60',
  },
  normal: {
    card: 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-900/30 hover:border-amber-500/50',
    corner: 'border-amber-500/40',
  },
}

const CORNER_POSITIONS = [
  'top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl',
  'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl',
  'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl',
  'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl',
]

// Photo controls show on mouse hover, keyboard focus, or when toggled open by a tap (touch devices have no hover)
const HIDDEN_PHOTO_CONTROLS = 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-has-focus-visible:opacity-100 group-has-focus-visible:pointer-events-auto'

function describeCameraError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Camera permission was denied. Allow camera access in your browser settings, or use Upload instead.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device. Use Upload instead.'
    case 'NotReadableError':
      return 'The camera is in use by another app.'
    default:
      return 'Could not access camera. Please ensure camera permissions are granted.'
  }
}

function PlayerCard({ player, onRemove, onUpdate, onAdjustHealth, onAdjustShields }) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(player.name)
  const [effect, setEffect] = useState(null)
  const [prevStats, setPrevStats] = useState({ health: player.health, shields: player.shields })
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [photoError, setPhotoError] = useState(null)
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const cardRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)
  const photoAreaRef = useRef(null)
  const cancelNameEditRef = useRef(false)

  // Pick the effect to play whenever health/shields change (adjusting state during render, not in an effect)
  if (player.health !== prevStats.health || player.shields !== prevStats.shields) {
    const change = describeChange(prevStats, player)
    setPrevStats({ health: player.health, shields: player.shields })
    if (change) {
      setEffect({ ...change, id: (effect?.id ?? 0) + 1 })
    }
  }

  // Restart the card animation (so repeated hits shake again) and clear the effect once it finishes
  useEffect(() => {
    if (!effect) return

    cardRef.current?.getAnimations?.().forEach(animation => {
      if (animation.animationName) {
        animation.cancel()
        animation.play()
      }
    })

    const timer = setTimeout(() => setEffect(null), EFFECT_STYLES[effect.type].duration)
    return () => clearTimeout(timer)
  }, [effect])

  useEffect(() => {
    if (!isConfirmingRemove) return
    const timer = setTimeout(() => setIsConfirmingRemove(false), 3000)
    return () => clearTimeout(timer)
  }, [isConfirmingRemove])

  // Close the photo menu when tapping/clicking anywhere outside the portrait
  useEffect(() => {
    if (!isPhotoMenuOpen) return

    const handlePointerDown = (e) => {
      if (!photoAreaRef.current?.contains(e.target)) setIsPhotoMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isPhotoMenuOpen])

  // Camera stream lives exactly as long as the camera view is open (and the card is mounted)
  useEffect(() => {
    if (!isCameraOpen || !navigator.mediaDevices?.getUserMedia) return

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
          setCameraError(describeCameraError(err))
        }
      }
    }

    initCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [isCameraOpen])

  const startCamera = () => {
    setIsPhotoMenuOpen(false)
    setPhotoError(null)
    setCameraError(
      navigator.mediaDevices?.getUserMedia
        ? null
        : 'Camera access requires HTTPS (or localhost). Use Upload instead.'
    )
    setIsCameraOpen(true)
  }

  const stopCamera = () => {
    setIsCameraOpen(false)
    setCameraError(null)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('Video not ready yet')
      return
    }

    onUpdate({ photo: toPortraitDataUrl(video, video.videoWidth, video.videoHeight, { mirror: true }) })
    stopCamera()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    // Reset so choosing the same file again still triggers a change
    e.target.value = ''
    if (!file) return

    setIsPhotoMenuOpen(false)
    try {
      onUpdate({ photo: await fileToPortraitDataUrl(file) })
      setPhotoError(null)
    } catch (err) {
      console.error('Could not load image:', err)
      setPhotoError('That file could not be read as an image.')
    }
  }

  const startEditingName = () => {
    setNameInput(player.name)
    setIsEditingName(true)
  }

  const finishEditingName = () => {
    const name = nameInput.trim()
    if (!cancelNameEditRef.current && name) {
      onUpdate({ name })
    }
    cancelNameEditRef.current = false
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e) => {
    // Blur before unmounting the input, so the edit is committed (or cancelled) exactly once
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelNameEditRef.current = true
      e.currentTarget.blur()
    }
  }

  const tier = getHealthTier(player.health)
  const healthStyle = HEALTH_STYLES[tier]
  const cardStyle = CARD_STYLES[tier === 'defeated' ? 'defeated' : player.shields > 0 ? 'shielded' : 'normal']
  const effectStyle = effect && EFFECT_STYLES[effect.type]
  const photoControlsVisibility = isPhotoMenuOpen ? 'opacity-100' : HIDDEN_PHOTO_CONTROLS

  return (
    <div
      ref={cardRef}
      className={`relative rounded-2xl shadow-2xl overflow-hidden border-2 transition-all duration-300 ${effectStyle?.card ?? ''} ${cardStyle.card}`}
    >
      {/* Ornate corner decorations */}
      {CORNER_POSITIONS.map(position => (
        <div
          key={position}
          className={`absolute w-8 h-8 transition-colors duration-300 ${position} ${cardStyle.corner}`}
        />
      ))}

      {/* Floating damage/heal number - keyed so each new hit restarts the animation; centring comes from the float-up keyframes */}
      {effect && (
        <div
          key={`number-${effect.id}`}
          className={`absolute top-1/2 left-1/2 z-50 pointer-events-none animate-float-up whitespace-nowrap font-bold drop-shadow-[0_0_10px_currentColor] ${effectStyle.text}`}
        >
          {effect.label}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Photo Section */}
      <div
        ref={photoAreaRef}
        className="relative h-48 bg-gradient-to-br from-slate-700 to-slate-800 group"
        onClick={() => {
          if (!isCameraOpen) setIsPhotoMenuOpen(open => !open)
        }}
        onPointerLeave={(e) => {
          // Touch browsers fire compatibility mouse/pointer leaves right after a tap, so only a real mouse closes the menu here
          if (e.pointerType === 'mouse') setIsPhotoMenuOpen(false)
        }}
      >
        {isCameraOpen ? (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
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
                disabled={Boolean(cameraError)}
                className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-amber-950 font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">Add portrait photo</span>
          </div>
        )}

        {photoError && !isCameraOpen && (
          <p className="absolute top-0 left-0 right-0 bg-red-950/90 text-red-300 text-xs text-center py-1.5 px-10 pointer-events-none">
            {photoError}
          </p>
        )}

        {/* Photo options overlay */}
        {!isCameraOpen && (
          <div className={`absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center gap-3 p-4 ${photoControlsVisibility}`}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                startCamera()
              }}
              className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all flex items-center gap-2 shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Upload
            </button>
          </div>
        )}

        {/* Remove Button - first press asks for confirmation */}
        {!isCameraOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isConfirmingRemove) {
                onRemove()
              } else {
                setIsConfirmingRemove(true)
              }
            }}
            aria-label={isConfirmingRemove ? `Confirm removing ${player.name}` : `Remove ${player.name}`}
            className={`absolute top-2 right-2 bg-red-900/80 hover:bg-red-700 text-red-300 hover:text-white rounded-full transition-all border border-red-700 z-10 flex items-center gap-1 ${
              isConfirmingRemove ? 'opacity-100 py-1 px-3 text-sm font-bold' : `p-1.5 ${photoControlsVisibility}`
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            {isConfirmingRemove && 'Remove?'}
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
              onBlur={finishEditingName}
              onKeyDown={handleNameKeyDown}
              maxLength={30}
              aria-label="Player name"
              autoFocus
              className="w-full bg-slate-700 text-amber-100 text-xl font-bold px-3 py-2 rounded-lg border border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <h2 className="text-xl font-bold text-amber-100 tracking-wide">
              <button
                onClick={startEditingName}
                className="w-full text-left truncate cursor-pointer hover:text-amber-300 transition-colors"
                title="Click to edit name"
              >
                {player.name}
              </button>
            </h2>
          )}
        </div>

        {/* Health Section */}
        <div className="mb-4">
          <span className="text-amber-200/70 text-sm font-medium flex items-center justify-center gap-2 uppercase tracking-wider mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            Vitality
          </span>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => onAdjustHealth(1)}
              aria-label={`Heal ${player.name} by 1`}
              className="w-32 bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-emerald-100 font-bold py-2.5 px-3 rounded-lg transition-all border border-emerald-500/50 hover:border-emerald-400 shadow-lg hover:shadow-emerald-800/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">+1</span>
            </button>
            <div
              aria-label={`${player.name} vitality: ${player.health}`}
              className={`relative bg-gradient-to-r ${healthStyle.color} text-white text-6xl font-black px-8 py-4 rounded-xl shadow-2xl ${healthStyle.glow} min-w-[8rem] text-center border-4 border-white/20`}
            >
              <span className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">{player.health}</span>
              <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity" />
            </div>
            <button
              onClick={() => onAdjustHealth(-1)}
              aria-label={`Damage ${player.name} by 1`}
              className="w-32 bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-red-200 font-bold py-2.5 px-3 rounded-lg transition-all border border-red-600/50 hover:border-red-400 shadow-lg hover:shadow-red-800/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">-1</span>
            </button>
          </div>
        </div>

        {/* Shields Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-200/70 text-sm font-medium flex items-center gap-2 uppercase tracking-wider">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-cyan-400 ${player.shields > 0 ? 'animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
              </svg>
              Arcane Shield
            </span>
            <div
              aria-label={`${player.name} shields: ${player.shields}`}
              className={`relative bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-3xl font-bold px-4 py-1 rounded-lg min-w-[4rem] text-center ${player.shields > 0 ? 'shadow-lg shadow-cyan-500/50 animate-shield-glow' : 'opacity-50'}`}
            >
              <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{player.shields}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onAdjustShields(-1)}
              disabled={player.shields === 0}
              aria-label={`Remove 1 shield from ${player.name}`}
              className="flex-1 bg-gradient-to-b from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 text-slate-300 font-bold py-2.5 px-3 rounded-lg transition-all border border-slate-500/50 hover:border-slate-400 shadow-lg active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              -1
            </button>
            <button
              onClick={() => onAdjustShields(1)}
              aria-label={`Add 1 shield to ${player.name}`}
              className="flex-1 bg-gradient-to-b from-cyan-600 to-blue-800 hover:from-cyan-500 hover:to-blue-700 text-cyan-100 font-bold py-2.5 px-3 rounded-lg transition-all border border-cyan-500/50 hover:border-cyan-400 shadow-lg hover:shadow-cyan-800/50 active:scale-95"
            >
              <span className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">+1</span>
            </button>
            <button
              onClick={() => onAdjustShields(3)}
              aria-label={`Add 3 shields to ${player.name}`}
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

      {/* Screen flash overlay */}
      {effect && (
        <div key={`flash-${effect.id}`} className={`absolute inset-0 pointer-events-none animate-flash ${effectStyle.flash}`} />
      )}
    </div>
  )
}

export default PlayerCard
