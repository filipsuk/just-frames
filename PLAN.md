# Plan: Just Frames (iOS Safari White Border App)

## Goals
- Browser-only processing (no uploads) for adding a white border to photos.
- iOS Safari compatible, minimal UI, no heavy frameworks.
- TypeScript + minimal bundler (Vite).
- TDD-first for image layout and aspect ratio logic.
- Deploy to GitHub Pages on merge to `main`.
- Minimal PWA (manifest + service worker) without aggressive caching.

## User Flow
1. Open the web app.
2. Select a photo from the photo library.
3. Image is processed locally in the browser.
4. Choose border width (0–50px) with a slider and see a preview.
5. Choose aspect ratio:
   - Instagram Stories (9:16)
   - Instagram Post Vertical (4:5)
   - Instagram Post Horizontal (1.91:1)
   - Original
6. Tap **Done** to open the native share dialog (Web Share API). Fallback to download if share is unsupported.

## Architecture (Structure A)
```
src/
  app/                # app shell & composition
    main.ts
  domain/             # pure image + layout math, testable
    aspectRatio.ts
    borderCalc.ts
    layout.ts
  features/
    editor/
      Editor.ts
      editor.css
      editor.test.ts
  ui/
    controls/
    Slider.ts
    Select.ts
  shared/
    types.ts
    constants.ts
```

## Implementation Steps (TDD-first)
1. **Project setup**
   - Vite + TypeScript.
   - Vitest for unit tests.
   - Basic `index.html` and `src/app/main.ts` entry.

2. **Domain logic (tests first)**
   - `aspectRatio.ts`: map options to numeric ratios; return original ratio when selected.
   - `layout.ts`: compute output canvas size and placement from:
     - source dimensions
     - border width (0–50px)
     - target ratio
   - `borderCalc.ts`: apply uniform border and centering logic.
   - Tests:
     - verify output sizes for each ratio
     - ensure borders expand canvas (no scaling)
     - ensure centering offsets are correct

3. **UI + Preview**
   - Simple HTML controls: file input, slider, ratio radio group, canvas preview, Done button.
   - Decode image with `FileReader` + `Image` or `createImageBitmap` (keep standard canvas for iOS).
   - Re-render preview on slider/ratio change.

4. **Export + Share**
   - Render final canvas to Blob.
   - Use `navigator.share` with a File when available.
   - Fallback: create a download link for the blob.

5. **Minimal PWA**
   - `manifest.webmanifest` with name/icons.
   - Simple service worker that skips caching and just enables installability.

6. **GitHub Pages deployment**
   - GitHub Actions workflow: build on merge to `main` and deploy `dist/` to GitHub Pages.

## Local Development
- `npm install`
- `npm run dev`
- `npm test` (Vitest)

## Notes & Constraints
- White border only (for now), sharp corners.
- No image compression; keep original resolution.
- Instagram story ratio uses extra top/bottom padding so IG doesn’t crop.
- Design stays minimal: basic HTML/CSS only.
