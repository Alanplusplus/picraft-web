#!/usr/bin/env node
/**
 * Update all scene JSON files to add new style options (to reach 10 each).
 * Also syncs to backend/scenes/.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_SCENES = path.resolve(__dirname, "..", "src", "data", "scenes");
const BACKEND_SCENES = path.resolve(__dirname, "..", "..", "backend", "scenes");

const NEW_OPTIONS = {
  "sticker-maker": {
    key: "style",
    add: [
      { value: "chibi", label: "Chibi anime", prompt: "chibi anime style with oversized head, tiny body, sparkly eyes and soft shading" },
      { value: "doodle", label: "Hand-drawn doodle", prompt: "hand-drawn pen doodle with loose sketchy lines and minimal color on white" },
      { value: "neon", label: "Neon glow", prompt: "neon glow style with bright electric colors on a dark base, glowing edges and light bloom effects" },
      { value: "pop", label: "Pop art", prompt: "pop art style with halftone dots, bold primary colors and thick outlines inspired by Roy Lichtenstein" },
      { value: "woodcut", label: "Woodcut print", prompt: "woodcut block-print style with bold black carved lines and limited flat color fills" },
    ],
  },
  "birthday-invitation-maker": {
    key: "theme",
    add: [
      { value: "safari", label: "Safari jungle", prompt: "playful safari jungle theme with lions, giraffes and tropical leaves, warm earth tones and bold rounded lettering" },
      { value: "mermaid", label: "Under the sea", prompt: "under-the-sea mermaid theme with shells, starfish and coral in aqua and lavender, whimsical script lettering" },
      { value: "retro", label: "Retro arcade", prompt: "retro arcade game theme with pixel hearts, joystick icons and neon colors on dark background, chunky 8-bit lettering" },
      { value: "watercolor", label: "Watercolor splash", prompt: "abstract watercolor splash design with vibrant color washes and modern brush-script lettering" },
    ],
  },
  "book-cover-maker": {
    key: "genre",
    add: [
      { value: "horror", label: "Horror / dark", prompt: "horror: ominous dark atmosphere, muted desaturated palette with a single accent color, distressed serif or gothic title" },
      { value: "memoir", label: "Memoir", prompt: "memoir: warm, intimate photographic feel with soft light, personal and approachable, handwritten or casual serif title" },
      { value: "children", label: "Children's book", prompt: "children's book: cheerful, colorful illustration with friendly characters, rounded playful title lettering" },
      { value: "historical", label: "Historical fiction", prompt: "historical fiction: aged parchment textures, sepia or muted period-accurate palette, elegant old-style serif title" },
    ],
  },
  "event-flyer-maker": {
    key: "style",
    add: [
      { value: "festival", label: "Music festival", prompt: "vibrant music festival style with psychedelic colors, layered collage elements and bold decorative display type" },
      { value: "vintage", label: "Vintage retro", prompt: "vintage retro style with faded warm tones, distressed paper texture and old-school typography" },
      { value: "sport", label: "Sports & fitness", prompt: "dynamic sports style with bold diagonal lines, high-energy colors and athletic condensed sans-serif type" },
      { value: "charity", label: "Warm charity", prompt: "warm charity appeal style with soft photography, pastel accent colors and friendly rounded sans-serif type" },
      { value: "tech", label: "Tech & startup", prompt: "modern tech and startup style with dark background, subtle grid patterns, gradient accents and clean geometric sans-serif" },
    ],
  },
  "linkedin-banner-maker": {
    key: "visual",
    add: [
      { value: "geometric", label: "Geometric shapes", prompt: "bold geometric shapes in a modern abstract pattern with clean lines and a professional color palette" },
      { value: "ocean", label: "Ocean & waves", prompt: "a calm ocean horizon with gentle waves and a sunrise, peaceful and professional mood" },
      { value: "dark", label: "Dark & premium", prompt: "a premium dark background with subtle metallic or gradient accents and elegant lighting" },
      { value: "bokeh", label: "Soft bokeh lights", prompt: "soft, warm bokeh light circles on a gently blurred background, ambient and professional" },
      { value: "minimalist", label: "Solid color block", prompt: "a clean solid color block design with a subtle duo-tone split, flat and modern" },
    ],
  },
  "restaurant-menu-maker": {
    key: "style",
    add: [
      { value: "chalkboard", label: "Chalkboard", prompt: "chalkboard design with white and colored chalk lettering on a dark slate background, hand-drawn food illustrations" },
      { value: "tropical", label: "Tropical café", prompt: "tropical café design with monstera leaves, bright coral and teal accents, playful sans-serif and hand-lettering mix" },
      { value: "japanese", label: "Japanese zen", prompt: "Japanese zen design with a washi paper texture, clean vertical layout, minimal ink brush accents and elegant Japanese-inspired typography" },
      { value: "retro", label: "Retro diner", prompt: "retro 1950s American diner style with checkered patterns, bold red and cream palette, vintage display type" },
      { value: "wine", label: "Wine bar", prompt: "wine bar and tapas design with a burgundy and cream palette, delicate vine illustrations and refined serif typography" },
    ],
  },
  "t-shirt-design-maker": {
    key: "style",
    add: [
      { value: "japanese", label: "Japanese ink", prompt: "Japanese sumi-e ink wash style with flowing brush strokes, minimal palette of black and red" },
      { value: "grunge", label: "Grunge texture", prompt: "grunge textured style with splattered paint, rough edges, layered distress marks and gritty feel" },
      { value: "geometric", label: "Geometric abstract", prompt: "clean geometric abstract style with precise shapes, flat colors and mathematical symmetry" },
      { value: "retro_sports", label: "Retro sports", prompt: "retro collegiate sports style with varsity lettering, crossed elements and a vintage athletic badge layout" },
      { value: "tattoo", label: "Traditional tattoo", prompt: "traditional American tattoo style with bold black outlines, limited palette of red, green, yellow and blue, classic flash art look" },
    ],
  },
  "wedding-invitation-maker": {
    key: "style",
    add: [
      { value: "art_deco", label: "Art Deco", prompt: "art deco design with geometric gold lines, fan shapes and a luxurious navy or emerald background, elegant sans-serif titles" },
      { value: "rustic", label: "Rustic wood", prompt: "rustic design with wood grain texture, mason jar and wildflower accents, warm browns and sunflower yellow, handwritten script names" },
      { value: "beach", label: "Beach & coastal", prompt: "beach and coastal design with watercolor ocean waves, sandy tones, seashell accents and a relaxed handwritten script" },
      { value: "moody", label: "Moody & dark", prompt: "moody romantic design with dark background, deep jewel-toned florals in burgundy and plum, elegant gold script names" },
      { value: "cherry_blossom", label: "Cherry blossom", prompt: "Japanese-inspired cherry blossom design with soft pink sakura branches on ivory, refined serif typography" },
    ],
  },
  "youtube-thumbnail-maker": {
    key: "style",
    add: [
      { value: "vlog", label: "Warm vlog", prompt: "warm, inviting vlog style with soft golden light, natural tones and a friendly, readable sans-serif headline" },
      { value: "tech_review", label: "Tech review", prompt: "sleek tech review style with a dark gradient background, product spotlight lighting and a futuristic sans-serif headline" },
      { value: "horror", label: "Dark & eerie", prompt: "dark, eerie horror-style with deep shadows, unsettling color grading and a distressed or dripping headline font" },
      { value: "retro_gaming", label: "Retro gaming", prompt: "retro gaming style with pixel elements, CRT scanline effects, bright neon colors and a chunky pixel headline" },
      { value: "fitness", label: "Fitness & energy", prompt: "high-energy fitness style with dynamic action lines, neon green or orange accents on dark background and a powerful bold headline" },
      { value: "travel", label: "Travel & explore", prompt: "travel and exploration style with a stunning landscape backdrop, cinematic color palette and an adventurous brushy headline" },
    ],
  },
};

for (const [slug, config] of Object.entries(NEW_OPTIONS)) {
  const filePath = path.join(WEB_SCENES, `${slug}.json`);
  const scene = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const field = scene.fields.find((f) => f.key === config.key);
  if (!field) {
    console.error(`Field ${config.key} not found in ${slug}`);
    continue;
  }

  const existingValues = new Set(field.options.map((o) => o.value));
  let added = 0;
  for (const opt of config.add) {
    if (!existingValues.has(opt.value)) {
      field.options.push(opt);
      added++;
    }
  }

  const content = JSON.stringify(scene, null, 2) + "\n";
  fs.writeFileSync(filePath, content);
  
  // Sync to backend
  const backendPath = path.join(BACKEND_SCENES, `${slug}.json`);
  if (fs.existsSync(backendPath)) {
    fs.writeFileSync(backendPath, content);
  }

  console.log(`${slug}: ${field.options.length} options (added ${added})`);
}

console.log("\nDone!");
