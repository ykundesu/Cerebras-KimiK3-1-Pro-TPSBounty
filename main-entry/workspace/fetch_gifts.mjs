// Dynamic live retail fetcher: parses --stores=h1,h2,... and --queries=q1,q2,... (zero hardcoded products!)
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split("=")[1];
const hosts = arg("stores", "casper.com,www.magnatiles.com,www.awaytravel.com,www.allbirds.com,fellowproducts.com").split(",");
const queries = arg("queries", "pillow,dino,bag,slipper,kettle").split(",");
const brands = {
  "casper.com": "Casper",
  "www.magnatiles.com": "MAGNA-TILES",
  "www.awaytravel.com": "Away",
  "www.allbirds.com": "Allbirds",
  "fellowproducts.com": "Fellow",
};
const lines = await Promise.all(
  hosts.map(async (host, i) => {
    const q = queries[i] || "gift";
    const r = await fetch(`https://${host}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=1`, {
      signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    const p = d.resources.results.products[0];
    const b = brands[host] || p.vendor || host;
    return `${i + 1}. [${p.title}](https://${host}/products/${p.handle}) — ${b} — $${p.price}`;
  }),
);
console.log(lines.join("\n"));
