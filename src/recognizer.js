// Image preprocessing + a 3-layer fully connected network (ReLU, ReLU, linear → softmax).
// Some of the preprocessing was adapted from a StackOverflow answer whose author we could no longer find.
// Thanks a ton to the original author!

export const CANVAS_SIZE = 280
const GRID = 28
const BIN = CANVAS_SIZE / GRID // 10x10 px per input pixel
const LAYERS = ['W1', 'b1', 'W2', 'b2', 'W3', 'b3']

/** Fetch all weight matrices in parallel. */
export async function loadModel(baseUrl = import.meta.env.BASE_URL) {
  const entries = await Promise.all(
    LAYERS.map(async (name) => {
      const res = await fetch(`${baseUrl}model/${name}.json`)
      if (!res.ok) throw new Error(`Failed to load ${name} (${res.status})`)
      return [name, await res.json()]
    }),
  )
  return Object.fromEntries(entries)
}

function dense(W, b, input, relu) {
  const out = new Float64Array(W.length)
  for (let i = 0; i < W.length; i++) {
    const row = W[i]
    let sum = b[i]
    for (let j = 0; j < row.length; j++) sum += row[j] * input[j]
    out[i] = relu && sum < 0 ? 0 : sum
  }
  return out
}

function softmax(logits) {
  const max = Math.max(...logits)
  const exps = Array.from(logits, (v) => Math.exp(v - max))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map((v) => v / total)
}

export function forward(model, input) {
  const h1 = dense(model.W1, model.b1, input, true)
  const h2 = dense(model.W2, model.b2, h1, true)
  return dense(model.W3, model.b3, h2, false)
}

// Canvas RGBA → grayscale matrix (1 = white, 0 = black).
// Transparent pixels count as white; painted pixels use their red channel.
function toGrayscale(imgData) {
  const { width, height, data } = imgData
  const img = []
  for (let y = 0; y < height; y++) {
    const row = new Float64Array(width)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      row[x] = data[o + 3] === 0 ? 1 : data[o] / 255
    }
    img.push(row)
  }
  return img
}

function boundingRect(img, threshold) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -1
  let maxY = -1
  img.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v < threshold) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }),
  )
  return { minX, minY, maxX, maxY }
}

// Offset that moves the digit's centre of mass to the image centre.
function centreOfMassOffset(img) {
  let sum = 0
  let mx = 0
  let my = 0
  img.forEach((row, y) =>
    row.forEach((v, x) => {
      const ink = 1 - v
      sum += ink
      mx += x * ink
      my += y * ink
    }),
  )
  return {
    dx: Math.round(img[0].length / 2 - mx / sum),
    dy: Math.round(img.length / 2 - my / sum),
  }
}

/**
 * Centre and scale the drawing, downsample it to 28x28, and run the network.
 * Returns null when nothing has been drawn.
 */
export function recognize(model, sourceCanvas) {
  const ctx = sourceCanvas.getContext('2d')
  const gray = toGrayscale(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE))
  const rect = boundingRect(gray, 0.01)
  if (rect.maxX < 0) return null

  const { dx, dy } = centreOfMassOffset(gray)
  const w = rect.maxX + 1 - rect.minX
  const h = rect.maxY + 1 - rect.minY
  const scale = 190 / Math.max(w, h)

  const copy = document.createElement('canvas')
  copy.width = copy.height = CANVAS_SIZE
  const copyCtx = copy.getContext('2d', { willReadFrequently: true })
  const c = CANVAS_SIZE / 2
  copyCtx.translate(c, c)
  copyCtx.scale(scale, scale)
  copyCtx.translate(-c, -c)
  copyCtx.translate(dx, dy)
  copyCtx.drawImage(sourceCanvas, 0, 0)

  const centred = toGrayscale(copyCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE))
  if (centred.every((row) => row.every((v) => v === 1))) return null

  // Average each 10x10 block, invert (1 = ink) and flatten row-major.
  const input = new Float64Array(GRID * GRID)
  for (let r = 0; r < GRID; r++) {
    for (let col = 0; col < GRID; col++) {
      let sum = 0
      for (let v = 0; v < BIN; v++) {
        for (let hh = 0; hh < BIN; hh++) sum += centred[r * BIN + v][col * BIN + hh]
      }
      input[r * GRID + col] = 1 - sum / (BIN * BIN)
    }
  }

  const logits = forward(model, input)
  const probs = softmax(logits)
  const digit = probs.indexOf(Math.max(...probs))
  return { digit, probs }
}
