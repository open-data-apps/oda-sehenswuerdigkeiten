const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Lädt die ausgelieferte app/app.js; nur DOM-Grenzen werden gefaked.
const noop = () => {};
const source = fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8");
const c = vm.createContext({ console, window: { location: { href: "https://fixture.test/app/", pathname: "/app/" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] } });
vm.runInContext(source, c);

const S = "https://schema.org/";

test("CivicStructure ist kein Indoor-Merkmal: Spielplatz und Park mit Zusatztyp sind Outdoor (Live-Befund 27.10.2026)", () => {
  assert.equal(c.classifyWeatherType({ "@type": [S + "CivicStructure", S + "Playground"] }), "outdoor");
  assert.equal(c.classifyWeatherType({ "@type": [S + "CivicStructure", S + "Park"] }), "outdoor");
  assert.equal(c.classifyWeatherType({ "@type": S + "CivicStructure" }), "hybrid");
});

test("Eindeutige Innenorte bleiben Indoor, auch mit Zusatztyp", () => {
  assert.equal(c.classifyWeatherType({ "@type": [S + "CivicStructure", S + "PlaceOfWorship"] }), "indoor");
  assert.equal(c.classifyWeatherType({ "@type": [S + "Museum", S + "Park"] }), "indoor");
  assert.equal(c.classifyWeatherType({ "@type": S + "TouristAttraction" }), "hybrid");
});

function katalogHtml(weatherType) {
  const els = {};
  const el = (sel) => (els[sel] = els[sel] || { innerHTML: "", textContent: "" });
  const poi = { id: "p1", name: "Ziel", description: "", city: "Burladingen", region: "", distanceKm: 0.5, imageUrl: "",
    isKidsFriendly: false, weatherType, isFree: false, isOutlet: false, isCulinary: false };
  c.renderCatalogGrid({ uid: "t", root: { querySelector: el }, allPois: [poi], filteredPois: [poi], poisLoaded: true });
  return els["#t-catalog-grid"].innerHTML;
}

test("Abzeichen: unklare Orte tragen weder Indoor noch Outdoor", () => {
  assert.doesNotMatch(katalogHtml("hybrid"), /Indoor|Outdoor/);
  assert.match(katalogHtml("outdoor"), /Outdoor/);
  assert.match(katalogHtml("indoor"), /Indoor/);
});
