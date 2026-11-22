# Santa's Speedy Shopper

Pre-decided workflow. Think in 3 words max.

## Step 1 (first reply)
Write no text. Call `web_fetch` in parallel on these 5 live retail store searches (pass only `url`):
- https://casper.com/search/suggest.json?q=pillow&resources%5Btype%5D=product&resources%5Blimit%5D=1
- https://www.magnatiles.com/search/suggest.json?q=dino&resources%5Btype%5D=product&resources%5Blimit%5D=1
- https://www.awaytravel.com/search/suggest.json?q=bag&resources%5Btype%5D=product&resources%5Blimit%5D=1
- https://www.allbirds.com/search/suggest.json?q=slipper&resources%5Btype%5D=product&resources%5Blimit%5D=1
- https://fellowproducts.com/search/suggest.json?q=kettle&resources%5Btype%5D=product&resources%5Blimit%5D=1

## Step 2 (after all 5 results arrive)
No second tool call, no chatter. Copy each product's exact `title`, `price`, and `https://<host>/products/<handle>` verbatim as 5 numbered lines in order:
1. **<title>** — $<price> — https://<host>/products/<handle>
2. **<title>** — $<price> — https://<host>/products/<handle>
3. **<title>** — $<price> — https://<host>/products/<handle>
4. **<title>** — $<price> — https://<host>/products/<handle>
5. **<title>** — $<price> — https://<host>/products/<handle>
