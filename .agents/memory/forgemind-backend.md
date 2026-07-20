---
name: ForgeMind backend setup
description: Key decisions and quirks for the ForgeMind AI Python FastAPI backend.
---

## Rules

**asyncpg + sslmode:** asyncpg does not accept `sslmode` as a URL query param. Strip it from DATABASE_URL and pass `ssl="require"` in `connect_args` to `create_async_engine`. See `backend/database.py`.

**Why:** `TypeError: connect() got an unexpected keyword argument 'sslmode'` on startup without this fix.

**GEMINI_API_KEY must be read at call time:** Do NOT read `os.getenv("GEMINI_API_KEY")` at module level — read it inside `get_gemini_model()` so the server picks up secrets added after initial import.

**Why:** Module-level reads freeze the value at import; secrets added while the server is running won't be seen until a full process restart AND code reload.

**Pydantic EmailStr:** requires `email-validator` package. If not installed, replace `EmailStr` with plain `str` in route models.

**sentence-transformers + faiss-cpu:** Both required for vector search. Install with `installLanguagePackages`. If blocked, the code degrades gracefully (returns empty results).

**Artifact.toml run command:** `cd /home/runner/workspace && python3 backend/main.py` — the `backend/` dir is not a Python package root; main.py adds its own path adjustments.

**Gemini model:** Use `gemini-2.0-flash` in `get_gemini_model()`.
