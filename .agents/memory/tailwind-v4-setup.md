---
name: Tailwind v4 setup
description: Differences from Tailwind v3 that break a naive npm install in an imported/legacy project.
---

Tailwind CSS v4 changed two things that break projects written against v3-style config:

1. The PostCSS plugin moved to a separate package. `postcss.config.js` must use `'@tailwindcss/postcss': {}` instead of `tailwindcss: {}` as a plugin key (npm install `@tailwindcss/postcss`).
2. There's no more `@tailwind base; @tailwind components; @tailwind utilities;` directive set. The CSS entry file (e.g. `src/index.css`) needs a single `@import "tailwindcss";` at the top instead.

**Why:** A GitHub-imported project pinned to `"tailwindcss": "^x"` with no lockfile can silently resolve to v4 on fresh `npm install`, and the old v3-style `postcss.config.js`/`tailwind.config.js` setup will fail with a PostCSS error or (worse) build successfully but render completely unstyled pages.

**How to apply:** After installing tailwindcss in a freshly imported project, check the installed major version (`node_modules/tailwindcss/package.json`) and use the matching setup style.
