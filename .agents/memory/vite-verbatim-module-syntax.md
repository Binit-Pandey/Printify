---
name: Vite verbatimModuleSyntax type imports
description: Why importing interfaces/types without `import type` crashes at runtime in Vite dev server, and how to fix it.
---

When `tsconfig.json`'s `compilerOptions.verbatimModuleSyntax` is `true`, esbuild (used by Vite) transpiles each file in isolation and cannot always tell that a named import is type-only just from usage. If a value import statement pulls in only interfaces/types (e.g. `import { Bill } from '../types'`), Vite may keep the import at runtime, causing:

```
SyntaxError: The requested module '/src/types/index.ts' does not provide an export named 'Bill'
```

**Why:** `verbatimModuleSyntax` requires the developer to explicitly mark type-only imports; esbuild will not silently elide them for you across module boundaries.

**How to apply:** When this error appears (or proactively, when `verbatimModuleSyntax: true` is set), split any import that pulls in only types/interfaces into `import type { ... } from '...'`. For mixed imports (some values, some types from the same module, e.g. `React, { ReactNode }` from `'react'`), separate into a value import and a `import type` import.
