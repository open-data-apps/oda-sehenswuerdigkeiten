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

test("DZT-Beschreibung: **fett** wird <strong>, lose Sternchen und Überschriftenzeichen verschwinden, HTML bleibt escaped", () => {
  assert.equal(c.formatDztText("**Ein Bach** prägt"), "<strong>Ein Bach</strong> prägt");
  assert.equal(c.formatDztText("### Abgegangene Spornburg"), "Abgegangene Spornburg");
  assert.equal(c.formatDztText("Waldkirc**\n**h**"), "Waldkirc\n<strong>h</strong>");
  assert.equal(c.formatDztText('<b onclick="x">**a**</b>'), "&lt;b onclick=&quot;x&quot;&gt;<strong>a</strong>&lt;/b&gt;");
});

test("Foto-Katalog zeigt Beschreibungen formatiert", () => {
  const els = {};
  const el = (sel) => (els[sel] = els[sel] || { innerHTML: "", textContent: "" });
  const poi = { id: "p1", name: "Fehlaquelle", description: "**Ein Bach** prägt", city: "Burladingen", region: "", distanceKm: 0.5, imageUrl: "",
    isKidsFriendly: false, weatherType: "outdoor", isFree: false, isOutlet: false, isCulinary: false };
  c.renderCatalogGrid({ uid: "t", root: { querySelector: el }, allPois: [poi], filteredPois: [poi], poisLoaded: true });
  assert.match(els["#t-catalog-grid"].innerHTML, /<strong>Ein Bach<\/strong> prägt/);
});

test("Detailansicht nutzt die Formatierung für die Beschreibung", () => {
  assert.match(source, /formatDztText\(poi\.description \|\| "Für dieses Ziel/);
});
