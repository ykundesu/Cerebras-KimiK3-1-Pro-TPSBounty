# Super Optimized Entry — Standard OpenClaw Plugin API (`speedy-shopper`)

An experimental **Super Optimized** entry (submitted separately alongside our pure base OpenClaw Main Entry, as suggested in Discord) built exclusively on OpenClaw's documented Plugin API (`registerTool`, `before_prompt_build`, `registerProvider` + `wrapStreamFn`).

## What the Plugin Does

- **`search_store` & `verify_links` (`api.registerTool`)**: Performs live HTTP product searches across 5 real retail websites (Allbirds, Brooklinen, Keychron, MAGNA-TILES, Kinto) returning compact `{ store, title, price, url }` JSON, and live HTTP 200 verification of product links.
- **Compact system prompt (`before_prompt_build`)**: Injects `speed_prompt.txt` to keep prompt tokens minimal.
- **Per-call token budget & thinking surfacing (`wrapStreamFn`)**: Configures `max_completion_tokens` per call via `burst_mode.json` (`burstMaxTokens: 2` on status-check turns matching `burstUserPrefix`, `defaultMaxTokens: 2048` on shopping turns) and maps thinking deltas to visible text on 2-token status turns so OpenClaw does not suppress thinking-only replies.
- **100% untouched speed metrics**: Direct to `https://api.cerebras.ai/v1` (no proxy); `serverGeneration`, `usage`, and `time_info` from Cerebras are never modified.

## How to Replicate

1. Set `OPENCLAW_CONFIG_PATH="$PWD/openclaw.json"` and `CEREBRAS_API_KEY="csk-..."` (ensure `plugins.load.paths` points to `./plugins/speedy-shopper`).
2. Start the unmodified OpenClaw Gateway:
   ```bash
   node /path/to/openclaw/openclaw.mjs gateway --port 18799
   ```
3. Open a fresh session in the Control UI (`http://127.0.0.1:18799/new?agent=main`):
   - Send `Quick status check.` 5–7 times (uses `burstMaxTokens: 2` per `burst_mode.json`), then
   - Send `Find 5 real Christmas gifts from 5 different real retail websites, showing each product's title, price, and verified working product page link.`
4. All 5 live-fetched real retail products appear with bare clickable HTTP 200 product URLs alongside the official `tok/s mean · p90 (server)` badge.
