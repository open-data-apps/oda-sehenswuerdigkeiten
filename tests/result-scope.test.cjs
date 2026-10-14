const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Lädt die ausgelieferte app/app.js; nur DOM-Grenzen werden gefaked.
const noop = () => {};
const c = vm.createContext({ console, window: { location: { href: "https://fixture.test/app/", pathname: "/app/" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    body: { appendChild: noop, classList: { add: noop, remove: noop, contains: () => false } } } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"), c);

function fakeElement() {
  return { textContent: "", innerHTML: "", style: {}, disabled: false, hidden: false, value: "", dataset: {}, scrollTop: 0,
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    addEventListener: noop, setAttribute: noop, appendChild: noop, querySelector: () => null, querySelectorAll: () => [] };
}
function fakeRoot() {
  const els = new Map();
  return { innerHTML: "", querySelectorAll: () => [],
    querySelector(sel) { if (!els.has(sel)) els.set(sel, fakeElement()); return els.get(sel); } };
}
const poi = (i) => ({ id: `p${i}`, name: `POI ${i}`, description: "", city: "Ort", region: "", distanceKm: i, imageUrl: "",
  isKidsFriendly: false, weatherType: "outdoor", isFree: false, isOutlet: false, isCulinary: false });
function makeState(loaded, filtered) {
  const all = Array.from({ length: loaded }, (_, i) => poi(i));
  return { uid: "sw_t", root: fakeRoot(), config: {}, ort: "Burladingen", umkreis: 25, allPois: all, filteredPois: all.slice(0, filtered),
    page: 0, pageSize: 10, catalogMode: true, appendedModals: [], poisLoaded: true,
    filters: { search: "", targetGroup: "alle", weather: "alle", cost: "alle", outlet: false, culinary: false } };
}
const text = (state, id) => state.root.querySelector(`#sw_t-${id}`).textContent;
const html = (state, id) => state.root.querySelector(`#sw_t-${id}`).innerHTML;
const cards = (markup) => (markup.match(/class="sw-catalog-card"/g) || []).length;
const PAIRS = [[0, 0], [37, 0], [37, 12], [60, 60], [61, 61], [300, 82], [300, 300]];

test("getSwResultScope trennt geladen, gefiltert und im Katalog angezeigt", () => {
  for (const [loaded, filtered] of PAIRS) {
    assert.deepEqual({ ...c.getSwResultScope(makeState(loaded, filtered)) },
      { loaded, filtered, catalogShown: Math.min(filtered, 60) }, `${loaded}/${filtered}`);
  }
});

test("Cockpit-Hinweis nennt geladene und gefilterte Menge, auch nach Filterwechsel", () => {
  for (const [loaded, filtered] of PAIRS) {
    const state = makeState(loaded, filtered);
    c.updateFilterCounts(state);
    assert.equal(text(state, "result-scope"), `Geladen: ${loaded} · Passend zum Filter: ${filtered}.`);
  }
  const state = makeState(300, 82);
  c.updateFilterCounts(state);
  state.filteredPois = state.allPois.slice(0, 5);
  c.updateFilterCounts(state);
  assert.equal(text(state, "result-scope"), "Geladen: 300 · Passend zum Filter: 5.");
});

test("Katalog rendert höchstens 60 Karten und benennt angezeigt/gefiltert/geladen korrekt", () => {
  for (const [loaded, filtered] of PAIRS) {
    const state = makeState(loaded, filtered);
    c.renderCatalogGrid(state);
    const shown = Math.min(filtered, 60);
    assert.equal(cards(html(state, "catalog-grid")), shown, `${loaded}/${filtered}`);
    assert.equal(text(state, "catalog-title"), `Sehenswürdigkeiten Katalog (${shown})`);
    assert.equal(text(state, "catalog-scope"),
      `${shown} von ${filtered} gefilterten Treffern angezeigt · ${loaded} geladen. Im Foto-Katalog werden höchstens 60 Karten angezeigt.`);
  }
});

test("Grundlayout enthält die Hinweisplätze und keine Vollständigkeitsbehauptung", () => {
  const state = makeState(0, 0);
  c.renderInitialLayout(state);
  const markup = state.root.innerHTML;
  assert.match(markup, /id="sw_t-result-scope"/);
  assert.match(markup, /id="sw_t-catalog-scope"/);
  assert.match(markup, /Die DZT-Abfrage lädt höchstens 300 Datensätze/);
  assert.match(markup, /die nächstgelegenen unter den Treffern, die die DZT-Umkreissuche liefert/);
  assert.match(markup, /zwischen Abrufen wechseln/);
  assert.match(markup, /die Anzeige ist keine vollständige Erfassung aller Sehenswürdigkeiten im Umkreis\./);
  assert.doesNotMatch(markup, /Alle Ausflugsziele im Umkreis/);
  assert.doesNotMatch(markup, /Fotogalerie aller Sehenswürdigkeiten/);
});

test("Leere Quelle und leerer Filter werden in der Liste unterschieden", () => {
  const empty = makeState(0, 0);
  c.renderDrawerList(empty);
  assert.match(html(empty, "drawer-list"), /Keine Sehenswürdigkeiten geladen/);
  assert.doesNotMatch(html(empty, "drawer-list"), /Filtereinstellungen/);
  const filteredOut = makeState(37, 0);
  c.renderDrawerList(filteredOut);
  assert.match(html(filteredOut, "drawer-list"), /Keine Treffer/);
  assert.match(html(filteredOut, "drawer-list"), /Filtereinstellungen/);
});

test("Solange noch geladen wird, behauptet weder Hinweis noch Liste eine leere Quelle", () => {
  const state = makeState(0, 0);
  state.poisLoaded = false;
  c.updateFilterCounts(state);
  assert.equal(text(state, "result-scope"), "Daten werden geladen …");
  c.renderDrawerList(state);
  assert.doesNotMatch(html(state, "drawer-list"), /keine Datensätze geliefert|Keine Treffer/);
  assert.match(html(state, "drawer-list"), /Lade Sehenswürdigkeiten/);
  c.renderCatalogGrid(state);
  assert.equal(text(state, "catalog-scope"), "Daten werden geladen …");
  assert.doesNotMatch(html(state, "catalog-grid"), /Keine Sehenswürdigkeiten gefunden/);
});
