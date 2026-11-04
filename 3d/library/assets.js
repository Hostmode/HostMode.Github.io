// The library's asset records: one per piece in CATALOG (3d/scene.js), in the format checkRecord() in contracts.js
// expects. Search, filters and the asset check all read these. A new piece needs a line in META, or the checks fail.
// Every piece is drawn in code (3d/decor.js), so nothing here needs a licence.
import { CATALOG } from "../scene.js";

// Detail budget per category: the most triangles and separate drawn parts one piece may use, so phones stay quick.
// Chairs are small because a room has dozens; installations are big because a room has one or two.
export const BUDGET = {
  // Tables and chairs: parts sharing a material are joined (mergeParts in decor.js), so a chair is 2 to 3 draws, a dressed table about 5.
  "Tables": { tris: 30000, meshes: 10 }, "Seating": { tris: 6000, meshes: 6 }, "Balloons": { tris: 250000, meshes: 12 },
  "Backdrops & drapery": { tris: 250000, meshes: 40 }, "Centerpieces": { tris: 40000, meshes: 16 }, "Lighting & candles": { tris: 60000, meshes: 30 },
  "Florals & greenery": { tris: 120000, meshes: 30 }, "Lounge & accents": { tris: 40000, meshes: 30 }, "Stage & floor": { tris: 20000, meshes: 12 },
  "Food & drink": { tris: 30000, meshes: 20 }, "Audio & video": { tris: 20000, meshes: 12 }, "Structure": { tris: 20000, meshes: 8 }
};
const ALL = ["wedding", "shower", "birthday", "anniversary", "corporate", "gala", "graduation", "holiday", "community"];
const SOCIAL = ["wedding", "shower", "birthday", "anniversary", "gala", "graduation", "holiday"];
const PARTY = ["shower", "birthday", "graduation", "holiday", "community"];

// [description, tags, events, styles]
const META = {
  table_round:      ["60-inch round guest table that seats 8 to 10.", ["round", "guest table", "60 inch", "seats 8"], ALL, ["classic", "modern", "romantic"]],
  table_round72:    ["72-inch round guest table that seats 10 to 12.", ["round", "guest table", "72 inch", "seats 10"], ALL, ["classic", "glam", "romantic"]],
  table_rect:       ["6-foot rectangular banquet table for guests or service.", ["rectangle", "banquet", "6 foot", "service"], ALL, ["classic", "minimal"]],
  table_banquet:    ["8-foot banquet table for long rows of guests or a head table.", ["banquet", "8 foot", "head table", "rows"], ALL, ["classic", "minimal"]],
  table_farm:       ["Wooden farm table for rustic, family-style seating.", ["farm table", "wood", "family style"], ["wedding", "shower", "anniversary", "holiday", "community"], ["rustic", "boho", "garden"]],
  table_cocktail:   ["High-top cocktail table for standing guests.", ["cocktail", "high top", "standing", "mingling"], ALL, ["modern", "glam", "minimal"]],
  chair:            ["Chiavari chair, the classic ballroom chair.", ["chiavari", "ballroom", "gold", "seating"], ALL, ["classic", "glam", "romantic"]],
  chair_ghost:      ["Clear acrylic ghost chair.", ["ghost", "acrylic", "clear", "seating"], SOCIAL, ["modern", "glam", "minimal"]],
  chair_crossback:  ["Wooden cross-back chair.", ["cross-back", "wood", "seating"], ["wedding", "shower", "anniversary", "holiday", "community"], ["rustic", "boho", "garden"]],
  chair_folding:    ["Folding chair for ceremonies and casual events.", ["folding", "ceremony", "seating"], ALL, ["minimal", "classic"]],
  balloon_arch:     ["Balloon garland draped in an organic curve.", ["balloons", "garland", "organic"], PARTY, ["playful", "boho", "modern"]],
  balloon_full_arch:["Full balloon arch to walk through or frame a backdrop.", ["balloons", "arch", "entrance"], PARTY, ["playful", "glam"]],
  balloon_column:   ["Balloon column for entrances and stage edges.", ["balloons", "column", "entrance"], PARTY, ["playful", "classic"]],
  balloon_wall:     ["Wall of balloons for a photo backdrop.", ["balloons", "wall", "photo backdrop"], PARTY, ["playful", "glam"]],
  backdrop:         ["Framed backdrop panel behind a head table or stage.", ["backdrop", "panel", "photo"], ALL, ["classic", "modern", "minimal"]],
  pipe_drape:       ["Pipe and drape fabric panels to hide walls or divide a room.", ["drape", "fabric", "divider", "pipe and drape"], ALL, ["classic", "glam", "minimal"]],
  flower_wall:      ["Wall covered in flowers for photos or behind the couple.", ["flowers", "wall", "photo backdrop"], SOCIAL, ["romantic", "garden", "glam"]],
  shimmer_wall:     ["Sequin shimmer wall that sparkles under light.", ["sequin", "shimmer", "sparkle", "photo backdrop"], ["birthday", "gala", "corporate", "graduation", "holiday"], ["glam", "modern"]],
  ceiling_drape:    ["Fabric swags across the ceiling to soften the room.", ["ceiling", "drape", "fabric", "swag"], ["wedding", "gala", "anniversary", "corporate"], ["romantic", "glam", "classic"]],
  centerpiece:      ["Low floral centerpiece that guests can see over.", ["flowers", "low", "centerpiece"], SOCIAL, ["romantic", "garden", "classic"]],
  centerpiece_tall: ["Tall floral centerpiece on a slim vase.", ["flowers", "tall", "centerpiece", "vase"], ["wedding", "gala", "anniversary", "corporate"], ["glam", "classic", "romantic"]],
  candle_cluster:   ["Cluster of candles for a table.", ["candles", "votives", "centerpiece"], SOCIAL, ["romantic", "minimal", "classic"]],
  uplight:          ["Colored uplight that washes a wall.", ["uplight", "wall wash", "color"], ALL, ["modern", "glam"]],
  string_lights:    ["String of warm bulbs overhead.", ["string lights", "bulbs", "warm"], SOCIAL, ["rustic", "boho", "garden"]],
  chandelier:       ["Crystal chandelier that lights the room.", ["chandelier", "crystal", "ceiling"], ["wedding", "gala", "anniversary"], ["glam", "classic", "romantic"]],
  candle_floor:     ["Tall floor candles for an aisle or entrance.", ["candles", "floor", "aisle"], ["wedding", "anniversary", "gala"], ["romantic", "classic"]],
  light_truss:      ["Lighting truss for stage lights.", ["truss", "stage", "lighting"], ["corporate", "gala", "community", "graduation"], ["modern"]],
  arch:             ["Floral arch for a ceremony or photo spot.", ["flowers", "arch", "ceremony"], ["wedding", "anniversary", "shower"], ["romantic", "garden", "boho"]],
  aisle_flowers:    ["Flower stand to line an aisle.", ["flowers", "aisle", "stand"], ["wedding", "anniversary"], ["romantic", "garden", "classic"]],
  hanging_greenery: ["Greenery garland hung overhead.", ["greenery", "garland", "hanging"], SOCIAL, ["garden", "boho", "rustic"]],
  plant:            ["Potted plant to soften corners.", ["plant", "potted", "greenery"], ALL, ["garden", "modern", "boho"]],
  sofa:             ["Lounge sofa for a seating area.", ["lounge", "sofa", "seating"], ALL, ["modern", "glam", "boho"]],
  lounge_chair:     ["Lounge armchair.", ["lounge", "armchair", "seating"], ALL, ["modern", "glam", "boho"]],
  ottoman:          ["Ottoman for a lounge area.", ["lounge", "ottoman", "seating"], ALL, ["modern", "boho"]],
  coffee_table:     ["Coffee table for a lounge area.", ["lounge", "coffee table"], ALL, ["modern", "minimal"]],
  rug:              ["Area rug under a lounge or the head table.", ["rug", "carpet", "lounge"], ALL, ["boho", "classic", "modern"]],
  welcome_sign:     ["Welcome sign on an easel, with your own words.", ["sign", "welcome", "easel"], ALL, ["classic", "modern", "rustic"]],
  marquee:          ["Light-up marquee letters, like LOVE or a name.", ["marquee", "letters", "light-up"], SOCIAL, ["glam", "playful", "modern"]],
  gift_table:       ["Gift and card table near the entrance.", ["gifts", "cards", "entrance"], SOCIAL, ["classic", "minimal"]],
  stage:            ["Raised stage for speeches, a band or the head table.", ["stage", "riser", "platform"], ALL, ["classic", "modern"]],
  dance_floor:      ["Dance floor in any finish.", ["dance floor", "parquet"], ALL, ["classic", "glam", "modern"]],
  podium:           ["Podium for speeches.", ["podium", "lectern", "speeches"], ["corporate", "graduation", "gala", "community", "wedding"], ["classic", "minimal"]],
  bar:              ["Bar counter for drinks.", ["bar", "drinks", "counter"], ALL, ["classic", "modern", "rustic"]],
  buffet:           ["Buffet table with chafing dishes.", ["buffet", "food", "chafing"], ALL, ["classic", "rustic"]],
  food_station:     ["Food station counter.", ["food station", "catering", "counter"], ALL, ["modern", "minimal"]],
  cake_table:       ["Cake table with a tiered cake.", ["cake", "dessert", "table"], SOCIAL, ["romantic", "classic", "playful"]],
  speaker:          ["Speaker on a stand.", ["speaker", "sound", "audio"], ALL, ["modern"]],
  dj_booth:         ["DJ booth with a lit front.", ["dj", "music", "booth"], ALL, ["modern", "playful", "glam"]],
  screen:           ["Screen for slideshows or a big screen game.", ["screen", "slideshow", "video"], ALL, ["modern", "minimal"]],
  column:           ["Column, to match pillars in the real venue.", ["column", "pillar", "structure"], ALL, ["classic"]]
};

// The settings a person can change on each piece in the Selected tab.
function settingsOf(c) {
  const s = ["size", "position", "turn"];
  if (c.palette) s.push("color set"); else if (c.dress === "table") s.push("linens", "runner", "napkins"); else if (c.dress === "chair") s.push("chair cover", "sash", "frame color"); else s.push("color");
  if (c.mat && !c.palette && !c.dress) s.push("material");
  if (c.top) s.push("sits on a table");
  return s;
}

export const ASSETS = Object.entries(CATALOG).map(([id, c]) => {
  const m = META[id] || [];
  return {
    id, name: c.label, description: m[0], category: c.cat, tags: m[1], events: m[2], styles: m[3],
    maker: "decor.buildItem:" + id, size: { w: c.w, d: c.d, h: c.h }, settings: settingsOf(c),
    budget: BUDGET[c.cat] || { tris: 20000, meshes: 12 }, source: { kind: "drawn in code", licence: "Host Mode's own, nothing to license" },
    version: 1, status: "checked"
  };
});
export const assetById = id => ASSETS.find(a => a.id === id);
export const metaIds = () => Object.keys(META);

// Search the library: words match the name, description and tags; filters narrow by event, style and category.
export function searchAssets(q = "", f = {}) {
  const words = String(q).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return ASSETS.filter(a => (!f.event || a.events.includes(f.event)) && (!f.style || a.styles.includes(f.style)) && (!f.category || a.category === f.category)
    && words.every(w => (a.name + " " + a.description + " " + a.tags.join(" ")).toLowerCase().includes(w)));
}
