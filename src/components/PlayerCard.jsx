import { useRef, useState, useEffect } from 'react'
import { describeChange, getHealthTier, isShieldShattered } from '../gameLogic'
import { fileToPortraitDataUrl, toPortraitDataUrl } from '../imageUtils'
import { CornerFiligree, Divider, ShieldEmblem } from './Ornaments'
import SummonEffect, { SUMMON_DURATION } from './SummonEffect'
import ShieldShatter, { SHATTER_DURATION } from './ShieldShatter'

// Vitality gem colouring per health tier (thresholds live in gameLogic.getHealthTier)
const HEALTH_STYLES = {
  defeated: { gem: 'from-stone-400 via-stone-600 to-stone-900', glow: 'shadow-[0_0_24px_rgba(0,0,0,0.6)]' },
  critical: { gem: 'from-red-400 via-red-600 to-red-950', glow: 'shadow-[0_0_28px_rgba(239,68,68,0.55)]' },
  warning: { gem: 'from-amber-300 via-orange-500 to-orange-950', glow: 'shadow-[0_0_28px_rgba(245,158,11,0.5)]' },
  healthy: { gem: 'from-emerald-300 via-emerald-600 to-emerald-950', glow: 'shadow-[0_0_28px_rgba(16,185,129,0.5)]' },
}

const EFFECT_STYLES = {
  damage: { card: 'animate-damage', flash: 'bg-red-500/30', text: 'font-body text-red-500 text-6xl', duration: 600 },
  heal: { card: 'animate-heal', flash: 'bg-emerald-500/20', text: 'font-body text-emerald-400 text-6xl', duration: 600 },
  'shield-break': { card: 'animate-shield-break', flash: 'bg-cyan-500/30', text: 'font-body text-cyan-300 text-6xl', duration: 600 },
  shatter: { card: 'animate-shield-break', flash: 'bg-cyan-400/35', text: 'font-heading text-cyan-200 text-3xl', duration: 1000 },
  death: { card: 'animate-death', flash: 'bg-gray-900/60', text: 'font-heading text-stone-300 text-4xl', duration: 1000 },
}

// frame: card border/glow, trim: filigree + inner rule colour, portrait: portrait frame border
const CARD_STYLES = {
  defeated: {
    frame: 'border-stone-600/50 opacity-75 grayscale',
    trim: 'text-stone-500/70',
    portrait: 'border-stone-600/60',
  },
  shielded: {
    frame: 'border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.45)] hover:shadow-[0_0_40px_rgba(34,211,238,0.7)]',
    trim: 'text-cyan-300/80',
    portrait: 'border-cyan-300/60',
  },
  normal: {
    frame: 'border-amber-700/60 shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:border-amber-500/70',
    trim: 'text-amber-400/80',
    portrait: 'border-amber-500/60',
  },
}

const CORNER_POSITIONS = [
  'top-1 left-1',
  'top-1 right-1 -scale-x-100',
  'bottom-1 left-1 -scale-y-100',
  'bottom-1 right-1 rotate-180',
]

const SECTION_LABEL = 'font-heading text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/70 flex items-center gap-2'

// Shared look for the engraved +/- buttons
// Cinzel's numeral 1 reads as a capital I, so numbers use Cormorant Garamond lining figures
const STEP_BUTTON = 'font-body font-bold lining-nums text-xl leading-none py-2 px-3 rounded-md border transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_3px_8px_rgba(0,0,0,0.5)] active:scale-95'

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

function PlayerCard({ player, summoned = false, onRemove, onUpdate, onAdjustHealth, onAdjustShields }) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(player.name)
  const [effect, setEffect] = useState(null)
  const [prevStats, setPrevStats] = useState({ health: player.health, shields: player.shields })
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [photoError, setPhotoError] = useState(null)
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  // Only read on mount: a freshly summoned card plays its entrance once
  const [isSummoning, setIsSummoning] = useState(summoned)
  const [shatterId, setShatterId] = useState(null)
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
    // Separate from `effect` so the barrier still shatters when the same hit also damages health
    if (isShieldShattered(prevStats, player)) {
      setShatterId((shatterId ?? 0) + 1)
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
    if (!shatterId) return
    const timer = setTimeout(() => setShatterId(null), SHATTER_DURATION)
    return () => clearTimeout(timer)
  }, [shatterId])

  // Bring a newly summoned hero into view (it's often below the fold on phones) and end the entrance afterwards
  useEffect(() => {
    if (!isSummoning) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    cardRef.current?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })

    const timer = setTimeout(() => setIsSummoning(false), SUMMON_DURATION)
    return () => clearTimeout(timer)
  }, [isSummoning])

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

  const cardAnimation = effectStyle?.card ?? (isSummoning ? 'animate-summon' : '')

  return (
    <div className="relative isolate">
      <div
        ref={cardRef}
        className={`relative h-full rounded-2xl border-2 bg-gradient-to-b from-[#261b30] via-[#18111f] to-[#0e0a13] transition-all duration-300 ${cardAnimation} ${cardStyle.frame}`}
      >
        {/* Texture, inner gilt rule and corner filigree */}
        <div className="absolute inset-0 rounded-2xl bg-grain opacity-[0.12] pointer-events-none" />
        <div className={`absolute inset-1.5 rounded-xl border border-current opacity-30 pointer-events-none transition-colors duration-300 ${cardStyle.trim}`} />
        {CORNER_POSITIONS.map(position => (
          <CornerFiligree
            key={position}
            className={`absolute w-10 h-10 pointer-events-none transition-colors duration-300 ${position} ${cardStyle.trim}`}
          />
        ))}

        {/* Floating damage/heal number - keyed so each new hit restarts the animation; centring comes from the float-up keyframes */}
        {effect && (
          <div
            key={`number-${effect.id}`}
            className={`absolute top-1/2 left-1/2 z-50 pointer-events-none animate-float-up whitespace-nowrap font-bold lining-nums drop-shadow-[0_0_10px_currentColor] ${effectStyle.text}`}
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

        <div className="relative px-5 pt-5 pb-5">
          {/* Portrait Section - arched frame */}
          <div
            ref={photoAreaRef}
            className="relative h-52 group"
            onClick={() => {
              if (!isCameraOpen) setIsPhotoMenuOpen(open => !open)
            }}
            onPointerLeave={(e) => {
              // Touch browsers fire compatibility mouse/pointer leaves right after a tap, so only a real mouse closes the menu here
              if (e.pointerType === 'mouse') setIsPhotoMenuOpen(false)
            }}
          >
            <div className={`absolute inset-0 overflow-hidden rounded-t-[50%_32%] rounded-b-lg border-2 bg-gradient-to-b from-[#2d2238] to-[#120d18] shadow-[inset_0_0_30px_rgba(0,0,0,0.85)] transition-colors duration-300 ${cardStyle.portrait}`}>
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
                    <div className="absolute inset-0 flex items-center justify-center bg-[#120d18]/95 p-6 pt-10">
                      <p className="text-red-300 text-base italic text-center">{cameraError}</p>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-2 bg-gradient-to-t from-black/85 to-transparent">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        capturePhoto()
                      }}
                      disabled={Boolean(cameraError)}
                      className="flex-1 font-heading uppercase tracking-wider text-xs bg-gradient-to-b from-amber-300 to-amber-600 hover:from-amber-200 hover:to-amber-500 text-amber-950 font-bold py-2 px-3 rounded-md border border-amber-200/60 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      Capture
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        stopCamera()
                      }}
                      className="font-heading uppercase tracking-wider text-xs bg-[#241a2e] hover:bg-[#33253f] text-amber-100 font-bold py-2 px-3 rounded-md border border-amber-500/30 transition-all"
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
                <div className="w-full h-full flex flex-col items-center justify-center pt-6 text-amber-200/30 group-hover:text-amber-300/80 transition-colors pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.5c-3 0-5 2.6-5 5.8 0 2.4 1.2 4.4 3 5.3-3.9.8-6.5 3.6-7 7.9h18c-.5-4.3-3.1-7.1-7-7.9 1.8-.9 3-2.9 3-5.3 0-3.2-2-5.8-5-5.8z" />
                  </svg>
                  <span className="font-heading text-xs uppercase tracking-[0.25em]">Add a portrait</span>
                </div>
              )}

              {tier === 'defeated' && !isCameraOpen && (
                <div className="absolute inset-x-0 bottom-0 py-1.5 bg-gradient-to-t from-black/90 to-black/40 text-center font-heading text-sm font-bold uppercase tracking-[0.5em] text-stone-300 pointer-events-none">
                  Fallen
                </div>
              )}

              {photoError && !isCameraOpen && (
                <p className="absolute top-10 inset-x-4 rounded bg-red-950/90 border border-red-800/60 text-red-200 text-sm italic text-center py-1.5 px-3 pointer-events-none">
                  {photoError}
                </p>
              )}

              {/* Photo options overlay */}
              {!isCameraOpen && (
                <div className={`absolute inset-0 bg-black/65 transition-opacity flex flex-col items-center justify-center gap-2.5 p-4 pt-8 ${photoControlsVisibility}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startCamera()
                    }}
                    className="font-heading uppercase tracking-wider text-xs bg-gradient-to-b from-cyan-500 to-blue-800 hover:from-cyan-400 hover:to-blue-700 text-white font-bold py-2.5 w-36 rounded-md border border-cyan-300/50 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Camera
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      fileInputRef.current?.click()
                    }}
                    className="font-heading uppercase tracking-wider text-xs bg-gradient-to-b from-amber-300 to-amber-600 hover:from-amber-200 hover:to-amber-500 text-amber-950 font-bold py-2.5 w-36 rounded-md border border-amber-200/60 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    Upload
                  </button>
                </div>
              )}
            </div>

            {/* Remove Button - sits in the corner beside the arch; first press asks for confirmation */}
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
                className={`absolute top-0 right-0 bg-red-950/90 hover:bg-red-800 text-red-300 hover:text-white rounded-full transition-all border border-red-700/80 z-20 flex items-center gap-1 ${
                  isConfirmingRemove ? 'opacity-100 py-1 px-3 font-heading text-xs font-bold uppercase tracking-wider' : `p-1.5 ${photoControlsVisibility}`
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {isConfirmingRemove && 'Remove?'}
              </button>
            )}
          </div>

          {/* Name Section */}
          <div className="mt-4">
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
                className="w-full bg-[#120d18] text-amber-100 font-heading text-xl font-bold text-center tracking-wider px-3 py-1.5 rounded-md border border-amber-500/70 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              />
            ) : (
              <h2 className="font-heading text-xl font-bold text-amber-100 tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <button
                  onClick={startEditingName}
                  className="w-full text-center truncate cursor-pointer hover:text-amber-300 transition-colors py-1.5"
                  title="Click to edit name"
                >
                  {player.name}
                </button>
              </h2>
            )}
            <Divider className={`w-44 h-3 mx-auto mt-1 transition-colors duration-300 ${cardStyle.trim}`} />
          </div>

          {/* Health Section */}
          <div className="mt-4">
            <span className={`${SECTION_LABEL} justify-center mb-3`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Vitality
            </span>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => onAdjustHealth(1)}
                aria-label={`Heal ${player.name} by 1`}
                className={`${STEP_BUTTON} w-32 bg-gradient-to-b from-emerald-700 to-emerald-950 hover:from-emerald-600 hover:to-emerald-900 text-emerald-100 border-emerald-400/40 hover:border-emerald-300/70`}
              >
                <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">+1</span>
              </button>
              {/* Vitality gem in a gilded setting */}
              <div
                aria-label={`${player.name} vitality: ${player.health}`}
                className={`relative w-32 h-32 rounded-full p-1 bg-gradient-to-b from-amber-200 via-amber-600 to-amber-900 transition-shadow duration-300 ${healthStyle.glow}`}
              >
                <div className={`relative w-full h-full rounded-full flex items-center justify-center bg-radial-[at_35%_28%] ${healthStyle.gem} shadow-[inset_0_-6px_14px_rgba(0,0,0,0.55),inset_0_4px_10px_rgba(255,255,255,0.2)]`}>
                  <div className="absolute inset-2 rounded-full border border-white/15" />
                  <div className="absolute top-3 left-7 w-9 h-4 rounded-full bg-white/25 blur-[3px] -rotate-[25deg]" />
                  <span className="relative font-body font-bold lining-nums text-6xl text-white drop-shadow-[0_3px_4px_rgba(0,0,0,0.85)]">{player.health}</span>
                </div>
              </div>
              <button
                onClick={() => onAdjustHealth(-1)}
                aria-label={`Damage ${player.name} by 1`}
                className={`${STEP_BUTTON} w-32 bg-gradient-to-b from-red-800 to-red-950 hover:from-red-700 hover:to-red-900 text-red-100 border-red-500/40 hover:border-red-400/70`}
              >
                <span className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">-1</span>
              </button>
            </div>
          </div>

          <Divider className={`w-44 h-3 mx-auto my-4 transition-colors duration-300 ${cardStyle.trim}`} />

          {/* Shields Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={SECTION_LABEL}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-cyan-400 ${player.shields > 0 ? 'animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
                </svg>
                Arcane Shield
              </span>
              <div
                aria-label={`${player.name} shields: ${player.shields}`}
                className={`relative w-14 h-16 flex items-center justify-center ${player.shields > 0 ? 'animate-shield-glow' : ''}`}
              >
                <ShieldEmblem active={player.shields > 0} className="absolute inset-0 w-full h-full" />
                <span className={`relative -mt-1.5 font-body font-bold lining-nums text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)] ${player.shields > 0 ? 'text-white' : 'text-stone-400'}`}>
                  {player.shields}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAdjustShields(-1)}
                disabled={player.shields === 0}
                aria-label={`Remove 1 shield from ${player.name}`}
                className={`${STEP_BUTTON} flex-1 bg-gradient-to-b from-[#3a3042] to-[#1c1622] hover:from-[#4a3d54] text-stone-300 border-stone-500/40 hover:border-stone-400/70 disabled:opacity-40 disabled:pointer-events-none`}
              >
                -1
              </button>
              <button
                onClick={() => onAdjustShields(1)}
                aria-label={`Add 1 shield to ${player.name}`}
                className={`${STEP_BUTTON} flex-1 bg-gradient-to-b from-cyan-700 to-blue-950 hover:from-cyan-600 hover:to-blue-900 text-cyan-100 border-cyan-400/40 hover:border-cyan-300/70`}
              >
                <span className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">+1</span>
              </button>
              <button
                onClick={() => onAdjustShields(3)}
                aria-label={`Add 3 shields to ${player.name}`}
                className={`${STEP_BUTTON} flex-1 bg-gradient-to-b from-cyan-600 to-blue-900 hover:from-cyan-500 hover:to-blue-800 text-cyan-50 border-cyan-300/50 hover:border-cyan-200/80`}
              >
                <span className="drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">+3</span>
              </button>
            </div>
            {player.shields > 0 && (
              <p className="text-base text-cyan-300/70 mt-2 text-center italic">
                A magical barrier absorbs damage
              </p>
            )}
          </div>
        </div>

        {/* Screen flash overlay */}
        {effect && (
          <div key={`flash-${effect.id}`} className={`absolute inset-0 rounded-2xl pointer-events-none animate-flash ${effectStyle.flash}`} />
        )}
      </div>

      {isSummoning && <SummonEffect />}
      {shatterId && <ShieldShatter key={shatterId} />}
    </div>
  )
}

export default PlayerCard
