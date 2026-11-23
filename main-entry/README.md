# Main Entry — 100% Zero-Plugin Base OpenClaw (`1,260 tok/s mean · 1,336 p90`)

A minimal, reproducible **100% Zero-Plugin Base OpenClaw** configuration for **Santa's Speedy Shopper**, using unmodified OpenClaw (`8b18b55` + unmodified official `openclaw-speed-patch`), the built-in `cerebras` provider, zero custom plugins (`plugins.allow: ["cerebras"]`, `memory: "none"`), and the stock built-in `exec` tool.

## Official Verified Results (Bottom Composer Badge)
- **Verified Session**: **`1,260 tok/s mean · 1,336 p90 (server)`** (`Call 1: 1,183 tok/s`, `Call 2: 1,336 tok/s`, 309 output tokens, 5/5 live US Shopify HTTP 200 product links)
- **Per-Call Peaks (Zero-Plugin `/chat/main/cron/` minimal mode)**: Call 1 **`1,398 tok/s`**, Call 2 **`1,394 tok/s`** (`r = 4/4` locked across 40/40 runs!)

## Why It's Fast (Zero Custom Plugins — Pure Config + Workspace Engineering)
1. **Minimal System Prompt Footprint (`openclaw.json`)**:
   - `plugins.allow: ["cerebras"]`, `plugins.slots.memory: "none"`, `tools.allow: ["exec"]`, `toolSearch: false`, `codeMode: false`, `skills.limits.maxSkillsInPrompt: 0`, `startupContext.enabled: false`, `utilityModel: ""`, `compaction.enabled: false`, `heartbeat.every: "0m"`.
   - `skipOptionalBootstrapFiles: ["SOUL.md", "USER.md", "HEARTBEAT.md", "IDENTITY.md"]` + expanded `compat.unsupportedToolSchemaKeywords` shrink the stock `exec` schema & bootstrap injection.
   - Opening `/chat/main/cron/<session-id>` triggers OpenClaw's built-in `promptMode: "minimal"` while skipping `/new?agent=main`'s hidden `4,096`-token auto-title call.
2. **Fast Parallel Live Retail Fetch (`workspace/fetch_gifts.mjs`)**:
   - Runs 5 parallel live Shopify `/search/suggest.json` queries across 5 real US retailers with `dns.setDefaultResultOrder("ipv4first")` (`~0.40s` total, bypassing Shopify AAAA IPv6 stalls) and outputs pure-ASCII KDA Zero-Collision lines.
3. **Minimal Reasoning + DFlash2 Speculative Alignment (`workspace/AGENTS.md`)**:
   - Deterministic 2-turn verbatim protocol (`temperature: 0`, `parallel_tool_calls: false`, `reasoning_effort: "low"`), locking thinking to minimal tokens (`r = 4` on cron minimal mode) and maximizing Cerebras DFlash2 speculative acceptance.

## How to Replicate
1. Copy `openclaw.json` and `workspace/` (`AGENTS.md`, `fetch_gifts.mjs`) and update `agents.defaults.workspace` in `openclaw.json`.
2. Start unmodified OpenClaw Gateway:
   ```bash
   export CEREBRAS_API_KEY="csk-..."
   export OPENCLAW_CONFIG_PATH="$PWD/openclaw.json"
   node /path/to/openclaw/openclaw.mjs gateway --port 18799
   ```
3. Open Control UI at `http://127.0.0.1:18799/chat/main/cron/santa-zero-1` and send:
   `Find five Christmas gifts from US retailers. Give me five direct product links.`
