# Main Entry — Pure Base OpenClaw (Zero Plugins, Zero MCP)

A minimal, easy-to-replicate **100% base OpenClaw** configuration for **Santa's Speedy Shopper**, using only stock OpenClaw (`8b18b55` + unmodified `openclaw-speed-patch`), the built-in `cerebras` provider, and the built-in `web_fetch` tool.

## Why It's Fast (Pure Config + Prompt Optimization)

1. **Minimal prompt token footprint (`ptok`)**:
   - `plugins.allow: ["cerebras"]` and `plugins.slots.memory: "none"` remove unused memory/extension prompt boilerplate.
   - `skipOptionalBootstrapFiles: ["SOUL.md", "USER.md", "HEARTBEAT.md", "IDENTITY.md"]`, `startupContext.enabled: false`, `skills.limits.maxSkillsInPrompt: 0`, and `tools.allow: ["web_fetch"]` keep only `AGENTS.md` and the single `web_fetch` tool schema in context.
2. **Low-latency parallel live retail fetching**:
   - `workspace/AGENTS.md` directs Kimi K3.1 Pro to issue 5 parallel `web_fetch` calls against 5 real retail store live search endpoints returning compact JSON (1.0–1.7 KB each: Casper, MAGNA-TILES, Away, Allbirds, Fellow) with zero special-character escaping traps.
3. **Minimal reasoning + high speculative decoding acceptance**:
   - `thinkingDefault: "low"` + `temperature: 0` + unambiguous step-by-step verbatim extraction eliminates unnecessary chain-of-thought overhead and maximizes Cerebras speculative decoding acceptance.

## How to Replicate

1. Copy `openclaw.json` and `workspace/AGENTS.md` (update `agents.defaults.workspace` in `openclaw.json` to point to this `workspace/` folder).
2. Start the OpenClaw Gateway:
   ```bash
   export CEREBRAS_API_KEY="csk-..."
   export OPENCLAW_CONFIG_PATH="$PWD/openclaw.json"
   node /path/to/openclaw/openclaw.mjs gateway --port 18799
   ```
3. Open a fresh session in the OpenClaw Control UI (`http://127.0.0.1:18799/new?agent=main`) and send:
   ```text
   Find 5 real Christmas gifts from 5 different real retail websites, showing each product's title, price, and verified working product page link.
   ```
4. Observe the 5 live-fetched retail products with verified working product links and the official speed patch badge (`tok/s mean · p90 (server)`).
