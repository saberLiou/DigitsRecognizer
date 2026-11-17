import Alpine from 'alpinejs'
import './style.css'
import { CANVAS_SIZE, loadModel, recognize } from './recognizer.js'

const LINE_WIDTH = 20
const INK = '#000'

Alpine.data('digitsRecognizer', () => {
  // Non-reactive handles: keep the canvas context and weights out of Alpine's proxies.
  let canvas, ctx, model
  let last = null

  return {
    status: 'loading', // loading | ready | error
    busy: false,
    hasInk: false,
    clearOnNextDraw: false,
    digit: null,
    probs: Array(10).fill(0),
    message: '',
    size: CANVAS_SIZE,

    async init() {
      canvas = this.$refs.canvas
      ctx = canvas.getContext('2d', { willReadFrequently: true })
      try {
        model = await loadModel()
        this.status = 'ready'
      } catch (err) {
        console.error(err)
        this.status = 'error'
      }
    },

    point(e) {
      const r = canvas.getBoundingClientRect()
      return {
        x: ((e.clientX - r.left) * canvas.width) / r.width,
        y: ((e.clientY - r.top) * canvas.height) / r.height,
      }
    },

    start(e) {
      if (this.clearOnNextDraw) this.clear()
      canvas.setPointerCapture?.(e.pointerId)
      last = this.point(e)
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(last.x, last.y, LINE_WIDTH / 2, 0, Math.PI * 2)
      ctx.fill()
      this.hasInk = true
      this.message = ''
    },

    move(e) {
      if (!last) return
      const p = this.point(e)
      ctx.strokeStyle = INK
      ctx.lineWidth = LINE_WIDTH
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      last = p
    },

    end() {
      last = null
    },

    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      this.hasInk = false
      this.clearOnNextDraw = false
      this.digit = null
      this.probs = Array(10).fill(0)
      this.message = ''
    },

    async run() {
      if (this.status !== 'ready' || this.busy) return
      this.busy = true
      // Let the UI paint the busy state before the synchronous inference.
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r)))
      try {
        const result = recognize(model, canvas)
        if (!result) {
          this.message = '請先畫一個數字再辨識。'
          return
        }
        this.digit = result.digit
        this.probs = result.probs
        this.clearOnNextDraw = true
      } finally {
        this.busy = false
      }
    },

    pct(p) {
      return `${(p * 100).toFixed(1)}%`
    },
  }
})

window.Alpine = Alpine
Alpine.start()
