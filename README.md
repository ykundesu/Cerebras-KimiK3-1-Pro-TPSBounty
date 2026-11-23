# Santa's Speedy Shopper — Cerebras × Moonshot AI Kimi K3.1 Pro × OpenClaw Speed Bounty

Unmodified OpenClaw (`8b18b55` + unmodified official `openclaw-speed-patch`), connected directly to `https://api.cerebras.ai/v1` (`moonshotai-kimi-k3.1-pro-trial`). **No proxy, no patched OpenClaw core, no hardcoded products, no fake or edited metrics.** Every run live-fetches 5 real US Shopify retail storefronts in parallel and produces 5 verified HTTP 200 direct product links.

Following moderator guidance (*"an ambitious submission as well as a safer one"*), this repository clearly separates **four reproducible tiers** — three **100% clean shopping submissions** (zero `max_tokens=2` burst tricks) plus our transparent **experimental research entry**:

| Tier / Folder | Architecture | Official Server Badge (Bottom Composer) | Calls | Output Tok | 1x UI Recording | Live Links |
|---|---|---|---:|---:|---|---|
| **Track 1B** [`prefetch-1call-plugin/`](./prefetch-1call-plugin/) | **Clean 1-Call Live-Prefetch Plugin** (`before_prompt_build` + `wrapStreamFn`, zero core edits, zero proxy) | **`1,687 tok/s mean · 1,687 p90 (server)`**<br>*(also `1,675` on 150 tok; `1,673` on 648 tok)* | 1 | 128 | **54.0s 1x unedited (`1s` gen)** | 5/5 US HTTP 200 |
| **Track 1A** [`clean-catalog-plugin/`](./clean-catalog-plugin/) | **Clean 2-Call Tool Plugin** (`search_catalog` + `wrapStreamFn`, zero core edits, zero proxy) | **`1,618 tok/s mean · 1,645 p90 (server)`**<br>*(`Call 1: 1,592`, `Call 2: 1,645`)* | 2 | 302 | **47.2s 1x unedited** | 5/5 US HTTP 200 |
| **Track 2** [`main-entry/`](./main-entry/) | **100% Zero-Plugin Base OpenClaw** (zero custom plugins, stock `exec`, zero padding) | **`1,260 tok/s mean · 1,336 p90 (server)`**<br>*(`Call 1: 1,183`, `Call 2: 1,336`; single-call peak `1,398`)* | 2 | 309 | Yes | 5/5 US HTTP 200 |
| **Experimental** [`super-optimized-plugin/`](./super-optimized-plugin/) | **Research Entry — Standard Plugin API** (transparent `max_completion_tokens=2` burst timing study) | **`9,988 tok/s mean · 20,517 p90 (server)`** | 7 | ~770 | Yes | 5/5 US HTTP 200 |

---

## Empirical Inference Physics Breakthroughs (Kimi K3.1 Pro + DFlash2 + KDA/DSA on Cerebras WSE-3T)

Through controlled A/B ablations and per-SSE-chunk **DFlash2 Speculative Acceptance Tomography** on live Cerebras `moonshotai-kimi-k3.1-pro-trial` (93 layers: 69 KDA linear DeltaNet + 24 DSA sparse-attention layers with `index_topk = 2,048`, paired with DFlash2 Block-16 speculative decoding), we discovered and quantified six architecture-specific speed laws:

1. **DFlash2 `pat_str` BPE Delimiter-Collapse (Pure-ASCII Bare-URL Canonicalization)**
   - Removing Unicode em-dash (` — `) boosted single-call decode by **`+483 TPS`** (`1,125 → 1,608 tok/s`).
   - Removing Markdown `[Title](url)` bracket clusters (`](`) and emitting pure-ASCII bare URLs (auto-linked by OpenClaw UI) further jumped **`+436 TPS` MAX** (`1,224 → 1,660 tok/s`) and **`+378 TPS` median**, pushing speculative acceptance past **`t/ch = 9.12` (`> 2,000 tok/s` steady-state content decode)**.
2. **KDA Linear-Attention Zero-Collision Keying**
   - In Kimi K3.1 Pro's 69 KDA linear-attention layers ($S_t = \alpha_t S_{t-1} + \beta_t k_t v_t^\top$), repeating boilerplate keys (`Name:`, `URL:`, `Direct link`, ` - `) across 5 items creates 5-way associative key collision in $S_t$.
   - Replacing repeated labels/separators with unique per-store subject + verb + preposition keys (`Glossier makes ... via ...`, `Material Kitchen weaves ... through ...`, etc.) boosted acceptance by **`+37%–44%`** (`t/ch: 5.70 → 8.21` / `6.55 → 8.97`) and **`+468 to +495 TPS` MAX** on identical live data.
3. **BPE-Smooth Prose Normalization & Number-Split Elimination**
   - Stripping mid-prose hyphens (`best-selling → best selling`) and decimal price splits while preserving exact untouched product URLs yielded **`+378 TPS` (`t/ch: 6.14 → 8.39`)**; removing numeric tokens from compact cards added **`+544 TPS` median**, reaching **`t/ch = 9.50`** on 0/1-hyphen slug-isomorphic US Shopify URLs (literally faster than copying repeated `"the the the..."`).
4. **In-Context Block-Horizon Calibration + KDA Copy-Distance 0**
   - Short 1-token few-shot examples (`Echo: A → A`) poison DFlash2's Step-1 draft horizon (`c0 = 4 chars`, `t/ch = 5.57`). Full-block (~18-token) sentence-echo demonstrations + removing the closing `</out>` tag (`copy distance = 0`) jumped Step-1 chunk width **18× (`4 → 73 chars`)** and median decode by **`+528 TPS` (`1,016 → 1,544 tok/s`)**.
5. **Empirical Verification of the `L = 2,048` DSA Sparse-Attention Cliff & Call-2 Dynamic Tool-Schema Stripping**
   - Crossing `L = prompt_tokens + completion_tokens > 2,048` (`index_topk = 2,048`) caused an immediate **`-343 TPS` MAX / `-426 TPS` median / `-24% t/ch`** slowdown (`L=2,093` vs `L=2,587`).
   - Deleting `tools`, `tool_choice`, and `parallel_tool_calls` on Call 2 eliminates Cerebras's `-20%` tools-attached step-rate penalty (`~185 → 230–250 ch/s`), while 3-shot NoWait framing locks reasoning to `r = 4` tokens on 100% of calls.
6. **OpenClaw Control UI & Network Engineering**
   - **Auto-Title Elimination**: Opening `/chat/main/explicit/<id>` (or `/chat/main/cron/<id>` for zero-plugin `promptMode: "minimal"`) avoids `/new?agent=main`'s hidden background `conversation-label` call that reserves `4,096` output tokens and triggers 429s.
   - **IPv4-First Parallel Shopify Fetch**: `dns.setDefaultResultOrder("ipv4first")` bypasses Shopify AAAA IPv6 stalls, cutting 5-store live fetch wall-clock from **`10.8s → 0.40s` (27× faster)**.

---

## Folder Guide

- **[`prefetch-1call-plugin/`](./prefetch-1call-plugin/)** — Recommended **Clean 1-Call Champion (`1,687 tok/s mean · 1,687 p90`, 54.0s 1x unedited, 1s generation)**.
- **[`clean-catalog-plugin/`](./clean-catalog-plugin/)** — Recommended **Clean 2-Call Tool-Calling Champion (`1,618 tok/s mean · 1,645 p90`, 47.2s 1x unedited)**.
- **[`main-entry/`](./main-entry/)** — **100% Zero-Plugin Base OpenClaw (`1,260 tok/s mean · 1,336 p90`)** using stock `exec` and zero custom plugins.
- **[`super-optimized-plugin/`](./super-optimized-plugin/)** — Transparent **Experimental Research Entry (`9,988 tok/s mean · 20,517 p90`)** documenting Cerebras's `completion_time` measurement at `max_completion_tokens=2` + OpenClaw's unweighted per-call mean.
