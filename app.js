const rupee = (n) => "₹" + n.toLocaleString("en-IN");
const $ = (s, r = document) => r.querySelector(s);
let rooms = [];

// ---- dates: today as minimum ----
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
document.querySelectorAll('input[type=date]').forEach((i) => (i.min = today));
$("#yr").textContent = new Date().getFullYear();

// ---- mobile nav ----
const navEl = $(".nav nav"), mb = $(".menu-btn");
mb.addEventListener("click", () => mb.setAttribute("aria-expanded", navEl.classList.toggle("open")));
navEl.addEventListener("click", (e) => { if (e.target.tagName === "A") navEl.classList.remove("open"); });

// ---- helpers ----
function nightsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function say(el, msg, kind) { el.textContent = msg; el.className = "status " + (kind || ""); }
async function post(url, data) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}

// ---- rooms ----
const arts = ["art-a", "art-b", "art-c"];
function renderRooms(nights, guests) {
  $("#roomList").innerHTML = rooms.map((r, i) => `
    <article class="room">
      <div class="art ${arts[i % 3]}"></div>
      <div class="body">
        <h3>${r.name}</h3>
        <p>${r.blurb}</p>
        <div class="price">${rupee(r.price)} <small>/ night · sleeps ${r.sleeps}</small></div>
        ${nights ? `<div>${nights} night${nights > 1 ? "s" : ""}: <b>${rupee(nights * r.price)}</b>${guests > r.sleeps ? ' <small>(too many guests for this room)</small>' : ""}</div>` : ""}
        <a class="btn" href="#reserve" data-room="${r.id}">Reserve this room</a>
      </div>
    </article>`).join("");
}
fetch("/api/rooms").then((r) => r.json()).then((data) => {
  rooms = data;
  renderRooms(0, 0);
  $("#roomSelect").innerHTML = rooms.map((r) => `<option value="${r.id}">${r.name} — ${rupee(r.price)}/night</option>`).join("");
}).catch(() => { $("#roomList").textContent = "Rooms could not be loaded. Please call us to book."; });

$("#roomList").addEventListener("click", (e) => {
  const id = e.target.dataset && e.target.dataset.room;
  if (id) { $("#roomSelect").value = id; updateSummary(); }
});

// ---- availability bar -> prices + prefill reservation ----
$("#checkForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const nights = nightsBetween(f.get("checkIn"), f.get("checkOut"));
  const q = $("#quote");
  if (nights < 1) { q.hidden = false; q.textContent = "Check-out must be after check-in."; return; }
  const guests = +f.get("adults") + +f.get("children");
  const res = $("#resForm");
  for (const k of ["checkIn", "checkOut", "adults", "children"]) res.elements[k].value = f.get(k);
  renderRooms(nights, guests);
  q.hidden = false;
  q.textContent = `${nights} night${nights > 1 ? "s" : ""}, ${guests} guest${guests > 1 ? "s" : ""}. Totals below are shown for each room.`;
  updateSummary();
  $("#rooms").scrollIntoView();
});

// ---- reservation ----
const resForm = $("#resForm");
function updateSummary() {
  const f = new FormData(resForm), n = nightsBetween(f.get("checkIn"), f.get("checkOut")), r = rooms.find((x) => x.id === f.get("room")), s = $("#summary");
  if (n > 0 && r) { s.hidden = false; s.textContent = `${r.name}, ${n} night${n > 1 ? "s" : ""}: ${rupee(n * r.price)}`; } else s.hidden = true;
}
resForm.addEventListener("change", updateSummary);
resForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = $("#resStatus"), btn = resForm.querySelector("button");
  btn.disabled = true; say(st, "Sending…");
  try {
    const out = await post("/api/reserve", Object.fromEntries(new FormData(resForm)));
    say(st, `Request received. Reference ${out.reference}: ${out.room}, ${out.nights} night(s), ${rupee(out.total)}. We will call to confirm.`, "ok");
    resForm.reset(); $("#summary").hidden = true;
  } catch (err) { say(st, err.message, "err"); }
  btn.disabled = false;
});

// ---- contact ----
$("#msgForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, st = $("#msgStatus"), btn = f.querySelector("button");
  btn.disabled = true; say(st, "Sending…");
  try { await post("/api/contact", Object.fromEntries(new FormData(f))); say(st, "Message sent. We will reply soon.", "ok"); f.reset(); }
  catch (err) { say(st, err.message, "err"); }
  btn.disabled = false;
});

// ---- menu (edit freely) ----
const MENU = {
  mains: [["Paneer Butter Masala", "Creamy tomato gravy", 280], ["Dal Makhani", "Slow-cooked overnight", 240], ["Chicken Tikka Masala", "Charcoal-grilled, rich gravy", 340], ["Veg Biryani", "With raita", 260]],
  breakfast: [["Aloo Paratha", "With curd and pickle", 120], ["Poha", "Lemon, peanuts, sev", 90], ["Masala Omelette", "Two eggs, toast", 110], ["Poori Sabzi", "Served till 11 am", 130]],
  sweet: [["Gulab Jamun", "Two pieces", 80], ["Rasmalai", "Two pieces", 100], ["Gajar Halwa", "Seasonal", 120], ["Ice Cream Sundae", "", 150]],
  drinks: [["Masala Chai", "", 40], ["Cold Coffee", "", 120], ["Sweet Lassi", "", 90], ["Fresh Lime Soda", "", 70]],
};
function showMenu(tab) {
  $("#menuList").innerHTML = MENU[tab].map(([n, d, p]) => `<li><div><b>${n}</b>${d ? `<span>${d}</span>` : ""}</div><b>${rupee(p)}</b></li>`).join("");
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
}
document.querySelector(".tabs").addEventListener("click", (e) => { if (e.target.dataset.tab) showMenu(e.target.dataset.tab); });
showMenu("mains");
