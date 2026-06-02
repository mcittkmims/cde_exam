# CDE Exam Study Site

Static TypeScript study website for the extracted CDE exam slide information.

## Commands

```bash
npm install
npm run dev
npm run build
```

The website is static at runtime. It reads the already-generated normalized data from `public/data/exam-data.json` and images from `public/exam-assets/`.

Generated image assets are grouped by content type:

- `public/exam-assets/theory/topic-1` through `topic-6`
- `public/exam-assets/problems/...`

`npm run build` writes the GitHub Pages-ready site to `dist/` without requiring the old raw extraction folders.

## Regenerating Data

Only run this when you intentionally want to rebuild the normalized static data from the original extracted files:

```bash
npm run data
```

That command reads the raw extraction folders, writes `public/data/exam-data.json`, and copies referenced images into `public/exam-assets/`. After those generated files are committed, the raw folders are no longer needed for normal development, build, or GitHub Pages deploys.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and deploys `dist/` on pushes to `main`.
