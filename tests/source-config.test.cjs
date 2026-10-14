const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Lädt die ausgelieferte app/app.js; Netzwerk und DOM-Grenzen werden gefaked.
const noop = () => {};
const c = vm.createContext({ console: { ...console, info: noop, warn: noop },
  URL, URLSearchParams, sessionStorage: { getItem: () => null, setItem: noop },
  window: { location: { href: "https://fixture.test/app/", pathname: "/app/", hostname: "fixture.test" }, addEventListener: noop },
  document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/app.js"), "utf8"), c);

const STANDARD = "https://proxy.opendatagermany.io/api/ts/v1/kg/sparql";
const FALLE = [
  ["benannter Slot", [{ name: "dztsparql", url: STANDARD }], STANDARD, "ts/v1/kg/sparql"],
  ["heuristischer Legacy-Slot", [{ name: "alt", url: "https://proxy.opendatagermany.io/api/custom/sparql" }],
    "https://proxy.opendatagermany.io/api/custom/sparql", "custom/sparql"],
  ["kein Slot", undefined, STANDARD, "ts/v1/kg/sparql"],
  ["leerer Slot", [{ name: "dztsparql", url: "" }], STANDARD, "ts/v1/kg/sparql"],
  ["ungültige URL", [{ name: "dztsparql", url: "keine url sparql" }], STANDARD, "ts/v1/kg/sparql"],
  ["mehrere Slots: erster Treffer in Listenreihenfolge", [
    { name: "erste", url: "https://proxy.opendatagermany.io/api/first/sparql" },
    { name: "dztsparql", url: STANDARD }], "https://proxy.opendatagermany.io/api/first/sparql", "first/sparql"],
  // Der Relay hängt nur den Pfad an den DZT-Host; die Fehleranzeige nennt deshalb das tatsächliche Ziel.
  ["fremder Host", [{ name: "dztsparql", url: "https://example.org/api/ts/v1/kg/sparql" }], STANDARD, "ts/v1/kg/sparql"],
];

async function fetchZiel(apiurls) {
  let ziel;
  c.fetch = async (url) => { ziel = url; throw new Error("kein Netz im Test"); };
  const state = { config: { apiurls }, lat: 48.1, lng: 9.2, umkreis: 25, root: {}, active: false, disposed: true };
  await c.loadDztData(state).catch(() => {});
  return new URL(ziel, "https://fixture.test").searchParams.get("path").split("?")[0];
}
function fehlerQuelle(apiurls) {
  let kontext;
  const original = c.renderOdasFehler;
  c.renderOdasFehler = (_root, _err, ctx) => { kontext = ctx; };
  try { c.renderErrorMessage({ config: { apiurls }, root: {} }, "Testfehler"); } finally { c.renderOdasFehler = original; }
  return kontext.url;
}

test("Abruf und Fehleranzeige verwenden dieselbe wirksame DZT-Quelle (Bestandsverhalten)", async () => {
  for (const [name, apiurls, url, apiPath] of FALLE) {
    assert.equal(await fetchZiel(apiurls), apiPath, `Abruf: ${name}`);
    assert.equal(fehlerQuelle(apiurls), url, `Fehleranzeige: ${name}`);
  }
});

test("resolveSwDztSource liefert genau diese Auswahl", () => {
  for (const [name, apiurls, endpointUrl, apiPath] of FALLE) {
    assert.deepEqual({ ...c.resolveSwDztSource({ apiurls }) }, { endpointUrl, apiPath }, name);
  }
});

// Metadaten-Konsistenz: Paket, lokale Config und README beschreiben dieselbe Quelle und Grenzen.
const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "app-package.json"), "utf8"));
const cfg = JSON.parse(fs.readFileSync(path.join(root, "odas-config/config.json"), "utf8"));
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const paketText = pkg.beschreibung.join("\n");
const lokalText = Array.isArray(cfg.beschreibung) ? cfg.beschreibung.join("\n") : cfg.beschreibung;

test("Paket-Beschreibungsarrays sind identisch", () => {
  assert.deepEqual(pkg["instanz-config"].beschreibung.default, pkg.beschreibung);
});

test("Paket, lokale Config und README nennen 300/60 und keine Vollständigkeit", () => {
  for (const [name, t] of [["Paket", paketText], ["lokal", lokalText], ["README", readme]]) {
    assert.match(t, /höchstens 300 Datensätze/, name);
    assert.match(t, /höchstens 60 Karten/, name);
    assert.match(t, /keine vollständige Erfassung/, name);
    assert.match(t, /nicht zwingend die nächstgelegenen/, name);
  }
});

test("Quellenangaben entsprechen dem tatsächlich verwendeten SPARQL-Standard", () => {
  for (const [name, t] of [["Paket", paketText], ["lokal", lokalText]]) {
    assert.match(t, /DZT SPARQL-Endpunkt/, name);
    assert.ok(t.includes(STANDARD), `${name}: SPARQL-Standard fehlt`);
    assert.doesNotMatch(t, /ts\/v2\/kg\/things|Query API v2/, name);
    assert.match(t, /Open Data Germany/, `${name}: Portal-Ebene`);
    assert.ok(t.includes("https://github.com/open-data-apps)") || t.includes('href="https://github.com/open-data-apps"'), `${name}: Pflichtlink open-data-apps`);
    assert.doesNotMatch(t, /Open Data Portal:(\*\*|<\/strong>)\s*(\[|<a[^>]*>)Open Data App Store/, `${name}: Store ist kein DZT-Portal`);
  }
});

test("apiurls ist optional dokumentiert und kpiKontext1 behauptet keine Gesamtzahl", () => {
  const zeile = readme.split("\n").find((l) => l.startsWith("| `apiurls` |"));
  assert.match(zeile, /\| nein \|$/);
  assert.match(zeile, /Standard/);
  for (const t of [pkg["instanz-config"].kpiKontext1.default, cfg.kpiKontext1]) {
    assert.doesNotMatch(t, /Gesamtzahl/);
    assert.match(t, /geladen/);
  }
});

test("README-Testbefehl erfasst alle Offline-Tests", () => {
  assert.ok(readme.includes("node --test tests/*.js tests/*.test.cjs"));
});
