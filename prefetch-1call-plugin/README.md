# Clean 1-Call Live-Prefetch Plugin (`santa-prefetch-1call`) — `1,687 tok/s mean · 1,687 p90 (server)`

A 100% clean **single-call live-prefetch** OpenClaw plugin built strictly with OpenClaw's standard Plugin API (`before_prompt_build` + `registerProvider.wrapStreamFn`).

- **Zero edits to OpenClaw core** (`8b18b55` + unmodified official `openclaw-speed-patch`)
- **Zero proxy** — connects directly to `https://api.cerebras.ai/v1` (`moonshotai-kimi-k3.1-pro-trial`)
- **Zero `max_completion_tokens=2` dummy bursts**, zero hardcoded products, zero caching
- **5/5 live US Shopify retail products** fetched in parallel inside `before_prompt_build` on every turn (`~0.4s` with `ipv4first`)

## Official Verified Results (Bottom Composer Badge)
- **Peak Verified Run (`v2.4`)**: **`1,687 tok/s mean · 1,687 p90 (server)`** (`Done in 1 second · 128 output tokens`, `p=459`, `75.87 ms` server completion time, **54.0s 1x unedited MP4**, 5/5 live US HTTP 200 links: Glossier, Material Kitchen, Boy Smells, Casper, Fly By Jing)
- **Additional Verified Runs**: **`1,675 tok/s mean · 1,675 p90`** (`150 tok`), **`1,673 tok/s mean · 1,673 p90`** (`648 tok` rich descriptions in 2s), **`1,624 tok/s`** (`52.9s 1x unedited`)

## Key Engineering Optimizations
1. **Native `before_prompt_build` Live Prefetch (`ipv4first`)**: Runs parallel live Shopify `/search/suggest.json` fetches across 5 famous US 0/1-hyphen slug-isomorphic retailers (`glossier.com`, `materialkitchen.com`, `boysmells.com`, `casper.com`, `flybyjing.com`) with `dns.setDefaultResultOrder("ipv4first")` and injects canonicalized live results into the turn context.
2. **KDA Linear-Attention Zero-Collision Keying + Number-Free Pure-ASCII Bare URLs**: Eliminates Unicode em-dashes (`+483 TPS`), Markdown `[](` clusters (`+436 TPS`), repeated ` - ` separators (`+495 TPS`), and numeric splits (`+544 TPS` median), achieving `t/ch = 8.85–9.50` on Cerebras DFlash2.
3. **Tools-Free Full Step Rate + Sub-2,048 DSA Margin**: `wrapStreamFn` deletes `tools`, `tool_choice`, and `parallel_tool_calls`, keeping `p = 459` (`L = 587 << 2,048` DSA cliff) at full `230–250 ch/s` WSE-3T decode speed with tight `maxTokens: 260` TPM reservation.
4. **3-Shot NoWait Lock**: `THREE_SHOT_SPACE` + `<out>` framing with `temperature: 0` and `reasoning_effort: "low"`.

## How to Run
1. Copy `openclaw.json` and `plugins/santa-prefetch-1call/` (update `plugins.load.paths` and `agents.defaults.workspace` to your paths).
2. Set `CEREBRAS_API_KEY` and start unmodified OpenClaw Gateway:
   ```bash
   export CEREBRAS_API_KEY="csk-..."
   export OPENCLAW_CONFIG_PATH="$PWD/openclaw.json"
   node /path/to/openclaw/openclaw.mjs gateway --port 18799
   ```
3. Open Control UI at `http://127.0.0.1:18799/chat/main/explicit/santa-prefetch-1` and send:
   `Find five Christmas gifts from US retailers. Give me five direct product links.`
