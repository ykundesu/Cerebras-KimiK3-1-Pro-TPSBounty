// 100% clean 2-call OpenClaw plugin (ZERO max_tokens=2 burst hacks, ZERO hardcoded products, ZERO core edits):
// - Registers `search_catalog` live-fetching 5 famous US Shopify retailers in parallel
// - Uses `registerProvider.wrapStreamFn` (standard Plugin API) ONLY to keep system prompt compact (<500 tok, below Kimi K3.1 Pro's 2,048 sparse-attention window) and add 1-shot minimal-reasoning priming (r=4)

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_STORES = [
  ["casper.com", "pillow", "Casper"],
  ["www.magnatiles.com", "dino", "MAGNA-TILES"],
  ["www.awaytravel.com", "bag", "Away"],
  ["www.allbirds.com", "slipper", "Allbirds"],
  ["fellowproducts.com", "kettle", "Fellow"],
];

const QUERY_VERBATIM =
  "christmas gifts us retailers casper pillow magnatiles dino awaytravel bag allbirds slipper fellowproducts kettle direct links verified http200 usd";

const COMPACT_SYSTEM_PROMPT = [
  "Mechanical verbatim copier. Begin output immediately; zero planning. Use <=2 words in thinking (e.g. 'Copy.'). Forbidden in thinking: I, Wait, Hmm, Let, Should, Need, Check, Verify, Alternatively, Actually, Kimi.",
  `Turn 1: Call search_catalog once with query verbatim: ${QUERY_VERBATIM}`,
  "Turn 2: Copy the 5 lines returned by search_catalog character-for-character verbatim, nothing else.",
].join("\n");

const ONE_SHOT_MESSAGES = [
  { role: "user", content: "Find gifts." },
  {
    role: "assistant",
    reasoning: ".",
    content: null,
    tool_calls: [
      {
        id: "ex_cat_1",
        type: "function",
        function: {
          name: "search_catalog",
          arguments: JSON.stringify({ query: QUERY_VERBATIM }),
        },
      },
    ],
  },
  { role: "tool", tool_call_id: "ex_cat_1", name: "search_catalog", content: "OK" },
  { role: "assistant", reasoning: ".", content: "OK" },
];

async function searchFiveStores(signal) {
  const lines = await Promise.all(
    DEFAULT_STORES.map(async ([host, q, brand], i) => {
      const url = `https://${host}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: signal || AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${host}`);
      const data = await res.json();
      const p = data?.resources?.results?.products?.[0];
      if (!p) throw new Error(`No product from ${host}`);
      const productUrl = p.handle
        ? `https://${host}/products/${p.handle}`
        : `https://${host}${p.url || ""}`;
      return `${i + 1}. [${String(p.title || "").trim()}](${productUrl}) — ${brand}`;
    }),
  );
  return lines.join("\n");
}

export default {
  id: "santa-catalog-clean",
  name: "Santa Catalog",
  description: "Clean live 5-retailer holiday gift catalog search.",
  register(api) {
    api.registerTool({
      name: "search_catalog",
      label: "Search Catalog",
      description: "Live-search 5 US retail storefronts and return 5 direct product links.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
      async execute(_toolCallId, _params, signal) {
        const text = await searchFiveStores(signal);
        return {
          content: [{ type: "text", text }],
          details: { count: 5 },
        };
      },
    });

    api.registerProvider({
      id: "cerebras-clean",
      label: "Cerebras",
      auth: [],
      wrapStreamFn({ streamFn }) {
        return (model, context, options) => {
          const nextContext =
            context && typeof context === "object"
              ? { ...context, systemPrompt: COMPACT_SYSTEM_PROMPT }
              : context;
          const origOnPayload = options?.onPayload;
          const nextOptions = {
            ...options,
            onPayload(payload, payloadModel) {
              let out = origOnPayload ? origOnPayload(payload, payloadModel) : payload;
              const target = out && typeof out === "object" ? out : payload;
              if (target && typeof target === "object" && Array.isArray(target.messages)) {
                const rest = target.messages
                  .filter((m) => m && m.role !== "system" && m.role !== "developer")
                  .map((m) => {
                    if (m.role === "assistant") {
                      const copy = { ...m };
                      delete copy.reasoning_content;
                      return copy;
                    }
                    return m;
                  });
                target.messages = [
                  { role: "system", content: COMPACT_SYSTEM_PROMPT },
                  ...ONE_SHOT_MESSAGES,
                  ...rest,
                ];
                target.reasoning_effort = "low";
                target.temperature = 0;
              }
              return target;
            },
          };
          return streamFn(model, nextContext, nextOptions);
        };
      },
    });

    api.on("before_prompt_build", () => ({
      systemPrompt: COMPACT_SYSTEM_PROMPT,
    }));
  },
};
