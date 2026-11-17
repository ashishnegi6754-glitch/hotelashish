# Hotel Ashish website

Node.js project deployed as a Cloudflare Worker with static assets.

- `public/` — the website (HTML, CSS, JS). Put photos in `public/images/`.
- `src/worker.js` — API: `GET /api/rooms`, `POST /api/reserve`, `POST /api/contact`.

## Run locally
```
npm install
npm run dev
```
Open the URL it prints (usually http://localhost:8787).

## Deploy to Cloudflare
```
npx wrangler login
npm run deploy
```
You get a `hotel-ashish.<your-subdomain>.workers.dev` URL. For your own domain:
Cloudflare dashboard → Workers & Pages → hotel-ashish → Settings → Domains & Routes.

## Save reservations (optional)
```
npx wrangler kv namespace create HOTEL_DATA
```
Paste the id into `wrangler.jsonc` (uncomment `kv_namespaces`) and redeploy.
Reservations and messages are then stored in KV; they are also visible live with `npx wrangler tail`.

## Things to edit
- Hotel name, address, phone, email: `public/index.html`
- Room names and prices: `ROOMS` in `src/worker.js`
- Restaurant menu: `MENU` in `public/app.js`
- Photos: replace the gradient classes (`.art-a/b/c`) in `public/style.css` with `background-image:url(/images/your-photo.jpg)`
