

## Fix Build Errors

There are two issues in the build logs:

### 1. CSS @import Order (Active Issue)
The `@import` for Google Fonts on line 6 of `src/index.css` must come **before** the `@tailwind` directives (lines 1-3). CSS requires `@import` statements to precede all other statements.

**Fix:** Move the `@import url(...)` line to the very top of `src/index.css`, above `@tailwind base;`.

### 2. Invalid Regex (Stale Issue)
The build log references `\p{L}` Unicode regex, but this pattern no longer exists in the codebase -- it was already fixed in a prior edit. This error appears to be from a cached/stale build. Moving the CSS `@import` and triggering a fresh build should clear it.

### Changes

**File: `src/index.css`**
- Move line 6 (`@import url('https://fonts.googleapis.com/...')`) to line 1, before the `@tailwind` directives.

No other files need changes.

