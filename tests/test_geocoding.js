const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Wir laden resolveCoordinates aus app/app.js bzw. testen die Logik isoliert
const appJsPath = path.join(__dirname, "../app/app.js");
const appJsCode = fs.readFileSync(appJsPath, "utf-8");

// Hilfsfunktion zum Extrahieren von resolveCoordinates aus app.js
let resolveCoordinates;
try {
  const sandbox = {
    console,
    process,
    require,
    __dirname: path.join(__dirname, "../app"),
    sessionStorage: {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); }
    },
    window: {},
    document: { readyState: "complete", addEventListener: () => {} }
  };
  const vm = require("vm");
  // Wir führen app.js in sandbox aus oder laden die Hilfsfunktionen
  vm.createContext(sandbox);
  vm.runInContext(appJsCode, sandbox);
  resolveCoordinates = sandbox.resolveCoordinates || sandbox.window.resolveCoordinates;
} catch (e) {
  // Wenn noch nicht implementiert, ist resolveCoordinates undefined
}

async function runTests() {
  console.log("--- TEST: 3-Stufen-Geocoding (TDD) ---");
  assert.strictEqual(typeof resolveCoordinates, "function", "resolveCoordinates must be a function in app/app.js");

  // Test 1: Explizite Koordinaten in configdata (Stufe 1)
  const res1 = await resolveCoordinates("Burladingen", { latitude: "48.1111", longitude: "9.2222" });
  assert.strictEqual(res1.source, "config", "Stufe 1: source should be 'config'");
  assert.strictEqual(res1.lat, 48.1111, "Stufe 1: lat should match config");
  assert.strictEqual(res1.lng, 9.2222, "Stufe 1: lng should match config");
  console.log("  ✅ Test 1: Explizite Koordinaten in configdata (Stufe 1)");

  // Test 2: Offline-Lookup via gemeinden.json (Stufe 2)
  const res2 = await resolveCoordinates("Burladingen", { latitude: "", longitude: "" });
  assert.strictEqual(res2.source, "offline", "Stufe 2: source should be 'offline' for Burladingen");
  assert(Math.abs(res2.lat - 48.2917) < 0.01, "Stufe 2: lat should be ~48.2917");
  assert(Math.abs(res2.lng - 9.1122) < 0.01, "Stufe 2: lng should be ~9.1122");
  console.log("  ✅ Test 2: Offline-Lookup für Burladingen (Stufe 2)");

  // Test 2b: Case-Insensitive & Whitespace
  const res2b = await resolveCoordinates("  tÜBiNgEn  ", {});
  assert.strictEqual(res2b.source, "offline", "Stufe 2b: should find Tübingen case-insensitively");
  assert(Math.abs(res2b.lat - 48.5216) < 0.05, "Stufe 2b: Tübingen lat check");
  console.log("  ✅ Test 2b: Case-Insensitive Offline-Lookup");

  // Test 3: Unbekannter Ort -> Nominatim Fallback (Stufe 3)
  const mockFetchNominatim = async (url) => {
    return {
      ok: true,
      json: async () => [{ lat: "52.5200", lon: "13.4050" }]
    };
  };
  const res3 = await resolveCoordinates("UnbekannteMusterstadt999", {}, mockFetchNominatim);
  assert.strictEqual(res3.source, "nominatim", "Stufe 3: source should be 'nominatim'");
  assert.strictEqual(res3.lat, 52.52, "Stufe 3: lat should match Nominatim");
  assert.strictEqual(res3.lng, 13.405, "Stufe 3: lng should match Nominatim");
  console.log("  ✅ Test 3: Unbekannter Ort ruft Nominatim ab (Stufe 3)");

  // Test 4: Fehlgeschlagener Abruf -> Stabiler Fallback
  const mockFetchFail = async () => {
    throw new Error("Network offline");
  };
  const res4 = await resolveCoordinates("VollkommenUnbekannt12345", {}, mockFetchFail);
  assert.strictEqual(res4.source, "fallback", "Stufe 4: source should be 'fallback' on error");
  assert.strictEqual(typeof res4.lat, "number", "Stufe 4: lat must be number");
  assert.strictEqual(typeof res4.lng, "number", "Stufe 4: lng must be number");
  console.log("  ✅ Test 4: Netzwerkfehler fällt stabil auf Default zurück");

  console.log("✅ All Geocoding tests PASSED!");
}

runTests().catch(err => {
  console.error("❌ Test failed:", err.message);
  process.exit(1);
});
