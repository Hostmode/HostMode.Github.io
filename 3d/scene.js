// Host Mode 3D venue: the scene model and its validated commands.
// No drawing code here, so it runs (and is tested) in plain Node: node agents/venue3d_test.mjs
// Units: meters inside the scene, angles in degrees. The editor shows feet and inches by default.
// Every change goes through apply(scene, ops): one batch = one undo step. Nothing here runs model-written code.

export const SCHEMA = "hostmode.venue3d", VERSION = 1;
export const FT = 0.3048;

// Dimension sources, so a reconstructed venue never passes guesses off as measurements.
export const DIM_SRC = ["measured", "confirmed", "estimated", "unknown"];

export const MATERIALS = {
  wood:     { label: "Wood",     color: "#8a5a35", rough: 0.55, metal: 0 },
  oak:      { label: "Light oak floor", color: "#c49a6c", rough: 0.45, metal: 0, coat: 0.25 },
  herringbone: { label: "Herringbone floor", color: "#a87a4f", rough: 0.4, metal: 0, coat: 0.35 },
  concrete: { label: "Concrete", color: "#9a9a96", rough: 0.9, metal: 0 },
  polished: { label: "Polished concrete", color: "#a7a7a3", rough: 0.25, metal: 0, coat: 0.6 },
  tile:     { label: "Tile",     color: "#e6e2da", rough: 0.3, metal: 0, coat: 0.3 },
  carpet:   { label: "Carpet, patterned", color: "#5a2f3f", rough: 1, metal: 0 },
  carpet_plain: { label: "Carpet, plain", color: "#5b6478", rough: 1, metal: 0 },
  glass:    { label: "Glass",    color: "#bcd8e6", rough: 0.05, metal: 0, opacity: 0.35 },
  acrylic:  { label: "Clear acrylic", color: "#eef4f7", rough: 0.08, metal: 0, opacity: 0.3 },
  metal:    { label: "Metal",    color: "#b9bcc2", rough: 0.3, metal: 1 },
  gold:     { label: "Gold",     color: "#c9a24a", rough: 0.3, metal: 1 },
  fabric:   { label: "Linen",    color: "#f4f1ea", rough: 0.9, metal: 0, sheen: 0.4 },
  satin:    { label: "Satin",    color: "#f4f1ea", rough: 0.45, metal: 0, sheen: 1 },
  sequin:   { label: "Sequin",   color: "#d9c08a", rough: 0.25, metal: 0.8 },
  velvet:   { label: "Velvet",   color: "#2a1b4d", rough: 1, metal: 0, sheen: 1 },
  paint:    { label: "Paint",    color: "#efe9df", rough: 0.85, metal: 0 },
  plaster:  { label: "Plaster",  color: "#ece5d8", rough: 0.9, metal: 0 },
  stone:    { label: "Stone",    color: "#b5aea3", rough: 0.8, metal: 0 },
  marble:   { label: "Marble",   color: "#f1efe9", rough: 0.15, metal: 0, coat: 0.6 },
  parquet:  { label: "Dance floor", color: "#2a2a2e", rough: 0.12, metal: 0.1, coat: 0.8 },
  // Outdoor ground (an outdoor site's lawn, paths, parking and patios)
  grass:    { label: "Grass",    color: "#6a9a45", rough: 1, metal: 0 },
  gravel:   { label: "Gravel",   color: "#b3aa9a", rough: 1, metal: 0 },
  asphalt:  { label: "Asphalt (parking)", color: "#4a4c52", rough: 0.95, metal: 0 },
  pavers:   { label: "Pavers",   color: "#b88a6a", rough: 0.85, metal: 0 },
  dirt:     { label: "Dirt",     color: "#8f6d4b", rough: 1, metal: 0 },
  sand:     { label: "Sand",     color: "#dcc89e", rough: 1, metal: 0 },
  mulch:    { label: "Mulch",    color: "#5e3d27", rough: 1, metal: 0 }
};
// What an outdoor site's ground can be painted with.
export const GROUND = ["grass", "gravel", "asphalt", "concrete", "pavers", "dirt", "sand", "mulch"];

// The reusable asset library. Sizes are meters (w = across, d = deep, h = tall). Every shape is drawn in code
// in editor.js, so there are no third-party models or textures to license.
// top: sits on a table. ceiling: hangs from the ceiling. floor: a floor layer things stand on.
// dress: which decorating options it takes (see DRESS). palette: takes a set of colors (balloons, flowers).
export const CATALOG = {
  // Tables (take linens)
  table_round:   { label: "Round table (60 in)", cat: "Tables", w: 1.52, d: 1.52, h: 0.76, mat: "fabric", seats: 8, dress: "table" },
  table_round72: { label: "Round table (72 in)", cat: "Tables", w: 1.83, d: 1.83, h: 0.76, mat: "fabric", seats: 10, dress: "table" },
  table_rect:    { label: "Rectangular table (6 ft)", cat: "Tables", w: 1.83, d: 0.76, h: 0.76, mat: "fabric", seats: 6, dress: "table" },
  table_banquet: { label: "Banquet table (8 ft)", cat: "Tables", w: 2.44, d: 0.76, h: 0.76, mat: "fabric", seats: 8, dress: "table" },
  table_farm:    { label: "Farm table (8 ft)", cat: "Tables", w: 2.44, d: 1.02, h: 0.76, mat: "wood", seats: 10, dress: "table", bare: true },
  table_cocktail:{ label: "Cocktail table", cat: "Tables", w: 0.76, d: 0.76, h: 1.07, mat: "fabric", dress: "table" },
  // a quarter of a ring 12 ft across (30 in deep): four make a circle, two make an S
  table_serpentine: { label: "Serpentine table", cat: "Tables", w: 1.83, d: 1.83, h: 0.76, mat: "fabric", seats: 4, dress: "table" },
  table_sweetheart: { label: "Sweetheart table", cat: "Tables", w: 1.22, d: 0.76, h: 0.76, mat: "fabric", seats: 2, dress: "table", oneSide: true },
  table_head:    { label: "Head table (24 ft)", cat: "Tables", w: 7.32, d: 0.76, h: 0.76, mat: "fabric", seats: 12, dress: "table", oneSide: true },
  // Seating (takes covers and sashes)
  chair:         { label: "Chiavari chair", cat: "Seating", w: 0.42, d: 0.45, h: 0.9, mat: "gold", dress: "chair" },
  chair_ghost:   { label: "Ghost chair", cat: "Seating", w: 0.45, d: 0.5, h: 0.9, mat: "acrylic", dress: "chair" },
  chair_crossback: { label: "Cross-back chair", cat: "Seating", w: 0.45, d: 0.5, h: 0.9, mat: "wood", dress: "chair" },
  chair_folding: { label: "Folding chair", cat: "Seating", w: 0.45, d: 0.48, h: 0.82, mat: "metal", dress: "chair" },
  chair_banquet: { label: "Banquet chair", cat: "Seating", w: 0.43, d: 0.56, h: 0.93, mat: "metal", dress: "chair" },
  chair_throne:  { label: "Throne chair", cat: "Seating", w: 0.92, d: 0.72, h: 1.8, mat: "gold" },
  bench:         { label: "Bench (8 ft)", cat: "Seating", w: 2.44, d: 0.36, h: 0.46, mat: "wood" },
  // Balloons
  balloon_arch:  { label: "Balloon garland", cat: "Balloons", w: 2.4, d: 0.6, h: 2.2, mat: "fabric", palette: true },
  balloon_full_arch: { label: "Balloon arch", cat: "Balloons", w: 3.0, d: 0.7, h: 3.0, mat: "fabric", palette: true },
  balloon_column:{ label: "Balloon column", cat: "Balloons", w: 0.6, d: 0.6, h: 2.0, mat: "fabric", palette: true },
  balloon_wall:  { label: "Balloon wall", cat: "Balloons", w: 2.4, d: 0.35, h: 2.4, mat: "fabric", palette: true },
  // Backdrops and drapery
  backdrop:      { label: "Backdrop", cat: "Backdrops & drapery", w: 2.44, d: 0.1, h: 2.44, mat: "fabric" },
  pipe_drape:    { label: "Pipe and drape (10 ft)", cat: "Backdrops & drapery", w: 3.05, d: 0.3, h: 2.44, mat: "fabric" },
  flower_wall:   { label: "Flower wall", cat: "Backdrops & drapery", w: 2.4, d: 0.2, h: 2.4, mat: "fabric", palette: true },
  shimmer_wall:  { label: "Shimmer wall", cat: "Backdrops & drapery", w: 2.4, d: 0.15, h: 2.4, mat: "sequin" },
  champagne_wall:{ label: "Champagne wall", cat: "Backdrops & drapery", w: 1.22, d: 0.3, h: 2.44, mat: "wood" },
  entrance_arch: { label: "Draped entrance arch", cat: "Backdrops & drapery", w: 2.4, d: 0.6, h: 2.6, mat: "gold", palette: true },
  partition:     { label: "Room divider", cat: "Backdrops & drapery", w: 1.8, d: 0.45, h: 1.9, mat: "wood" },
  ceiling_drape: { label: "Ceiling draping", cat: "Backdrops & drapery", w: 8, d: 8, h: 1.0, mat: "fabric", ceiling: true },
  // Centerpieces (sit on a table)
  centerpiece:   { label: "Low floral centerpiece", cat: "Centerpieces", w: 0.35, d: 0.35, h: 0.3, mat: "glass", top: true, palette: true },
  centerpiece_tall: { label: "Tall centerpiece", cat: "Centerpieces", w: 0.45, d: 0.45, h: 0.95, mat: "glass", top: true, palette: true },
  candle_cluster:{ label: "Candle cluster", cat: "Centerpieces", w: 0.35, d: 0.35, h: 0.25, mat: "glass", top: true },
  bud_vases:     { label: "Bud vases", cat: "Centerpieces", w: 0.45, d: 0.25, h: 0.28, mat: "glass", top: true, palette: true },
  table_garland: { label: "Table garland", cat: "Centerpieces", w: 1.8, d: 0.35, h: 0.12, mat: "fabric", top: true, palette: true },
  branches:      { label: "Branch centerpiece", cat: "Centerpieces", w: 0.8, d: 0.8, h: 1.1, mat: "glass", top: true },
  bouquet:       { label: "Bouquet", cat: "Centerpieces", w: 0.3, d: 0.42, h: 0.2, mat: "satin", top: true, palette: true },
  // Lighting and candles
  uplight:       { label: "Uplight", cat: "Lighting & candles", w: 0.25, d: 0.25, h: 0.25, mat: "metal" },
  string_lights: { label: "String lights", cat: "Lighting & candles", w: 6, d: 0.3, h: 0.6, mat: "metal", ceiling: true },
  chandelier:    { label: "Chandelier", cat: "Lighting & candles", w: 1.0, d: 1.0, h: 1.0, mat: "glass", ceiling: true },
  candle_floor:  { label: "Floor candles", cat: "Lighting & candles", w: 0.45, d: 0.45, h: 0.6, mat: "glass" },
  light_truss:   { label: "Light truss", cat: "Lighting & candles", w: 3.0, d: 0.3, h: 2.8, mat: "metal" },
  lanterns:      { label: "Lanterns (set of 3)", cat: "Lighting & candles", w: 0.6, d: 0.45, h: 0.75, mat: "metal" },
  spotlight:     { label: "Spotlight", cat: "Lighting & candles", w: 0.6, d: 0.6, h: 2.0, mat: "metal" },
  // Florals and greenery
  arch:          { label: "Floral arch", cat: "Florals & greenery", w: 2.1, d: 0.4, h: 2.4, mat: "gold", palette: true },
  aisle_flowers: { label: "Aisle flower stand", cat: "Florals & greenery", w: 0.45, d: 0.45, h: 1.0, mat: "gold", palette: true },
  hanging_greenery: { label: "Hanging greenery", cat: "Florals & greenery", w: 3.0, d: 0.5, h: 0.8, mat: "fabric", ceiling: true },
  plant:         { label: "Potted plant", cat: "Florals & greenery", w: 0.6, d: 0.6, h: 1.4, mat: "stone" },
  // Lounge and accents
  sofa:          { label: "Sofa", cat: "Lounge & accents", w: 2.0, d: 0.9, h: 0.85, mat: "velvet" },
  lounge_chair:  { label: "Lounge chair", cat: "Lounge & accents", w: 0.85, d: 0.85, h: 0.8, mat: "velvet" },
  ottoman:       { label: "Ottoman", cat: "Lounge & accents", w: 0.6, d: 0.6, h: 0.45, mat: "velvet" },
  coffee_table:  { label: "Coffee table", cat: "Lounge & accents", w: 1.2, d: 0.6, h: 0.45, mat: "gold" },
  rug:           { label: "Area rug", cat: "Lounge & accents", w: 3.0, d: 2.4, h: 0.015, mat: "carpet", floor: true },
  welcome_sign:  { label: "Welcome sign", cat: "Lounge & accents", w: 0.65, d: 0.5, h: 1.7, mat: "wood" },
  marquee:       { label: "Marquee letters", cat: "Lounge & accents", w: 1.6, d: 0.2, h: 1.2, mat: "paint" },
  gift_table:    { label: "Gift table", cat: "Lounge & accents", w: 1.83, d: 0.76, h: 0.76, mat: "fabric", dress: "table" },
  welcome_table: { label: "Welcome table", cat: "Lounge & accents", w: 1.83, d: 0.76, h: 0.76, mat: "fabric", dress: "table" },
  pedestals:     { label: "Pedestals (set of 3)", cat: "Lounge & accents", w: 0.9, d: 0.45, h: 0.82, mat: "paint", palette: true },
  sculpture:     { label: "Sculpture on a plinth", cat: "Lounge & accents", w: 0.45, d: 0.45, h: 1.6, mat: "paint" },
  display_shelf: { label: "Display shelving", cat: "Lounge & accents", w: 1.2, d: 0.4, h: 1.8, mat: "wood" },
  // Stage, food, audio, structure
  stage:         { label: "Stage", cat: "Stage & floor", w: 6.1, d: 3.66, h: 0.6, mat: "wood", floor: true },
  dance_floor:   { label: "Dance floor", cat: "Stage & floor", w: 4.88, d: 4.88, h: 0.03, mat: "parquet", floor: true },
  aisle_runner:  { label: "Aisle runner", cat: "Stage & floor", w: 1.02, d: 12.2, h: 0.005, mat: "fabric", floor: true },
  podium:        { label: "Podium", cat: "Stage & floor", w: 0.6, d: 0.5, h: 1.15, mat: "wood" },
  bar:           { label: "Bar", cat: "Food & drink", w: 2.44, d: 0.7, h: 1.07, mat: "wood" },
  buffet:        { label: "Buffet table", cat: "Food & drink", w: 2.44, d: 0.76, h: 0.76, mat: "fabric", dress: "table" },
  food_station:  { label: "Food station", cat: "Food & drink", w: 1.83, d: 0.9, h: 0.9, mat: "metal" },
  cake_table:    { label: "Cake table", cat: "Food & drink", w: 0.9, d: 0.9, h: 0.76, mat: "fabric", dress: "table" },
  dessert_table: { label: "Dessert table", cat: "Food & drink", w: 2.44, d: 0.76, h: 0.76, mat: "fabric", dress: "table" },
  speaker:       { label: "Speaker", cat: "Audio & video", w: 0.5, d: 0.45, h: 1.6, mat: "metal" },
  dj_booth:      { label: "DJ booth", cat: "Audio & video", w: 1.8, d: 0.7, h: 1.07, mat: "metal" },
  screen:        { label: "Projector screen", cat: "Audio & video", w: 3.0, d: 0.15, h: 2.3, mat: "fabric" },
  led_wall:      { label: "LED video wall", cat: "Audio & video", w: 5.0, d: 0.5, h: 3.0, mat: "metal" },
  projector:     { label: "Projector", cat: "Audio & video", w: 0.5, d: 0.5, h: 1.3, mat: "metal" },
  // Photo booths and special effects
  photo_booth:   { label: "Photo booth", cat: "Photo & effects", w: 2.4, d: 2.4, h: 2.4, mat: "fabric" },
  booth_360:     { label: "360 video booth", cat: "Photo & effects", w: 1.2, d: 1.2, h: 2.1, mat: "metal" },
  fog:           { label: "Low fog (dancing on clouds)", cat: "Photo & effects", w: 4.88, d: 4.88, h: 0.4, mat: "fabric", over: true },
  cold_spark:    { label: "Cold spark machine", cat: "Photo & effects", w: 0.32, d: 0.32, h: 2.4, mat: "metal" },
  column:        { label: "Column", cat: "Structure", w: 0.5, d: 0.5, h: 3.6, mat: "stone", structure: true },
  // Tents and shade. eave: how high the roof's edge is; shade: how it shades (a roof, slats, a round canopy), for the sun check.
  tent:          { label: "Frame tent (20 × 20 ft)", cat: "Tents & shade", w: 6.1, d: 6.1, h: 3.8, mat: "fabric", over: true, eave: 2.44, shade: "roof" },
  tent_40x60:    { label: "Frame tent (40 × 60 ft)", cat: "Tents & shade", w: 12.19, d: 18.29, h: 5.49, mat: "fabric", over: true, eave: 2.44, shade: "roof" },
  canopy:        { label: "Pop-up canopy (10 × 10 ft)", cat: "Tents & shade", w: 3.05, d: 3.05, h: 3.05, mat: "fabric", over: true, eave: 2.13, shade: "roof" },
  pergola:       { label: "Wood pergola (8 × 8 ft)", cat: "Tents & shade", w: 2.44, d: 2.44, h: 2.44, mat: "wood", over: true, eave: 2.44, shade: "slats" },
  umbrella:      { label: "Market umbrella", cat: "Tents & shade", w: 2.59, d: 2.59, h: 2.74, mat: "fabric", over: true, eave: 1.98, shade: "round" },
  // An outdoor site's equipment, and the buildings already there (traced from the site, any size)
  generator:     { label: "Towable generator (20 kW)", cat: "Site & power", w: 3.33, d: 1.51, h: 1.7, mat: "metal" },
  restroom_trailer: { label: "Restroom trailer (2 stations)", cat: "Site & power", w: 4.27, d: 2.44, h: 3.05, mat: "paint" },
  barricade:     { label: "Crowd barricade", cat: "Site & power", w: 1.99, d: 0.6, h: 1.09, mat: "metal" },
  // Phase 5 pieces (Nov 5, 2026): see 3d/library/specs and research
  table_square: { label: "Square table (4 ft)", cat: "Tables", w: 1.22, d: 1.22, h: 0.77, mat: "fabric", seats: 4, dress: "table" },
  table_picnic: { label: "Picnic table", cat: "Tables", w: 1.83, d: 1.52, h: 0.71, mat: "wood" },
  table_kids: { label: "Kids table", cat: "Tables", w: 1.83, d: 0.76, h: 0.53, mat: "wood" },
  bar_stool: { label: "Bar stool", cat: "Seating", w: 0.43, d: 0.43, h: 0.76, mat: "metal" },
  hay_bale: { label: "Hay bale seat", cat: "Seating", w: 0.91, d: 0.51, h: 0.43, mat: "mulch" },
  kids_chair: { label: "Kids chair", cat: "Seating", w: 0.3, d: 0.3, h: 0.58, mat: "metal" },
  bleachers: { label: "Bleachers (3 rows)", cat: "Seating", w: 4.57, d: 1.52, h: 0.76, mat: "metal" },
  bar_cart: { label: "Bar cart", cat: "Food & drink", w: 1.35, d: 0.76, h: 1.0, mat: "wood" },
  food_truck: { label: "Food truck", cat: "Food & drink", w: 6.1, d: 2.6, h: 3.3, mat: "paint" },
  concession_cart: { label: "Concession cart", cat: "Food & drink", w: 1.07, d: 0.71, h: 1.37, mat: "paint" },
  grazing_table: { label: "Grazing table", cat: "Food & drink", w: 2.44, d: 0.76, h: 0.76, mat: "fabric" },
  bounce_house: { label: "Bounce house", cat: "Lounge & accents", w: 3.96, d: 3.96, h: 3.2, mat: "fabric" },
  neon_sign: { label: "Neon sign", cat: "Lighting & candles", w: 0.76, d: 0.04, h: 0.4, mat: "acrylic" },
  light_tower: { label: "Light tower", cat: "Site & power", w: 0.9, d: 0.9, h: 3.3, mat: "metal" },
  path_lights: { label: "Pathway lights (set of 6)", cat: "Lighting & candles", w: 4.57, d: 0.12, h: 0.37, mat: "metal" },
  tiki_torch: { label: "Tiki torch", cat: "Lighting & candles", w: 0.08, d: 0.08, h: 1.52, mat: "wood" },
  tv_monitor: { label: "TV monitor on stand", cat: "Audio & video", w: 1.25, d: 0.6, h: 1.75, mat: "metal" },
  foh_station: { label: "Front-of-house engineer station", cat: "Audio & video", w: 2.4, d: 1.4, h: 1.2, mat: "metal" },
  foh_mixer: { label: "Sound and DJ desk", cat: "Audio & video", w: 1.83, d: 0.61, h: 0.97, mat: "metal" },
  flown_line_array: { label: "Line array on truss", cat: "Audio & video", w: 7.0, d: 0.9, h: 5.0, mat: "metal" },
  flown_line_array_small: { label: "Line array on truss (compact)", cat: "Audio & video", w: 6.0, d: 0.8, h: 4.0, mat: "metal" },
  line_array: { label: "Speaker on stand", cat: "Audio & video", w: 0.9, d: 0.9, h: 2.1, mat: "metal" },
  runway: { label: "Runway (24 ft)", cat: "Stage & floor", w: 1.22, d: 7.32, h: 0.61, mat: "carpet_plain" },
  riser: { label: "Riser (8 × 4 ft)", cat: "Stage & floor", w: 2.44, d: 1.22, h: 0.61, mat: "carpet_plain" },
  tent_flooring: { label: "Event flooring (12 × 12 ft)", cat: "Stage & floor", w: 3.66, d: 3.66, h: 0.02, mat: "parquet", floor: true },
  trade_show_booth: { label: "Exhibit booth (10 × 10 ft)", cat: "Structure", w: 3.05, d: 3.05, h: 2.44, mat: "fabric" },
  pop_up_banner: { label: "Pop-up banner", cat: "Backdrops & drapery", w: 0.84, d: 0.3, h: 2.03, mat: "fabric" },
  registration_desk: { label: "Registration desk", cat: "Tables", w: 1.83, d: 0.6, h: 0.91, mat: "paint" },
  gazebo: { label: "Gazebo (10 × 10 ft)", cat: "Tents & shade", w: 3.05, d: 3.05, h: 3.27, mat: "fabric", over: true, eave: 2.0, shade: "roof" },
  shade_sail: { label: "Shade sail", cat: "Tents & shade", w: 4.88, d: 4.23, h: 3.0, mat: "fabric", over: true, eave: 2.4, shade: "slats" },
  bell_tent: { label: "Bell tent", cat: "Tents & shade", w: 5.0, d: 5.0, h: 3.0, mat: "fabric", over: true, eave: 1.0, shade: "round" },
  patio_heater: { label: "Patio heater", cat: "Site & power", w: 0.83, d: 0.83, h: 2.18, mat: "metal" },
  handwash_station: { label: "Hand wash station", cat: "Site & power", w: 0.67, d: 0.55, h: 1.57, mat: "paint" },
  cable_ramp: { label: "Cable ramp", cat: "Site & power", w: 1.33, d: 0.48, h: 0.044, mat: "paint" },
  // Phase 6 pieces (Nov 5, 2026): see 3d/library/research/*_p6.json for which sizes are sourced and which are estimates
  champagne_tower: { label: "Champagne tower", cat: "Food & drink", w: 0.9, d: 0.9, h: 1.5, mat: "glass" },
  coffee_station: { label: "Coffee station", cat: "Food & drink", w: 1.83, d: 0.76, h: 1.42, mat: "fabric" },
  water_station: { label: "Water dispenser", cat: "Food & drink", w: 0.3, d: 0.39, h: 1.28, mat: "paint" },
  cornhole: { label: "Cornhole board", cat: "Lounge & accents", w: 1.22, d: 0.61, h: 0.31, mat: "wood" },
  fire_pit: { label: "Fire pit", cat: "Site & power", w: 0.9, d: 0.9, h: 0.45, mat: "metal" },
  confetti_cannon: { label: "Confetti cannon", cat: "Photo & effects", w: 0.2, d: 0.2, h: 0.6, mat: "paint" },
  bubble_machine: { label: "Bubble machine", cat: "Photo & effects", w: 0.4, d: 0.3, h: 0.4, mat: "metal" },
  easel_sign: { label: "Easel sign", cat: "Lounge & accents", w: 0.6, d: 0.6, h: 1.5, mat: "wood" },
  card_box: { label: "Card box", cat: "Centerpieces", w: 0.3, d: 0.25, h: 0.3, mat: "wood", top: true },
  stanchion: { label: "Stanchions with rope (pair)", cat: "Stage & floor", w: 2.0, d: 0.33, h: 0.95, mat: "metal" },
  misting_fan: { label: "Misting fan", cat: "Site & power", w: 0.6, d: 0.6, h: 1.75, mat: "metal" },
  trash_station: { label: "Trash and recycling station", cat: "Site & power", w: 1.2, d: 0.5, h: 1.05, mat: "paint" },
  coat_rack: { label: "Coat rack (rolling)", cat: "Lounge & accents", w: 1.5, d: 0.5, h: 1.7, mat: "metal" },
  ada_ramp: { label: "Accessible ramp (1:12)", cat: "Stage & floor", w: 1.22, d: 5.18, h: 0.305, mat: "metal" },
  golf_cart: { label: "Golf cart (4 seat)", cat: "Site & power", w: 2.5, d: 1.2, h: 1.8, mat: "paint" },
  ticket_booth: { label: "Ticket booth", cat: "Structure", w: 1.22, d: 1.83, h: 2.4, mat: "paint" },
  first_aid_tent: { label: "First aid tent (10 × 10 ft)", cat: "Tents & shade", w: 3.05, d: 3.05, h: 3.0, mat: "fabric", over: true, eave: 2.2, shade: "roof" },
  tree: { label: "Potted tree", cat: "Florals & greenery", w: 1.0, d: 1.0, h: 2.4, mat: "wood" },
  hedge_wall: { label: "Hedge wall panel", cat: "Florals & greenery", w: 1.22, d: 0.3, h: 1.83, mat: "mulch" },
  topiary: { label: "Topiary pair", cat: "Florals & greenery", w: 1.0, d: 0.4, h: 1.2, mat: "mulch" },
  poster_easel: { label: "Poster easel", cat: "Lounge & accents", w: 0.6, d: 0.6, h: 1.65, mat: "wood" },
  upright_piano: { label: "Upright piano", cat: "Audio & video", w: 1.5, d: 0.6, h: 1.2, mat: "paint" },
  baby_grand: { label: "Baby grand piano", cat: "Audio & video", w: 1.5, d: 1.7, h: 1.0, mat: "paint" },
  classroom_desk: { label: "Classroom table (6 ft seminar)", cat: "Tables", w: 1.83, d: 0.46, h: 0.74, mat: "paint" },
  charging_station: { label: "Charging station", cat: "Lounge & accents", w: 0.4, d: 0.4, h: 1.1, mat: "paint" },
  photo_backdrop_frame: { label: "Photo backdrop frame (8 × 8 ft)", cat: "Backdrops & drapery", w: 2.44, d: 0.5, h: 2.44, mat: "fabric" },
  building:      { label: "Existing building", cat: "Site & power", w: 20, d: 12, h: 8, mat: "paint", shade: "box", site: true }
};
export const KINDS = Object.keys(CATALOG);
// The Add tab lists categories in this order: what decorators change most often first.
export const CAT_ORDER = ["Tables", "Seating", "Balloons", "Backdrops & drapery", "Centerpieces", "Lighting & candles", "Florals & greenery", "Lounge & accents", "Stage & floor", "Food & drink", "Audio & video", "Photo & effects", "Tents & shade", "Site & power", "Structure"];

// Decorating options. Tables take linens; chairs take covers and sashes. A color of null means none.
export const DRESS = {
  table: {
    linen: { label: "Tablecloth", opts: { floor: "Floor length", lap: "Lap length", spandex: "Fitted spandex", pleated: "Pleated skirt", none: "No cloth" } },
    linenColor: { label: "Cloth color", color: true },
    overlay: { label: "Overlay", opts: { none: "None", square: "Square overlay", sequin: "Sequin overlay" } },
    overlayColor: { label: "Overlay color", color: true },
    runner: { label: "Runner", opts: { none: "None", satin: "Satin", sequin: "Sequin" } },
    runnerColor: { label: "Runner color", color: true },
    charger: { label: "Charger plates", color: true, none: true },
    napkin: { label: "Napkins", color: true, none: true }
  },
  chair: {
    cover: { label: "Chair cover", opts: { none: "None", banquet: "Banquet cover", spandex: "Fitted spandex" } },
    coverColor: { label: "Cover color", color: true },
    sash: { label: "Sash", color: true, none: true }
  }
};
const DEF_DRESS = { table: { linen: "floor", overlay: "none", runner: "none" }, chair: { cover: "none" } };
export function dressOf(it) { const k = (CATALOG[it.kind] || {}).dress; if (!k) return null; const d = Object.assign({}, DEF_DRESS[k], it.dress || {}); if (k === "table" && CATALOG[it.kind].bare && !(it.dress && it.dress.linen)) d.linen = "none"; return d; }
export const PALETTES = { blush: ["#efc7c2", "#ffffff", "#c9a24a"], garden: ["#f1a7bd", "#ffffff", "#9cae8f", "#e8d6b3"], navy: ["#16255a", "#ffffff", "#c0c3c8"], hostmode: ["#16255a", "#f6892f", "#2f8a4c", "#ffffff"], classic: ["#ffffff", "#f3ead6", "#c9a24a"], jewel: ["#3b1d5e", "#1d6b47", "#6d1a2e", "#c9a24a"], rainbow: ["#e74c3c", "#f39c12", "#f2c94c", "#2f8a4c", "#2f6fd1", "#6b3fa0"] };
export const LIGHT_KINDS = ["point", "spot", "sun", "ambient"];

const r2 = n => Math.round(n * 1000) / 1000;
const isNum = n => typeof n === "number" && isFinite(n);
export const uid = (p) => p + Math.random().toString(36).slice(2, 8);
export const clone = o => JSON.parse(JSON.stringify(o));

// Kelvin to a hex color, so planners can ask for "warm" (2700 K) or "daylight" (5600 K).
export function kelvinHex(k) {
  const t = Math.max(1000, Math.min(12000, k)) / 100;
  let r, g, b;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

export const COLORS = {
  white: "#f7f5f0", ivory: "#f3ead6", black: "#1b1b1f", navy: "#16255a", orange: "#f6892f", green: "#2f8a4c",
  gold: "#c9a24a", silver: "#c0c3c8", red: "#b3263a", burgundy: "#6d1a2e", pink: "#f1a7bd", blush: "#efc7c2",
  purple: "#6b3fa0", "dark purple": "#3b1d5e", lavender: "#b9a6dc", blue: "#2f6fd1", "light blue": "#a9cbe8",
  teal: "#1f8a8a", sage: "#9cae8f", "emerald": "#1d6b47", yellow: "#f2c94c", champagne: "#e8d6b3",
  grey: "#8d8f94", gray: "#8d8f94", brown: "#6b4426", cream: "#efe6d2", rose: "#d67b8a"
};

// ---------- A new venue ----------
export function sampleVenue() {
  const W = 18.3, D = 13.7, H = 4.3; // about 60 x 45 ft with 14 ft ceilings
  const s = {
    schema: SCHEMA, version: VERSION, id: uid("v_"), name: "Sample ballroom", units: "ft",
    created: Date.now(), updated: Date.now(),
    room: { w: W, d: D, h: H, floor: "oak", walls: "plaster", ceiling: "paint", wallColor: "#efe6d8", dimSrc: { w: "confirmed", d: "confirmed", h: "estimated" } },
    walls: [], openings: [], items: [], lights: [], views: []
  };
  // Four walls, corners going round the room. The front wall (z = 0) is where a stage goes by default.
  const c = [[0, 0], [W, 0], [W, D], [0, D]];
  ["Front wall", "Right wall", "Back wall", "Left wall"].forEach((name, i) =>
    s.walls.push({ id: "w" + (i + 1), name, a: c[i], b: c[(i + 1) % 4], h: H, t: 0.2, mat: "paint", color: "#efe6d8" }));
  s.openings.push({ id: "o1", type: "door", wall: "w3", at: W / 2, w: 1.83, h: 2.44, sill: 0, name: "Main doors" });
  s.openings.push({ id: "o2", type: "door", wall: "w2", at: 2.5, w: 0.91, h: 2.13, sill: 0, name: "Service door" });
  [3, 6.85, 10.7].forEach((at, i) => s.openings.push({ id: "o" + (3 + i), type: "window", wall: "w4", at, w: 1.5, h: 2.0, sill: 0.9 }));
  [4, 9.15, 14.3].forEach((at, i) => s.openings.push({ id: "o" + (6 + i), type: "window", wall: "w3", at: at === 9.15 ? 13.5 : at, w: 1.5, h: 2.0, sill: 0.9 }));
  s.items.push(mkItem("stage", W / 2, 1.83 + 0.2, 0, { id: "stage1" }));
  s.items.push(mkItem("dance_floor", W / 2, D / 2 + 0.3, 0, { id: "dance1" }));
  // Six round tables with eight chairs each, two rows either side of the dance floor.
  [[3.4, 5.3], [3.4, 9.2], [14.9, 5.3], [14.9, 9.2], [6.2, 11.8], [12.1, 11.8]].forEach(([x, z], i) => {
    const t = mkItem("table_round", x, z, 0, { id: "t" + (i + 1), color: "#f7f5f0", label: "Table " + (i + 1) });
    s.items.push(t); s.items.push(...chairsAround(t, 8));
  });
  s.items.push(mkItem("bar", W - 1.2, D - 3.2, -90, { id: "bar1" }));
  s.lights.push({ id: "L0", kind: "ambient", color: "#ffffff", intensity: 0.35, name: "Room fill" });
  s.lights.push({ id: "L1", kind: "sun", x: -6, y: 9, z: 4, color: kelvinHex(5600), intensity: 1.2, name: "Daylight" });
  [[W / 4, D / 3], [3 * W / 4, D / 3], [W / 4, 2 * D / 3], [3 * W / 4, 2 * D / 3]].forEach(([x, z], i) =>
    s.lights.push({ id: "L" + (2 + i), kind: "point", x, y: H - 0.3, z, color: kelvinHex(3000), intensity: 6, range: 12, name: "Chandelier " + (i + 1) }));
  s.lights.push({ id: "L6", kind: "spot", x: W / 2, y: H - 0.2, z: 5, tx: W / 2, ty: 0.6, tz: 1.8, color: kelvinHex(4200), intensity: 30, angle: 35, name: "Stage wash" });
  s.views = [
    { id: "vw1", name: "From the doors", pos: [W / 2, 1.65, D - 0.8], target: [W / 2, 1.2, 2] },
    { id: "vw2", name: "From the stage", pos: [W / 2, 2.2, 2], target: [W / 2, 0.8, D - 2] }
  ];
  return s;
}

export function mkItem(kind, x, z, rot = 0, extra = {}) {
  const c = CATALOG[kind];
  return Object.assign({ id: uid("i_"), kind, x: r2(x), z: r2(z), y: 0, rot: r2(rot), w: c.w, d: c.d, h: c.h, mat: c.mat, color: null }, extra);
}

// A point in a table's own frame (x along its width, z along its depth) to the room.
function fromTable(t, lx, lz) { const a = (t.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [t.x + lx * c - lz * s, t.z + lx * s + lz * c]; }
export function chairsAround(t, n, kind = "chair") {
  const out = [], rad = Math.max(t.w, t.d) / 2 + 0.32, C = CATALOG[t.kind] || {};
  // A chair's front is its +z side; turning it by rot points the front at (-sin rot, cos rot). Facing the table means rot = 180° minus
  // the chair's direction from the table. (Before Nov 3, 2026 this was 180° plus, so only the chairs at the head and foot faced the table.)
  const facing = (x, z, cx, cz) => ((180 - Math.atan2(x - cx, z - cz) * 180 / Math.PI) % 360 + 360) % 360;
  const face = (x, z, cx, cz) => mkItem(kind, x, z, r2(facing(x, z, cx, cz)), { group: t.id });
  if (t.kind === "table_serpentine") { // along the outer curve, facing the ring's center
    const [cx, cz] = fromTable(t, -t.w / 2, -t.d / 2), R = t.w + 0.3;
    for (let k = 0; k < n; k++) { const ph = (k + 0.5) / n * Math.PI / 2, [x, z] = fromTable(t, -t.w / 2 + Math.cos(ph) * R, -t.d / 2 + Math.sin(ph) * R); out.push(face(x, z, cx, cz)); }
    return out;
  }
  if (C.oneSide) { // everyone on the back side, facing the room
    for (let k = 0; k < n; k++) { const lx = -t.w / 2 + (k + 0.5) * t.w / n, [x, z] = fromTable(t, lx, -t.d / 2 - 0.32), [cx, cz] = fromTable(t, lx, 0); out.push(face(x, z, cx, cz)); }
    return out;
  }
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    // The chair's back faces away from the table: rot points its front (+z) at the table center.
    const x = t.x + Math.sin(a) * rad, z = t.z + Math.cos(a) * rad;
    out.push(mkItem(kind, x, z, r2(facing(x, z, t.x, t.z)), { group: t.id }));
  }
  return out;
}

// ---------- Geometry helpers ----------
export function footprint(it) {
  // Rotated rectangle's axis-aligned box: good enough for "does this bump into that" at event-planning scale.
  const a = it.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const hw = (it.w * c + it.d * s) / 2, hd = (it.w * s + it.d * c) / 2;
  return { x0: it.x - hw, x1: it.x + hw, z0: it.z - hd, z1: it.z + hd };
}
const overlap = (A, B, pad = 0) => A.x0 < B.x1 - pad && A.x1 > B.x0 + pad && A.z0 < B.z1 - pad && A.z1 > B.z0 + pad;

// Which items sit on the floor layer (stage, dance floor) vs stand on it. Things can stand on floors and stages.
const isFloorLayer = it => !!(CATALOG[it.kind] || {}).floor;
// Things on a table or hanging from the ceiling don't bump into furniture on the floor.
// Tents and fog stand over everything else, so they don't either.
export const offFloor = it => { const c = CATALOG[it.kind] || {}; return !!(c.top || c.ceiling || c.over); };

export function collisions(scene, it) {
  if (offFloor(it)) return [];
  if (isFloorLayer(it)) {
    return scene.items.filter(o => o.id !== it.id && isFloorLayer(o) && overlap(footprint(o), footprint(it), 0.05)).map(o => o.id);
  }
  const f = footprint(it);
  return scene.items.filter(o => o.id !== it.id && !isFloorLayer(o) && !offFloor(o) && o.group !== it.id && it.group !== o.id &&
    !(it.group && it.group === o.group) && overlap(footprint(o), f, 0.02)).map(o => o.id);
}

export function inRoom(scene, it) {
  const f = footprint(it), R = scene.room;
  return f.x0 >= -0.01 && f.z0 >= -0.01 && f.x1 <= R.w + 0.01 && f.z1 <= R.d + 0.01 && (it.y || 0) + it.h <= R.h + 0.01;
}

export function wallLen(w) { return Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); }

// Named places in the room, for "front", "left", "center"... Front = the stage wall (z = 0) unless a stage says otherwise.
// Outdoors these are inside the property line (its outline's box) and further in from the edge.
export function bounds(scene) {
  const R = scene.room, E = scene.site && scene.site.edge && scene.site.edge.pts;
  if (!E) return { x0: 0, z0: 0, x1: R.w, z1: R.d };
  return { x0: Math.max(0, Math.min(...E.map(p => p[0]))), z0: Math.max(0, Math.min(...E.map(p => p[1]))), x1: Math.min(R.w, Math.max(...E.map(p => p[0]))), z1: Math.min(R.d, Math.max(...E.map(p => p[1]))) };
}
export function place(scene, where) {
  const B = bounds(scene), m = scene.site ? 4 : 1.2, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
  const map = {
    center: [cx, cz], middle: [cx, cz],
    front: [cx, B.z0 + m], back: [cx, B.z1 - m], rear: [cx, B.z1 - m],
    left: [B.x0 + m, cz], right: [B.x1 - m, cz],
    "front left": [B.x0 + m, B.z0 + m], "front right": [B.x1 - m, B.z0 + m], "back left": [B.x0 + m, B.z1 - m], "back right": [B.x1 - m, B.z1 - m]
  };
  return map[where] || null;
}

// ---------- Commands ----------
// Each op: { op: "add_item", ...args }. apply() checks every op, applies them to a copy, and only returns
// the new scene if every op passed. Destructive ops need confirm: true (the editor asks the person first).
export const OPS = {
  set_site:     "make this an outdoor site, or change it: w, d (meters), ground (grass, gravel, asphalt, concrete, pavers, dirt, sand, mulch), north (degrees north is turned clockwise from up in the top view)",
  paint_ground: "an area of the site's ground: mat, pts [[x,z],...] or rect {x,z,w,d}, name, id (g_..., to redraw it)",
  remove_ground:"id, confirm",
  trace_boundary:"the property line: pts [[x,z],...] (3 or more), src measured|confirmed|estimated; pts [] with confirm removes it",
  add_building: "an existing building on the site: x, z, w, d, h, rot, label",
  set_sun:      "where and when, for sun and shade: lat, lng, date YYYY-MM-DD, time HH:MM, tz (hours from UTC), place",
  set_aerial:   "a picture from above (stored apart): ref, iw, ih, pa and pb (two marks, 0 to 1 across and down), len (meters between them), x, z (its center on the site), rot, opacity",
  clear_aerial: "confirm",
  set_room:     "w, d, h (meters), floor/walls/ceiling material, wallColor, dimSrc",
  add_wall:     "a [x,z], b [x,z], h, t",
  add_opening:  "type door|window|opening (an open doorway, no door), wall id, at (meters from wall start), w, h, sill",
  add_item:     "kind, x, z, rot, w/d/h optional, color, mat, label",
  move_object:  "id, x and/or z (absolute) or dx/dz, or where (center|front|back|left|right...)",
  rotate_object:"id, rot (absolute degrees) or by (relative)",
  resize_object:"id, w/d/h (meters) or scale",
  duplicate_object: "id, dx, dz",
  delete_object:"id or kind, confirm: true",
  change_material: "id or kind or 'floor'|'walls'|'ceiling', mat, color",
  add_light:    "kind point|spot|sun|ambient, x,y,z, color or kelvin, intensity",
  modify_lighting: "id or 'all' or near (item id), intensity, color, kelvin, scale",
  arrange_tables: "kind, count, chairs, around (item id) or rows, spacing",
  dress_object: "id or kind ('tables'|'chairs'|a kind), linen, linenColor, overlay, overlayColor, runner, runnerColor, charger, napkin, cover, coverColor, sash, palette",
  decorate_tables: "kind (a centerpiece), tables ('all' or ids), palette",
  swap_style: "from ('chairs' or a chair kind), to (chair kind)",
  save_view:    "name, pos, target",
  group_objects:   "ids (2 or more), name: makes a set that moves, turns, copies and deletes together",
  ungroup_objects: "set",
  rename_set:   "set, name",
  move_set:     "set (or ids), dx/dz, or x/z for the set's center",
  rotate_set:   "set (or ids), by (degrees, around the set's center)",
  duplicate_set:"set (or ids), dx, dz",
  delete_set:   "set (or ids), confirm: true",
  set_photo:    "ref (the stored photo), iw, ih (its size in pixels), pts (4 floor corners as [x, y] from 0 to 1: far left, far right, near right, near left), w (near edge in meters, measured), d (far to near, meters, optional), dSrc ('measured' or 'estimated'), ox, oz (where dot 1 sits in the room)",
  clear_photo:  "confirm: true"
};

// ---------- Sets: several things grouped to act as one (a table with its chairs and decor, a lounge corner) ----------
// An item in a set has it.set = the set's id, and s.sets = {id: {name}}. Things attached to a member
// (it.group = the member's id, like chairs around a table and centerpieces on it) always come along.
export function setMembers(s, id) { return s.items.filter(i => i.set === id).map(i => i.id); }
export function setClosure(s, ids) {
  const out = new Set(ids); let grew = true;
  while (grew) { grew = false; s.items.forEach(i => { if (i.group && out.has(i.group) && !out.has(i.id)) { out.add(i.id); grew = true; } }); }
  return [...out];
}
// The item a tap should treat as "the thing": climb from a chair or centerpiece to the table it belongs to.
export function rootOf(s, id) { let it = s.items.find(i => i.id === id), n = 0; while (it && it.group && n++ < 5) { const p = s.items.find(i => i.id === it.group); if (!p) break; it = p; } return it; }
function setTargets(s, o) {
  const ids = o.set ? setMembers(s, o.set) : Array.isArray(o.ids) ? o.ids : null;
  if (!ids || !ids.length) throw new Error(o.set ? "there's no set called " + o.set : "needs a set or ids");
  ids.forEach(id => { if (!s.items.some(i => i.id === id)) throw new Error("there's no object called " + id); });
  return setClosure(s, ids).map(id => s.items.find(i => i.id === id));
}
export function setCenter(items) { return [r2(items.reduce((a, i) => a + i.x, 0) / items.length), r2(items.reduce((a, i) => a + i.z, 0) / items.length)]; }
function setName(s, its) {
  const base = its.some(i => i.kind.startsWith("table")) ? "Table set" : "Set", used = new Set(Object.values(s.sets || {}).map(x => x.name));
  let n = 1, nm = base; while (used.has(nm)) nm = base + " " + (++n); return nm;
}
function cleanSets(s) {
  s.sets = s.sets && typeof s.sets === "object" ? s.sets : {};
  const used = new Set(s.items.map(i => i.set).filter(Boolean));
  Object.keys(s.sets).forEach(k => { if (!used.has(k)) delete s.sets[k]; });
  used.forEach(k => { if (!s.sets[k]) s.sets[k] = { name: "Set" }; });
}

export function apply(scene, ops, opts = {}) {
  if (!Array.isArray(ops)) ops = [ops];
  const s = clone(scene), log = [], errors = [];
  for (const o of ops) {
    if (!o || typeof o.op !== "string" || !OPS[o.op]) { errors.push("I don't know the step " + JSON.stringify(o && o.op)); continue; }
    try {
      const r = RUN[o.op](s, o, opts);
      if (r && r.error) errors.push(r.error); else if (r) log.push(r);
    } catch (e) { errors.push(o.op + ": " + e.message); }
  }
  if (errors.length && !opts.partial) return { ok: false, errors, log, scene };
  cleanSets(s);
  s.updated = Date.now();
  const warnings = checkScene(s);
  return { ok: true, scene: s, log, errors, warnings };
}

function needSite(s) { if (!s.site) throw new Error("this design isn't an outdoor site"); s.site.areas = s.site.areas || []; return s.site; }
// A list of [x, z] points on the site (a little past its edge is fine), rounded.
function checkPts(s, pts, min, max, what) {
  if (!Array.isArray(pts) || pts.length < min || pts.length > max) throw new Error(what + " needs " + min + " to " + max + " points");
  const m = 2; return pts.map(q => { if (!Array.isArray(q) || q.length !== 2 || !q.every(isNum)) throw new Error(what + " needs [x, z] points"); if (q[0] < -m || q[1] < -m || q[0] > s.room.w + m || q[1] > s.room.d + m) throw new Error(what + " goes off the site"); return [r2(q[0]), r2(q[1])]; });
}
function need(o, k) { if (o[k] == null) throw new Error("needs " + k); return o[k]; }
function num(v, lo, hi, what) { if (!isNum(v) || v < lo || v > hi) throw new Error(what + " must be between " + lo + " and " + hi); return r2(v); }
function findIt(s, id) { const it = s.items.find(i => i.id === id) || s.lights.find(l => l.id === id); if (!it) throw new Error("there's no object called " + id); return it; }
const label = it => it.label || (CATALOG[it.kind] ? CATALOG[it.kind].label : it.name || it.kind);
function checkColor(c) { if (c == null) return null; const v = COLORS[String(c).toLowerCase()] || c; if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error("unknown color " + c); return v; }
function checkPalette(p) { if (typeof p === "string") { if (!PALETTES[p]) throw new Error("unknown color set " + p); return PALETTES[p].slice(); } if (!Array.isArray(p) || !p.length || p.length > 6) throw new Error("a color set needs 1 to 6 colors"); return p.map(checkColor); }
function moveGroup(s, it, dx, dz) { s.items.forEach(o => { if (o.group === it.id) { o.x = r2(o.x + dx); o.z = r2(o.z + dz); } }); }

const RUN = {
  // ---- Outdoor sites: the ground, the property line, the sun, an aerial picture (see "Outdoor sites" below) ----
  set_site(s, o) {
    const fresh = !s.site, R = s.room;
    s.site = s.site || { ground: "grass", areas: [], edge: null, sun: null, north: 0 };
    if (o.w != null) R.w = num(o.w, 5, 400, "site width"); if (o.d != null) R.d = num(o.d, 5, 400, "site length");
    if (o.ground != null) { if (!GROUND.includes(o.ground)) throw new Error("the ground can be " + GROUND.join(", ")); s.site.ground = o.ground; }
    if (o.north != null) s.site.north = r2(((num(o.north, -360, 360, "north") % 360) + 360) % 360);
    if (o.dimSrc) Object.entries(o.dimSrc).forEach(([k, v]) => { if (!DIM_SRC.includes(v)) throw new Error("dimension source must be " + DIM_SRC.join("/")); R.dimSrc[k] = v; });
    R.floor = s.site.ground; R.h = Math.max(R.h || 0, 30); // no ceiling outdoors: only a sky limit, so tall tents and buildings fit
    return (fresh ? "Made this an outdoor site, " : "Site set to ") + fmtLen(R.w) + " by " + fmtLen(R.d);
  },
  paint_ground(s, o) {
    const S0 = needSite(s), mat = need(o, "mat"); if (!GROUND.includes(mat)) throw new Error("the ground can be " + GROUND.join(", "));
    let pts = o.pts; if (o.rect) { const { x, z, w, d } = o.rect; if (![x, z, w, d].every(isNum)) throw new Error("rect needs x, z, w and d"); pts = [[x, z], [x + w, z], [x + w, z + d], [x, z + d]]; }
    pts = checkPts(s, pts, 3, 60, "an area");
    if (polyArea(pts) < 0.25) throw new Error("that area is too small");
    const id = o.id && /^g_[a-z0-9]{1,12}$/.test(o.id) ? o.id : uid("g_"), a = { id, name: String(o.name || MATERIALS[mat].label).trim().slice(0, 40), mat, pts };
    const k = S0.areas.findIndex(x => x.id === id); if (k >= 0) S0.areas[k] = a; else { if (S0.areas.length >= 60) throw new Error("a site can have 60 painted areas"); S0.areas.push(a); }
    return (k >= 0 ? "Redrew " : "Painted ") + a.name.toLowerCase() + " (" + Math.round(polyArea(pts) / FT / FT).toLocaleString() + " sq ft)";
  },
  remove_ground(s, o) {
    const S0 = needSite(s); if (!o.confirm) return { error: "removing an area needs an OK" };
    const a = S0.areas.find(x => x.id === o.id); if (!a) throw new Error("there's no area called " + o.id);
    S0.areas = S0.areas.filter(x => x !== a); return "Removed " + a.name.toLowerCase();
  },
  trace_boundary(s, o) {
    const S0 = needSite(s);
    if (!o.pts || !o.pts.length) { if (!o.confirm) return { error: "removing the property line needs an OK" }; S0.edge = null; return "Removed the property line"; }
    const pts = checkPts(s, o.pts, 3, 200, "the property line"); if (polyArea(pts) < 4) throw new Error("that property line is too small");
    S0.edge = { pts, src: DIM_SRC.includes(o.src) ? o.src : "estimated" };
    return "Traced the property line: " + fmtLen(pts.reduce((a, p, i) => a + Math.hypot(p[0] - pts[(i + 1) % pts.length][0], p[1] - pts[(i + 1) % pts.length][1]), 0)) + " around";
  },
  add_building(s, o) { return RUN.add_item(s, Object.assign({}, o, { kind: "building", label: o.label || o.name || "Existing building" })); },
  set_sun(s, o) {
    const S0 = needSite(s), sun = Object.assign({ lat: 35.2271, lng: -80.8431, date: "2026-06-15", time: "12:00", tz: -4 }, S0.sun || {});
    if (o.lat != null) sun.lat = num(o.lat, -89, 89, "latitude"); if (o.lng != null) sun.lng = num(o.lng, -180, 180, "longitude");
    if (o.date != null) { if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date) || isNaN(Date.parse(o.date + "T12:00:00Z"))) throw new Error("the date must look like 2026-06-15"); sun.date = o.date; }
    if (o.time != null) { const m = String(o.time).match(/^(\d{1,2}):(\d{2})$/); if (!m || +m[1] > 23 || +m[2] > 59) throw new Error("the time must look like 14:30"); sun.time = m[1].padStart(2, "0") + ":" + m[2]; }
    if (o.tz != null) sun.tz = num(o.tz, -12, 14, "time zone");
    if (o.place != null) sun.place = String(o.place).trim().slice(0, 60);
    S0.sun = sun; placeSun(s);
    const p = sunPosition(sun); return p.elev > 0 ? "The sun at " + clock(sun.time) + " on " + dayName(sun.date) + ": " + Math.round(p.elev) + "° up in the " + compass(p.az) : "At " + clock(sun.time) + " on " + dayName(sun.date) + " the sun is down";
  },
  set_aerial(s, o) {
    const S0 = needSite(s), A = Object.assign({}, S0.aerial || {});
    if (o.ref != null) { if (!/^ph_[a-z0-9]{3,30}$/.test(o.ref)) throw new Error("that picture reference isn't valid"); A.ref = o.ref; }
    if (o.iw != null) A.iw = Math.round(num(o.iw, 16, 10000, "picture width")); if (o.ih != null) A.ih = Math.round(num(o.ih, 16, 10000, "picture height"));
    const uv = (q, what) => { if (!Array.isArray(q) || q.length !== 2 || !q.every(v => isNum(v) && v >= -0.2 && v <= 1.2)) throw new Error(what + " must be on the picture"); return q.map(v => Math.round(v * 10000) / 10000); };
    if (o.pa != null) A.pa = uv(o.pa, "the first mark"); if (o.pb != null) A.pb = uv(o.pb, "the second mark");
    if (o.len === null) delete A.len; else if (o.len != null) A.len = num(o.len, 0.5, 3000, "the measured length");
    if (o.x != null) A.x = num(o.x, -500, 900, "x"); if (o.z != null) A.z = num(o.z, -500, 900, "z"); if (o.rot != null) A.rot = r2(((num(o.rot, -360, 360, "turn") % 360) + 360) % 360);
    if (o.opacity != null) A.opacity = num(o.opacity, 0.2, 1, "how see-through");
    if (!A.ref || !A.iw || !A.ih) throw new Error("choose a picture first");
    if (A.x == null) { A.x = r2(s.room.w / 2); A.z = r2(s.room.d / 2); }
    S0.aerial = A; const sz = aerialSize(A, s.room);
    return sz.measured ? "The picture is to scale: " + fmtLen(sz.w) + " × " + fmtLen(sz.d) : "Placed the picture. Mark a length you know to put it to scale.";
  },
  clear_aerial(s, o) { const S0 = needSite(s); if (!o.confirm) return { error: "removing the picture needs an OK" }; delete S0.aerial; return "Removed the aerial picture"; },
  // A venue photo to design over (Stage A). The photo itself is stored once beside the design (store.js), never inside it.
  set_photo(s, o) {
    const P = Object.assign({}, s.photo || {});
    if (o.ref != null) { if (!/^ph_[a-z0-9]{3,30}$/.test(o.ref)) throw new Error("that photo reference isn't valid"); P.ref = o.ref; }
    if (o.iw != null) P.iw = Math.round(num(o.iw, 16, 10000, "photo width")); if (o.ih != null) P.ih = Math.round(num(o.ih, 16, 10000, "photo height"));
    if (o.pts != null) { if (!Array.isArray(o.pts) || o.pts.length !== 4 || !o.pts.every(q => Array.isArray(q) && q.length === 2 && q.every(v => isNum(v) && v >= -0.5 && v <= 1.5))) throw new Error("the floor needs 4 dots"); P.pts = o.pts.map(q => q.map(v => Math.round(v * 10000) / 10000)); }
    if (o.w != null) P.w = num(o.w, 0.3, 200, "the near edge");
    if (o.d === null) { delete P.d; P.dSrc = "estimated"; } else if (o.d != null) { P.d = num(o.d, 0.3, 200, "the depth"); P.dSrc = o.dSrc === "estimated" ? "estimated" : "measured"; }
    if (o.ox != null) P.ox = num(o.ox, -200, 200, "distance from the left wall"); if (o.oz != null) P.oz = num(o.oz, -200, 200, "distance from the back wall");
    if (!P.ref || !P.iw || !P.ih) throw new Error("choose a photo first");
    if (!P.pts) P.pts = [[0.3, 0.55], [0.7, 0.55], [0.86, 0.86], [0.14, 0.86]];
    s.photo = P; return "Updated the venue photo";
  },
  clear_photo(s, o) { if (!o.confirm) return { error: "removing the photo needs an OK" }; delete s.photo; return "Removed the venue photo"; },
  group_objects(s, o) {
    const ids = Array.isArray(o.ids) ? [...new Set(o.ids)] : [];
    ids.forEach(id => { if (!s.items.some(i => i.id === id)) throw new Error("there's no object called " + id); });
    // only the main pieces get the set mark; chairs and decor on a picked table come along anyway
    const pick = new Set(ids), top = ids.filter(id => { const it = s.items.find(i => i.id === id); return !(it.group && pick.has(it.group)); });
    if (setClosure(s, top).length < 2) throw new Error("pick at least two things to group");
    s.sets = s.sets || {}; const id = o.id && /^set_[a-z0-9]{1,12}$/.test(o.id) ? o.id : uid("set_"), its = top.map(t => s.items.find(i => i.id === t));
    const name = String(o.name || setName(s, its)).trim().slice(0, 40) || "Set";
    its.forEach(i => { i.set = id; }); s.sets[id] = { name };
    return "Grouped " + setClosure(s, top).length + " things as “" + name + "”";
  },
  rename_set(s, o) {
    const id = need(o, "set"); if (!s.sets || !s.sets[id]) throw new Error("there's no set called " + id);
    s.sets[id].name = String(need(o, "name")).trim().slice(0, 40) || "Set"; return "Named the set “" + s.sets[id].name + "”";
  },
  ungroup_objects(s, o) {
    const id = need(o, "set"), its = s.items.filter(i => i.set === id); if (!its.length) throw new Error("there's no set called " + id);
    const name = (s.sets && s.sets[id] || {}).name || "the set"; its.forEach(i => { delete i.set; }); if (s.sets) delete s.sets[id];
    return "Took apart " + name;
  },
  move_set(s, o) {
    const its = setTargets(s, o), [cx, cz] = setCenter(its);
    let dx = o.dx || 0, dz = o.dz || 0; if (o.x != null) dx = o.x - cx; if (o.z != null) dz = o.z - cz;
    if (!isNum(dx) || !isNum(dz)) throw new Error("dx and dz must be numbers");
    its.forEach(i => { i.x = r2(i.x + dx); i.z = r2(i.z + dz); });
    return "Moved " + (o.set && s.sets && s.sets[o.set] ? s.sets[o.set].name : its.length + " things");
  },
  rotate_set(s, o) {
    const its = setTargets(s, o), [cx, cz] = setCenter(its), by = +need(o, "by"); if (!isNum(by)) throw new Error("by must be a number");
    const da = by * Math.PI / 180;
    its.forEach(i => { const rx = i.x - cx, rz = i.z - cz; i.x = r2(cx + rx * Math.cos(da) + rz * Math.sin(da)); i.z = r2(cz - rx * Math.sin(da) + rz * Math.cos(da)); i.rot = r2((((i.rot || 0) + by) % 360 + 360) % 360); });
    return "Turned " + (o.set && s.sets && s.sets[o.set] ? s.sets[o.set].name : its.length + " things") + " " + Math.round(by) + "°";
  },
  duplicate_set(s, o) {
    const its = setTargets(s, o);
    const minX = Math.min(...its.map(i => i.x - (i.w || 0) / 2)), maxX = Math.max(...its.map(i => i.x + (i.w || 0) / 2));
    const dx = o.dx ?? r2(maxX - minX + 0.5), dz = o.dz ?? 0, map = new Map(its.map(i => [i.id, uid("i_")]));
    const newSet = o.set ? uid("set_") : null;
    its.forEach(i => { const n = clone(i); n.id = map.get(i.id); n.x = r2(i.x + dx); n.z = r2(i.z + dz);
      if (n.group) { if (map.has(n.group)) n.group = map.get(n.group); else delete n.group; }
      if (n.set) { if (newSet && n.set === o.set) n.set = newSet; else delete n.set; }
      s.items.push(n); });
    if (newSet) { s.sets = s.sets || {}; const nm = (s.sets[o.set] || {}).name || "Set"; s.sets[newSet] = { name: setName(s, [{ kind: nm.startsWith("Table") ? "table" : "x" }]) }; }
    return "Copied " + its.length + " things";
  },
  delete_set(s, o) {
    if (!o.confirm) return { error: "Deleting needs your OK first" };
    const gone = new Set(setTargets(s, o).map(i => i.id)); const n = gone.size;
    s.items = s.items.filter(i => !gone.has(i.id));
    return "Removed " + n + " object" + (n === 1 ? "" : "s");
  },
  set_room(s, o) {
    const R = s.room;
    ["w", "d", "h"].forEach(k => { if (o[k] != null) R[k] = num(o[k], 2, 200, "room " + k); });
    ["floor", "walls", "ceiling"].forEach(k => { if (o[k] != null) { if (!MATERIALS[o[k]]) throw new Error("unknown material " + o[k]); R[k] = o[k]; } });
    if (o.wallColor) R.wallColor = checkColor(o.wallColor);
    if (o.dimSrc) Object.entries(o.dimSrc).forEach(([k, v]) => { if (!DIM_SRC.includes(v)) throw new Error("dimension source must be " + DIM_SRC.join("/")); R.dimSrc[k] = v; });
    if (o.w != null || o.d != null) {
      const W = R.w, D = R.d, c = [[0, 0], [W, 0], [W, D], [0, D]];
      s.walls.slice(0, 4).forEach((w, i) => { w.a = c[i]; w.b = c[(i + 1) % 4]; });
    }
    if (o.h != null) { s.walls.forEach(w => w.h = R.h); s.items.forEach(i => { if ((CATALOG[i.kind] || {}).ceiling) i.y = r2(R.h - i.h); }); }
    return "Room set to " + fmtLen(R.w) + " by " + fmtLen(R.d) + ", " + fmtLen(R.h) + " high";
  },
  add_wall(s, o) {
    const a = need(o, "a"), b = need(o, "b");
    const w = { id: o.id || uid("w_"), name: o.name || "Wall", a: a.map(r2), b: b.map(r2), h: num(o.h ?? s.room.h, 0.3, 30, "wall height"), t: num(o.t ?? 0.15, 0.05, 2, "wall thickness"), mat: "paint", color: s.room.wallColor };
    if (wallLen(w) < 0.2) throw new Error("that wall is too short");
    s.walls.push(w); return "Added " + w.name.toLowerCase() + " (" + fmtLen(wallLen(w)) + ")";
  },
  add_opening(s, o) {
    const type = need(o, "type"); if (!["door", "window", "opening"].includes(type)) throw new Error("opening must be door, window or opening (an open doorway)");
    const w = s.walls.find(x => x.id === need(o, "wall")); if (!w) throw new Error("no wall " + o.wall);
    const op = { id: o.id || uid("o_"), type, wall: w.id, at: r2(o.at ?? wallLen(w) / 2), w: num(o.w ?? (type === "door" ? 0.91 : 1.2), 0.3, 10, "width"), h: num(o.h ?? (type === "door" ? 2.13 : 1.5), 0.3, 10, "height"), sill: r2(o.sill ?? (type === "door" ? 0 : 0.9)) };
    if (op.at - op.w / 2 < 0 || op.at + op.w / 2 > wallLen(w)) throw new Error("that " + type + " doesn't fit on " + w.name);
    if (op.sill + op.h > w.h) throw new Error("that " + type + " is taller than the wall");
    s.openings.push(op); return "Added a " + type + " on the " + w.name.toLowerCase();
  },
  add_item(s, o) {
    const kind = need(o, "kind"); if (!CATALOG[kind]) throw new Error("the library has no " + kind);
    let x = o.x, z = o.z;
    if (o.where) { const p = place(s, o.where); if (!p) throw new Error("I don't know where " + o.where + " is"); [x, z] = p; }
    const it = mkItem(kind, num(x ?? s.room.w / 2, -1, s.room.w + 1, "x"), num(z ?? s.room.d / 2, -1, s.room.d + 1, "z"), o.rot || 0, { id: o.id || uid("i_") });
    const big = CATALOG[kind].site ? 150 : 40; // an existing building can be bigger than any rental piece
    ["w", "d", "h"].forEach(k => { if (o[k] != null) it[k] = num(o[k], 0.05, big, k); });
    if (o.color) it.color = checkColor(o.color);
    if (o.mat) { if (!MATERIALS[o.mat]) throw new Error("unknown material " + o.mat); it.mat = o.mat; }
    if (o.label) it.label = String(o.label).slice(0, 40);
    if (o.group) it.group = o.group;
    if (o.palette) it.palette = checkPalette(o.palette);
    if (o.where) snapInside(s, it, o.where);
    const C = CATALOG[kind];
    if (C.top) { // land on the table it's put on, or the one under it
      const t = o.on ? s.items.find(i => i.id === o.on) : s.items.find(i => CATALOG[i.kind].dress === "table" && (() => { const f = footprint(i); return it.x > f.x0 && it.x < f.x1 && it.z > f.z0 && it.z < f.z1; })());
      if (o.on && !t) throw new Error("there's no table called " + o.on);
      if (t) { it.y = t.h; it.group = t.id; if (o.on) { const k = s.items.filter(i => i.group === t.id && CATALOG[i.kind].top).length, rr = Math.min(t.w, t.d) * 0.22, a = k * 2.1;
        it.x = r2(t.x + (k ? Math.cos(a) * rr : 0)); it.z = r2(t.z + (k ? Math.sin(a) * rr : 0)); } }
    }
    if (C.ceiling) it.y = r2(s.room.h - it.h);
    s.items.push(it);
    if (o.chairs) s.items.push(...chairsAround(it, Math.min(+o.chairs, 14), o.chairKind || "chair"));
    return "Added " + label(it).toLowerCase() + (o.chairs ? " with " + o.chairs + " chairs" : "");
  },
  move_object(s, o) {
    const it = findIt(s, need(o, "id")); let x = it.x, z = it.z;
    if (o.where) { const p = place(s, o.where); if (!p) throw new Error("I don't know where " + o.where + " is"); [x, z] = p; }
    if (o.x != null) x = o.x; if (o.z != null) z = o.z;
    if (o.dx != null) x += o.dx; if (o.dz != null) z += o.dz;
    if (o.y != null && it.kind !== undefined) it.y = num(o.y, 0, 30, "height off the floor");
    const dx = x - it.x, dz = z - it.z; it.x = r2(x); it.z = r2(z);
    if (o.where && it.w) snapInside(s, it, o.where);
    if (it.w) moveGroup(s, it, it.x - (it.x - dx), it.z - (it.z - dz));
    if (it.kind && CATALOG[it.kind] && CATALOG[it.kind].top && o.y == null) {
      const t = s.items.find(i => CATALOG[i.kind].dress === "table" && (() => { const f = footprint(i); return it.x > f.x0 && it.x < f.x1 && it.z > f.z0 && it.z < f.z1; })());
      if (t) { it.y = t.h; it.group = t.id; } else { it.y = 0; delete it.group; }
    }
    if (it.kind && LIGHT_KINDS.includes(it.kind)) { if (o.y != null) it.y = o.y; }
    return "Moved " + label(it).toLowerCase() + (o.where ? " to the " + o.where : "");
  },
  rotate_object(s, o) {
    const it = findIt(s, need(o, "id")); const old = it.rot || 0;
    it.rot = r2(((o.rot != null ? o.rot : old + (o.by || 0)) % 360 + 360) % 360);
    const da = (it.rot - old) * Math.PI / 180;
    s.items.forEach(c => { if (c.group === it.id) { const rx = c.x - it.x, rz = c.z - it.z; c.x = r2(it.x + rx * Math.cos(da) + rz * Math.sin(da)); c.z = r2(it.z - rx * Math.sin(da) + rz * Math.cos(da)); c.rot = r2(c.rot + (it.rot - old)); } });
    return "Turned " + label(it).toLowerCase() + " to " + Math.round(it.rot) + "°";
  },
  resize_object(s, o) {
    const it = findIt(s, need(o, "id")); if (!it.w) throw new Error("that can't be resized");
    if (o.scale != null) { const k = num(o.scale, 0.1, 10, "scale"); it.w = r2(it.w * k); it.d = r2(it.d * k); if (!isFloorLayer(it)) it.h = r2(it.h * k); }
    const big = (CATALOG[it.kind] || {}).site ? 150 : 40;
    ["w", "d", "h"].forEach(k => { if (o[k] != null) it[k] = num(o[k], 0.05, big, k); });
    return "Resized " + label(it).toLowerCase() + " to " + fmtLen(it.w) + " × " + fmtLen(it.d);
  },
  duplicate_object(s, o) {
    const it = findIt(s, need(o, "id")); if (!it.w) throw new Error("only furniture can be copied this way");
    const n = clone(it); n.id = uid("i_"); n.x = r2(it.x + (o.dx ?? it.w + 0.5)); n.z = r2(it.z + (o.dz ?? 0)); delete n.group;
    s.items.push(n);
    s.items.filter(c => c.group === it.id).forEach(c => { const k = clone(c); k.id = uid("i_"); k.group = n.id; k.x = r2(c.x + n.x - it.x); k.z = r2(c.z + n.z - it.z); s.items.push(k); });
    return "Copied " + label(it).toLowerCase();
  },
  delete_object(s, o) {
    if (!o.confirm) return { error: "Deleting needs your OK first" };
    const ids = o.id ? [o.id] : s.items.filter(i => i.kind === o.kind).map(i => i.id);
    if (!ids.length) throw new Error("nothing to delete");
    const gone = new Set(ids); s.items.forEach(c => { if (gone.has(c.group)) gone.add(c.id); });
    const n = s.items.length + s.lights.length;
    s.items = s.items.filter(i => !gone.has(i.id)); s.lights = s.lights.filter(l => !gone.has(l.id));
    return "Removed " + (n - s.items.length - s.lights.length) + " object" + (n - s.items.length - s.lights.length === 1 ? "" : "s");
  },
  change_material(s, o) {
    const mat = o.mat; if (mat && !MATERIALS[mat]) throw new Error("unknown material " + mat);
    const color = checkColor(o.color);
    if (["floor", "walls", "ceiling"].includes(o.id || o.target)) {
      const k = o.id || o.target; if (mat) { s.room[k] = mat; if (!color && k !== "walls") delete s.room[k + "Color"]; }
      if (color && k === "walls") { s.room.wallColor = color; s.walls.forEach(w => w.color = color); }
      if (color && k !== "walls") s.room[k + "Color"] = color;
      return "Changed the " + k;
    }
    const list = o.id ? [findIt(s, o.id)] : s.items.filter(i => i.kind === o.kind || (o.kind === "tables" && i.kind.startsWith("table")) || (o.kind === "chairs" && i.kind.startsWith("chair")));
    if (!list.length) throw new Error("nothing matched");
    list.forEach(it => { if (mat) it.mat = mat; if (color) it.color = color; });
    return "Changed " + list.length + " " + (list.length === 1 ? label(list[0]).toLowerCase() : "objects");
  },
  add_light(s, o) {
    const kind = need(o, "kind"); if (!LIGHT_KINDS.includes(kind)) throw new Error("light must be " + LIGHT_KINDS.join("/"));
    const L = { id: o.id || uid("L_"), kind, x: r2(o.x ?? s.room.w / 2), y: r2(o.y ?? s.room.h - 0.3), z: r2(o.z ?? s.room.d / 2),
      color: o.kelvin ? kelvinHex(o.kelvin) : (checkColor(o.color) || "#ffffff"), intensity: num(o.intensity ?? (kind === "spot" ? 20 : kind === "point" ? 4 : 1), 0, 500, "brightness"),
      range: o.range || 8, angle: o.angle || 30, name: o.name || ({ point: "Light", spot: "Spotlight", sun: "Sun", ambient: "Fill" })[kind] };
    if (kind === "spot") { L.tx = o.tx ?? L.x; L.ty = o.ty ?? 0; L.tz = o.tz ?? L.z; }
    if (o.kelvin) L.kelvin = o.kelvin;
    s.lights.push(L); return "Added " + L.name.toLowerCase();
  },
  modify_lighting(s, o) {
    let list = o.id === "all" || !o.id ? s.lights.slice() : [findIt(s, o.id)];
    if (o.kind) list = list.filter(l => l.kind === o.kind);
    if (!list.length) throw new Error("no lights matched");
    list.forEach(L => {
      if (o.intensity != null) L.intensity = num(o.intensity, 0, 500, "brightness");
      if (o.scale != null) L.intensity = r2(L.intensity * num(o.scale, 0, 10, "scale"));
      if (o.kelvin) { L.kelvin = num(o.kelvin, 1000, 12000, "color temperature"); L.color = kelvinHex(L.kelvin); }
      if (o.color) L.color = checkColor(o.color);
    });
    return "Adjusted " + list.length + " light" + (list.length === 1 ? "" : "s");
  },
  arrange_tables(s, o) {
    const kind = o.kind || "table_round", count = Math.round(num(o.count, 1, 60, "number of tables")), chairs = o.chairs == null ? (CATALOG[kind].seats || 0) : Math.round(num(o.chairs, 0, 14, "chairs"));
    if (!CATALOG[kind] || !kind.startsWith("table")) throw new Error("arrange_tables needs a table kind");
    // New tables keep the look of the ones they replace: linens, chair style, covers, sashes, centerpieces.
    const oldT = s.items.find(i => i.kind.startsWith("table_round") && kind.startsWith("table_round") || i.kind === kind);
    const look = oldT ? { dress: oldT.dress, color: oldT.color, chair: s.items.find(i => i.group === oldT.id && i.kind.startsWith("chair")), tops: s.items.filter(i => i.group === oldT.id && CATALOG[i.kind].top) } : null;
    if (o.replace !== false) { // Clear existing tables of that kind and their chairs, as one step the person can undo.
      const same = k => k === kind || (kind.startsWith("table_round") && k.startsWith("table_round"));
      const old = new Set(s.items.filter(i => same(i.kind)).map(i => i.id));
      s.items = s.items.filter(i => !old.has(i.id) && !old.has(i.group));
    }
    const c = CATALOG[kind], R = s.room;
    // A table with its chairs takes about this much floor; keep an aisle between neighbors so people can walk.
    const foot = (c.seats || chairs ? Math.max(c.w, c.d) + 1.1 : Math.max(c.w, c.d) + 0.3), aisle = o.spacing ?? 0.6, edge = 0.3;
    const center = o.around ? findIt(s, o.around) : null;
    const cx = center ? center.x : R.w / 2, cz = center ? center.z : R.d / 2;
    // Candidate spots on a fine grid, nearest to the center first, so tables gather around it
    // (or fill the room evenly from the middle when nothing is named).
    // Tables go on an even lattice (rows the way a banquet captain sets them). Try several lattice offsets and
    // keep whichever fits the most tables, then use the spots nearest the center.
    const pitch = foot + aisle, boxAt = (x, z) => ({ x0: x - foot / 2, x1: x + foot / 2, z0: z - foot / 2, z1: z + foot / 2 });
    const free = (x, z) => { const b = boxAt(x, z); return b.x0 >= edge && b.z0 >= edge && b.x1 <= R.w - edge && b.z1 <= R.d - edge && !s.items.some(i => !(CATALOG[i.kind] || {}).over && overlap(footprint(i), b, -edge)); };
    let spots = [];
    for (let ox = 0; ox < pitch; ox += 0.25) for (let oz = 0; oz < pitch; oz += 0.25) {
      const got = [];
      for (let x = ox + foot / 2; x <= R.w; x += pitch) for (let z = oz + foot / 2; z <= R.d; z += pitch) if (free(x, z)) got.push([x, z]);
      if (got.length > spots.length || (got.length === spots.length && got.length >= count)) {
        got.sort((p, q) => Math.hypot(p[0] - cx, p[1] - cz) - Math.hypot(q[0] - cx, q[1] - cz));
        const score = g => g.slice(0, count).reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cz), 0);
        if (got.length > spots.length || score(got) < score(spots)) spots = got;
      }
    }
    const placed = [];
    let made = 0;
    for (const [x, z] of spots) {
      if (made >= count) break;
      const box = boxAt(x, z);
      if (placed.some(b => overlap(b, box, -aisle + 0.01))) continue;
      const t = mkItem(kind, x, z, 0, { label: "Table " + (made + 1) });
      if (look) { if (look.dress) t.dress = clone(look.dress); if (look.color) t.color = look.color; }
      if (o.color) t.color = checkColor(o.color);
      s.items.push(t);
      if (chairs) { const lc = look && look.chair; const cs = chairsAround(t, chairs, lc ? lc.kind : "chair"); if (lc) cs.forEach(c => { if (lc.dress) c.dress = clone(lc.dress); c.mat = lc.mat; if (lc.color) c.color = lc.color; }); s.items.push(...cs); }
      if (look) look.tops.forEach(tp => s.items.push(Object.assign(clone(tp), { id: uid("i_"), x: t.x + (tp.x - oldT.x), z: t.z + (tp.z - oldT.z), group: t.id })));
      placed.push(box); made++;
    }
    if (made < count) return { error: "Only " + made + " of " + count + " tables fit with space to walk between them. Try fewer tables, smaller tables, or a bigger room." };
    return "Arranged " + made + " " + c.label.toLowerCase().replace(/ \(.*\)/, "") + "s" + (chairs ? " with " + chairs + " chairs each" : "") + (center ? " around the " + label(center).toLowerCase() : "");
  },
  dress_object(s, o) {
    const list = o.id ? [findIt(s, o.id)] : s.items.filter(i => { const c = CATALOG[i.kind]; return o.kind === "tables" ? c.dress === "table" && !/buffet|cake|gift/.test(i.kind) : o.kind === "chairs" ? c.dress === "chair" : i.kind === o.kind; });
    if (!list.length) throw new Error("nothing to decorate");
    let n = 0;
    list.forEach(it => {
      const C = CATALOG[it.kind], spec = DRESS[C.dress];
      if (o.palette) { if (!C.palette) throw new Error(label(it) + " doesn't take a color set"); it.palette = checkPalette(o.palette); n++; }
      if (!spec) { if (!o.palette) throw new Error(label(it) + " doesn't take linens or covers"); return; }
      const d = Object.assign({}, it.dress || {});
      for (const [k, def] of Object.entries(spec)) {
        if (!(k in o)) continue;
        const v = o[k];
        if (def.opts) { if (!def.opts[v]) throw new Error(def.label.toLowerCase() + " must be one of: " + Object.values(def.opts).join(", ")); d[k] = v; }
        else d[k] = (v == null || v === "none") && def.none ? null : checkColor(v);
      }
      // Asking for a cover or sash color turns the cover on; a cloth color keeps the current cloth.
      if (o.coverColor && !o.cover && (!d.cover || d.cover === "none")) d.cover = "spandex";
      if (o.overlayColor && !o.overlay && (!d.overlay || d.overlay === "none")) d.overlay = "square";
      if (o.runnerColor && !o.runner && (!d.runner || d.runner === "none")) d.runner = "satin";
      if (o.linenColor) it.color = d.linenColor;
      it.dress = d; n++;
    });
    return "Decorated " + n + " " + (n === 1 ? label(list[0]).toLowerCase() : list[0].kind.startsWith("chair") ? "chairs" : "tables");
  },
  swap_style(s, o) {
    const to = need(o, "to"); if (!CATALOG[to] || CATALOG[to].dress !== "chair") throw new Error("pick a chair style");
    const list = s.items.filter(i => o.from === "chairs" ? CATALOG[i.kind].dress === "chair" : i.kind === o.from);
    if (!list.length) throw new Error("there are no chairs to swap");
    list.forEach(c => { const C = CATALOG[to]; c.kind = to; c.w = C.w; c.d = C.d; c.h = C.h; c.mat = C.mat; c.color = null; });
    return "Switched " + list.length + " chairs to " + CATALOG[to].label.toLowerCase() + "s";
  },
  decorate_tables(s, o) {
    const kind = need(o, "kind"); if (!CATALOG[kind] || !CATALOG[kind].top) throw new Error(kind + " doesn't go on a table");
    const tables = s.items.filter(i => CATALOG[i.kind].dress === "table" && /^table_(round|rect|banquet|farm|serpentine|head|sweetheart)/.test(i.kind) && (o.tables === "all" || !o.tables || o.tables.includes(i.id)));
    if (!tables.length) throw new Error("there are no guest tables");
    // One centerpiece per table: swap out whatever centerpiece is already there.
    const gone = new Set(s.items.filter(i => CATALOG[i.kind].top && tables.some(t => t.id === i.group)).map(i => i.id));
    s.items = s.items.filter(i => !gone.has(i.id));
    tables.forEach(t => { const it = mkItem(kind, t.x, t.z, 0, { y: t.h, group: t.id }); if (o.palette) it.palette = checkPalette(o.palette); s.items.push(it); });
    return "Put a " + CATALOG[kind].label.toLowerCase() + " on " + tables.length + " table" + (tables.length === 1 ? "" : "s");
  },
  save_view(s, o) { s.views.push({ id: uid("vw_"), name: String(need(o, "name")).slice(0, 40), pos: need(o, "pos").map(r2), target: need(o, "target").map(r2), fov: o.fov >= 15 && o.fov <= 90 ? r2(o.fov) : 50 }); return "Saved the view " + o.name; }
};

// Keep an item inside the room when it's sent to a named spot (a stage sent "front" sits against the front wall).
function snapInside(s, it, where) {
  const f = footprint(it), B = bounds(s), m = s.site ? 2 : 0.25;
  if (/front/.test(where)) it.z = r2(it.z - f.z0 + B.z0 + m);
  if (/back|rear/.test(where)) it.z = r2(it.z + (B.z1 - m - f.z1));
  if (/left/.test(where)) it.x = r2(it.x - f.x0 + B.x0 + m);
  if (/right/.test(where)) it.x = r2(it.x + (B.x1 - m - f.x1));
  if (it.kind === "stage" && /front|back/.test(where)) it.rot = /back/.test(where) ? 180 : 0;
}

// Problems worth showing after a change: things outside the room or bumping into each other.
export function checkScene(s) {
  const w = [];
  s.items.forEach(it => {
    if (!inRoom(s, it)) w.push({ id: it.id, msg: label(it) + (s.site ? " is outside the site" : " is outside the room") });
  });
  if (s.site) siteWarnings(s).forEach(x => w.push(x));
  const seen = new Set();
  s.items.forEach(it => {
    if (it.group) return;
    collisions(s, it).forEach(o => { const k = [it.id, o].sort().join("|"); if (!seen.has(k)) { seen.add(k); w.push({ id: it.id, msg: label(it) + " overlaps " + label(s.items.find(i => i.id === o)) }); } });
  });
  return w;
}

// Load a file someone saved or exported, refusing anything that isn't a Host Mode venue.
export function validateFile(obj) {
  if (!obj || obj.schema !== SCHEMA) throw new Error("This isn't a Host Mode venue file");
  if (obj.version > VERSION) throw new Error("This venue was saved by a newer version of Host Mode");
  if (!obj.room || !Array.isArray(obj.items) || !Array.isArray(obj.walls)) throw new Error("This venue file is missing parts");
  obj.items = obj.items.filter(i => CATALOG[i.kind] && isNum(i.x) && isNum(i.z));
  obj.lights = (obj.lights || []).filter(l => LIGHT_KINDS.includes(l.kind));
  obj.openings = obj.openings || []; obj.views = obj.views || [];
  obj.sets = obj.sets && typeof obj.sets === "object" && !Array.isArray(obj.sets) ? obj.sets : {};
  obj.items.forEach(i => { if (i.set != null && (typeof i.set !== "string" || !obj.sets[i.set])) delete i.set; });
  if (obj.photo != null) { const P = obj.photo; if (!P || typeof P.ref !== "string" || !/^ph_[a-z0-9]{3,30}$/.test(P.ref) || !isNum(P.iw) || !isNum(P.ih) || !Array.isArray(P.pts) || P.pts.length !== 4) delete obj.photo; }
  if (obj.site != null) cleanSite(obj);
  delete obj.photo_image; delete obj.aerial_image; // the photo itself travels only in exported files, and is stored apart when one is opened
  return obj;
}

// ---------- Outdoor sites ----------
// An outdoor design has s.site: {ground, areas: [{id, name, mat, pts}], edge: {pts, src} (the property line), north (degrees
// north is turned clockwise from straight up in the top view), sun: {lat, lng, date, time, tz, place}, aerial (a picture from
// above, stored apart like venue photos)}. The room becomes the site's size with a 30 m sky limit and no walls. Indoor designs
// have no site and work exactly as before. North is -z (up in the top view) unless turned; east is +x.
export const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) c = !c; } return c; };
export function polyArea(pts) { let a = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }); return Math.abs(a) / 2; }
// A piece's four corners on the site.
export function cornersOf(it) { const a = (it.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => { const lx = u * it.w / 2, lz = v * it.d / 2; return [it.x + lx * c - lz * sn, it.z + lx * sn + lz * c]; }); }
// Is a site point inside a piece's footprint (round pieces as circles)?
function insideIt(it, x, z, round) { const dx = x - it.x, dz = z - it.z; if (round) return Math.hypot(dx, dz) <= it.w / 2; const a = (it.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), lx = dx * c + dz * sn, lz = -dx * sn + dz * c; return Math.abs(lx) <= it.w / 2 && Math.abs(lz) <= it.d / 2; }
const boxGap = (A, B) => Math.hypot(Math.max(0, A.x0 - B.x1, B.x0 - A.x1), Math.max(0, A.z0 - B.z1, B.z0 - A.z1));
// Fire codes commonly ask for 20 ft between generators and tents (see the towable_generators finding); local rules decide.
const TENT_GAP = 20 * FT;
function siteWarnings(s) {
  const w = [], E = s.site.edge && s.site.edge.pts;
  if (E) s.items.forEach(it => { const C = CATALOG[it.kind] || {}; if (it.group || C.site || C.top) return; if (cornersOf(it).some(p => !inPoly(p, E))) w.push({ id: it.id, msg: label(it) + " is past the property line" }); });
  const tents = s.items.filter(i => (CATALOG[i.kind] || {}).shade === "roof");
  s.items.filter(i => i.kind === "generator").forEach(g => { const t = tents.find(t => boxGap(footprint(g), footprint(t)) < TENT_GAP); if (t) w.push({ id: g.id, msg: "The generator is closer than 20 ft to the " + label(t).replace(/ \(.*\)/, "").toLowerCase() + ". Fire codes usually ask for 20 ft: check with the venue and the fire marshal" }); });
  return w;
}
function cleanSite(obj) {
  const S0 = obj.site; if (!S0 || typeof S0 !== "object" || Array.isArray(S0)) { delete obj.site; return; }
  const okPts = (p, n) => Array.isArray(p) && p.length >= n && p.length <= 200 && p.every(q => Array.isArray(q) && q.length === 2 && q.every(isNum));
  if (!GROUND.includes(S0.ground)) S0.ground = "grass";
  S0.areas = (Array.isArray(S0.areas) ? S0.areas : []).filter(a => a && typeof a.id === "string" && GROUND.includes(a.mat) && okPts(a.pts, 3)).slice(0, 60);
  S0.areas.forEach(a => { a.name = String(a.name || MATERIALS[a.mat].label).slice(0, 40); });
  if (S0.edge && !okPts(S0.edge.pts, 3)) S0.edge = null; if (S0.edge && !DIM_SRC.includes(S0.edge.src)) S0.edge.src = "estimated";
  if (!isNum(S0.north)) S0.north = 0;
  const u = S0.sun; if (u && !(isNum(u.lat) && isNum(u.lng) && isNum(u.tz) && /^\d{4}-\d{2}-\d{2}$/.test(u.date) && /^\d{2}:\d{2}$/.test(u.time))) S0.sun = null;
  const A = S0.aerial; if (A && !(typeof A.ref === "string" && /^ph_[a-z0-9]{3,30}$/.test(A.ref) && isNum(A.iw) && isNum(A.ih) && isNum(A.x) && isNum(A.z))) delete S0.aerial;
}

// Where the sun is: NOAA's general solar position equations (finding sun_position). sun = {lat, lng, date "YYYY-MM-DD",
// time "HH:MM" local clock time, tz hours from UTC (-4 for summer in Charlotte)}. Returns degrees: elev above the horizon,
// az clockwise from north. About a degree off at most, which is plenty for shade; it knows nothing about clouds.
export function sunPosition(sun, time) {
  const rad = Math.PI / 180, [Y, M, D] = sun.date.split("-").map(Number), [h, mi] = (time || sun.time).split(":").map(Number);
  const leap = (Y % 4 === 0 && Y % 100 !== 0) || Y % 400 === 0, doy = Math.round((Date.UTC(Y, M - 1, D) - Date.UTC(Y, 0, 1)) / 864e5) + 1;
  const g = 2 * Math.PI / (leap ? 366 : 365) * (doy - 1 + (h - 12) / 24);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = h * 60 + mi + eqt + 4 * sun.lng - 60 * sun.tz, ha = (tst / 4 - 180) * rad, la = sun.lat * rad;
  const cz = Math.max(-1, Math.min(1, Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha)));
  const az = (Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha)) / rad + 360) % 360;
  return { elev: 90 - Math.acos(cz) / rad, az };
}
// The direction toward the sun on the site, as a unit [x, y, z].
export function sunVec(s, p) { const a = ((p.az + (s.site.north || 0)) % 360) * Math.PI / 180, e = p.elev * Math.PI / 180; return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]; }
// Keeps the design's sun light where the sun is (the view draws real shadows from it).
function placeSun(s) {
  const sun = s.site.sun; if (!sun) return; const p = sunPosition(sun), v = sunVec(s, p), R = s.room, up = p.elev > 0;
  let L = s.lights.find(l => l.kind === "sun"); if (!L) { L = { id: "L_sun", kind: "sun", color: "#ffffff", name: "Sun" }; s.lights.push(L); }
  const q = sunVec(s, { az: p.az, elev: Math.max(p.elev, 2) }), k = 60, e = Math.max(p.elev, 2) * Math.PI / 180; // a low sun still lights from just over the horizon
  L.x = r2(R.w / 2 + q[0] * k); L.y = r2(q[1] * k); L.z = r2(R.d / 2 + q[2] * k);
  L.intensity = up ? r2(0.9 + 1.4 * Math.min(1, Math.sin(e) * 1.5)) : 0.05; L.color = up && p.elev < 12 ? "#ffc58a" : "#fff4e2";
}
const COMPASS = ["north", "north-northeast", "northeast", "east-northeast", "east", "east-southeast", "southeast", "south-southeast", "south", "south-southwest", "southwest", "west-southwest", "west", "west-northwest", "northwest", "north-northwest"];
export const compass = az => COMPASS[Math.round(az / 22.5) % 16];
export function clock(t) { const [h, m] = t.split(":").map(Number); return (h % 12 || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? " am" : " pm"); }
export function dayName(d) { const [Y, M, D] = d.split("-").map(Number); return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][M - 1] + " " + D + (Y !== new Date().getFullYear() ? ", " + Y : ""); }
// How shaded a spot is at height y: 1 under a tent, canopy, umbrella or a building's shadow, 0.5 under pergola slats, 0 in the sun.
// Each roof is a flat shape at its eave height, so a spot is shaded when the line from it toward the sun passes through a roof.
export function shadeAt(s, x, z, y, v) {
  const k = 1 / Math.max(0.03, v[1]); let best = 0;
  for (const c of s.items) {
    const C = CATALOG[c.kind] || {}; if (!C.shade) continue;
    if (C.shade === "box") { for (let t = y; t <= c.h; t += Math.max(0.25, (c.h - y) / 12)) if (insideIt(c, x + v[0] * k * (t - y), z + v[2] * k * (t - y))) return 1; continue; }
    const hc = C.eave * (c.h / C.h); if (hc <= y) continue;
    if (insideIt(c, x + v[0] * k * (hc - y), z + v[2] * k * (hc - y), C.shade === "round")) best = Math.max(best, C.shade === "slats" ? 0.5 : 1);
    if (best === 1) return 1;
  }
  return best;
}
// The sun check for the Site tab and the Ask box: where the sun is, and how many seats are in shade (a seated head at 1.1 m).
export function shadeReport(s, time) {
  const sun = s.site && s.site.sun; if (!sun) return null;
  const p = sunPosition(sun, time), up = p.elev > 0, v = sunVec(s, p);
  const seats = s.items.filter(i => i.kind.startsWith("chair") || i.kind === "bench");
  const sh = seats.map(c => up ? shadeAt(s, c.x, c.z, 1.1, v) : 1), full = sh.filter(x => x === 1).length, part = sh.filter(x => x === 0.5).length;
  const times = { rise: null, set: null }; let prev = null;
  for (let m = 0; m <= 24 * 60; m += 5) { const t = String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"), e = sunPosition(sun, t).elev; if (prev != null && prev <= 0 && e > 0 && !times.rise) times.rise = t; if (prev != null && prev > 0 && e <= 0) times.set = t; prev = e; }
  return { elev: p.elev, az: p.az, up, seats: seats.length, shaded: full, part, sunny: seats.length - full - part, rise: times.rise, set: times.set, seatShade: seats.map((c, i) => [c.id, sh[i]]) };
}
// The aerial picture's size on the site: to scale once two marks and the real length between them are given; until then
// it's stretched to the site's width and marked as a guess.
export function aerialSize(A, R) {
  if (A.pa && A.pb && A.len) { const px = Math.hypot((A.pb[0] - A.pa[0]) * A.iw, (A.pb[1] - A.pa[1]) * A.ih); if (px > 4) { const mpp = A.len / px; return { w: A.iw * mpp, d: A.ih * mpp, measured: true }; } }
  return { w: R.w, d: R.w * A.ih / A.iw, measured: false };
}
// A point on the site to a spot on the aerial picture (0 to 1 across and down), for placing the two marks.
export function siteToAerial(A, R, x, z) { const sz = aerialSize(A, R), a = -(A.rot || 0) * Math.PI / 180, dx = x - A.x, dz = z - A.z, lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a); return [lx / sz.w + 0.5, lz / sz.d + 0.5]; }

// A new outdoor site: an empty lawn, or the corporate luncheon pilot (Gate 1 of the outdoor plan).
export function sampleSite(kind = "luncheon") {
  const s = sampleVenue(); s.id = uid("v_"); s.walls = []; s.openings = []; s.items = []; s.lights = []; s.views = []; delete s.sets;
  const W = kind === "luncheon" ? 70 : 60, D = kind === "luncheon" ? 50 : 40;
  s.name = kind === "luncheon" ? "Corporate luncheon (sample site)" : "Outdoor site";
  s.room = { w: W, d: D, h: 30, floor: "grass", walls: "paint", ceiling: "paint", wallColor: "#efe6d8", dimSrc: { w: "estimated", d: "estimated", h: "unknown" } };
  s.site = { ground: "grass", areas: [], edge: null, sun: null, north: 0 };
  s.lights.push({ id: "L0", kind: "ambient", color: "#ffffff", intensity: 0.5, name: "Sky light" });
  RUN.set_sun(s, { date: "2026-05-14", time: "12:30", tz: -4, lat: 35.2271, lng: -80.8431, place: "Charlotte, NC" });
  s.views = [{ id: "vw1", name: "From the parking lot", pos: [W - 4, 1.65, D - 6], target: [W / 2, 1.5, D / 2] }, { id: "vw2", name: "From above", pos: [W / 2, 38, D + 22], target: [W / 2, 0, D / 2] }];
  if (kind !== "luncheon") return s;
  // A company's lawn beside its office: building to the north, parking to the east, a walk and a patio. 120 guests.
  const area = (id, name, mat, pts) => s.site.areas.push({ id, name, mat, pts });
  area("g_park", "Parking lot", "asphalt", [[54, 2], [69, 2], [69, 34], [54, 34]]);
  area("g_drive", "Driveway", "asphalt", [[54, 34], [60, 34], [60, 49.5], [54, 49.5]]);
  area("g_patio", "Patio", "pavers", [[10, 14], [24, 14], [24, 21], [10, 21]]);
  area("g_walk", "Front walk", "concrete", [[26.5, 14], [29.5, 14], [29.5, 22.5], [26.5, 22.5]]);
  area("g_path", "Gravel path to the restrooms", "gravel", [[44, 37.5], [54, 37.5], [54, 39.5], [44, 39.5]]);
  area("g_beds", "Planting bed", "mulch", [[8, 12.5], [48, 12.5], [48, 14], [8, 14]]);
  s.site.edge = { pts: [[1, 1], [69.5, 1], [69.5, 49.5], [8, 49.5], [1, 42]], src: "confirmed" };
  const add = (kind, x, z, rot = 0, extra = {}) => { const it = mkItem(kind, x, z, rot, extra); s.items.push(it); return it; };
  add("building", 28, 6.6, 0, { id: "bldg", w: 40, d: 11, h: 10, color: "#d9d2c5", label: "Office building" });
  add("tent_40x60", 29.4, 30, 90, { id: "tent1", label: "Dining tent" });
  [23.2, 26.3, 29.4, 32.5, 35.6].forEach((x, i) => [26.4, 30, 33.6].forEach((z, j) => { const t = add("table_round", x, z, 0, { id: "t" + (i * 3 + j + 1), color: "#f7f5f0", label: "Table " + (i * 3 + j + 1), dress: { linen: "floor", runner: "satin", runnerColor: "#16255a" } }); s.items.push(...chairsAround(t, 8, "chair_crossback")); }));
  add("podium", 21.1, 30, 90, { id: "podium1" }); add("speaker", 21, 27.4, 90, { id: "spk1" }); add("speaker", 21, 32.6, 90, { id: "spk2" });
  add("tent", 42.5, 30, 0, { id: "tent2", label: "Buffet tent" });
  add("buffet", 42.5, 28.6, 0, { id: "buf1" }); add("buffet", 42.5, 31.4, 180, { id: "buf2" });
  add("canopy", 28, 20.2, 0, { id: "checkin", label: "Check-in" }); add("welcome_table", 28, 20.6, 0, { id: "wtab", label: "Check-in table" });
  add("pergola", 14, 17.5, 0, { id: "perg1", label: "Lounge pergola" }); add("sofa", 14, 18.4, 180, { id: "sofa1" }); add("lounge_chair", 12.6, 16.8, 90, { id: "lc1" }); add("lounge_chair", 15.4, 16.8, -90, { id: "lc2" }); add("coffee_table", 14, 17.3, 0, { id: "ct1" });
  [[45, 17], [48.5, 19], [45.5, 22]].forEach(([x, z], i) => { add("umbrella", x, z, 0, { id: "umb" + (i + 1) }); add("table_cocktail", x, z, 0, { id: "ck" + (i + 1), dress: { linen: "spandex", linenColor: "#ffffff" } }); });
  add("generator", 61.5, 44, 90, { id: "gen1" });
  add("restroom_trailer", 50, 42.2, 0, { id: "rest1" });
  [32.5, 34.5, 36.5].forEach((z, i) => add("barricade", 53, z, 90, { id: "bar" + (i + 1) }));
  add("plant", 24.8, 15, 0, { id: "pl1" }); add("plant", 31.2, 15, 0, { id: "pl2" });
  return s;
}

// Two promotional templates: the grandest designs the library can make, for showing the designer off.
// They open from Save & share, like the other samples. The ballroom seats 96 at 12 tables; the garden estate seats 104.
export function samplePromoBallroom() {
  const W = 24.4, D = 18.3, H = 5.5; // 80 x 60 ft, 18 ft ceilings
  const s = {
    schema: SCHEMA, version: VERSION, id: uid("v_"), name: "Grand wedding ballroom (promo)", units: "ft",
    created: Date.now(), updated: Date.now(),
    room: { w: W, d: D, h: H, floor: "herringbone", walls: "plaster", ceiling: "paint", wallColor: "#f3ead6", dimSrc: { w: "confirmed", d: "confirmed", h: "estimated" } },
    walls: [], openings: [], items: [], lights: [], views: []
  };
  const c = [[0, 0], [W, 0], [W, D], [0, D]];
  ["Front wall", "Right wall", "Back wall", "Left wall"].forEach((name, i) =>
    s.walls.push({ id: "w" + (i + 1), name, a: c[i], b: c[(i + 1) % 4], h: H, t: 0.2, mat: "paint", color: "#f3ead6" }));
  s.openings.push({ id: "o1", type: "door", wall: "w3", at: W / 2, w: 1.83, h: 2.44, sill: 0, name: "Main doors" });
  s.openings.push({ id: "o2", type: "door", wall: "w2", at: 2.5, w: 0.91, h: 2.13, sill: 0, name: "Service door" });
  [3, 7, 11, 15].forEach((at, i) => s.openings.push({ id: "o" + (3 + i), type: "window", wall: "w4", at, w: 1.5, h: 2.0, sill: 0.9 }));
  [4, 8, 16.4, 20.4].forEach((at, i) => s.openings.push({ id: "o" + (7 + i), type: "window", wall: "w3", at, w: 1.5, h: 2.0, sill: 0.9 }));
  const add = (kind, x, z, rot = 0, extra = {}) => { const it = mkItem(kind, x, z, rot, extra); s.items.push(it); return it; };
  // The elegant look: ivory floor-length linens, champagne runners and sashes, gold chargers, tall centerpieces.
  const ELEGANT = { linen: "floor", linenColor: "#f3ead6", runner: "satin", runnerColor: "#e8d6b3", charger: "#c9a24a", napkin: "#f3ead6" };
  const CHAIR_DRESS = { cover: "spandex", coverColor: "#f7f5f0", sash: "#e8d6b3" };
  const BLUSH = PALETTES.blush.slice(), CLASSIC = PALETTES.classic.slice();
  // Stage end: LED wall behind the stage, truss, floral arch, thrones, cold sparks and spotlights.
  add("stage", 12.2, 2.4, 0, { id: "stage1" });
  add("led_wall", 12.2, 0.45, 0, { id: "led1" });
  add("light_truss", 12.2, 4.9, 0, { id: "truss1" });
  add("arch", 8.6, 2.4, 0, { id: "arch1", palette: BLUSH });
  add("chair_throne", 10.8, 2.4, 0, { id: "throne1" });
  add("chair_throne", 13.6, 2.4, 0, { id: "throne2" });
  add("cold_spark", 9.0, 5.0, 0, { id: "spark1" });
  add("cold_spark", 15.4, 5.0, 0, { id: "spark2" });
  add("spotlight", 7.2, 5.2, 0, { id: "spot1" });
  add("spotlight", 17.2, 5.2, 0, { id: "spot2" });
  // Head table with its 12, then 8 rounds of 10 around the dance floor.
  const head = add("table_head", 12.2, 6.2, 0, { id: "head1", color: "#f3ead6", label: "Head table", dress: Object.assign({}, ELEGANT) });
  s.items.push(...chairsAround(head, 12));
  add("dance_floor", 12.2, 9.15, 0, { id: "dance1" });
  add("fog", 12.2, 9.15, 0, { id: "fog1" });
  add("balloon_full_arch", 12.2, 7.0, 0, { id: "barch1", palette: BLUSH });
  [[4.6, 5.0], [19.8, 5.0], [4.6, 9.15], [19.8, 9.15], [4.6, 14.0], [9.4, 14.0], [15.0, 14.0], [19.8, 14.0]].forEach(([x, z], i) => {
    const t = add("table_round72", x, z, 0, { id: "t" + (i + 1), color: "#f3ead6", label: "Table " + (i + 1), dress: Object.assign({}, ELEGANT) });
    s.items.push(...chairsAround(t, 10));
    add("centerpiece_tall", x, z, 0, { y: 0.76, group: t.id, palette: CLASSIC });
  });
  add("centerpiece_tall", 12.2, 6.2, 0, { y: 0.76, group: head.id, palette: CLASSIC });
  add("table_garland", 10.0, 6.2, 0, { y: 0.76, group: head.id, palette: CLASSIC });
  add("table_garland", 14.4, 6.2, 0, { y: 0.76, group: head.id, palette: CLASSIC });
  // Sweetheart nook in the front-left corner, on a rug.
  add("rug", 2.8, 2.6, 0, { id: "rug1" });
  add("sofa", 2.2, 1.2, 0, { id: "sofa1" });
  add("lounge_chair", 1.4, 2.6, 45, { id: "lc1" });
  add("lounge_chair", 4.2, 2.6, -45, { id: "lc2" });
  add("coffee_table", 2.8, 2.6, 0, { id: "ct1" });
  const sw = add("table_sweetheart", 2.4, 4.4, 0, { id: "sw1", color: "#f3ead6", label: "Sweetheart table", dress: Object.assign({}, ELEGANT) });
  s.items.push(...chairsAround(sw, 2));
  // Ceiling: chandeliers, string lights, hanging greenery, draping (y set by hand, as add_item does).
  add("chandelier", 8.0, 9.15, 0, { id: "ch1", y: H - 1.0 });
  add("chandelier", 16.4, 9.15, 0, { id: "ch2", y: H - 1.0 });
  add("string_lights", 12.2, 8.2, 0, { id: "sl1", y: H - 0.6 });
  add("string_lights", 12.2, 10.2, 0, { id: "sl2", y: H - 0.6 });
  add("hanging_greenery", 12.2, 9.15, 0, { id: "hg1", y: H - 0.8 });
  add("ceiling_drape", 12.2, 9.15, 0, { id: "cd1", y: H - 1.0 });
  // Food, drink and fun along the walls.
  add("bar", 23.3, 9.15, -90, { id: "bar1" });
  add("buffet", 23.3, 13.0, -90, { id: "buf1", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("dessert_table", 1.1, 14.5, 90, { id: "des1", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("cake_table", 1.1, 8.0, 90, { id: "cake1", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("photo_booth", 21.5, 16.5, 0, { id: "pb1" });
  add("booth_360", 22.8, 5.0, 0, { id: "b360" });
  add("welcome_table", 6.4, 16.2, 0, { id: "wtab", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("gift_table", 18.0, 16.2, 0, { id: "gtab", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  // Entrance at the back wall: flower and shimmer walls, LOVE marquee, draped arch, balloon columns and garlands.
  add("flower_wall", 9.0, 17.9, 0, { id: "fw1", palette: BLUSH });
  add("shimmer_wall", 15.4, 17.9, 0, { id: "sw2" });
  add("marquee", 12.2, 16.0, 0, { id: "mq1", label: "LOVE" });
  add("entrance_arch", 12.2, 17.2, 0, { id: "ea1", palette: BLUSH });
  add("balloon_column", 10.6, 17.2, 0, { id: "bc1", palette: BLUSH });
  add("balloon_column", 13.8, 17.2, 0, { id: "bc2", palette: BLUSH });
  add("balloon_arch", 6.4, 17.9, 0, { id: "bg1", palette: BLUSH });
  add("balloon_arch", 18.0, 17.9, 0, { id: "bg2", palette: BLUSH });
  add("aisle_runner", 12.2, 14.7, 0, { id: "ar1", d: 6.0 });
  // Uplights, candles, lanterns, plants and aisle flowers.
  [[1.0, 5.5], [1.0, 9.15], [1.0, 17.9], [23.4, 2.0], [23.4, 7.0], [23.4, 17.9]].forEach(([x, z], i) => add("uplight", x, z, 0, { id: "up" + (i + 1) }));
  [[6.0, 7.5], [18.4, 7.5], [6.0, 12.5], [18.4, 12.5]].forEach(([x, z], i) => add("candle_floor", x, z, 0, { id: "cf" + (i + 1) }));
  add("lanterns", 10.0, 16.5, 0, { id: "lan1" });
  add("lanterns", 14.4, 16.5, 0, { id: "lan2" });
  add("plant", 1.0, 12.0, 0, { id: "pl1" });
  add("plant", 22.0, 12.0, 0, { id: "pl2" });
  add("aisle_flowers", 10.9, 12.3, 0, { id: "af1", palette: BLUSH });
  add("aisle_flowers", 13.5, 12.3, 0, { id: "af2", palette: BLUSH });
  add("pedestals", 20.5, 12.0, 0, { id: "pd1", palette: BLUSH });
  add("sculpture", 22.5, 14.8, 0, { id: "sc1" });
  // Every chiavari chair gets the white spandex cover and champagne sash.
  s.items.filter(i => i.kind === "chair").forEach(c => { c.dress = Object.assign({}, CHAIR_DRESS); });
  s.lights.push({ id: "L0", kind: "ambient", color: "#ffffff", intensity: 0.35, name: "Room fill" });
  s.lights.push({ id: "L1", kind: "sun", x: -6, y: 9, z: 4, color: kelvinHex(5600), intensity: 1.2, name: "Daylight" });
  [[6.1, 6.1], [18.3, 6.1], [6.1, 12.2], [18.3, 12.2]].forEach(([x, z], i) =>
    s.lights.push({ id: "L" + (2 + i), kind: "point", x, y: H - 0.3, z, color: kelvinHex(2700), intensity: 6, range: 12, name: "Warm light " + (i + 1) }));
  s.lights.push({ id: "L6", kind: "spot", x: 12.2, y: H - 0.2, z: 5.3, tx: 12.2, ty: 0.6, tz: 2.4, color: kelvinHex(3000), intensity: 30, angle: 35, name: "Stage wash" });
  s.views = [
    { id: "vw1", name: "From the doors", pos: [12.2, 1.65, 17.5], target: [12.2, 1.2, 2] },
    { id: "vw2", name: "From the stage", pos: [12.2, 2.2, 2], target: [12.2, 0.8, 16] },
    { id: "vw3", name: "Overview", pos: [12.2, 14, 24], target: [12.2, 0, 9] }
  ];
  return s;
}

export function samplePromoSite() {
  const s = sampleVenue(); s.id = uid("v_"); s.walls = []; s.openings = []; s.items = []; s.lights = []; s.views = []; delete s.sets;
  const W = 90, D = 65;
  s.name = "Garden estate (promo)";
  s.room = { w: W, d: D, h: 30, floor: "grass", walls: "paint", ceiling: "paint", wallColor: "#efe6d8", dimSrc: { w: "estimated", d: "estimated", h: "unknown" } };
  s.site = { ground: "grass", areas: [], edge: null, sun: null, north: 0 };
  s.lights.push({ id: "L0", kind: "ambient", color: "#ffffff", intensity: 0.5, name: "Sky light" });
  // Golden hour on a June evening in Charlotte, as part of the design: never reset to today.
  RUN.set_sun(s, { date: "2026-06-13", time: "18:30", tz: -4, lat: 35.2271, lng: -80.8431, place: "Charlotte, NC" });
  s.views = [
    { id: "vw1", name: "From the parking lot", pos: [86, 1.65, 59], target: [45, 1.5, 32] },
    { id: "vw2", name: "From above", pos: [45, 38, 87], target: [45, 0, 32] }
  ];
  const area = (id, name, mat, pts) => s.site.areas.push({ id, name, mat, pts });
  area("g_park", "Parking lot", "asphalt", [[70, 2], [88, 2], [88, 30], [70, 30]]);
  area("g_drive", "Driveway", "asphalt", [[60, 8], [70, 8], [70, 14], [60, 14]]);
  area("g_patio", "Patio", "pavers", [[36, 26], [54, 26], [54, 34], [36, 34]]);
  area("g_walk", "Front walk", "concrete", [[43, 14], [47, 14], [47, 26], [43, 26]]);
  area("g_path", "Gravel path to the restrooms", "gravel", [[66, 52], [74, 52], [74, 54.8], [66, 54.8]]);
  area("g_bedl", "Planting bed", "mulch", [[32, 14.5], [43, 14.5], [43, 16], [32, 16]]);
  area("g_bedr", "Planting bed", "mulch", [[47, 14.5], [58, 14.5], [58, 16], [47, 16]]);
  area("g_bedc", "Planting bed by the ceremony lawn", "mulch", [[8, 40], [20, 40], [20, 42], [8, 42]]);
  s.site.edge = { pts: [[2, 2], [88, 2], [88, 63], [4, 63], [2, 55]], src: "confirmed" };
  const add = (kind, x, z, rot = 0, extra = {}) => { const it = mkItem(kind, x, z, rot, extra); s.items.push(it); return it; };
  const ELEGANT = { linen: "floor", linenColor: "#f3ead6", runner: "satin", runnerColor: "#e8d6b3", charger: "#c9a24a", napkin: "#f3ead6" };
  const CHAIR_DRESS = { cover: "spandex", coverColor: "#f7f5f0", sash: "#e8d6b3" };
  const BLUSH = PALETTES.blush.slice(), CLASSIC = PALETTES.classic.slice();
  // The manor house to the north, parking to the east.
  add("building", 45, 8, 0, { id: "manor", w: 30, d: 12, h: 10, color: "#d9d2c5", label: "Manor house" });
  // Ceremony lawn on the west: floral arch, LOVE marquee, aisle runner, 24 cross-back chairs facing the arch.
  add("arch", 18, 24, 0, { id: "arch1", palette: BLUSH });
  add("marquee", 18, 22.3, 0, { id: "mq1", label: "LOVE" });
  add("aisle_runner", 18, 30, 0, { id: "ar1" });
  for (let k = 0; k < 12; k++) {
    add("chair_crossback", 16.5, 25.5 + k * 0.95, 180, { id: "cc_l" + k });
    add("chair_crossback", 19.5, 25.5 + k * 0.95, 180, { id: "cc_r" + k });
  }
  // Dining under the big tent: 10 rounds of 8, dressed like the ballroom.
  add("tent_40x60", 45.35, 38, 90, { id: "tent1", label: "Dining tent" });
  [38.8, 41.9, 45.0, 48.1, 51.2].forEach((x, i) => [36.2, 39.8].forEach((z, j) => {
    const t = add("table_round", x, z, 0, { id: "t" + (i * 2 + j + 1), color: "#f3ead6", label: "Table " + (i * 2 + j + 1), dress: Object.assign({}, ELEGANT) });
    s.items.push(...chairsAround(t, 8, "chair_crossback"));
    add("centerpiece_tall", x, z, 0, { y: 0.76, group: t.id, palette: CLASSIC });
  }));
  // Band stage to the south-east: podium, speakers, DJ booth, FOH mixer, line arrays.
  add("stage", 68, 48, 0, { id: "stage1" });
  add("podium", 64.5, 48, 90, { id: "podium1" });
  add("speaker", 64.5, 45.8, 90, { id: "spk1" });
  add("speaker", 64.5, 50.2, 90, { id: "spk2" });
  add("dj_booth", 71, 51.5, 180, { id: "dj1" });
  add("foh_mixer", 68, 54.5, 0, { id: "foh1" });
  add("flown_line_array", 63.5, 44.8, 0, { id: "fla1" });
  add("flown_line_array", 63.5, 51.2, 0, { id: "fla2" });
  add("line_array", 72.5, 45.5, 0, { id: "la1" });
  add("line_array", 72.5, 50.5, 0, { id: "la2" });
  // Buffet tent, check-in canopy, pergola lounge.
  add("tent", 62, 38, 0, { id: "tent2", label: "Buffet tent" });
  add("buffet", 62, 36.5, 0, { id: "buf1", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("buffet", 62, 39.5, 180, { id: "buf2", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("canopy", 30, 20, 0, { id: "checkin", label: "Check-in" });
  add("welcome_table", 30, 20.4, 0, { id: "wtab", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("pergola", 28, 50, 0, { id: "perg1", label: "Lounge pergola" });
  add("sofa", 28, 50.9, 180, { id: "sofa1" });
  add("lounge_chair", 26.6, 49.3, 90, { id: "lc1" });
  add("lounge_chair", 29.4, 49.3, -90, { id: "lc2" });
  add("coffee_table", 28, 49.8, 0, { id: "ct1" });
  // Cocktail umbrellas, dance floor on the patio, gazebo with dessert and champagne.
  [[36, 22], [54, 22], [58, 26]].forEach(([x, z], i) => {
    add("umbrella", x, z, 0, { id: "umb" + (i + 1) });
    add("table_cocktail", x, z, 0, { id: "ck" + (i + 1), dress: { linen: "spandex", linenColor: "#f7f5f0" } });
  });
  add("dance_floor", 45, 30, 0, { id: "dance1" });
  add("gazebo", 80, 52, 0, { id: "gaz1", label: "Garden gazebo" });
  add("dessert_table", 80, 52, 0, { id: "des1", color: "#f3ead6", dress: Object.assign({}, ELEGANT) });
  add("champagne_tower", 78.2, 52, 0, { id: "cht1" });
  // Games and fun on the south lawn, then the practical pieces.
  add("fire_pit", 28, 54, 0, { id: "fp1" });
  add("cornhole", 33, 54, 0, { id: "ch1" });
  add("cornhole", 37, 54, 0, { id: "ch2" });
  add("food_truck", 80, 60, 0, { id: "ft1" });
  add("golf_cart", 72, 60, 90, { id: "gc1" });
  add("bleachers", 60, 58, 0, { id: "bl1" });
  add("baby_grand", 56, 50, 0, { id: "bg1" });
  add("restroom_trailer", 72, 56, 0, { id: "rest1" });
  add("generator", 75, 27, 90, { id: "gen1" });
  [10, 20, 30].forEach((z, i) => add("barricade", 69, z, 90, { id: "bar" + (i + 1) }));
  // Light and greenery: uplights, lanterns, candles, plants, path lights, signs.
  [[32, 20], [58, 20], [32, 44], [58, 44], [36, 32], [54, 32]].forEach(([x, z], i) => add("uplight", x, z, 0, { id: "up" + (i + 1) }));
  [[38, 27], [52, 27]].forEach(([x, z], i) => add("lanterns", x, z, 0, { id: "lan" + (i + 1) }));
  add("candle_floor", 40, 34.5, 0, { id: "cf1" });
  add("candle_floor", 50, 34.5, 0, { id: "cf2" });
  [[32, 15.5], [58, 15.5], [10, 30], [68, 30], [60, 44]].forEach(([x, z], i) => add("plant", x, z, 0, { id: "pl" + (i + 1) }));
  add("path_lights", 45, 16, 0, { id: "pth1" });
  add("path_lights", 45, 24, 0, { id: "pth2" });
  add("welcome_sign", 26, 20, 0, { id: "ws1" });
  add("easel_sign", 14, 24, 0, { id: "es1" });
  add("stanchion", 18, 37.5, 0, { id: "st1" });
  add("topiary", 30, 15, 0, { id: "tp1" });
  add("tree", 8, 20, 0, { id: "tr1" });
  add("tree", 84, 48, 0, { id: "tr2" });
  // Every cross-back chair gets the white spandex cover and champagne sash.
  s.items.filter(i => i.kind === "chair_crossback").forEach(c => { c.dress = Object.assign({}, CHAIR_DRESS); });
  return s;
}

// ---------- Designing over a venue photo (Stage A) ----------
// The person drags four dots onto the corners of something rectangular on the floor of their photo (a rug, the dance floor,
// tile lines, the room's corners): dots 1 and 2 on the far edge (left, right), 3 and 4 on the near edge (right, left), and types
// the near edge's real length. From those four points we work out the camera: where it stood, which way it pointed and how
// wide its lens was (assuming the photo isn't cropped off-center), plus how deep the rectangle is. Only the typed length is
// measured; everything else from a photo is an estimate and is shown as one. If the depth is measured too, it decides the lens.
function solveLin(A, b) { // Gaussian elimination with partial pivoting; null if the points don't make a shape
  const n = b.length, M = A.map((r, i) => r.concat(b[i]));
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; } }
  return M.map((r, i) => r[n] / r[i]);
}
export function homography(src, dst) { // the 3×3 map taking 4 src points to 4 dst points
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const h = solveLin(A, b); return h && [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len3 = a => Math.hypot(a[0], a[1], a[2]), unit3 = a => { const l = len3(a) || 1; return a.map(v => v / l); };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Returns { ok, pos, x, y, z (the camera's right, up and back directions in the room), fov (vertical, degrees), d (the rectangle's
// depth, meters), lens: "photo" | "depth" | "guessed", height } or { ok: false, why } in plain words.
export function photoCamera(P) {
  if (!P || !P.pts || !P.iw || !P.ih) return { ok: false, why: "Choose a photo first." };
  const { iw, ih } = P, W = P.w || 1, img = P.pts.map(([u, v]) => [(u - 0.5) * iw, (v - 0.5) * ih]); // pixels from the middle, y down
  const area = img.reduce((a, p, i) => { const q = img[(i + 1) % 4]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  if (Math.abs(area) < iw * ih * 0.002) return { ok: false, why: "The dots are too close together. Spread them out over the floor." };
  const H = homography([[0, 0], [1, 0], [1, 1], [0, 1]], img); if (!H) return { ok: false, why: "Those dots don't make a shape on the floor. Move them so no three are in a line." };
  const h = j => [H[0][j], H[1][j], H[2][j]], h1 = h(0), h2 = h(1), h3 = h(2), fov = f => 2 * Math.atan(ih / 2 / f) * 180 / Math.PI, okF = f => f > 0 && isFinite(f) && fov(f) > 15 && fov(f) < 110;
  let f = NaN, lens = "photo";
  if (P.dSrc === "measured" && P.d) { // the depth is known, so the lens is whatever makes the rectangle that shape
    const k = (P.d / W) ** 2, A1 = h1[0] ** 2 + h1[1] ** 2, A2 = h2[0] ** 2 + h2[1] ** 2, u = (k * h1[2] ** 2 - h2[2] ** 2) / (A2 - k * A1); f = 1 / Math.sqrt(u); lens = "depth";
  }
  if (!okF(f)) { f = Math.sqrt(-(h1[0] * h2[0] + h1[1] * h2[1]) / (h1[2] * h2[2])); lens = "photo"; } // the floor's corners are square
  if (!okF(f)) { f = ih / 2 / Math.tan(27.5 * Math.PI / 180); lens = "guessed"; } // a typical phone camera
  const g = v => [v[0] / f, v[1] / f, v[2]];
  let g1 = g(h1), g2 = g(h2), g3 = g(h3);
  const D = P.dSrc === "measured" && P.d ? P.d : W * len3(g2) / len3(g1), lam = len3(g1) / W;
  let r1 = unit3(g1), r2 = unit3(g2), t = g3.map(v => v / lam);
  if (t[2] < 0) { r1 = r1.map(v => -v); r2 = r2.map(v => -v); t = t.map(v => -v); } // the floor is in front of the camera
  r2 = unit3(r2.map((v, i) => v - dot3(r1, r2) * r1[i])); const r3 = cross3(r1, r2);
  const C = [-dot3(r1, t), -dot3(r2, t), -dot3(r3, t)]; // the camera in floor coordinates (a along dots 1→2, b along 1→4, c down)
  if (-C[2] <= 0.05) return { ok: false, why: "Put dots 1 and 2 on the far edge (left, then right) and 3 and 4 on the near edge (right, then left)." };
  const ox = P.ox || 0, oz = P.oz || 0, room = ([a, b, c]) => [a, -c, b], row = i => [r1[i], r2[i], r3[i]];
  const x = room(row(0)), y = room(row(1)).map(v => -v), z = room(row(2)).map(v => -v);
  return { ok: true, pos: [C[0] + ox, -C[2], C[1] + oz], x, y, z, fov: fov(f), d: D, lens, height: -C[2] };
}

export function counts(s) {
  const c = {}; s.items.forEach(i => c[i.kind] = (c[i.kind] || 0) + 1);
  const seats = s.items.filter(i => i.kind.startsWith("chair")).length;
  return { by: c, seats, tables: s.items.filter(i => i.kind.startsWith("table")).length };
}

export function fmtLen(m, units = "ft") {
  if (units === "m") return (Math.round(m * 100) / 100) + " m";
  const inches = Math.round(m / FT * 12); const f = Math.floor(inches / 12), i = inches % 12;
  return i ? f + "′ " + i + "″" : f + "′";
}

// ---------- Plain-language instructions (free, works offline) ----------
// Turns common requests into the same validated ops an AI model would send. Anything it can't read is
// reported back instead of guessed. A model (Claude) can send ops JSON directly through the same apply().
const NUMS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
const KIND_WORDS = [
  // Phase 5 pieces (Nov 5, 2026), before the older, vaguer words
  // Phase 6 pieces (Nov 5, 2026)
  [/champagne tower|champagne fountain|glass tower/, "champagne_tower"], [/coffee (?:station|urn|bar|service)/, "coffee_station"], [/water (?:station|dispenser|cooler)|drinking fountain/, "water_station"], [/corn ?hole|bean ?bag toss/, "cornhole"], [/fire ?pits?|firepit/, "fire_pit"], [/confetti|cannon/, "confetti_cannon"], [/bubble machines?|bubbles?/, "bubble_machine"], [/easel signs?|a-?frame|sandwich board|sign ?board/, "easel_sign"], [/card box|card holder|wishing well|gift card/, "card_box"], [/stanchions?|velvet rope|rope line|queue posts?/, "stanchion"], [/misting|mist fan|cooling fan/, "misting_fan"], [/trash|recycl|waste (?:station|bin)|garbage/, "trash_station"], [/coat (?:rack|check)|garment rack|clothes rack/, "coat_rack"], [/(?:ada|wheelchair|accessible|access) ramp|(?<!cable )\bramps?\b/, "ada_ramp"], [/golf cart|shuttle cart/, "golf_cart"], [/ticket (?:booth|window)|box office/, "ticket_booth"], [/first[- ]?aid|medic(?:al)? tent/, "first_aid_tent"], [/hedge|boxwood (?:wall|panel)/, "hedge_wall"], [/topiar(?:y|ies)/, "topiary"], [/potted trees?|\btrees?\b/, "tree"], [/poster easel|display easel|easel/, "poster_easel"], [/baby grand|grand piano/, "baby_grand"], [/pianos?|keyboard/, "upright_piano"], [/classroom|seminar table|school desk|student desk|workshop table/, "classroom_desk"], [/charging (?:station|tower|kiosk)|phone charg/, "charging_station"], [/photo (?:backdrop )?frame|backdrop frame|step and repeat/, "photo_backdrop_frame"],
  [/square tables?|4 ?(?:ft|foot) square/, "table_square"], [/picnic tables?/, "table_picnic"], [/kids'? tables?|children'?s? tables?/, "table_kids"], [/bar ?stools?|counter stools?/, "bar_stool"], [/hay ?bales?|straw ?bales?/, "hay_bale"], [/kids'? chairs?|children'?s? chairs?/, "kids_chair"], [/bleachers?|grandstand/, "bleachers"], [/bar cart|drinks? cart|mobile bar/, "bar_cart"], [/food trucks?/, "food_truck"], [/popcorn|cotton candy|snow ?cone|concession cart|carnival cart/, "concession_cart"], [/grazing|charcuterie/, "grazing_table"], [/bounce house|inflatable|jumper/, "bounce_house"], [/neon/, "neon_sign"], [/light(?:ing)? tower|balloon light/, "light_tower"], [/path(?:way)? lights?|aisle lights?/, "path_lights"], [/tiki|torch(?:es)?/, "tiki_torch"], [/tv|television|monitor/, "tv_monitor"], [/(?:foh|front[- ]of[- ]house) (?:engineer|station|position|console)|sound engineer|mixing (?:position|station)/, "foh_station"], [/mixer|soundboard|sound desk|foh|front of house/, "foh_mixer"], [/pa speaker|speaker (?:stand|tripod)/, "line_array"], [/runway|catwalk/, "runway"], [/riser|platform/, "riser"], [/tent floor(?:ing)?|event floor(?:ing)?|floor panels?|flooring/, "tent_flooring"], [/trade ?show|exhibit(?:ion)? booth|expo booth|vendor booth/, "trade_show_booth"], [/pop-?up banner|retractable banner|banner stand/, "pop_up_banner"], [/registration|check-?in desk|sign-?in desk/, "registration_desk"], [/gazebo|pavilion/, "gazebo"], [/shade sail|sail shade|sun sail/, "shade_sail"], [/bell tent|glamp/, "bell_tent"], [/patio heater|propane heater|outdoor heater/, "patio_heater"], [/hand ?wash|wash(?:ing)? station|sink/, "handwash_station"], [/cable (?:ramp|protector)/, "cable_ramp"],
  // outdoor pieces (Nov 4, 2026). Sizes like "40 by 60" are read as "size40x60" first, so they aren't counts
  [/size40x60|big tent|large tent|dining tent|reception tent/, "tent_40x60"], [/size10x10|pop-?up|canopy|canopies|vendor (?:booth|tent)|check-?in tent/, "canopy"], [/pergolas?/, "pergola"],
  [/umbrellas?/, "umbrella"], [/generators?/, "generator"], [/restrooms?|bathrooms?|toilets?|porta|portable potty/, "restroom_trailer"], [/barricades?|barriers?|bike racks?|crowd control/, "barricade"], [/buildings?/, "building"],
  // the pieces added Nov 3, 2026 first: their names are more specific than the older words below ("LED wall behind the stage" is an LED wall)
  [/throne/, "chair_throne"], [/banquet chairs?|stack(?:able|ing) chairs?|hotel chairs?/, "chair_banquet"], [/\bbench(?:es)?\b/, "bench"],
  [/serpentine|s-?curve|curved tables?/, "table_serpentine"], [/sweetheart/, "table_sweetheart"], [/head table|wedding party table/, "table_head"],
  [/champagne (?:wall|display)|toast(?:ing)? wall/, "champagne_wall"], [/entrance arch|draped arch/, "entrance_arch"], [/divider|partition|folding screen/, "partition"],
  [/bud vases?/, "bud_vases"], [/table garland|garland runner|greenery runner|eucalyptus/, "table_garland"], [/branch(?:es)?|manzanita/, "branches"], [/bouquet/, "bouquet"],
  [/lanterns?/, "lanterns"], [/spot ?lights?/, "spotlight"], [/welcome table|guest ?book table|sign-?in table/, "welcome_table"], [/pedestals?|plinths?/, "pedestals"], [/sculpture|statue/, "sculpture"], [/shel(?:f|ves|ving)|bookcase/, "display_shelf"],
  [/aisle runner|walkway/, "aisle_runner"], [/dessert (?:table|display|bar)|sweets? table|candy (?:bar|table)/, "dessert_table"],
  [/led (?:wall|screen)|video wall/, "led_wall"], [/projector|projection/, "projector"], [/threesixty|three sixty/, "booth_360"], [/photo ?booth|selfie booth/, "photo_booth"],
  [/\bfog\b|dry ice|dancing on (?:the )?clouds/, "fog"], [/cold sparks?|spark(?:ler)? (?:machine|fountain)s?|\bsparks?\b/, "cold_spark"], [/\btents?\b/, "tent"],
  [/balloon (?:wall|backdrop)/, "balloon_wall"], [/balloon columns?|balloon towers?/, "balloon_column"], [/balloon garland|organic balloon/, "balloon_arch"], [/balloon arch|balloons?/, "balloon_full_arch"],
  [/flower wall|floral wall/, "flower_wall"], [/shimmer|sequin wall/, "shimmer_wall"], [/pipe (?:and|&) drape|drapes? panel/, "pipe_drape"], [/ceiling (?:drap|swag)|draping/, "ceiling_drape"],
  [/string lights?|bistro lights?|fairy lights?/, "string_lights"], [/chandeliers?/, "chandelier"], [/uplights?/, "uplight"], [/floor candles?|pillar candles?/, "candle_floor"],
  [/aisle (?:flowers?|stand|arrangement)|flower stands?/, "aisle_flowers"], [/hanging greenery|greenery garland|greenery/, "hanging_greenery"], [/floral arch|wedding arch|ceremony arch/, "arch"],
  [/\brugs?\b/, "rug"], [/welcome sign|sign/, "welcome_sign"], [/marquee/, "marquee"], [/ottomans?/, "ottoman"], [/coffee table/, "coffee_table"], [/gift table/, "gift_table"], [/farm(?:house)? tables?/, "table_farm"],
  [/tall centerpieces?/, "centerpiece_tall"], [/candle (?:cluster|centerpieces?)|votives?/, "candle_cluster"], [/centerpieces?/, "centerpiece"],
  [/ghost chairs?/, "chair_ghost"], [/cross-?back chairs?/, "chair_crossback"], [/folding chairs?/, "chair_folding"],
  [/round tables?|guest tables?|tables?(?! cloth)/, "table_round"], [/banquet tables?|long tables?/, "table_banquet"], [/cocktail tables?|high ?tops?/, "table_cocktail"],
  [/buffet( tables?)?/, "buffet"], [/stage/, "stage"], [/dance ?floor/, "dance_floor"], [/\bbar\b/, "bar"], [/podium|lectern/, "podium"],
  [/dj( booth)?/, "dj_booth"], [/backdrop/, "backdrop"], [/arch/, "arch"], [/cake table/, "cake_table"], [/sofa|couch/, "sofa"], [/lounge/, "lounge_chair"],
  [/(?:small|compact|short|low) (?:line ?arrays?|pa towers?)|(?:line ?arrays?|pa towers?) (?:\(?compact|for (?:a )?(?:small|low))/, "flown_line_array_small"], [/line ?arrays?|flown (?:speakers?|pa|sound)|speakers? on (?:a )?truss|pa towers?/, "flown_line_array"], [/speakers?/, "speaker"], [/screen|projector/, "screen"], [/plants?/, "plant"], [/food station/, "food_station"], [/chairs?/, "chair"]
];
// Colors named in a sentence, in the order they appear ("navy and gold" -> navy, gold).
function colorsIn(t) {
  const names = Object.keys(COLORS).sort((a, b) => b.length - a.length), found = [];
  let rest = " " + t + " ";
  for (const n of names) { const re = new RegExp("[^a-z]" + n + "(?=[^a-z])", "g"); let m; while ((m = re.exec(rest))) { found.push([m.index, n]); rest = rest.slice(0, m.index + 1) + "#".repeat(n.length) + rest.slice(m.index + 1 + n.length); } }
  return found.sort((a, b) => a[0] - b[0]).map(f => f[1]);
}
const DECOR_WORD = /linen|tablecloth|table ?cloth|cloths|runners?|overlays?|chargers?|napkins?|sash(?:es)?|chair covers?|covers?\b|spandex|pleated|floor[- ]length|lap[- ]length/;
const WHERE = /(front left|front right|back left|back right|front|back|rear|left|right|center|centre|middle)/;

export function interpret(scene, text) {
  const ops = [], notes = [];
  const parts = String(text).toLowerCase().replace(/centre/g, "center").split(/\s*(?:,\s*(?:and\s+)?|;|\band then\b|\bthen\b|\.\s+|\band\s+(?=(?:add|move|put|place|create|arrange|make|change|set|turn|remove|delete|dim|brighten)\b))\s*/).filter(Boolean);
  const n = t => { const m = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\b/); return m ? (NUMS[m[1]] || +m[1]) : null; };
  const kindOf = t => { for (const [re, k] of KIND_WORDS) if (re.test(t)) return k; return null; };
  const find = k => scene.items.find(i => i.kind === k);
  let pendingCenter = null;

  for (let p of parts) {
    p = p.trim().replace(/\b360(?=[ -]*(?:degree|booth|video|camera|photo|spin))/g, "threesixty"); // "a 360 booth" is one booth, not 360
    p = p.replace(/\b(\d+)\s*(?:x|by|×)\s*(\d+)(?:\s*(?:ft|foot|feet|'))?/g, "size$1x$2"); // "a 40 by 60 tent" is one tent of that size
    // Outdoors: "show the shade at 3 pm", "where's the sun at 10:30 am on june 14"
    if (scene.site && /\b(?:sun|shade|shady|shadows?|sunny)\b/.test(p)) {
      const tm = p.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/) || (/\bnoon\b/.test(p) ? [0, "12", "00", "pm"] : null), op = { op: "set_sun" };
      if (tm) { let h = +tm[1] % 12; if (/p/.test(tm[3])) h += 12; op.time = String(h).padStart(2, "0") + ":" + (tm[2] || "00"); }
      const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], dm = p.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/);
      if (dm) op.date = (scene.site.sun ? scene.site.sun.date.slice(0, 4) : "2026") + "-" + String(MON.indexOf(dm[1]) + 1).padStart(2, "0") + "-" + dm[2].padStart(2, "0");
      if (op.time || op.date) { ops.push(op); const after = apply(scene, [...ops]); if (after.ok) { const r = shadeReport(after.scene); if (r) notes.push(r.up ? Math.round(r.elev) + "° up in the " + compass(r.az) + (r.seats ? ": " + r.shaded + " of " + r.seats + " seats in shade" : "") : "the sun is down then"); } continue; }
    }
    const where = (p.match(WHERE) || [])[1] === "middle" ? "center" : (p.match(WHERE) || [])[1];
    const cols = colorsIn(p);
    // Carpet: "carpet the room", "navy carpet", "plain gray carpet", "change the floor to carpet" (a rug is a piece, not the floor)
    if (/carpet/.test(p) && !/\brugs?\b/.test(p) && !/^(remove|delete|take)/.test(p)) {
      ops.push(Object.assign({ op: "change_material", id: "floor", mat: /plain|solid|plush/.test(p) ? "carpet_plain" : "carpet" }, cols.length ? { color: cols[0] } : {})); continue;
    }
    // Linens and chair dressing: "ivory floor-length linens with gold runners", "blush sashes on the chairs"
    if (DECOR_WORD.test(p) && !/aisle runner|walkway/.test(p) && !/^(remove|delete|take off|take away)/.test(p)) {
      const tOp = { op: "dress_object", kind: "tables" }, cOp = { op: "dress_object", kind: "chairs" };
      for (const sub of p.split(/\s+(?:with|and|plus|&)\s+/)) {
        const c = colorsIn(sub)[0];
        if (/chair covers?|covers?\b.*chairs?|chairs?.*covers?\b|\bcovers?\b/.test(sub) && !/table/.test(sub)) { cOp.cover = /spandex|fitted|stretch/.test(sub) ? "spandex" : "banquet"; if (c) cOp.coverColor = c; }
        else if (/sash/.test(sub)) cOp.sash = c || "gold";
        else if (/runner/.test(sub)) { tOp.runner = /sequin|sparkl|glitter/.test(sub) ? "sequin" : "satin"; tOp.runnerColor = c || "gold"; }
        else if (/overlay/.test(sub)) { tOp.overlay = /sequin|sparkl|glitter/.test(sub) ? "sequin" : "square"; tOp.overlayColor = c || "gold"; }
        else if (/charger/.test(sub)) tOp.charger = c || "gold";
        else if (/napkin/.test(sub)) tOp.napkin = c || "white";
        else if (/linen|cloth|spandex|pleated|length/.test(sub)) {
          if (/floor[- ]?length|full[- ]?length|to the floor/.test(sub)) tOp.linen = "floor"; else if (/lap|cocktail[- ]length|short/.test(sub)) tOp.linen = "lap"; else if (/spandex|fitted|stretch/.test(sub)) tOp.linen = "spandex"; else if (/pleat/.test(sub)) tOp.linen = "pleated"; else if (/no (?:table)?cloth|bare/.test(sub)) tOp.linen = "none";
          if (c) tOp.linenColor = c;
        }
      }
      if (Object.keys(tOp).length > 2) ops.push(tOp);
      if (Object.keys(cOp).length > 2) ops.push(cOp);
      if (ops.length) continue;
    }
    // Chair style: "switch to ghost chairs", "use cross-back chairs"
    const sw = p.match(/(ghost|cross-?back|chiavari|folding|banquet) chairs?/);
    if (sw && /switch|use|change|swap|make|replace|chiavari|instead/.test(p)) {
      ops.push({ op: "swap_style", from: "chairs", to: { ghost: "chair_ghost", chiavari: "chair", folding: "chair_folding", banquet: "chair_banquet" }[sw[1]] || "chair_crossback" }); continue;
    }
    // Centerpieces on every table: "put tall centerpieces on every table", "add candles to each table"
    if (/centerpiece|candles?|votive|flowers?|floral|bud vases?|garlands?|branch|manzanita/.test(p) && /(each|every|all|the) (?:guest )?tables?|tables/.test(p) && !/floor candle|flower wall|floral wall/.test(p)) {
      const kind = /bud vase/.test(p) ? "bud_vases" : /garland/.test(p) ? "table_garland" : /branch|manzanita/.test(p) ? "branches" : /tall/.test(p) ? "centerpiece_tall" : /candle|votive/.test(p) && !/flower|floral/.test(p) ? "candle_cluster" : "centerpiece";
      ops.push(Object.assign({ op: "decorate_tables", kind, tables: "all" }, cols.length ? { palette: cols } : {})); continue;
    }
    // "set up this venue for a wedding with 120 guests"
    let m = p.match(/(\d+)\s*(?:guests|people)/);
    if (m && /set ?up|seat|for a|wedding|party|reception|shower|gala/.test(p)) {
      const guests = +m[1], df = find("dance_floor");
      // Try 60-inch rounds of 8 first, then 72-inch rounds of 10, and say so if neither fits.
      const tries = [["table_round", 8], ["table_round72", 10]];
      let chosen = null;
      for (const [kind, seats] of tries) {
        const op = { op: "arrange_tables", kind, count: Math.ceil(guests / seats), chairs: seats, around: df ? df.id : undefined };
        if (apply(scene, [...ops, op]).ok) { chosen = op; break; }
      }
      if (chosen) { ops.push(chosen); notes.push(chosen.count + " tables of " + chosen.chairs + " for " + guests + " guests"); }
      else notes.push(guests + " guests won't fit at round tables with walking space in this room as it's set up now. Try moving the bar or making the dance floor smaller.");
      continue;
    }
    // "arrange eight round tables (with 8 chairs) around it / around the dance floor"
    if (/arrange|set out|lay out|add|place|put/.test(p) && /tables?/.test(p) && n(p) && !/buffet|cake/.test(p)) {
      const counts = p.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)\b/g) || [];
      const count = NUMS[counts[0]] || +counts[0];
      const ch = p.match(/(\d+|eight|ten|six|four|twelve)\s+chairs/); const chairs = ch ? (NUMS[ch[1]] || +ch[1]) : undefined;
      const kind = /banquet|long/.test(p) ? "table_banquet" : /cocktail|high/.test(p) ? "table_cocktail" : /72|large|big/.test(p) ? "table_round72" : "table_round";
      let around;
      if (/around|surround/.test(p)) { const tgt = /stage/.test(p) ? "stage" : "dance_floor"; around = pendingCenter && /\bit\b/.test(p) ? pendingCenter : (find(tgt) || {}).id || pendingCenter; }
      ops.push({ op: "arrange_tables", kind, count, chairs, around }); continue;
    }
    // "move the stage to the front of the room"
    m = p.match(/^(?:move|put|place|shift|slide)\s+(?:the\s+)?(.+?)\s+(?:to|on|at|against|over to)\s+(?:the\s+)?(.+)$/);
    if (m) {
      const k = kindOf(m[1]), w2 = (m[2].match(WHERE) || [])[1];
      if (!k) { notes.push("I couldn't tell what to move in “" + p + "”"); continue; }
      const list = scene.items.filter(i => i.kind === k || (k === "table_round" && i.kind.startsWith("table") && !/buffet/.test(m[1])));
      if (!list.length) { ops.push({ op: "add_item", kind: k, where: w2 || "center" }); notes.push("there wasn't a " + CATALOG[k].label.toLowerCase() + ", so I'll add one"); continue; }
      if (!w2) { notes.push("I couldn't tell where to move the " + CATALOG[k].label.toLowerCase()); continue; }
      if (list.length > 1 && k === "buffet") list.forEach((it, i) => ops.push({ op: "move_object", id: it.id, where: w2, dz: i * (it.w + 0.4) }));
      else ops.push({ op: "move_object", id: list[0].id, where: w2 });
      if (k === "dance_floor" || k === "stage") pendingCenter = list[0].id;
      continue;
    }
    // "add / create / place a stage at the front", "add a dance floor in the center"
    m = p.match(/^(?:add|create|place|put|set up|build|make)\s+(?:a|an|the|another|one|two|three|four|\d+)?\s*(.+?)(?:\s+(?:at|in|on|to|by|along)\s+(?:the\s+)?(.+))?$/);
    if (m && kindOf(m[1]) && (!/light|lighting|look|feel/.test(p) || /string_lights|chandelier|uplight|spotlight|lanterns/.test(kindOf(m[1])))) {
      const k = kindOf(m[1]); const count = Math.min(n(p) || 1, 20); const w2 = (String(m[2] || "").match(WHERE) || [])[1] || where;
      const C = CATALOG[k], extra = C.palette && cols.length ? { palette: cols } : C.palette && /hostmode|host mode/.test(p) ? { palette: "hostmode" } : {};
      if (!C.palette && cols.length && !C.dress) extra.color = cols[0];
      // "over the dance floor", "above the stage", "by the bar", "next to the cake table"
      const near = p.match(/(?:over|above|on|by|next to|beside|behind|around)\s+(?:the\s+)?(dance ?floor|stage|bar|cake table|buffet|sofa|dj booth)/);
      const anchor = near && find(kindOf(near[1]));
      if (anchor) {
        const f = footprint(anchor), C2 = CATALOG[k];
        let x = anchor.x, z = anchor.z;
        if (!C2.ceiling && !/over|above|on/.test(near[0])) { z = /behind/.test(near[0]) ? f.z0 - C2.d / 2 - 0.2 : f.z1 + C2.d / 2 + 0.3; if (z > scene.room.d - C2.d) z = f.z0 - C2.d / 2 - 0.3;
          z = Math.max(C2.d / 2 + 0.05, Math.min(scene.room.d - C2.d / 2 - 0.05, z)); } // against the wall at most: an LED wall behind a stage that's against the wall stands on the stage's back edge
        for (let i = 0; i < count; i++) { const id = uid("i_"); ops.push(Object.assign({ op: "add_item", kind: k, id, x: x + (count > 1 ? (i - (count - 1) / 2) * ((C2.ceiling ? (f.x1 - f.x0) : C2.w + 0.4) / Math.max(1, count - (C2.ceiling ? 0 : 1)) ) : 0), z }, extra)); }
        continue;
      }
      const existing = find(k);
      if (existing && (k === "stage" || k === "dance_floor") && count === 1) { ops.push({ op: "move_object", id: existing.id, where: w2 || "center" }); pendingCenter = existing.id; notes.push("there's already a " + CATALOG[k].label.toLowerCase() + ", so I moved it"); continue; }
      for (let i = 0; i < count; i++) { const id = uid("i_"); ops.push(Object.assign({ op: "add_item", kind: k, where: w2 || "center", id }, extra)); if (i) ops.push({ op: "move_object", id, dx: (/left/.test(w2 || "") ? 1 : /right/.test(w2 || "") ? -1 : (i % 2 ? 1 : -1)) * (/left|right/.test(w2 || "") ? i : Math.ceil(i / 2)) * (CATALOG[k].w + 0.4) }); if (k === "stage" || k === "dance_floor") pendingCenter = id; }
      continue;
    }
    // "change the tablecloths to dark purple", "make the chairs gold", "paint the walls navy"
    m = p.match(/(?:change|make|turn|paint|color|colour|switch)\s+(?:the\s+|all\s+(?:the\s+)?)?(.+?)\s+(?:to\s+|into\s+)?((?:dark|light)?\s*[a-z]+)$/);
    if (m && (COLORS[m[2].trim()] || MATERIALS[m[2].trim()])) {
      const what = m[1], val = m[2].trim(), isColor = !!COLORS[val];
      const target = /wall/.test(what) ? { id: "walls" } : /floor(?! dance)/.test(what) && !/dance/.test(what) ? { id: "floor" } : /ceiling/.test(what) ? { id: "ceiling" }
        : /cloth|linen|table/.test(what) ? { kind: "tables" } : /chair/.test(what) ? { kind: "chairs" } : kindOf(what) ? { kind: kindOf(what) } : null;
      if (!target) { notes.push("I couldn't tell what to change in “" + p + "”"); continue; }
      ops.push(Object.assign({ op: "change_material" }, target, isColor ? { color: val } : { mat: val })); continue;
    }
    // Lighting: "add warm lighting around the dance floor", "dim the lights", "make it brighter"
    if (/light|lighting|uplight/.test(p)) {
      const kelvin = /warm|cozy|romantic|candle/.test(p) ? 2700 : /cool|daylight|bright white/.test(p) ? 5600 : null;
      if (/add|around|put|place/.test(p)) {
        const tgt = /stage/.test(p) ? find("stage") : find("dance_floor") || find("stage");
        const f = tgt ? footprint(tgt) : { x0: 2, x1: scene.room.w - 2, z0: 2, z1: scene.room.d - 2 };
        const pts = [[f.x0, f.z0], [f.x1, f.z0], [f.x1, f.z1], [f.x0, f.z1], [(f.x0 + f.x1) / 2, f.z0], [(f.x0 + f.x1) / 2, f.z1]];
        pts.forEach(([x, z], i) => ops.push({ op: "add_light", kind: "point", x, y: 2.6, z, kelvin: kelvin || 3000, intensity: 3, range: 6, name: "Warm light " + (i + 1) }));
        continue;
      }
      if (/dim|darker|lower|softer/.test(p)) { ops.push({ op: "modify_lighting", id: "all", scale: 0.6, kelvin: kelvin || undefined }); continue; }
      if (/bright|lighter|more light/.test(p)) { ops.push({ op: "modify_lighting", id: "all", scale: 1.5 }); continue; }
      if (kelvin) { ops.push({ op: "modify_lighting", id: "all", kelvin }); continue; }
    }
    // "make the room look more elegant / upscale"
    if (/elegant|upscale|luxur|classy|fancy|formal|romantic|look like a wedding|wedding (?:look|style|feel)/.test(p)) {
      ops.push({ op: "dress_object", kind: "tables", linen: "floor", linenColor: "ivory", runner: "satin", runnerColor: "champagne", charger: "gold", napkin: "ivory" });
      if (scene.items.some(i => CATALOG[i.kind].dress === "chair")) ops.push({ op: "change_material", kind: "chairs", mat: "gold", color: "gold" }, { op: "dress_object", kind: "chairs", sash: "champagne" });
      ops.push({ op: "modify_lighting", id: "all", kelvin: 2700, scale: 0.85 });
      if (scene.items.some(i => /^table_(round|rect|banquet|farm|serpentine|head|sweetheart)/.test(i.kind))) ops.push({ op: "decorate_tables", kind: "centerpiece_tall", tables: "all", palette: "classic" });
      notes.push("ivory floor-length linens, champagne runners and sashes, gold chargers, tall centerpieces, and warmer, softer light"); continue;
    }
    // "remove the bar" / "delete the podium" — needs the person's OK in the editor
    m = p.match(/^(?:remove|delete|take out|get rid of)\s+(?:the\s+|all\s+(?:the\s+)?)?(.+)$/);
    if (m && kindOf(m[1])) { ops.push({ op: "delete_object", kind: kindOf(m[1]), confirm: false }); notes.push("deleting needs your OK"); continue; }
    if (/rotate|turn/.test(p) && kindOf(p)) { const it = find(kindOf(p)); const deg = (p.match(/(-?\d+)\s*(?:°|deg)/) || [])[1]; if (it) { ops.push({ op: "rotate_object", id: it.id, by: deg ? +deg : 90 }); continue; } }
    notes.push("I didn't understand “" + p + "”");
  }
  return { ops, notes };
}
