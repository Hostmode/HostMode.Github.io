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
  "Food & drink": { tris: 30000, meshes: 20 }, "Audio & video": { tris: 20000, meshes: 12 }, "Photo & effects": { tris: 40000, meshes: 16 },
  // Outdoors: a site has a few tents and a little equipment, plus its own buildings (drawn as simple boxes with windows)
  "Tents & shade": { tris: 20000, meshes: 12 }, "Site & power": { tris: 20000, meshes: 12 }, "Structure": { tris: 20000, meshes: 8 }
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
  column:           ["Column, to match pillars in the real venue.", ["column", "pillar", "structure"], ALL, ["classic"]],
  // Added Nov 3, 2026 (Phase 4). The research behind each one is in research/ and specs/.
  table_serpentine: ["Curved serpentine table: four make a circle, two make an S.", ["serpentine", "curved", "s-curve", "guest table"], ["wedding", "anniversary", "gala", "corporate"], ["modern", "romantic", "rustic"]],
  table_sweetheart: ["Table for two, so the couple faces their guests.", ["sweetheart", "couple", "head table"], ["wedding", "anniversary"], ["romantic", "classic", "glam"]],
  table_head:       ["24-foot head table that seats 12 on one side, facing the room.", ["head table", "wedding party", "one side"], ["wedding", "gala", "corporate"], ["classic", "glam"]],
  chair_banquet:    ["Stackable padded banquet chair, the hotel ballroom standard.", ["banquet", "stackable", "hotel", "padded", "seating"], ["wedding", "corporate", "gala", "community", "graduation", "holiday"], ["classic", "minimal"]],
  chair_throne:     ["High-backed throne chair for the couple or guest of honor.", ["throne", "king", "queen", "guest of honor", "statement", "seating"], SOCIAL, ["glam", "romantic", "classic"]],
  bench:            ["8-foot wooden bench for ceremony rows or family-style tables.", ["bench", "ceremony", "family style", "seating"], ["wedding", "community", "holiday", "shower"], ["rustic", "boho", "garden"]],
  champagne_wall:   ["Self-serve champagne wall that doubles as a photo spot.", ["champagne", "glasses", "self-serve", "drinks", "photo backdrop"], SOCIAL, ["glam", "romantic", "modern"]],
  entrance_arch:    ["Arch with sheer draping and flowers for an entrance or aisle.", ["arch", "entrance", "drape", "flowers", "ceremony"], ["wedding", "anniversary", "gala", "shower"], ["romantic", "glam", "garden"]],
  partition:        ["Folding room divider to hide service areas or make a corner.", ["divider", "screen", "partition", "folding"], ["wedding", "corporate", "gala", "community"], ["boho", "classic", "modern"]],
  bud_vases:        ["Group of bud vases with single blooms.", ["bud vases", "single stem", "flowers", "centerpiece"], SOCIAL, ["minimal", "garden", "boho"]],
  table_garland:    ["Greenery garland down the middle of a table.", ["garland", "greenery", "runner", "eucalyptus", "centerpiece"], SOCIAL, ["garden", "rustic", "boho"]],
  branches:         ["Tall branch centerpiece with hanging crystals.", ["branches", "manzanita", "tall", "crystals", "centerpiece"], ["wedding", "gala", "holiday", "anniversary"], ["glam", "modern", "garden"]],
  bouquet:          ["Bouquet laid on the sweetheart or head table.", ["bouquet", "bridal", "flowers"], ["wedding", "anniversary", "shower"], ["romantic", "garden", "classic"]],
  lanterns:         ["Three candle lanterns for paths, steps and entrances.", ["lanterns", "candles", "path", "entrance"], SOCIAL, ["rustic", "boho", "romantic"]],
  spotlight:        ["Spotlight on a stand, to light the couple, the cake or a stage.", ["spotlight", "beam", "stage", "lighting"], ["wedding", "gala", "corporate", "graduation", "community"], ["modern", "glam"]],
  welcome_table:    ["Welcome table with a sign, guest book, frames and flowers.", ["welcome", "guest book", "entrance", "sign"], ["wedding", "shower", "birthday", "anniversary", "gala", "graduation", "corporate"], ["classic", "romantic", "modern"]],
  pedestals:        ["Three display pedestals with flowers and candles.", ["pedestals", "plinths", "display", "risers"], ["wedding", "shower", "birthday", "gala", "corporate"], ["modern", "minimal", "glam"]],
  sculpture:        ["Abstract sculpture on a plinth for lounges and entrances.", ["sculpture", "art", "plinth", "gallery"], ["gala", "corporate", "wedding", "anniversary"], ["modern", "minimal", "glam"]],
  display_shelf:    ["Open display shelving for favors, gifts or a lounge.", ["shelves", "shelving", "display", "favors"], ["wedding", "shower", "birthday", "corporate", "holiday"], ["boho", "rustic", "modern"]],
  aisle_runner:     ["Aisle runner, 40 inches wide, in any color.", ["aisle", "runner", "ceremony", "walkway"], ["wedding", "anniversary", "gala"], ["classic", "romantic"]],
  dessert_table:    ["Dessert table with a tiered cake, cupcakes and candy jars.", ["desserts", "sweets", "cake", "cupcakes", "candy"], SOCIAL, ["romantic", "playful", "classic"]],
  led_wall:         ["16 by 10 foot LED video wall for a stage or slideshows.", ["led wall", "video wall", "screen", "stage"], ["corporate", "gala", "graduation", "community", "wedding", "birthday"], ["modern", "glam"]],
  projector:        ["Projector on a stand for a screen or projection on a wall.", ["projector", "projection", "video"], ["corporate", "wedding", "birthday", "gala", "graduation"], ["modern"]],
  photo_booth:      ["Open-air photo booth: a backdrop and a camera with a ring light.", ["photo booth", "camera", "backdrop", "photos"], ["wedding", "shower", "birthday", "graduation", "corporate", "gala", "holiday"], ["playful", "glam", "modern"]],
  booth_360:        ["360 video booth: a platform with a camera arm that circles the guests.", ["360 booth", "video", "platform", "photos"], ["wedding", "birthday", "graduation", "corporate", "gala"], ["playful", "modern", "glam"]],
  fog:              ["Low fog over the dance floor for the first dance.", ["fog", "clouds", "dry ice", "first dance", "effect"], ["wedding", "anniversary", "gala"], ["romantic", "glam"]],
  cold_spark:       ["Cold spark fountain for grand entrances and first dances.", ["cold sparks", "sparklers", "fountain", "grand entrance", "effect"], ["wedding", "birthday", "gala", "graduation"], ["glam", "playful"]],
  tent:             ["20 by 20 foot frame tent: about 33 guests at round tables.", ["tent", "outdoor", "canopy", "frame tent"], ["wedding", "shower", "birthday", "graduation", "community", "corporate", "holiday"], ["classic", "garden"]],
  tent_40x60:       ["40 by 60 foot frame tent: up to 192 at round tables, or about 144 with room for a stage, buffet or bar.", ["tent", "outdoor", "frame tent", "large tent", "dining tent"], ["wedding", "birthday", "graduation", "community", "corporate", "holiday"], ["classic", "garden", "modern"]],
  canopy:           ["10 by 10 foot pop-up canopy: check-in, a vendor booth, tickets or merchandise.", ["canopy", "pop-up", "outdoor", "booth", "check-in", "tent"], ["community", "corporate", "graduation", "birthday"], ["classic", "modern", "playful"]],
  pergola:          ["8 by 8 foot wood pergola for a lounge, a bar or a ceremony spot. Partial shade.", ["pergola", "outdoor", "lounge", "shade"], ["wedding", "corporate", "community", "birthday"], ["rustic", "garden", "boho", "modern"]],
  umbrella:         ["Market umbrella, about 8.5 ft across and 9 ft tall, for lounges and cocktail tables.", ["umbrella", "outdoor", "shade", "patio"], ["wedding", "corporate", "community", "birthday", "graduation"], ["classic", "garden", "modern"]],
  generator:        ["Towable 20 kW generator. Keep it at least 20 ft from tents.", ["generator", "power", "electric", "outdoor"], ["wedding", "birthday", "graduation", "community", "corporate", "holiday"], ["minimal"]],
  restroom_trailer: ["Two-station restroom trailer, for about 75 to 150 guests.", ["restroom", "bathroom", "toilet", "trailer", "outdoor"], ["wedding", "birthday", "graduation", "community", "corporate", "holiday"], ["minimal", "classic"]],
  barricade:        ["Steel crowd barricade, 6.5 ft long: entrances, queues, stage fronts, parking edges.", ["barricade", "barrier", "fence", "queue", "crowd", "outdoor"], ["community", "corporate", "graduation", "holiday"], ["minimal"]],
  building:         ["A building already on the site, sized to match the real one.", ["building", "site", "outdoor", "existing"], ["wedding", "shower", "birthday", "anniversary", "corporate", "gala", "graduation", "holiday", "community"], ["classic", "modern"]]
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

// Search the library: words match the name, description, category, tags, event types and styles; filters narrow by event, style and category.
// Everyday words for an event, so "baby shower" or "quinceañera" finds the right pieces.
const SAY = { baby: "shower", gender: "shower", reveal: "shower", bridal: "wedding", reception: "wedding", ceremony: "wedding", quince: "birthday", quinceanera: "birthday", party: "birthday",
  office: "corporate", conference: "corporate", company: "corporate", grad: "graduation", christmas: "holiday", church: "community", school: "community",
  luncheon: "corporate", picnic: "community", fair: "community", festival: "community", concert: "community", rodeo: "community", outside: "outdoor", lawn: "outdoor", backyard: "outdoor", power: "generator", toilet: "restroom", porta: "restroom", fence: "barricade" };
export function searchAssets(q = "", f = {}) {
  const words = String(q).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(Boolean).map(w => SAY[w] || SAY[w.replace(/s$/, "")] || w);
  return ASSETS.filter(a => (!f.event || a.events.includes(f.event)) && (!f.style || a.styles.includes(f.style)) && (!f.category || a.category === f.category)
    && words.every(w => (a.name + " " + a.description + " " + a.category + " " + a.tags.join(" ") + " " + a.events.join(" ") + " " + a.styles.join(" ")).toLowerCase().includes(w.replace(/(s|es)$/, "")))); // "weddings" finds wedding pieces
}
