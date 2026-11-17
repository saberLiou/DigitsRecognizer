<p align="center">
  <img src="public/logo.svg" alt="Digits Recognizer logo" />
</p>

<h1 align="center">Digits Recognizer</h1>

<p align="center">
  A one-page web app that recognizes handwritten digits with an artificial neural network (ANN) running entirely in the browser.<br />
  <a href="https://saberliou.github.io/DigitsRecognizer/">Live demo</a>
</p>

## Features

- Draw a digit (0–9) with a finger, mouse, or stylus; the canvas scales to fit the screen.
- Recognition runs fully client-side with a pre-trained ANN: a 784 → 1000 → 1000 → 10 fully connected network (ReLU) — no server involved.
- The drawing is centered by its center of mass and scaled before being downsampled to 28×28, MNIST-style.
- Shows the predicted digit, its confidence, and softmax probability bars for all ten digits.
- Model weights (~17 MB) load in the background behind a loading overlay, with a reload button if loading fails.
- Keyboard shortcuts: <kbd>Enter</kbd> to recognize, <kbd>Esc</kbd> to clear. The canvas clears itself on the next stroke after a recognition.

Model constructor: [@tnfsh810124](https://github.com/tnfsh810124)

## Development

Requires [nvm](https://github.com/nvm-sh/nvm); the Node.js version is pinned in `.nvmrc`.

```sh
nvm use          # Switch to the Node.js version in .nvmrc (run `nvm install` first if missing)
npm install
npm run dev      # Start the dev server
npm run build    # Build to dist/ (relative paths, deployable to GitHub Pages or any static host)
npm run preview  # Serve the built dist/ locally to check the production build
npm run lint     # Lint with ESLint (`npm run lint:fix` to auto-fix)
npm run format   # Format with Prettier (`npm run format:check` to check only)
```

Tech stack: Alpine.js + Vite + Tailwind CSS v4, linted with ESLint and formatted with Prettier.

## Project Architecture

### Structure

```
index.html              # Page layout & Alpine template: canvas, buttons, result panel
src/
├─ main.js              # Alpine component: drawing, UI state, keyboard shortcuts
├─ recognizer.js        # Pure functions, no Alpine: preprocessing, forward pass, softmax
└─ style.css            # Tailwind entry + result pop animation
public/
├─ model/               # Pre-trained weights W1–W3, b1–b3 (JSON, fetched at runtime)
├─ logo.svg
└─ logo.ico
```

### File dependencies

Arrows point from the importing file to the imported one.

```text
        index.html  (x-data="digitsRecognizer")
            │
            ▼
         main.js ───────▶ style.css
          │   │
          │   └─────────▶ alpinejs
          ▼
    recognizer.js ─── fetch ───▶ public/model/*.json
```

### Loading the model

```text
 page load → Alpine init() → loadModel(): fetch W1, b1, W2, b2, W3, b3 in parallel
                                              │
                                 ok ──────────┴────────── failed
                                  ▼                         ▼
                          status = 'ready'          status = 'error'
                       overlay fades out,        "模型載入失敗" message
                      "辨識" button enabled        + reload button
```

### Recognizing a digit

```text
  pointer events on <canvas> (280×280)
        │ start / move / end → draw round strokes
        ▼
  "辨識" button / Enter
        │
        ▼
  toGrayscale → boundingRect ──── nothing drawn ────▶ "請先畫一個數字再辨識。"
        │
        ▼
  shift to center of mass, scale into a 190px box (off-screen canvas)
        │
        ▼
  10×10 average pooling → 28×28 = 784 inputs
        │
        ▼
  dense 784→1000 (ReLU) → dense 1000→1000 (ReLU) → dense 1000→10
        │
        ▼
  softmax → digit + probabilities → result panel
        │
        └──▶ next stroke clears the canvas and result
```

## Deployment

Every push to `master` is linted, built, and deployed to GitHub Pages by GitHub Actions (`.github/workflows/deploy.yml`):

```text
 push master → npm ci → lint → format:check → vite build → GitHub Pages
```

https://saberliou.github.io/DigitsRecognizer

## License

[MIT](LICENSE) © saberLiou and Digits Recognizer contributors
