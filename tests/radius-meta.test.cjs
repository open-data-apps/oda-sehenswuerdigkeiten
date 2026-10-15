const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Lädt die ausgelieferte app/app.js; nur DOM- und Netzwerkgrenzen werden gefaked.
const noop = () => {};
const classList = { add: noop, remove: noop, toggle: noop, contains: () => false };
const load = () => { const ctx = vm.createContext({ console: { ...console, info: noop, warn: noop, error: (...a) => console.log("APPERR", ...a) }, URL, URLSearchParams, setTimeout: noop,
  sessionStorage: { getItem: () => null, setItem: noop },
  window: { location: { href: "https://fixture.test/app/", pathname: "/app/", hostname: "fixture.test" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    body: { appendChild: noop, classList } } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"), ctx); return ctx; };
const c = load();

const raw = (id, lat, lng, city) => ({ "@id": id, "schema:name": id, "schema:geo": { "schema:latitude": lat, "schema:longitude": lng },
  "schema:address": { "schema:addressLocality": city } });

test("Nur Ziele innerhalb des Umkreises bleiben erhalten; Ziele ohne Koordinaten bleiben am Ende", async () => {
  // Referenz Burladingen (48.2917, 9.1122): 0,3° Breite = rund 33 km
  const rows = [raw("nah", 48.30, 9.12, "Burladingen"), raw("fern", 48.59, 9.12, "Stuttgart"), raw("ohneGeo", undefined, undefined, "X")];
  rows[2]["schema:geo"] = null;
  let gesehen;
  const app = load(); // eigener Kontext: die Stubs unten überschreiben App-Funktionen
  Object.assign(app, {
    resolveCoordinates: async () => ({ lat: 48.2917, lng: 9.1122, source: "test" }),
    registerSwActionHandler: noop, renderInitialLayout: noop, ensureLeafletAndClusterLoaded: async () => {},
    loadDztData: async () => rows, initLeafletMap: async () => {}, updateFilterCounts: noop, updateMapMarkers: noop,
    renderDrawerList: noop, hideLoadingOverlay: noop, ensureQrNavMenuItem: noop, ensureGlobalOffcanvasSetup: noop,
    applyFilters: (state) => { gesehen = state; } });
  const root = { isConnected: true, innerHTML: "", querySelector: () => null, addEventListener: noop, removeEventListener: noop };
  await app.app({ ort: "Burladingen", latitude: "48.2917", longitude: "9.1122", radiusKm: "25" }, root);
  assert.ok(gesehen, "applyFilters wurde erreicht");
  assert.deepEqual(gesehen.allPois.map((p) => p.id), ["nah", "ohneGeo"]);
  assert.ok(gesehen.allPois.every((p) => p.distanceKm == null || p.distanceKm <= 25));
});

const poi = (city, distanceKm) => ({ id: "p1", name: "Ziel", description: "", city, region: "", distanceKm, imageUrl: "", images: [],
  isKidsFriendly: false, weatherType: "outdoor", isFree: false, isOutlet: false, isCulinary: false });

test("Listenkarte: ohne Ortsname keine verwaiste Trenn-Raute vor der Entfernung", () => {
  const els = {};
  const el = (sel) => (els[sel] = els[sel] || { innerHTML: "", textContent: "", disabled: false });
  const render = (p) => {
    c.renderDrawerList({ uid: "t", root: { querySelector: el }, allPois: [p], filteredPois: [p], poisLoaded: true, page: 0, pageSize: 10 });
    return els["#t-drawer-list"].innerHTML.match(/class="sw-card-meta">([\s\S]*?)<\/div>/)[1].replace(/\s+/g, " ").trim();
  };
  assert.equal(render(poi("", 6.1)), "<strong>6.1 km</strong>");
  assert.equal(render(poi("Hechingen", 6.1)), "Hechingen &bull; <strong>6.1 km</strong>");
  assert.equal(render(poi("Hechingen", null)), "Hechingen");
});

test("Karten-Popup, Listenkarte und Detail-Hero bauen die Meta-Zeile ohne verwaiste Raute", () => {
  const src = fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8");
  assert.equal((src.match(/\.filter\(Boolean\)\.join\(" &bull; "\)/g) || []).length, 3);
  assert.doesNotMatch(src, /\? `&bull; <strong>\$\{poi\.distanceKm\} km<\/strong>` : ""/);
  assert.doesNotMatch(src, /\? ` &bull; <strong>/);
});
