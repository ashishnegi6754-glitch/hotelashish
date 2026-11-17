// Hotel Ashish — Cloudflare Worker (API). Static files are served from /public.

const ROOMS = [
  { id: "standard", name: "Standard Room", price: 1800, sleeps: 2, blurb: "Queen bed, AC, work desk and a quiet courtyard view." },
  { id: "deluxe", name: "Deluxe Room", price: 2600, sleeps: 3, blurb: "More space, a sitting corner, and a balcony." },
  { id: "family", name: "Family Suite", price: 3800, sleeps: 5, blurb: "Two connected rooms with a shared lounge." },
];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const clean = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = (v) => /^[+\d][\d\s-]{7,15}$/.test(v);
const toDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00Z") : null);

async function save(env, prefix, record) {
  const id = `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 4)}`.toUpperCase();
  record.id = id;
  record.createdAt = new Date().toISOString();
  console.log(JSON.stringify(record)); // visible in `wrangler tail`
  if (env.HOTEL_DATA) await env.HOTEL_DATA.put(`${prefix}:${id}`, JSON.stringify(record));
  return id;
}

async function reserve(request, env) {
  const b = await request.json().catch(() => null);
  if (!b) return json({ error: "Invalid request." }, 400);

  const room = ROOMS.find((r) => r.id === b.room);
  const inD = toDate(clean(b.checkIn, 10));
  const outD = toDate(clean(b.checkOut, 10));
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const name = clean(b.name, 80);
  const phone = clean(b.phone, 20);
  const email = clean(b.email, 120);
  const adults = Math.min(Math.max(parseInt(b.adults) || 1, 1), 10);
  const children = Math.min(Math.max(parseInt(b.children) || 0, 0), 10);

  if (!room) return json({ error: "Please choose a room." }, 400);
  if (!inD || !outD || inD < today) return json({ error: "Please choose valid check-in and check-out dates." }, 400);
  const nights = Math.round((outD - inD) / 86400000);
  if (nights < 1 || nights > 30) return json({ error: "Stay must be between 1 and 30 nights." }, 400);
  if (name.length < 2) return json({ error: "Please enter your name." }, 400);
  if (!isPhone(phone)) return json({ error: "Please enter a valid phone number." }, 400);
  if (email && !isEmail(email)) return json({ error: "Please enter a valid email address." }, 400);
  if (adults + children > room.sleeps) return json({ error: `${room.name} sleeps up to ${room.sleeps} guests.` }, 400);

  const reference = await save(env, "RES", {
    name, phone, email, room: room.id, checkIn: b.checkIn, checkOut: b.checkOut,
    adults, children, nights, total: nights * room.price, notes: clean(b.notes, 500),
  });
  return json({ ok: true, reference, nights, total: nights * room.price, room: room.name });
}

async function contact(request, env) {
  const b = await request.json().catch(() => null);
  if (!b) return json({ error: "Invalid request." }, 400);
  const name = clean(b.name, 80), email = clean(b.email, 120), message = clean(b.message, 1000);
  if (name.length < 2 || !isEmail(email) || message.length < 5)
    return json({ error: "Please fill in your name, a valid email and a message." }, 400);
  const reference = await save(env, "MSG", { name, email, message });
  return json({ ok: true, reference });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/rooms" && request.method === "GET") return json(ROOMS);
    if (pathname === "/api/reserve" && request.method === "POST") return reserve(request, env);
    if (pathname === "/api/contact" && request.method === "POST") return contact(request, env);
    if (pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
