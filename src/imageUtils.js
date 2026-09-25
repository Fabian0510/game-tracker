const PORTRAIT_MAX_SIZE = 640

// Draws an image/video source scaled down to fit PORTRAIT_MAX_SIZE and returns a JPEG data URL.
export function toPortraitDataUrl(source, width, height, { mirror = false } = {}) {
  const scale = Math.min(1, PORTRAIT_MAX_SIZE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const ctx = canvas.getContext('2d')
  if (mirror) {
    // Mirror horizontally to match the webcam preview
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', 0.85)
}

export async function fileToPortraitDataUrl(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return toPortraitDataUrl(img, img.naturalWidth, img.naturalHeight)
  } finally {
    URL.revokeObjectURL(url)
  }
}
