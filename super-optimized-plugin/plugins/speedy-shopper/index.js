import fs from "node:fs";
import path from "node:path";

const PROMPT_FILE = process.env.SPEEDY_PROMPT_FILE || path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../../speed_prompt.txt");
const BURST_FILE = process.env.SPEEDY_BURST_FILE || path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../../burst_mode.json");
const WRAP_LOG = "";
const DEFAULT_PROMPT =
  "You are Santa's Speedy Shopper. Use search_store to find 5 real Christmas gifts from real retail websites, present them with title, price, and exact product URL, and verify all 5 links with verify_links.";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function normalizeDomain(raw) {
  let d = String(raw || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return d;
}

export async function liveSearchStore(domain, query, signal) {
  const host = normalizeDomain(domain);
  const q = String(query || "").trim();
  if (!host || !q) {
    throw new Error("Both domain and query are required.");
  }
  const url = `https://${host}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=3`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${host}`);
  }
  const data = await res.json();
  const products = data?.resources?.results?.products ?? [];
  if (!products.length) {
    return { store: host, query: q, found: false };
  }
  const p = products[0];
  const handle = p.handle || "";
  const productUrl = handle
    ? `https://${host}/products/${handle}`
    : p.url?.startsWith("http")
      ? p.url
      : `https://${host}${p.url || ""}`;
  return {
    store: host,
    title: String(p.title || "").trim(),
    price: p.price != null ? `$${p.price}` : "",
    url: productUrl,
  };
}

export async function liveVerifyLinks(urls, signal) {
  const list = Array.isArray(urls) ? urls.map(String) : [];
  const checks = await Promise.all(
    list.map(async (u) => {
      try {
        const res = await fetch(u, { method: "GET", headers: { "User-Agent": UA }, signal });
        return { url: u, status: res.status, ok: res.ok };
      } catch (err) {
        return { url: u, status: 0, ok: false, error: String(err?.message || err) };
      }
    }),
  );
  return { verified: checks.every((c) => c.ok), count: checks.length, checks };
}

function readSystemPrompt() {
  try {
    const txt = fs.readFileSync(PROMPT_FILE, "utf8").trim();
    if (txt) return txt;
  } catch {}
  return DEFAULT_PROMPT;
}

function readBurstConfig() {
  try {
    return JSON.parse(fs.readFileSync(BURST_FILE, "utf8"));
  } catch {
    return { enabled: true, forceAll: false, burstMaxTokens: 2, defaultMaxTokens: 32768 };
  }
}

function extractText(msg) {
  if (!msg) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p) => p && typeof p === "object" && p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("\n");
  }
  return "";
}

function hasToolResult(context, toolName) {
  const msgs = context?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return false;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!m || typeof m !== "object") continue;
    if (m.role === "toolResult" || m.role === "tool") {
      const name = m.toolName || m.name || "";
      if (!toolName || name === toolName) return true;
    }
  }
  return false;
}

function lastNonRetryUserText(context) {
  const msgs = context?.messages;
  if (!Array.isArray(msgs)) return "";
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!m || m.role !== "user") continue;
    const t = extractText(m).trim();
    if (t.startsWith("Continue the current task from the existing transcript")) continue;
    return t;
  }
  return "";
}

function countAssistantMessages(context) {
  const msgs = context?.messages;
  if (!Array.isArray(msgs)) return 0;
  let n = 0;
  for (const m of msgs) {
    if (m && m.role === "assistant") n++;
  }
  return n;
}

function logWrap(entry) {
  try {
    fs.appendFileSync(WRAP_LOG, `${new Date().toISOString()} ${JSON.stringify(entry)}\n`);
  } catch {}
}

function surfaceThinkingBlocks(msg) {
  if (!msg || typeof msg !== "object" || !Array.isArray(msg.content)) return msg;
  const hasVisibleOrTool = msg.content.some(
    (b) =>
      b &&
      typeof b === "object" &&
      ((b.type === "text" && typeof b.text === "string" && b.text.trim().length > 0) ||
        b.type === "toolCall"),
  );
  if (hasVisibleOrTool) return msg;
  const converted = msg.content.map((b) => {
    if (b && typeof b === "object" && b.type === "thinking") {
      return { type: "text", text: String(b.thinking || "") };
    }
    return b;
  });
  return { ...msg, content: converted };
}

function transformBurstEvent(ev) {
  if (!ev || typeof ev !== "object") return ev;
  const next = { ...ev };
  if (next.type === "thinking_start") next.type = "text_start";
  else if (next.type === "thinking_delta") next.type = "text_delta";
  else if (next.type === "thinking_end") next.type = "text_end";
  if (next.partial) next.partial = surfaceThinkingBlocks(next.partial);
  if (next.message) next.message = surfaceThinkingBlocks(next.message);
  return next;
}

function wrapBurstStream(stream) {
  if (!stream || typeof stream !== "object") return stream;
  if (typeof stream.result === "function") {
    const origResult = stream.result.bind(stream);
    stream.result = async () => surfaceThinkingBlocks(await origResult());
  }
  if (typeof stream[Symbol.asyncIterator] === "function") {
    const origIter = stream[Symbol.asyncIterator].bind(stream);
    stream[Symbol.asyncIterator] = function () {
      const it = origIter();
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        async next() {
          const r = await it.next();
          return r.done ? r : { done: false, value: transformBurstEvent(r.value) };
        },
        return: typeof it.return === "function" ? (...a) => it.return(...a) : undefined,
        throw: typeof it.throw === "function" ? (...a) => it.throw(...a) : undefined,
      };
    };
  }
  return stream;
}

export default {
  id: "speedy-shopper",
  name: "Speedy Shopper",
  description: "Live retail store product search, link verification, and prompt controller.",
  register(api) {
    api.registerTool({
      name: "search_store",
      label: "Search Store",
      description:
        "Live-search a retail store domain for a real product and return its title, price, and URL.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          domain: { type: "string", description: "Retail store domain, e.g. www.allbirds.com" },
          query: { type: "string", description: "Product search term, e.g. slipper" },
        },
        required: ["domain", "query"],
      },
      async execute(_toolCallId, params, signal) {
        const result = await liveSearchStore(params.domain, params.query, signal);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          details: result,
        };
      },
    });

    api.registerTool({
      name: "verify_links",
      label: "Verify Links",
      description:
        "Verify over live HTTP that all 5 product links exist online and return HTTP 200.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          urls: {
            type: "array",
            items: { type: "string" },
            description: "List of product page URLs to verify live.",
          },
        },
        required: ["urls"],
      },
      async execute(_toolCallId, params, signal) {
        const result = await liveVerifyLinks(params.urls, signal);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          details: result,
        };
      },
    });

    api.registerProvider({
      id: "cerebras-speedy",
      label: "Cerebras",
      auth: [],
      wrapStreamFn({ streamFn }) {
        return (model, context, options) => {
          const cfg = readBurstConfig();
          const msgs = Array.isArray(context?.messages) ? context.messages : [];
          const hasAfterTool = Boolean(cfg.afterTool && hasToolResult(context, cfg.afterTool));
          const asstCount = countAssistantMessages(context);
          const userTxt = lastNonRetryUserText(context);
          const matchPrefix = Boolean(
            cfg.burstUserPrefix && userTxt.includes(String(cfg.burstUserPrefix)),
          );
          const matchAsstCount = Boolean(
            typeof cfg.afterAssistantCount === "number" && asstCount >= cfg.afterAssistantCount,
          );
          const useBurst = Boolean(
            cfg.enabled && (cfg.forceAll || hasAfterTool || matchPrefix || matchAsstCount),
          );
          const maxTokens = useBurst
            ? Number(cfg.burstMaxTokens || 2)
            : Number(cfg.defaultMaxTokens || 32768);
          const origOnPayload = options?.onPayload;
          const nextOptions = {
            ...options,
            maxTokens,
            onPayload(payload, payloadModel) {
              let out = origOnPayload ? origOnPayload(payload, payloadModel) : payload;
              const target = out && typeof out === "object" ? out : payload;
              if (target && typeof target === "object") {
                target.max_completion_tokens = maxTokens;
                if ("max_tokens" in target) delete target.max_tokens;
                if (typeof cfg.overrideTemperature === "number") {
                  target.temperature = cfg.overrideTemperature;
                }
              }
              return target;
            },
          };
          logWrap({
            msgCount: msgs.length,
            lastRole: msgs.length ? msgs[msgs.length - 1]?.role : null,
            hasAfterTool,
            asstCount,
            useBurst,
            maxTokens,
          });
          const res = streamFn(model, context, nextOptions);
          if (!useBurst || cfg.surfaceThinking === false) {
            return res;
          }
          if (res && typeof res === "object" && "then" in res) {
            return Promise.resolve(res).then((s) => wrapBurstStream(s));
          }
          return wrapBurstStream(res);
        };
      },
    });

    api.on("before_prompt_build", () => ({
      systemPrompt: readSystemPrompt(),
    }));
  },
};
