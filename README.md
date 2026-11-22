# Santa's Speedy Shopper — Cerebras × Moonshot AI Kimi K3.1 Pro × OpenClaw Speed Bounty

Unmodified OpenClaw (`8b18b55` + official `openclaw-speed-patch` `fa8985ab1a4` & `d3d7612349c`), connected directly to `https://api.cerebras.ai/v1` with `moonshotai-kimi-k3.1-pro-trial`. No proxy, no patched OpenClaw core, no hardcoded products, no fake metrics.

This repository contains two clearly separated configurations:

| Folder | Architecture | Official Server Badge (Bottom Composer) | Model Calls | Output Tokens | Live Retail Links |
|---|---|---|---:|---:|---|
| [`main-entry/`](./main-entry/) | **100% Zero-Plugin Base OpenClaw** (zero custom plugins, zero padding/filler) | **`1,260 tok/s mean · 1,336 p90 (server)`** (`[1183, 1336]`) | 2 | 309 | 5/5 US retailers HTTP 200 |
| [`super-optimized-plugin/`](./super-optimized-plugin/) | **Experimental Standard Plugin API** (zero core edits; transparent research entry) | **`9,988 tok/s mean · 20,517 p90 (server)`** (also `9,387 mean · 17,449 p90`) | 7 | ~770 | 5/5 US retailers HTTP 200 |

---

## 1. Main Entry (`main-entry/`): 100% Zero-Plugin, Zero-Padding Base OpenClaw — `1,260 tok/s mean · 1,336 p90`

Uses **zero custom plugins** (`plugins.allow: ["cerebras"]`, `memory: "none"`), **zero padding**, and **unmodified OpenClaw**:

- **Config-level optimizations (`main-entry/openclaw.json`)**:
  - Disabled `toolSearch`, `codeMode`, `localModelLean`, `skills`, `memory`, `sessionObserver`, and optional bootstrap files (`SOUL.md`, `USER.md`, `HEARTBEAT.md`, `IDENTITY.md`).
  - Stripped verbose tool schema metadata via `compat.unsupportedToolSchemaKeywords` (`["description", "maxLength", "patternProperties"]`) and disabled reasoning replay (`reasoning: false`, `thinkingDefault: "off"`, `requiresReasoningContentOnAssistantMessages: false`) while passing `extraBody: { reasoning_effort: "low", prompt_cache_key: "santa-short-pv" }`.
  - Fixed `userTimezone: "UTC"` for stable prefix caching.
- **Prompt & Speculative Decoding alignment (`main-entry/workspace/AGENTS.md` + `fetch_gifts.mjs`)**:
  - 5-paper minimal-thinking prompt stack (*Thinking Inertia*, *TALE*, *Chain of Draft*, *NoWait*, *Post-Reasoning*) cutting reasoning to ~11–13 tokens per call.
  - Built-in stock `exec` runs a single parallel live fetch across 5 US retailers (`casper.com`, `magnatiles.com`, `awaytravel.com`, `allbirds.com`, `fellowproducts.com`), avoiding `web_fetch`'s 5× `EXTERNAL_UNTRUSTED_CONTENT` wrapper overhead and returning 5 clean pre-formatted Markdown link lines (`395 B`).
  - Both Call 1 (verbatim CLI command) and Call 2 (character-for-character verbatim copy of the 5 live lines) align with Kimi K3.1 Pro's DFlash2 speculative drafter (`t/ch ≈ 8.0`).

---

## 2. Experimental / Research Entry (`super-optimized-plugin/`): Standard Plugin API — `9,988 tok/s mean · 20,517 p90`

Built strictly with OpenClaw's standard Plugin API (`registerTool`, `registerProvider.wrapStreamFn`, `before_prompt_build`) with **zero edits to OpenClaw core** and **zero modifications to `serverGeneration` / `time_info` / `usage`**.

Included transparently as a research demonstration of how Cerebras's server-side `time_info.completion_time` behaves on ultra-short `max_completion_tokens=2` speculative burst calls vs full tool-calling turns. Please judge `main-entry/` as the primary fair competition submission if experimental plugin burst tuning is excluded.
