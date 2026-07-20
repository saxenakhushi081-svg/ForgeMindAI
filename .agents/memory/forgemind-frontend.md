---
name: ForgeMind frontend setup
description: Key decisions for the ForgeMind AI React+Vite frontend.
---

## Rules

**Router:** Uses `wouter`, NOT react-router-dom. Import `Switch`, `Route`, `Link` from `wouter`.

**Auth token:** Stored in localStorage as `forgemind_token` and `forgemind_user`. The custom-fetch attaches Bearer header.

**API hooks:** Import from `@workspace/api-client-react`. Generated from OpenAPI spec via orval.

**OpenAPI spec codegen quirks:**
- Remove `format: email` from all email fields (generates `zod.email()` which is Zod v4 syntax, not v3).
- Remove `format: binary` from multipart file fields (generates `Blob`/`File` types unavailable in Node.js lib context).
- Re-run: `pnpm --filter @workspace/api-spec run codegen`

**Missing packages:** `react-dropzone` and `date-fns` are used by design subagent but not in original package.json. Install with `pnpm --filter @workspace/forge-mind add react-dropzone date-fns`.

**`installLanguagePackages` for nodejs:** May fail for some packages — fall back to `pnpm --filter @workspace/<artifact> add <pkg>`.
