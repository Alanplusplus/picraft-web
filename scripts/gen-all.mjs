#!/usr/bin/env node
/**
 * Generate all examples for non-photo scenes.
 * 10 styles × 2 examples each = 20 per scene.
 * Usage: node scripts/gen-all.mjs [--scene slug] [--only-missing]
 */
import { createHash } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXAMPLES_DIR = path.join(ROOT, "public", "examples");
const DATA_DIR = path.join(ROOT, "src", "data", "scenes");

const CONCURRENCY = 6;
const args = process.argv.slice(2);
const onlyScene = args.includes("--scene") ? args[args.indexOf("--scene") + 1] : null;

// ---- APIs ----
const KIE_BASE = "https://api.kie.ai/api/v1/jobs";
function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const file = path.resolve(ROOT, "..", "backend", ".env");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}
const KIE_TOKEN = readEnv("KIE_API_TOKEN");
if (!KIE_TOKEN) throw new Error("Set KIE_API_TOKEN (env var or backend/.env) before running this script.");
const NB_BASE = "https://api.chibistyle.app";

async function kieRequest(method, p, body) {
  const h = { Authorization: `Bearer ${KIE_TOKEN}` };
  if (body) h["Content-Type"] = "application/json";
  const res = await fetch(`${KIE_BASE}${p}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`KIE ${res.status}: ${await res.text()}`);
  return res.json();
}

async function kieGenerate(prompt, ar, model = "gpt-image-2-5-flare-text-to-image") {
  const resp = await kieRequest("POST", "/createTask", { model, input: { prompt, aspect_ratio: ar, resolution: "1K" } });
  if (resp.code !== 200 || !resp.data?.taskId) throw new Error(`KIE create: ${JSON.stringify(resp)}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const s = await kieRequest("GET", `/recordInfo?taskId=${resp.data.taskId}`);
    if (s.code !== 200 || !s.data) continue;
    if (s.data.state === "success") { const r = JSON.parse(s.data.resultJson || "{}"); return (r.resultUrls || [])[0]; }
    if (s.data.state === "fail") throw new Error(`KIE: ${s.data.failMsg}`);
  }
  throw new Error("KIE timeout");
}

function nbHeaders() {
  const ts = Math.floor(Date.now() / 1000).toString();
  return { ts, sign: createHash("md5").update("common" + ts + "ios").digest("hex"), "x-platform": "ios", "x-device-id": "B8F3A2D1-94E7-4C6B-A5E8-7D2F1C9E3B4A", "Content-Type": "application/json" };
}
async function nbRequest(method, p, body) {
  const res = await fetch(`${NB_BASE}${p}`, { method, headers: nbHeaders(), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`NB ${res.status}`);
  return res.json();
}
async function nbGenerate(prompt, ar) {
  const resp = await nbRequest("POST", "/common/v1/generate", { image_url_list: null, prompt, app: "nanobanana", params: {}, use_pro: false, image_size: ar, resolution: "1K" });
  if (resp.code !== 200 || !resp.data?.task_id) throw new Error(`NB create: ${resp.message}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 8000));
    const s = await nbRequest("GET", `/common/v1/task/${resp.data.task_id}`);
    if (!s.data) continue;
    if (s.data.status === "done") return (s.data.result?.image_urls || [])[0];
    if (s.data.status === "failed") throw new Error(`NB: ${s.message}`);
  }
  throw new Error("NB timeout");
}

async function downloadWebp(url, webpPath) {
  const pngPath = webpPath.replace(/\.webp$/, ".png");
  execSync(`curl -4 -sL -o ${JSON.stringify(pngPath)} ${JSON.stringify(url)}`, { timeout: 60000 });
  execSync(`cwebp -q 80 ${JSON.stringify(pngPath)} -o ${JSON.stringify(webpPath)}`, { timeout: 30000, stdio: "pipe" });
  fs.unlinkSync(pngPath);
}

function loadScene(slug) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${slug}.json`), "utf8"));
}

function getStyleField(scene) {
  return scene.fields.find(f => f.type === "select" && ["style","theme","genre","visual"].includes(f.key));
}

function renderPrompt(template, values) {
  let result = template;
  result = result.replace(/\[\[(.*?)\]\]/gs, (_, seg) => {
    const keys = [...seg.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]);
    return keys.some(k => !values[k]) ? "" : seg.replace(/\{\{\s*(\w+)\s*\}\}/g, (__, k) => values[k] || "");
  });
  result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => values[k] || "");
  return result.split("\n").map(l => l.trim()).filter(Boolean).join("\n");
}

// ---- Data for each scene (2 examples per style, unique content) ----

const SCENE_DATA = {};

// STICKER MAKER
SCENE_DATA["sticker-maker"] = {
  engine: "kie", ar: "1:1", w: 800, h: 800,
  items: [
    { subject: "A tiny fox reading a book under a mushroom", text: "Bookworm", style: "kawaii" },
    { subject: "A baby owl wearing oversized glasses perched on books", text: "", style: "kawaii" },
    { subject: "A happy golden retriever wearing sunglasses at the beach", text: "", style: "cartoon" },
    { subject: "A superhero cat flying through clouds with a cape", text: "Super Kitty", style: "cartoon" },
    { subject: "A VW camper van on a desert highway at sunset", text: "Road trip", style: "retro" },
    { subject: "A roller-skating bear with a boombox on its shoulder", text: "Groove on", style: "retro" },
    { subject: "A gentle whale swimming among jellyfish in deep ocean", text: "", style: "watercolor" },
    { subject: "A bouquet of wildflowers tied with a ribbon", text: "Bloom", style: "watercolor" },
    { subject: "A little astronaut planting a flower on the moon", text: "Dream big", style: "pixel" },
    { subject: "A treasure chest overflowing with gems and coins", text: "", style: "pixel" },
    { subject: "A blushing strawberry with tiny arms waving hello", text: "Hi!", style: "chibi" },
    { subject: "A sleeping dragon curled around a giant donut", text: "", style: "chibi" },
    { subject: "A light bulb sprouting leaves and small flowers", text: "Bright idea", style: "doodle" },
    { subject: "A paper airplane trailing dotted lines across the sky", text: "", style: "doodle" },
    { subject: "A flamingo standing in a puddle of neon reflections", text: "Stay lit", style: "neon" },
    { subject: "A boombox blasting colorful soundwaves into the dark", text: "", style: "neon" },
    { subject: "A slice of pizza with sunglasses giving a thumbs up", text: "Pizza time", style: "pop" },
    { subject: "A lipstick and a speech bubble with stars around it", text: "Bold", style: "pop" },
    { subject: "A grizzly bear catching a salmon mid-leap in a river", text: "", style: "woodcut" },
    { subject: "An anchor wrapped in rope with ocean waves behind it", text: "Steady", style: "woodcut" },
  ],
};

// BIRTHDAY INVITATION
SCENE_DATA["birthday-invitation-maker"] = {
  engine: "kie", ar: "3:4", w: 800, h: 1067,
  items: [
    { honoree: "Oliver", age: "is turning 4!", date: "Sunday, January 15", time: "11 AM – 1 PM", place: "Tiny Tots Playhouse", rsvp: "RSVP to Amy · 555-0199", theme: "party" },
    { honoree: "Mila", age: "is turning 6!", date: "Saturday, March 8", time: "2:00 – 4:30 PM", place: "Rainbow Bounce Arena", rsvp: "", theme: "party" },
    { honoree: "Sophie", age: "is turning 8!", date: "Saturday, February 22", time: "3:00 – 5:00 PM", place: "Starlight Skating Rink", rsvp: "RSVP by Feb 15", theme: "unicorn" },
    { honoree: "Ava", age: "is turning 5!", date: "Sunday, August 3", time: "10:30 AM", place: "Butterfly Garden Pavilion", rsvp: "", theme: "unicorn" },
    { honoree: "Leo", age: "is turning 6!", date: "Sunday, March 9", time: "10 AM – 12 PM", place: "Dino Discovery Museum", rsvp: "RSVP by March 1", theme: "dinosaur" },
    { honoree: "Ethan", age: "is turning 7!", date: "Saturday, September 13", time: "2:00 – 5:00 PM", place: "Treetop Adventure Course", rsvp: "", theme: "dinosaur" },
    { honoree: "Zara", age: "is turning 9!", date: "Friday, April 18", time: "5:00 – 7:00 PM", place: "Galaxy Laser Tag Arena", rsvp: "RSVP to Mike · 555-0277", theme: "space" },
    { honoree: "Noah", age: "is turning 3!", date: "Sunday, November 16", time: "11 AM – 1 PM", place: "Little Explorer Café", rsvp: "", theme: "space" },
    { honoree: "Richard", age: "turns 50!", date: "Saturday, May 24", time: "7:30 PM", place: "The Rooftop at Hotel Grand", rsvp: "RSVP by May 10", theme: "elegant" },
    { honoree: "Grace", age: "turns 30!", date: "Friday, October 31", time: "8:00 PM", place: "Moonlight Lounge, Downtown", rsvp: "RSVP to Grace", theme: "elegant" },
    { honoree: "Lily", age: "is turning 2!", date: "Sunday, June 8", time: "3:00 – 5:00 PM", place: "Rose Garden Park", rsvp: "", theme: "floral" },
    { honoree: "Charlotte", age: "turns 60!", date: "Saturday, July 26", time: "12:00 PM", place: "Lavender Hill Estate", rsvp: "RSVP to Anna", theme: "floral" },
    { honoree: "Max", age: "is turning 5!", date: "Saturday, July 19", time: "1:00 – 4:00 PM", place: "Wild Safari Park, Zone B", rsvp: "RSVP to Karen", theme: "safari" },
    { honoree: "Aiden", age: "is turning 4!", date: "Sunday, March 30", time: "10 AM", place: "Jungle Jim's Play Centre", rsvp: "", theme: "safari" },
    { honoree: "Luna", age: "is turning 7!", date: "Saturday, April 12", time: "2:00 – 4:00 PM", place: "Coral Beach Club", rsvp: "RSVP by April 5", theme: "mermaid" },
    { honoree: "Isla", age: "is turning 3!", date: "Sunday, May 18", time: "11 AM", place: "Seashell Splash Pool", rsvp: "", theme: "mermaid" },
    { honoree: "Jake", age: "is turning 10!", date: "Friday, August 8", time: "6:00 – 8:00 PM", place: "Pixel Palace Arcade", rsvp: "RSVP to Dan", theme: "retro" },
    { honoree: "Ryan", age: "is turning 12!", date: "Saturday, December 6", time: "4:00 PM", place: "Game Zone, 77 Pine Ave", rsvp: "", theme: "retro" },
    { honoree: "Chloe", age: "is turning 8!", date: "Saturday, January 25", time: "2:00 – 4:00 PM", place: "Art Loft Studio, 99 Birch St", rsvp: "RSVP to Jen", theme: "watercolor" },
    { honoree: "Isabella", age: "turns 21!", date: "Friday, February 14", time: "9:00 PM", place: "Velvet Lounge, Arts District", rsvp: "", theme: "watercolor" },
  ],
};

// BOOK COVER
SCENE_DATA["book-cover-maker"] = {
  engine: "kie", ar: "2:3", w: 800, h: 1208,
  items: [
    { title: "The Ember Throne", subtitle: "Book Two of the Ashen Crown", author: "Elena Castillo", genre: "fantasy", concept: "A crumbling throne engulfed in golden flames atop a mountain peak at dusk" },
    { title: "Crown of Stars", subtitle: "", author: "Isabelle Fontaine", genre: "fantasy", concept: "A young queen in armor under a sky of swirling galaxies" },
    { title: "Dead Drop", subtitle: "", author: "Marcus Cole", genre: "thriller", concept: "A rain-slicked alley in Berlin at night, a briefcase under a streetlight" },
    { title: "The Silent Witness", subtitle: "", author: "Patricia Quinn", genre: "thriller", concept: "A single eye peering through a crack in a door" },
    { title: "Summer in Santorini", subtitle: "A love story in the sun", author: "Nadia Blake", genre: "romance", concept: "A couple silhouetted against a sunset over white-washed buildings" },
    { title: "Love, Rewritten", subtitle: "Sometimes the sequel is better", author: "Jordan Lee", genre: "romance", concept: "Two people back-to-back on a park bench surrounded by autumn leaves" },
    { title: "Void Walker", subtitle: "", author: "Kai Zhang", genre: "scifi", concept: "An astronaut drifting toward a massive glowing portal in deep space" },
    { title: "Neon Exodus", subtitle: "The Colony Ship Trilogy", author: "Ravi Sharma", genre: "scifi", concept: "A colossal ship departing a cyberpunk megacity ringed by neon" },
    { title: "Atomic Habits for Teams", subtitle: "Small changes that transform organizations", author: "Dr. Rachel Owens", genre: "nonfiction", concept: "" },
    { title: "Design Your Day", subtitle: "A creative guide to intentional living", author: "Kira Novak", genre: "nonfiction", concept: "" },
    { title: "The Glass Orchard", subtitle: "", author: "Simone Beaumont", genre: "literary", concept: "Delicate glass apple trees in a misty meadow at dawn" },
    { title: "Paper Ghosts", subtitle: "", author: "Haruki Tanaka", genre: "literary", concept: "Origami cranes scattered across an old wooden desk with faded letters" },
    { title: "The Bone Garden", subtitle: "", author: "V.K. Mortis", genre: "horror", concept: "A fog-covered Victorian cemetery with a single figure holding a lantern" },
    { title: "Whispers at Willowmere", subtitle: "", author: "Daphne Crowe", genre: "horror", concept: "A crumbling mansion reflected in still black water at dusk" },
    { title: "Salt & Sunlight", subtitle: "Growing up on the coast", author: "Maria Santos", genre: "memoir", concept: "A weathered fishing boat on a pebble beach at golden hour" },
    { title: "Letters I Never Sent", subtitle: "", author: "David Park", genre: "memoir", concept: "A stack of handwritten letters tied with a faded ribbon" },
    { title: "The Brave Little Cloud", subtitle: "", author: "Emma Bailey", genre: "children", concept: "A fluffy cloud with a smiley face floating above a colorful village" },
    { title: "Mango and the Magic Map", subtitle: "", author: "Priya Desai", genre: "children", concept: "A parrot holding a treasure map in its beak over a jungle" },
    { title: "The Mapmaker's Daughter", subtitle: "", author: "Catherine Byrne", genre: "historical", concept: "A candlelit desk with old maps and a compass, a woman in period dress" },
    { title: "Empire of Sand", subtitle: "A novel of ancient Rome", author: "Julius Varro", genre: "historical", concept: "A Roman colosseum at sunset with eagles overhead" },
  ],
};

// EVENT FLYER
SCENE_DATA["event-flyer-maker"] = {
  engine: "kie", ar: "3:4", w: 800, h: 1067,
  items: [
    { eventName: "Farmers Market Opening", tagline: "Fresh produce & live music", date: "Saturday, April 5 · 8 AM", place: "Town Square, Main Street", details: "40+ vendors\nFree parking\nKids activities", cta: "farmersmarket.town", style: "community" },
    { eventName: "Pet Adoption Fair", tagline: "Find your new best friend", date: "Saturday, May 17 · 10 AM", place: "City Park, Dog Run Area", details: "Dogs & cats\nFree vet check", cta: "Happy Paws Rescue", style: "community" },
    { eventName: "Neon Nights DJ Battle", tagline: "", date: "Friday, June 20 · 10 PM", place: "Club Voltage, 55 Electric Ave", details: "6 DJs\n$10 cover\n21+", cta: "", style: "neon" },
    { eventName: "Latin Dance Night", tagline: "Salsa, bachata & merengue", date: "Every Friday · 9 PM", place: "Havana Lounge, 200 Ocean Dr", details: "Free lesson 9–10 PM", cta: "No cover before 10", style: "neon" },
    { eventName: "Punk Rock Showcase", tagline: "Three bands, one night", date: "Saturday, August 9 · 7 PM", place: "The Basement, 12 Brick Lane", details: "The Razors\nBurn Notice\nStatic Void", cta: "Tickets $15", style: "gig" },
    { eventName: "Acoustic Open Mic", tagline: "", date: "Every Wednesday · 7 PM", place: "The Coffee Barn", details: "Sign up at 6:30\n15 min sets", cta: "", style: "gig" },
    { eventName: "Annual Tech Summit 2025", tagline: "Innovation · Leadership · Growth", date: "October 14–16, 2025", place: "Convention Center, Hall A", details: "50+ speakers\nStartup showcase", cta: "Register at techsummit.io", style: "corporate" },
    { eventName: "Women in Leadership Forum", tagline: "Inspire · Connect · Lead", date: "Thursday, March 20 · 9 AM", place: "Hilton Downtown", details: "Keynote speaker\nPanel discussions", cta: "womenleadership.co", style: "corporate" },
    { eventName: "Winter Charity Gala", tagline: "An evening of elegance", date: "Saturday, December 13 · 6:30 PM", place: "Fairmont Hotel, Grand Ballroom", details: "Live orchestra\nSilent auction", cta: "Tables from $500", style: "gala" },
    { eventName: "Masquerade Ball", tagline: "Unmask the mystery", date: "Saturday, October 25 · 7 PM", place: "Château des Roses", details: "Costume contest\nGourmet buffet", cta: "Masks required", style: "gala" },
    { eventName: "Desert Music Festival", tagline: "3 days · 50 artists · 1 sunset", date: "June 20–22, 2025", place: "Red Canyon Amphitheater", details: "Camping available\nFood village\nArt installations", cta: "desertfest.live", style: "festival" },
    { eventName: "Sunset Sounds Festival", tagline: "Music under the stars", date: "August 15–17, 2025", place: "Riverside Park Amphitheater", details: "6 stages\nLocal food\nFree kids zone", cta: "sunsetsounds.co", style: "festival" },
    { eventName: "Vintage Flea Market", tagline: "Treasures from every decade", date: "First Sunday of every month", place: "Old Railway Warehouse", details: "100+ stalls\nFree entry\nStreet food", cta: "", style: "vintage" },
    { eventName: "Retro Cinema Night", tagline: "Classics on the big screen", date: "Saturday, November 8 · 7 PM", place: "The Grand Theatre", details: "Double feature\nPopcorn & sodas", cta: "$8 per person", style: "vintage" },
    { eventName: "5K Color Run", tagline: "Run. Get colorful. Have fun.", date: "Sunday, April 20 · 8 AM", place: "Lakefront Trail", details: "All ages welcome\nFree t-shirt\nMedal for finishers", cta: "colorrun.town", style: "sport" },
    { eventName: "CrossFit Open Day", tagline: "Your first workout is free", date: "Saturday, January 11 · 9 AM", place: "Iron Box Gym, 45 Steel St", details: "Free trial class\nCoach-led intro", cta: "ironboxgym.com", style: "sport" },
    { eventName: "Blanket Drive", tagline: "Warmth for those who need it most", date: "November 1–30", place: "Drop off at any City Library", details: "New or gently used\nAll sizes accepted", cta: "Hosted by Warm Hearts", style: "charity" },
    { eventName: "Charity Fun Run", tagline: "Every step helps a child learn", date: "Sunday, September 7 · 9 AM", place: "Central Park Loop", details: "5K walk or run\nKids race\nAll proceeds to schools", cta: "charityfunrun.org", style: "charity" },
    { eventName: "AI Hackathon Weekend", tagline: "Build. Ship. Win.", date: "March 22–23, 2025", place: "Innovation Hub, Floor 3", details: "48 hours\nMentors on-site\n$10K in prizes", cta: "aihack.dev", style: "tech" },
    { eventName: "Startup Demo Night", tagline: "10 startups. 5 minutes each.", date: "Thursday, October 2 · 6 PM", place: "TechHub Innovation Center", details: "Live pitches\nInvestor panel\nNetworking drinks", cta: "demonight.vc", style: "tech" },
  ],
};

// LINKEDIN BANNER
SCENE_DATA["linkedin-banner-maker"] = {
  engine: "nb", ar: "16:9", w: 800, h: 198,
  items: [
    { name: "Sarah Chen", headline: "Product Designer at Figma", visual: "gradient", color: "" },
    { name: "Alex Turner", headline: "Data Scientist · Machine Learning", visual: "gradient", color: "blue and teal" },
    { name: "Marcus Williams", headline: "Full-Stack Developer & Open Source", visual: "tech", color: "" },
    { name: "Ananya Patel", headline: "Cloud Architect · AWS · Kubernetes", visual: "tech", color: "dark navy and orange" },
    { name: "David Kim", headline: "Startup Founder · EdTech", visual: "city", color: "" },
    { name: "Michael Chen", headline: "Attorney at Law · Corporate M&A", visual: "city", color: "navy and gold" },
    { name: "James Rodriguez", headline: "Real Estate Broker · NYC", visual: "nature", color: "" },
    { name: "Laura Fischer", headline: "HR Director · People Strategy", visual: "nature", color: "lavender and sage" },
    { name: "Emily Park", headline: "Marketing Director | Brand Strategy", visual: "workspace", color: "" },
    { name: "Carlos Rivera", headline: "Executive Chef | Farm-to-Table", visual: "workspace", color: "warm wood tones" },
    { name: "Maria Gonzalez", headline: "UX Researcher | Accessibility", visual: "geometric", color: "purple and pink" },
    { name: "Tom Bradley", headline: "Sales Director | SaaS Growth", visual: "geometric", color: "" },
    { name: "Sophie Larsson", headline: "Photographer | Portraits & Weddings", visual: "ocean", color: "blush and gold" },
    { name: "Rachel Green", headline: "Veterinarian | Small Animal Medicine", visual: "ocean", color: "soft green" },
    { name: "Nina Volkov", headline: "Biotech Researcher | Gene Therapy", visual: "dark", color: "teal and white" },
    { name: "Omar Hassan", headline: "Architect | Sustainable Design", visual: "dark", color: "" },
    { name: "Yuki Tanaka", headline: "Motion Designer · Cinema 4D", visual: "bokeh", color: "orange and warm gold" },
    { name: "Fatima Al-Rashid", headline: "Civil Engineer | Infrastructure", visual: "bokeh", color: "green and gold" },
    { name: "James Wright", headline: "Podcast Host | Tech & Culture", visual: "minimalist", color: "charcoal and red" },
    { name: "Diana Torres", headline: "Content Strategist | B2B SaaS", visual: "minimalist", color: "navy and coral" },
  ],
};

// RESTAURANT MENU
SCENE_DATA["restaurant-menu-maker"] = {
  engine: "kie", ar: "3:4", w: 800, h: 1067,
  items: [
    { restaurantName: "The Golden Fork", cuisine: "European bistro", items: "French Onion Soup – gruyère crouton – $12\nSteak Frites – béarnaise, hand-cut fries – $28\nCreme Brûlée – vanilla bean – $10", style: "bistro", paper: "letter" },
    { restaurantName: "Saffron Palace", cuisine: "Royal Indian cuisine", items: "Samosa (2) – potato, peas, tamarind – $7\nButter Chicken – creamy tomato, basmati – $18\nGarlic Naan – $4\nGulab Jamun (3) – $7", style: "bistro", paper: "a4" },
    { restaurantName: "Sakura Ramen", cuisine: "Authentic Japanese ramen", items: "Tonkotsu Ramen – pork broth, chashu – $16\nMiso Ramen – corn, butter – $15\nGyoza (6 pcs) – ponzu – $8\nMatcha Ice Cream – $6", style: "modern", paper: "letter" },
    { restaurantName: "Wave Poké Bar", cuisine: "Hawaiian-inspired bowls", items: "Classic Ahi – tuna, soy, sesame, rice – $15\nSalmon Lover – avocado, mango – $16\nTofu Crunch – edamame, greens – $14\nMiso Soup – $4", style: "modern", paper: "letter" },
    { restaurantName: "Trailhead Tavern", cuisine: "Craft beer & comfort food", items: "Loaded Nachos – brisket, jalapeño – $14\nSmoked Wings (8) – dry rub – $15\nPulled Pork Sandwich – coleslaw – $16\nBrownie Sundae – $9", style: "rustic", paper: "letter" },
    { restaurantName: "Sunny Side Café", cuisine: "All-day breakfast & brunch", items: "Eggs Benedict – ham, hollandaise – $14\nAvocado Toast – poached egg – $12\nFluffy Pancakes (3) – maple, butter – $11\nCappuccino – $5", style: "rustic", paper: "letter" },
    { restaurantName: "El Fuego Taquería", cuisine: "Street tacos & mezcal", items: "Al Pastor – pineapple, cilantro – $4\nCarnitas – salsa verde – $4\nBirria – consommé dip, cheese – $5\nChurros – chocolate sauce – $7", style: "street", paper: "letter" },
    { restaurantName: "Pho 99", cuisine: "Vietnamese street food", items: "Pho Tai – rare beef, rice noodles – $14\nBanh Mi – grilled pork, pickled daikon – $10\nSpring Rolls (4) – peanut sauce – $8\nVietnamese Coffee – $5", style: "street", paper: "letter" },
    { restaurantName: "Ember & Oak", cuisine: "Wood-fired steakhouse", items: "Bone Marrow – sourdough, parsley – $16\nRibeye 16 oz – chimichurri – $58\nFilet Mignon 8 oz – truffle butter – $52\nChocolate Lava Cake – $14", style: "fine", paper: "letter" },
    { restaurantName: "Maison Laurent", cuisine: "French fine dining", items: "Soupe à l'Oignon – gruyère – $14\nDuck Confit – lentils, jus – $34\nBoeuf Bourguignon – mushrooms – $38\nTarte Tatin – crème fraîche – $16", style: "fine", paper: "a4" },
    { restaurantName: "The Ale House", cuisine: "Gastropub classics", items: "Fish & Chips – tartar sauce, mushy peas – $18\nShepherd's Pie – lamb, cheddar crust – $16\nSticky Toffee Pudding – $9\nPint of IPA – $7", style: "chalkboard", paper: "letter" },
    { restaurantName: "Smoke & Barrel BBQ", cuisine: "Low & slow Texas BBQ", items: "Brisket Plate – 1/2 lb, two sides – $22\nPulled Pork – two sides – $18\nBaby Back Ribs – half rack – $24\nCornbread – $3\nPecan Pie – $7", style: "chalkboard", paper: "letter" },
    { restaurantName: "Coconut Breeze", cuisine: "Tropical island kitchen", items: "Jerk Chicken – rice & peas, plantain – $18\nMango Shrimp Bowl – coconut rice – $20\nFried Plantain Chips – guacamole – $8\nRum Punch – $10", style: "tropical", paper: "letter" },
    { restaurantName: "Aloha Grill", cuisine: "Hawaiian BBQ & poke", items: "Kalua Pork Plate – mac salad – $16\nGrilled Mahi-Mahi – pineapple salsa – $22\nSpam Musubi (2) – $6\nShaved Ice – $5", style: "tropical", paper: "letter" },
    { restaurantName: "Bamboo Garden", cuisine: "Dim sum & Cantonese", items: "Har Gow – shrimp (4) – $7\nSiu Mai – pork (4) – $6\nChar Siu Bao – BBQ pork (3) – $7\nMango Pudding – $5", style: "japanese", paper: "a4" },
    { restaurantName: "Zen Bowl", cuisine: "Japanese curry & donburi", items: "Katsu Curry – pork cutlet, rice – $16\nSalmon Don – sashimi, pickles – $18\nEdamame – sea salt – $5\nHojicha Latte – $6", style: "japanese", paper: "letter" },
    { restaurantName: "Burger Barn", cuisine: "Smash burgers & shakes", items: "Classic Smash – cheese, pickles, sauce – $10\nBacon BBQ – onion rings, BBQ – $13\nFries – hand-cut, sea salt – $5\nMilkshake – vanilla or chocolate – $7", style: "retro", paper: "letter" },
    { restaurantName: "Malt Shop", cuisine: "Classic American diner", items: "Double Cheeseburger – lettuce, tomato – $11\nHot Dog – mustard, relish – $7\nChili Cheese Fries – $8\nRoot Beer Float – $6", style: "retro", paper: "letter" },
    { restaurantName: "The Olive Branch", cuisine: "Mediterranean wine bar", items: "Hummus & Pita – tahini, olive oil – $10\nGreek Salad – feta, olives – $12\nLamb Kofta – yogurt, rice – $22\nHouse Wine – glass – $11", style: "wine", paper: "a4" },
    { restaurantName: "Primrose Patisserie", cuisine: "French pastries & tea", items: "Croissant – classic butter – $4\nPain au Chocolat – dark chocolate – $5\nMacaron Box (6) – assorted – $14\nAfternoon Tea Set – $32\nLavender Latte – $6", style: "wine", paper: "a4" },
  ],
};

// T-SHIRT DESIGN
SCENE_DATA["t-shirt-design-maker"] = {
  engine: "kie", ar: "3:4", w: 800, h: 1067,
  items: [
    { idea: "A mountain range inside a circle with a camper van driving toward sunset", text: "Adventure Awaits", style: "vintage", shirt: "dark" },
    { idea: "A compass rose with mountain peaks in the center", text: "Find Your Way", style: "vintage", shirt: "light" },
    { idea: "A skull wearing a crown of roses", text: "", style: "streetwear", shirt: "dark" },
    { idea: "A tiger face made of dripping paint splashes", text: "", style: "streetwear", shirt: "dark" },
    { idea: "A lighthouse on a rocky coast with waves crashing", text: "Stay Anchored", style: "lineart", shirt: "light" },
    { idea: "A whale swimming through clouds among hot air balloons", text: "", style: "lineart", shirt: "dark" },
    { idea: "A happy dinosaur wearing headphones and dancing", text: "Jurassic Jams", style: "cute", shirt: "light" },
    { idea: "A cat sitting in a teacup surrounded by donuts", text: "Living my best life", style: "cute", shirt: "dark" },
    { idea: "A phoenix rising from geometric flames", text: "", style: "bold", shirt: "dark" },
    { idea: "An eagle with spread wings and a shield", text: "", style: "bold", shirt: "light" },
    { idea: "A koi fish swimming upstream through swirling water", text: "", style: "japanese", shirt: "dark" },
    { idea: "A cherry blossom branch with petals falling on wind", text: "", style: "japanese", shirt: "light" },
    { idea: "A vintage motorcycle with flames trailing behind it", text: "Born to Ride", style: "grunge", shirt: "dark" },
    { idea: "A roaring lion with a splattered ink background", text: "", style: "grunge", shirt: "dark" },
    { idea: "A fox face made of interconnected triangles and lines", text: "", style: "geometric", shirt: "light" },
    { idea: "A wolf howling at a moon composed of geometric shards", text: "", style: "geometric", shirt: "dark" },
    { idea: "Crossed baseball bats behind a home plate with stars", text: "Sluggers", style: "retro_sports", shirt: "light" },
    { idea: "A basketball going through a flaming hoop", text: "Nothing but net", style: "retro_sports", shirt: "dark" },
    { idea: "An anchor wrapped in a banner with roses around it", text: "Hold Fast", style: "tattoo", shirt: "dark" },
    { idea: "A swallow bird carrying a heart with daggers and roses", text: "", style: "tattoo", shirt: "light" },
  ],
};

// WEDDING INVITATION
SCENE_DATA["wedding-invitation-maker"] = {
  engine: "kie", ar: "3:4", w: 800, h: 1067,
  items: [
    { names: "Sophia Chen & Liam Anderson", date: "Saturday, September 20, 2025", time: "Four o'clock", venue: "The Lakeview Estate", location: "Lake Tahoe, California", rsvp: "RSVP by August 15", style: "botanical" },
    { names: "Aisha Noor & Daniel Fischer", date: "Sunday, September 28, 2025", time: "Four o'clock", venue: "Lakeside Pavilion", location: "Lake Tahoe, Nevada", rsvp: "RSVP to aisha.daniel@email.com", style: "botanical" },
    { names: "Julia Park & Andrew Bennett", date: "Sunday, January 19, 2025", time: "Half past four", venue: "The Loft at City Hall", location: "Brooklyn, New York", rsvp: "", style: "minimal" },
    { names: "Sienna Blake & Oliver Grant", date: "Saturday, May 3, 2025", time: "Five o'clock", venue: "The Greenhouse at Fern Valley", location: "Portland, Oregon", rsvp: "", style: "minimal" },
    { names: "Emily Rose & Daniel Kim", date: "Saturday, October 4, 2025", time: "Half past five", venue: "The Grand Ballroom at St. Regis", location: "", rsvp: "RSVP by September 1", style: "classic" },
    { names: "Zoe Chen & Alexander Wolf", date: "Saturday, December 20, 2025", time: "Six o'clock", venue: "The Winter Lodge", location: "Aspen, Colorado", rsvp: "RSVP by November 15", style: "classic" },
    { names: "Aria Patel & Marcus Johnson", date: "Friday, March 21, 2025", time: "", venue: "Willow Creek Vineyard", location: "Napa Valley, California", rsvp: "", style: "boho" },
    { names: "Luna Reyes & Sebastian Cruz", date: "Friday, November 7, 2025", time: "Sunset", venue: "Desert Bloom Ranch", location: "Sedona, Arizona", rsvp: "Reply by October 1", style: "boho" },
    { names: "Hannah Brooks & Caleb Wright", date: "Saturday, May 24, 2025", time: "Two o'clock", venue: "Magnolia Garden", location: "Savannah, Georgia", rsvp: "", style: "garden" },
    { names: "Natalie Kim & David Ruiz", date: "Saturday, August 9, 2025", time: "Four o'clock", venue: "Seaside Chapel", location: "Malibu, California", rsvp: "RSVP by July 1", style: "garden" },
    { names: "Catherine Moore & William Hayes", date: "Saturday, August 16, 2025", time: "Five o'clock", venue: "St. Andrew's Cathedral", location: "Charleston, South Carolina", rsvp: "RSVP by July 1", style: "art_deco" },
    { names: "Victoria Sterling & James Whitfield", date: "Saturday, April 5, 2025", time: "Seven o'clock in the evening", venue: "The Ritz Ballroom", location: "Manhattan, New York", rsvp: "Black tie", style: "art_deco" },
    { names: "Claire Beaumont & Thomas Nakamura", date: "Saturday, March 22, 2025", time: "Three o'clock", venue: "Cherry Blossom Garden", location: "Washington, D.C.", rsvp: "", style: "rustic" },
    { names: "Amara Johnson & Erik Svensson", date: "Sunday, April 27, 2025", time: "Noon", venue: "Sunflower Farm", location: "Provence, France", rsvp: "", style: "rustic" },
    { names: "Mia Torres & Ryan Campbell", date: "Saturday, April 12, 2025", time: "Three o'clock", venue: "The Vineyard at Rosewood Estate", location: "Sonoma, California", rsvp: "RSVP by March 5", style: "beach" },
    { names: "Isla Reed & Connor Walsh", date: "Saturday, June 7, 2025", time: "Five o'clock", venue: "The Sandbar", location: "Tulum, Mexico", rsvp: "", style: "beach" },
    { names: "Rose Delacroix & Henry St. Claire", date: "Saturday, June 21, 2025", time: "Four o'clock", venue: "Château Beaumont", location: "Loire Valley, France", rsvp: "RSVP by May 15", style: "moody" },
    { names: "Eva Lindgren & James Okafor", date: "Saturday, February 8, 2025", time: "Six o'clock", venue: "The Modern Art Museum", location: "Chicago, Illinois", rsvp: "", style: "moody" },
    { names: "Priya Mehta & Liam O'Sullivan", date: "Friday, July 18, 2025", time: "Half past five", venue: "The Cliffside at Montara", location: "Montara, California", rsvp: "RSVP at priyaandliam.com", style: "cherry_blossom" },
    { names: "Jasmine Kaur & Marco Rossi", date: "Sunday, October 12, 2025", time: "Five o'clock", venue: "The Olive Grove", location: "Tuscany, Italy", rsvp: "Reply by September 1", style: "cherry_blossom" },
  ],
};

// YOUTUBE THUMBNAIL
SCENE_DATA["youtube-thumbnail-maker"] = {
  engine: "kie", ar: "16:9", w: 800, h: 449,
  items: [
    { headline: "I QUIT MY JOB", topic: "A developer quits tech to travel, sitting at an airport with backpack and laptop", style: "bold" },
    { headline: "CRYPTO EXPLAINED", topic: "Beginner-friendly cryptocurrency explainer, blockchain as glowing interconnected blocks", style: "bold" },
    { headline: "BEST BUDGET PHONE", topic: "Budget smartphone review under $300, phones on a desk with spec comparison", style: "clean" },
    { headline: "DRAWING TIMELAPSE", topic: "Stunning pencil portrait timelapse, an artist's hand creating a face from scratch", style: "clean" },
    { headline: "30 DAYS NO SUGAR", topic: "Fitness challenge giving up sugar for 30 days, before and after, healthy food", style: "cinematic" },
    { headline: "HAUNTED HOTEL", topic: "Exploring abandoned haunted hotel at night with flashlights, eerie hallways", style: "cinematic" },
    { headline: "DON'T BUY THIS", topic: "Honest review of overrated gadgets, dramatic reaction face, red X marks on products", style: "playful" },
    { headline: "CAKE FAILS", topic: "Hilarious baking disasters, collapsed cakes, melted frosting, funny reactions", style: "playful" },
    { headline: "MORNING ROUTINE", topic: "Cozy morning routine, waking at sunrise, journaling with coffee, soft light", style: "vlog" },
    { headline: "DAY IN MY LIFE", topic: "A day in the life of a freelancer, working at coffee shops, city walks, sunset", style: "vlog" },
    { headline: "iPHONE 17 REVIEW", topic: "Hands-on review of the latest iPhone, close-up on screen and camera, sleek dark setup", style: "tech_review" },
    { headline: "BEST LAPTOP 2025", topic: "Comparing top 5 laptops side by side on a minimalist desk, specs overlay", style: "tech_review" },
    { headline: "DON'T WATCH ALONE", topic: "A creepy abandoned asylum at night, shadow figures, distorted camera angles", style: "horror" },
    { headline: "TRUE CRIME STORY", topic: "Dark investigation board with photos and red string, detective silhouette", style: "horror" },
    { headline: "RETRO GAME HUNT", topic: "Finding rare retro games at a flea market, stacks of cartridges and consoles", style: "retro_gaming" },
    { headline: "SPEEDRUN WORLD RECORD", topic: "Intense gaming speedrun, glowing monitor, fast-paced gameplay screenshot", style: "retro_gaming" },
    { headline: "ULTIMATE HOME GYM", topic: "Building a home gym for under $500, dumbbells and pull-up bar in a garage", style: "fitness" },
    { headline: "100 PUSH-UPS DAILY", topic: "A 30-day push-up challenge transformation, before and after physique shots", style: "fitness" },
    { headline: "JAPAN IN 7 DAYS", topic: "Epic Japan travel vlog, Tokyo neon, Kyoto temples, cherry blossoms, ramen", style: "travel" },
    { headline: "VAN LIFE ACROSS EUROPE", topic: "Living in a converted van traveling Europe, mountains, coastal roads, campfire", style: "travel" },
  ],
};

// ---- Build tasks ----

function buildTasks() {
  const tasks = [];
  for (const [slug, config] of Object.entries(SCENE_DATA)) {
    if (onlyScene && slug !== onlyScene) continue;
    const scene = loadScene(slug);
    const styleField = getStyleField(scene);
    
    for (let i = 0; i < config.items.length; i++) {
      const item = config.items[i];
      const values = {};
      
      for (const field of scene.fields) {
        if (field.type === "image") continue;
        if (field.type === "select") {
          const val = item[field.key] || field.default;
          const opt = field.options.find(o => o.value === val);
          values[field.key] = opt?.prompt || opt?.label || val;
        } else {
          // Optional fields left empty in the example row must stay empty; falling back to the
          // placeholder printed unrelated text (e.g. "Monday mood") on the generated artwork.
          values[field.key] = item[field.key] ?? (field.required ? field.placeholder || "" : "");
        }
      }

      const prompt = renderPrompt(scene.prompt, values);
      const styleLabel = styleField?.options.find(o => o.value === item[styleField.key])?.label || "";
      
      // Build alt text
      const altParts = [scene.name + " example:"];
      for (const field of scene.fields) {
        if (field.type === "image") continue;
        const v = item[field.key];
        if (!v) continue;
        if (field.type === "select") {
          const opt = field.options.find(o => o.value === v);
          altParts.push(opt?.label || v);
        } else {
          altParts.push(typeof v === "string" ? v.split("\n")[0].slice(0, 60) : String(v));
        }
      }

      tasks.push({
        slug, index: i,
        engine: config.engine, aspectRatio: config.ar,
        width: config.w, height: config.h,
        alt: altParts.join(", ").slice(0, 200),
        prompt,
      });
    }
  }
  return tasks;
}

// ---- Runner ----

async function generateOne(task) {
  const tag = `${task.slug}[${task.index}]`;
  console.log(`[START] ${tag}`);
  try {
    const url = task.engine === "nb"
      ? await nbGenerate(task.prompt, task.aspectRatio)
      : await kieGenerate(task.prompt, task.aspectRatio);
    if (!url) throw new Error("No URL");
    const ts = Date.now();
    const filename = `${task.slug}_${ts}_${task.index}`;
    const webpPath = path.join(EXAMPLES_DIR, `${filename}.webp`);
    await downloadWebp(url, webpPath);
    console.log(`[DONE] ${tag}`);
    return { ...task, result: { url: `/examples/${filename}.webp`, alt: task.alt, width: task.width, height: task.height, approved: true } };
  } catch (err) {
    console.error(`[FAIL] ${tag}: ${err.message}`);
    return { ...task, result: null };
  }
}

async function runBatch(tasks) {
  const results = []; let idx = 0;
  async function worker() { while (idx < tasks.length) { const i = idx++; results.push(await generateOne(tasks[i])); } }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return results;
}

async function main() {
  fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
  const tasks = buildTasks();
  console.log(`Total: ${tasks.length} tasks, concurrency: ${CONCURRENCY}`);
  
  const results = await runBatch(tasks);
  
  const bySlug = {};
  for (const r of results) { if (r.result) (bySlug[r.slug] ??= []).push(r); }
  
  for (const [slug, items] of Object.entries(bySlug)) {
    const jsonPath = path.join(DATA_DIR, `examples-${slug}.json`);
    const data = { items: items.sort((a, b) => a.index - b.index).map(i => i.result) };
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n");
    console.log(`Wrote ${jsonPath}: ${data.items.length} items`);
  }
  
  const failed = results.filter(r => !r.result);
  if (failed.length) { console.log(`\n${failed.length} failed:`); failed.forEach(f => console.log(`  - ${f.slug}[${f.index}]`)); }
  console.log(`\nDone! ${results.length - failed.length}/${results.length} succeeded.`);
}

main().catch(console.error);
