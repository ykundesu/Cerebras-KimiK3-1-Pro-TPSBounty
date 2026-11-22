# Santa's Speedy Shopper — Cerebras × Kimi K3.1 Pro Speed Bounty

Two reproducible OpenClaw configurations for the **Cerebras × Moonshot AI Kimi K3.1 Pro × OpenClaw Weekend Hackathon ("Santa's Speedy Shopper" Speed Bounty)**, both running against **unmodified OpenClaw (`8b18b55`) + unmodified official [`openclaw-speed-patch`](https://github.com/wkasekende/openclaw-speed-patch)** directly to `https://api.cerebras.ai/v1` with **no proxy** and **100% untouched `serverGeneration` / `time_info` / `usage` metrics**.

## Repository Layout

| Folder | Entry Type | Harness / Plugins | Approach |
|---|---|---|---|
| [`main-entry/`](./main-entry) | **Main Entry (Base OpenClaw)** | **Zero custom plugins, zero MCP** — stock `cerebras` provider + built-in `web_fetch` only | Pure config & prompt optimization: minimal prompt footprint (`ptok`), minimal reasoning overhead (`thinkingDefault: "low"`), parallel live retail `web_fetch` across 5 real stores, deterministic verbatim formatting |
| [`super-optimized-plugin/`](./super-optimized-plugin) | **Super Optimized Entry** | Standard OpenClaw Plugin API (`registerTool`, `before_prompt_build`, `wrapStreamFn`) | Live retail search & HTTP 200 verification tools (`search_store`, `verify_links`) + compact prompt injection + per-call `max_completion_tokens` tuning & thinking-token surfacing via documented plugin hooks |

## Prerequisites (Both Entries)

1. Clone OpenClaw at commit `8b18b55` and apply the unmodified official speed patch:
   ```bash
   git clone https://github.com/openclaw/openclaw.git
   cd openclaw
   git checkout 8b18b55
   # Apply https://github.com/wkasekende/openclaw-speed-patch
   pnpm install && pnpm build
   ```
2. Set your Cerebras API key:
   ```bash
   export CEREBRAS_API_KEY="csk-..."
   ```
3. Follow the instructions inside [`main-entry/README.md`](./main-entry/README.md) or [`super-optimized-plugin/README.md`](./super-optimized-plugin/README.md).

## Integrity Verification

- **No core edits**: OpenClaw and `openclaw-speed-patch` are completely unmodified.
- **Direct Cerebras API**: All requests go directly to `https://api.cerebras.ai/v1` with model `moonshotai-kimi-k3.1-pro-trial`.
- **No fabricated results**: All 5 Christmas gifts are fetched live from real retail storefronts (e.g., Casper, MAGNA-TILES, Away, Allbirds, Fellow / Brooklinen / Keychron / Kinto) with live HTTP 200 product links.
- **Untouched speed metrics**: `serverGeneration`, `time_info`, and `usage` are never altered, spoofed, or intercepted.
