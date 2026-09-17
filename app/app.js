/*
 * Sehenswürdigkeiten – App-Logik (DZT Knowledge Graph)
 *
 * Full-Page Map & Modern Glassmorphism UI
 *  - 100vw × 100vh Edge-to-Edge Canvas
 *  - Schwebende Header-Glassbar mit Schnellsuche, Umschaltern und Burger-Menü
 *  - Interaktive Filter-Pills mit Live-Zählern (Familie, Indoor, Outdoor, Kostenlos)
 *  - Einklappbarer Seiten-Drawer links mit Karten-Synchronisation
 *  - Zuschaltbarer Vollbild-Katalog-Modus (3-Spalten-Fotogitter)
 *  - Leaflet.markercluster mit präzisen, zentrierten SVG-Drop-Pins
 *  - Diskrete Schwebepille für Schale-4-Methodik, Lizenzen & Rechtliches
 *
 * Datenzugriff:
 *  - Im ODAS-Livebetrieb ausschließlich über den internen Store-Relay:
 *    GET <appPath>/dzt?path=ts/v1/kg/sparql?query=...
 *  - Bei lokaler Entwicklung automatischer Fallback auf config.demoPois.
 */

let swInstanzZaehler = 0;
const swInstances = new Map();

/**
 * Lifecycle-Hook der ODAS-Base: Wird beim Verlassen der Seite aufgerufen.
 */
function onPageLeave(page) {
  document.body.classList.remove("sw-app-fullscreen");

  // Alle aktiven Bootstrap Modals sauber schliessen
  try {
    document.querySelectorAll(".modal.show").forEach((modalEl) => {
      if (window.bootstrap && window.bootstrap.Modal) {
        const inst = window.bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }
    });
  } catch (err) {
    console.warn("Fehler beim Schließen aktiver Modals:", err);
  }

  // Backdrops und Klassen restlos aufräumen
  document.querySelectorAll(".modal-backdrop, .offcanvas-backdrop").forEach((b) => b.remove());
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");

  // Startseiten-Wrapper detachen und im globalen Cache für die blitzschnelle Rückkehr aufbewahren
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    const wrapper = mainContent.querySelector(".sw-fullscreen-wrapper");
    if (wrapper) {
      window.__swCachedAppWrapper = wrapper;
      wrapper.remove();
    }
  }
}

/**
 * Stellt sicher, dass das Bootstrap-Offcanvas-Menü global als direktes Kind von document.body
 * eingehängt ist (verhindert CSS-Transform-Stacking-Context-Probleme auf Sekundärseiten)
 */
function ensureGlobalOffcanvasSetup() {
  if (typeof document === "undefined" || !document.getElementById) return;
  const offcanvasNav = document.getElementById("offcanvasNavbar");
  if (offcanvasNav && offcanvasNav.parentElement !== document.body) {
    document.body.appendChild(offcanvasNav);
  }
}

/**
 * Hook der ODAS-Base: Eigenes Template für Sekundärseiten (Beschreibung, Kontakt, Impressum, Datenschutz)
 */
function renderPageOverride(page) {
  if (page === "startseite") return null;

  // Offcanvas an document.body und QR-Code Menüpunkt sicherstellen
  ensureGlobalOffcanvasSetup();
  setTimeout(() => ensureQrNavMenuItem(), 0);

  const titles = {
    beschreibung: "Über diese App & Methodik",
    kontakt: "Kontakt & Ansprechpartner",
    impressum: "Impressum",
    datenschutz: "Datenschutzerklärung"
  };

  const svgIcons = {
    beschreibung: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    kontakt: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    impressum: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h6"/></svg>',
    datenschutz: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
  };

  const title = titles[page] || "Information";
  const icon = svgIcons[page] || svgIcons.beschreibung;

  let rawContent = "";
  if (typeof configData !== "undefined" && configData && configData[page]) {
    rawContent = configData[page];
  } else {
    rawContent = "Informationen für diese Seite sind derzeit nicht verfügbar.";
  }

  const formattedContent = Array.isArray(rawContent)
    ? (typeof normalizeMultilineValue === "function" ? normalizeMultilineValue(rawContent) : rawContent.join("<br>"))
    : rawContent;

  return `
    <div class="sw-secondary-wrapper">
      <div class="sw-secondary-card" id="secondarySites">
        <div class="sw-secondary-nav-bar">
          <a href="#startseite" class="sw-secondary-back-link" title="Zurück zur Kartenansicht">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Zurück zur Karte</span>
          </a>
          <div class="sw-secondary-badge">DZT &bull; ODAS</div>
        </div>
        <div class="sw-secondary-header">
          <span class="sw-secondary-icon">${icon}</span>
          <h2 class="sw-secondary-title">${title}</h2>
        </div>
        <div class="sw-secondary-body">
          ${formattedContent}
        </div>
      </div>
    </div>
  `;
}

// ===========================================================================
// 3-Stufen Geocoding Engine (Option 1C)
// ===========================================================================
let GEMEINDEN_LOOKUP = null;

async function loadGemeindenLookup(fetchFn) {
  if (GEMEINDEN_LOOKUP) return GEMEINDEN_LOOKUP;
  // Node.js Test-Umgebung: Direktes Laden via fs falls vorhanden
  if (typeof process !== "undefined" && process.versions && process.versions.node && typeof require === "function") {
    try {
      const fs = require("fs");
      const path = require("path");
      const dir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
      const candidates = [
        path.join(dir, "assets/gemeinden.json"),
        path.join(dir, "../assets/gemeinden.json"),
        path.join(process.cwd(), "assets/gemeinden.json"),
        path.join(process.cwd(), "oda-sehenswuerdigkeiten/assets/gemeinden.json")
      ];
      for (const fp of candidates) {
        if (fs.existsSync(fp)) {
          GEMEINDEN_LOOKUP = JSON.parse(fs.readFileSync(fp, "utf-8"));
          return GEMEINDEN_LOOKUP;
        }
      }
    } catch (_) {}
  }

  // Browser-Umgebung: Laden via fetch
  const effectiveFetch = fetchFn || (typeof fetch !== "undefined" ? fetch : null);
  if (effectiveFetch) {
    const candidatePaths = ["assets/gemeinden.json", "../assets/gemeinden.json"];
    for (const p of candidatePaths) {
      try {
        const resp = await effectiveFetch(p);
        if (resp && resp.ok) {
          GEMEINDEN_LOOKUP = await resp.json();
          return GEMEINDEN_LOOKUP;
        }
      } catch (_) {}
    }
  }

  // Fallback auf Basiseintrag Burladingen
  return { "burladingen": [48.2917, 9.1122] };
}

async function resolveCoordinates(ort, configdata = {}, fetchFn = null) {
  // Stufe 1: Explizite Koordinaten in configdata
  const cfgLat = configdata.latitude !== undefined && configdata.latitude !== "" ? parseFloat(configdata.latitude) : NaN;
  const cfgLng = configdata.longitude !== undefined && configdata.longitude !== "" ? parseFloat(configdata.longitude) : NaN;
  if (!isNaN(cfgLat) && !isNaN(cfgLng) && cfgLat !== 0 && cfgLng !== 0) {
    return { lat: cfgLat, lng: cfgLng, source: "config" };
  }

  const cleanOrt = String(ort || "").trim().toLowerCase();
  if (!cleanOrt) {
    return { lat: 48.2917, lng: 9.1122, source: "fallback" };
  }

  // Cache-Prüfung im sessionStorage
  const cacheKey = `sw_geo_v1_${cleanOrt}`;
  try {
    if (typeof sessionStorage !== "undefined") {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          return { lat: parsed.lat, lng: parsed.lng, source: parsed.source || "offline" };
        }
      }
    }
  } catch (_) {}

  // Stufe 2: Offline-Gemeindeverzeichnis
  const lookup = await loadGemeindenLookup(fetchFn);
  if (lookup && lookup[cleanOrt]) {
    const coords = lookup[cleanOrt];
    const result = { lat: coords[0], lng: coords[1], source: "offline" };
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (_) {}
    return result;
  }

  // Stufe 3: Automatischer Online-Geocoding-Fallback via OpenStreetMap Nominatim
  const effectiveFetch = fetchFn || (typeof fetch !== "undefined" ? fetch : null);
  if (effectiveFetch) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&city=${encodeURIComponent(cleanOrt)}&country=Germany&limit=1`;
      const resp = await effectiveFetch(url, {
        headers: { "Accept": "application/json" }
      });
      if (resp && resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const result = { lat, lng, source: "nominatim" };
          try {
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem(cacheKey, JSON.stringify(result));
          } catch (_) {}
          return result;
        }
      }
    } catch (err) {
      console.warn("Geocoding-Abruf fehlgeschlagen, nutze Fallback:", err);
    }
  }

  // Stufe 4: Sicherer Fallback (Standard: Burladingen Zentrum)
  return { lat: 48.2917, lng: 9.1122, source: "fallback" };
}

if (typeof window !== "undefined") {
  window.resolveCoordinates = resolveCoordinates;
}
if (typeof globalThis !== "undefined") {
  globalThis.resolveCoordinates = resolveCoordinates;
}

/**
 * Hauptfunktion der ODAS-Anwendung
 */
async function app(configdata = {}, enclosingHtmlDivElement) {
  const root = enclosingHtmlDivElement;

  // 1. Cache-Prüfung: Falls Startseite in dieser Browsersitzung bereits geladen wurde
  if (window.__swCachedAppWrapper && window.__swCachedState && !window.__swCachedState.disposed) {
    root.innerHTML = "";
    root.appendChild(window.__swCachedAppWrapper);
    document.body.classList.add("sw-app-fullscreen");

    const offcanvasNav = document.getElementById("offcanvasNavbar");
    if (offcanvasNav && offcanvasNav.parentElement !== document.body) {
      document.body.appendChild(offcanvasNav);
    }

    if (window.__swCachedState.map) {
      setTimeout(() => {
        try {
          window.__swCachedState.map.invalidateSize();
        } catch (_) {}
      }, 50);
    }
    ensureQrNavMenuItem(window.__swCachedState);
    return "";
  }

  const uid = "sw_" + ++swInstanzZaehler;

  // Viewport Fullscreen Lock für Startseite aktivieren
  document.body.classList.add("sw-app-fullscreen");

  // Bootstrap Offcanvas-Menü aus ausgeblendetem Header an document.body umhängen
  const offcanvasNav = document.getElementById("offcanvasNavbar");
  if (offcanvasNav && offcanvasNav.parentElement !== document.body) {
    document.body.appendChild(offcanvasNav);
  }
  ensureQrNavMenuItem();

  // Vorherige Instanz im selben DOM-Container bereinigen
  const prev = swInstances.get(root);
  if (prev) {
    prev.disposed = true;
    if (prev.map) {
      try { prev.map.remove(); } catch (_) {}
      prev.map = null;
    }
  }

  // 3-Stufen-Geocoding: Koordinaten auflösen
  const coords = await resolveCoordinates(configdata.ort || "Burladingen", configdata);

  // Instanz-Zustand
  const state = {
    uid,
    root,
    config: configdata,
    disposed: false,
    appendedModals: [],
    ort: String(configdata.ort || "Burladingen").trim(),
    lat: coords.lat,
    lng: coords.lng,
    coordSource: coords.source,
    umkreis: parseInt(configdata.umkreis || configdata.radiusKm, 10) || 25,
    standardFilter: String(configdata.standardFilter || "alle").trim(),
    allPois: [],
    filteredPois: [],
    markerMap: new Map(),
    map: null,
    clusterGroup: null,
    centerMarker: null,
    drawerCollapsed: false,
    catalogMode: false,
    page: 0,
    pageSize: 10,
    sortBy: "dist_asc",
    filters: {
      search: "",
      targetGroup: "alle", // alle | kinder
      weather: "alle",     // alle | indoor | outdoor
      cost: "alle",        // alle | kostenlos
      outlet: false,       // true | false
      culinary: false      // true | false
    }
  };

  swInstances.set(root, state);

  // Standard-Filter anwenden
  if (state.standardFilter === "kinder") state.filters.targetGroup = "kinder";
  if (state.standardFilter === "indoor") state.filters.weather = "indoor";
  if (state.standardFilter === "outdoor") state.filters.weather = "outdoor";
  if (state.standardFilter === "kostenlos") state.filters.cost = "kostenlos";
  if (state.standardFilter === "outlet") state.filters.outlet = true;
  if (state.standardFilter === "culinary") state.filters.culinary = true;

  // Globalen Detail-Opener registrieren
  window[`swOpenDetail_${uid}`] = (poiId) => openDetailModal(state, poiId);
  window[`swFocusPoi_${uid}`] = (poiId) => focusPoiOnMap(state, poiId);

  // Initiales Layout rendern (Ladezustand)
  renderInitialLayout(state);

  try {
    // Leaflet & Markercluster Skripte & Styles sicherstellen
    await ensureLeafletAndClusterLoaded();

    // Daten abrufen (DZT Relay oder Fallback-Fixture)
    const rawPois = await loadDztData(state);
    if (state.disposed) return;

    // Normalisieren & nach Distanz sortieren
    state.allPois = rawPois.map(p => normalizeDztPoi(p, state.lat, state.lng)).filter(Boolean);
    state.allPois.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    // Karte initialisieren
    await initLeafletMap(state);

    // Filter anwenden & UI befüllen
    applyFilters(state);
    updateFilterCounts(state);
    updateMapMarkers(state);
    renderDrawerList(state);
    hideLoadingOverlay(state);
    ensureQrNavMenuItem(state);

    // Im globalen Cache für sofortigen Rücksprung sichern
    window.__swCachedState = state;
    window.__swCachedAppWrapper = state.root.querySelector(".sw-fullscreen-wrapper");
    return "";
  } catch (error) {
    if (state.disposed) return "";
    hideLoadingOverlay(state);
    console.error("Fehler beim Laden der Sehenswürdigkeiten:", error);
    renderErrorMessage(state, error.message);
    return "";
  }
}

function hideLoadingOverlay(state) {
  const u = state.uid;
  const overlay = state.root.querySelector(`#${u}-loading-overlay`);
  if (!overlay) return;
  overlay.classList.add("sw-fade-out");
  setTimeout(() => {
    if (overlay && overlay.parentNode) {
      overlay.style.display = "none";
    }
  }, 400);
}

// ===========================================================================
// Vendor Loader für Leaflet & Markercluster
// ===========================================================================

function markiereGeladen(el) {
  if (el && el.dataset) el.dataset.geladen = "ja";
}

function istGeladen(el) {
  return !!(el && el.dataset && el.dataset.geladen === "ja");
}

function loadStylesheetOnce(id, href) {
  const vorhanden = document.getElementById(id);
  if (vorhanden) {
    if (istGeladen(vorhanden)) return Promise.resolve();
    if (vorhanden.dataset && vorhanden.dataset.fehlgeschlagen === "ja") {
      vorhanden.parentNode && vorhanden.parentNode.removeChild(vorhanden);
    } else {
      return new Promise((resolve, reject) => {
        vorhanden.addEventListener("load", () => { markiereGeladen(vorhanden); resolve(); }, { once: true });
        vorhanden.addEventListener("error", () => reject(new Error(`Stylesheet konnte nicht geladen werden: ${href}`)), { once: true });
      });
    }
  }
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => {
      markiereGeladen(link);
      resolve();
    };
    link.onerror = () => {
      if (link.dataset) link.dataset.fehlgeschlagen = "ja";
      reject(new Error(`Stylesheet konnte nicht geladen werden: ${href}`));
    };
    document.head.appendChild(link);
  });
}

function loadScriptOnce(id, src, readyCheck) {
  if (readyCheck && readyCheck()) return Promise.resolve();
  const vorhanden = document.getElementById(id);
  if (vorhanden) {
    if (istGeladen(vorhanden)) return Promise.resolve();
    if (vorhanden.dataset && vorhanden.dataset.fehlgeschlagen === "ja") {
      vorhanden.parentNode && vorhanden.parentNode.removeChild(vorhanden);
    } else {
      return new Promise((resolve, reject) => {
        vorhanden.addEventListener("load", () => { markiereGeladen(vorhanden); resolve(); }, { once: true });
        vorhanden.addEventListener("error", () => {
          if (vorhanden.dataset) vorhanden.dataset.fehlgeschlagen = "ja";
          reject(new Error(`Skript konnte nicht geladen werden: ${src}`));
        }, { once: true });
      });
    }
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.onload = () => {
      markiereGeladen(script);
      resolve();
    };
    script.onerror = () => {
      if (script.dataset) script.dataset.fehlgeschlagen = "ja";
      reject(new Error(`Skript konnte nicht geladen werden: ${src}`));
    };
    document.head.appendChild(script);
  });
}

async function ensureLeafletAndClusterLoaded() {
  // 1. Leaflet Stylesheet und JS laden
  await Promise.all([
    loadStylesheetOnce("leaflet-css", "vendor/leaflet/leaflet.css"),
    loadScriptOnce("leaflet-js", "vendor/leaflet/leaflet.js", () => typeof window.L !== "undefined")
  ]);

  // 2. MarkerCluster Stylesheet und JS laden
  await Promise.all([
    loadStylesheetOnce("leaflet-markercluster-css", "vendor/markercluster/MarkerCluster.css"),
    loadStylesheetOnce("leaflet-markercluster-default-css", "vendor/markercluster/MarkerCluster.Default.css"),
    loadScriptOnce("leaflet-markercluster-js", "vendor/markercluster/leaflet.markercluster.js", () => typeof window.L !== "undefined" && typeof window.L.markerClusterGroup === "function")
  ]);

  // 3. QR-Code Generator vorab laden
  ensureQrCodeLoaded().catch(() => {});
}

function ensureQrCodeLoaded() {
  const basePath = getOdasAppBasePath();
  const qrSrc = basePath ? `${basePath}/vendor/qrcode/qrcode.min.js` : "vendor/qrcode/qrcode.min.js";
  return loadScriptOnce("qrcode-js", qrSrc, () => typeof window.qrcode === "function");
}

// ===========================================================================
// DZT-Relay & Datenabruf (SPARQL ts/v1/kg/sparql)
// ===========================================================================

function dztApiPath(apiurl) {
  try {
    return new URL(String(apiurl || "")).pathname.replace(/^\/+api\/?/, "");
  } catch (_error) {
    return "";
  }
}

function buildDztSparqlQuery(lat, lng, radiusKm) {
  let geoFilter = "";
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  const radius = parseFloat(radiusKm) || 25;

  if (!isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0) {
    const geoShapeJson = JSON.stringify({
      query: {
        geo_shape: {
          geometry: {
            shape: {
              type: "circle",
              radius: `${radius}km`,
              coordinates: [numLng, numLat]
            },
            relation: "intersects"
          }
        }
      }
    });
    geoFilter = `
  ?search a inst:dzt-geo-shapes ;
    con:query ${JSON.stringify(geoShapeJson)} ;
    con:entities ?s .`;
  }

  return `PREFIX inst: <http://www.ontotext.com/connectors/elasticsearch/instance#>
PREFIX con: <http://www.ontotext.com/connectors/elasticsearch#>
PREFIX schema: <https://schema.org/>

SELECT ?s 
  (SAMPLE(?nameDe) AS ?name)
  (SAMPLE(?descDe) AS ?desc)
  (SAMPLE(?latVal) AS ?lat)
  (SAMPLE(?lngVal) AS ?lng)
  (SAMPLE(?streetVal) AS ?street)
  (SAMPLE(?postalVal) AS ?postal)
  (SAMPLE(?cityVal) AS ?city)
  (SAMPLE(?freeVal) AS ?free)
  (SAMPLE(?imgUrl) AS ?img)
  (GROUP_CONCAT(DISTINCT ?imgUrl; separator="|") AS ?imgs)
  (GROUP_CONCAT(DISTINCT ?type; separator=",") AS ?types)
WHERE {${geoFilter}
  VALUES ?targetType {
    schema:TouristAttraction
    schema:OutletStore
    schema:ShoppingCenter
    schema:Brewery
    schema:Winery
    schema:Distillery
    schema:FoodEstablishment
    schema:BarOrPub
    schema:Restaurant
    schema:Museum
    schema:Castle
    schema:DaySpa
    schema:Playground
    schema:AmusementPark
    schema:WaterPark
    schema:Zoo
    schema:PublicSwimmingPool
    schema:Park
    schema:NatureReserve
  }
  ?s a ?targetType .
  OPTIONAL { ?s a ?type }
  ?s schema:name ?nameDe .
  FILTER(lang(?nameDe) = "de" || lang(?nameDe) = "")
  OPTIONAL {
    ?s schema:description ?descDe .
    FILTER(lang(?descDe) = "de" || lang(?descDe) = "")
  }
  OPTIONAL {
    ?s schema:geo ?geo .
    ?geo schema:latitude ?latVal .
    ?geo schema:longitude ?lngVal .
  }
  OPTIONAL {
    ?s schema:address ?addr .
    OPTIONAL { ?addr schema:streetAddress ?streetVal }
    OPTIONAL { ?addr schema:postalCode ?postalVal }
    OPTIONAL { ?addr schema:addressLocality ?cityVal }
  }
  OPTIONAL { ?s schema:isAccessibleForFree ?freeVal }
  OPTIONAL {
    ?s schema:image ?imgObj .
    ?imgObj schema:contentUrl ?imgUrl .
  }
}
GROUP BY ?s
LIMIT 300`;
}

function convertSparqlBindingToPoi(b) {
  const types = b.types && b.types.value ? b.types.value.split(",") : ["https://schema.org/TouristAttraction"];
  let images = [];
  if (b.imgs && b.imgs.value) {
    const urls = b.imgs.value.split("|").map(u => u.trim()).filter(Boolean);
    images = urls.map(u => ({ "@type": "ImageObject", "schema:contentUrl": u }));
  } else if (b.img && b.img.value) {
    images = [{ "@type": "ImageObject", "schema:contentUrl": b.img.value }];
  }

  return {
    "@id": b.s ? b.s.value : "",
    "@type": types,
    "schema:name": b.name ? b.name.value : "Sehenswürdigkeit",
    "schema:description": b.desc ? b.desc.value : "",
    "schema:geo": (b.lat && b.lng) ? {
      "@type": "GeoCoordinates",
      "schema:latitude": parseFloat(b.lat.value),
      "schema:longitude": parseFloat(b.lng.value)
    } : null,
    "schema:address": {
      "@type": "PostalAddress",
      "schema:streetAddress": b.street ? b.street.value : "",
      "schema:postalCode": b.postal ? b.postal.value : "",
      "schema:addressLocality": b.city ? b.city.value : ""
    },
    "schema:image": images.length > 1 ? images : (images[0] || null),
    "schema:isAccessibleForFree": b.free ? (b.free.value === "true" || b.free.value === "1") : undefined
  };
}

async function loadDztData(state) {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  
  // Wenn lokale Demo-POIs verfügbar sind und wir lokal laufen:
  if (isLocalhost) {
    const localDemos = await getLocalDemoPoisFallback(state);
    if (localDemos.length > 0) {
      console.info("Lokale Entwicklung: Verwende Demo-POIs aus assets/demo-pois.json.");
      return localDemos;
    }
  }

  // SessionStorage-Cache prüfen (beschleunigt Kaltstart & Reloads auf Mobile und Desktop drastisch)
  const cacheKey = `sw_dzt_cache_v1_${state.lat.toFixed(4)}_${state.lng.toFixed(4)}_${state.umkreis}`;
  try {
    const cachedEntry = sessionStorage.getItem(cacheKey);
    if (cachedEntry) {
      const parsed = JSON.parse(cachedEntry);
      const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 Stunden Gültigkeit
      if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp < CACHE_TTL_MS) && Array.isArray(parsed.data) && parsed.data.length > 0) {
        console.info(`DZT-Daten aus Session-Cache geladen (${parsed.data.length} POIs)`);
        return parsed.data;
      }
    }
  } catch (cacheErr) {
    console.warn("Session-Cache konnte nicht gelesen werden:", cacheErr);
  }

  // Endpunkt ermitteln (Standard: ts/v1/kg/sparql)
  let baseEndpoint = "ts/v1/kg/sparql";
  if (Array.isArray(state.config.apiurls)) {
    const sparqlEntry = state.config.apiurls.find(u => u && (u.name === "dztsparql" || (u.url && u.url.includes("sparql"))));
    if (sparqlEntry && sparqlEntry.url) {
      const derived = dztApiPath(sparqlEntry.url);
      if (derived) baseEndpoint = derived;
    }
  }

  const query = buildDztSparqlQuery(state.lat, state.lng, state.umkreis);
  const path = `${baseEndpoint}?${new URLSearchParams({ query }).toString()}`;
  const relayUrl = `${getOdasAppBasePath()}/dzt?path=${encodeURIComponent(path)}`;

  try {
    const response = await fetch(relayUrl, {
      headers: { "Accept": "application/sparql-results+json" }
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error("Der Zugang zum DZT Knowledge Graph wurde abgelehnt (API-Key im Store prüfen).");
    }
    if (response.status === 429) {
      throw new Error("Das Abfragelimit der DZT-Schnittstelle wurde erreicht. Bitte versuchen Sie es später erneut.");
    }
    if (response.status === 404 && isLocalhost) {
      const fallback = await getLocalDemoPoisFallback(state);
      if (fallback.length > 0) return fallback;
    }
    if (!response.ok) {
      throw new Error(`DZT-Schnittstelle antwortet mit Status HTTP ${response.status}`);
    }

    const data = await response.json();
    let resultPois = [];
    if (data && data.results && Array.isArray(data.results.bindings)) {
      resultPois = data.results.bindings.map(convertSparqlBindingToPoi);
    } else if (Array.isArray(data)) {
      resultPois = data;
    } else if (data && Array.isArray(data["@graph"])) {
      resultPois = data["@graph"];
    } else if (data && Array.isArray(data.things)) {
      resultPois = data.things;
    }

    // In Session-Cache für blitzschnelle Wiederverwendung ablegen
    if (resultPois && resultPois.length > 0) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          data: resultPois
        }));
      } catch (cacheStoreErr) {
        console.warn("Session-Cache konnte nicht geschrieben werden (z. B. Quota oder Private Mode):", cacheStoreErr);
      }
    }

    return resultPois;
  } catch (err) {
    const fallback = await getLocalDemoPoisFallback(state);
    if (fallback.length > 0) {
      console.warn("Relay-Abruf fehlgeschlagen, verwende Demo-Fixture:", err.message);
      return fallback;
    }
    throw err;
  }
}

async function getLocalDemoPoisFallback(state) {
  if (Array.isArray(state.config.demoPois) && state.config.demoPois.length > 0) {
    return state.config.demoPois;
  }
  try {
    const res = await fetch("assets/demo-pois.json");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (_) {}
  return [];
}

function getOdasAppBasePath() {
  const p = window.location.pathname;
  const match = p.match(/^(.*\/app)(?:\/.*)?$/);
  if (match) return match[1];
  return p.replace(/\/index\.html$/, "").replace(/\/$/, "");
}

// ===========================================================================
// Klassifikation & Normalisierung
// ===========================================================================

function classifyKidsFriendly(poi) {
  if (!poi) return false;
  const types = Array.isArray(poi["@type"]) ? poi["@type"] : [poi["@type"] || ""];
  const typeStr = types.join(" ").toLowerCase();
  
  const kidsTypes = ["playground", "amusementpark", "waterpark", "zoo", "aquarium", "themepark"];
  if (kidsTypes.some(t => typeStr.includes(t))) {
    return true;
  }

  // Schema-Property: audience oder typicalAgeRange
  const audience = poi["schema:audience"] || poi["audience"];
  if (audience) {
    const audStr = JSON.stringify(audience).toLowerCase();
    if (audStr.includes("kinder") || audStr.includes("family") || audStr.includes("familie") || audStr.includes("child")) {
      return true;
    }
  }

  return false;
}

function classifyWeatherType(poi) {
  if (!poi) return "hybrid";
  const types = Array.isArray(poi["@type"]) ? poi["@type"] : [poi["@type"] || ""];
  const typeStr = types.join(" ").toLowerCase();

  const indoorTypes = [
    "museum", "artgallery", "church", "placeofworship", "civicstructure", 
    "dayspa", "publicswimmingpool", "library", "aquarium"
  ];
  if (indoorTypes.some(t => typeStr.includes(t))) return "indoor";

  const outdoorTypes = [
    "park", "landform", "hikingtrail", "trail", "naturereserve", 
    "campground", "playground", "mountain", "beach"
  ];
  if (outdoorTypes.some(t => typeStr.includes(t))) return "outdoor";

  return "hybrid";
}

function isFreeAdmission(poi) {
  if (!poi) return false;
  const val = poi["schema:isAccessibleForFree"];
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true" || val === "1";
  if (typeof val === "object" && val && val["@value"] !== undefined) {
    return String(val["@value"]).toLowerCase() === "true";
  }
  return false;
}

function classifyOutlet(poi) {
  if (!poi) return false;
  const types = Array.isArray(poi["@type"]) ? poi["@type"] : [poi["@type"] || ""];
  const typeStr = types.join(" ").toLowerCase();
  
  const outletTypes = ["outletstore", "shoppingcenter", "factoryoutlet"];
  return outletTypes.some(t => typeStr.includes(t));
}

function classifyCulinary(poi) {
  if (!poi) return false;
  const types = Array.isArray(poi["@type"]) ? poi["@type"] : [poi["@type"] || ""];
  const typeStr = types.join(" ").toLowerCase();

  // Sakralbauten / Kirchen sind NIEMALS Kulinarik/Genuss
  if (typeStr.includes("placeofworship") || typeStr.includes("church")) {
    return false;
  }

  const culinaryTypes = [
    "brewery", "winery", "distillery", "foodestablishment", 
    "barorpub", "restaurant", "culinaryexperience"
  ];
  return culinaryTypes.some(t => typeStr.includes(t));
}

function normalizeDztPoi(rawPoi, refLat, refLng) {
  if (!rawPoi) return null;

  const id = rawPoi["@id"] || `poi_${Math.random().toString(36).substr(2, 9)}`;
  const name = typeof rawPoi["schema:name"] === "object" ? (rawPoi["schema:name"]["@value"] || "") : (rawPoi["schema:name"] || "Sehenswürdigkeit");
  
  let description = "";
  if (Array.isArray(rawPoi["schema:description"])) {
    const deEntry = rawPoi["schema:description"].find(d => typeof d === "object" && d["@language"] === "de") || rawPoi["schema:description"][0];
    description = typeof deEntry === "object" ? (deEntry["@value"] || "") : String(deEntry || "");
  } else if (typeof rawPoi["schema:description"] === "object") {
    description = rawPoi["schema:description"]["@value"] || "";
  } else {
    description = rawPoi["schema:description"] || "";
  }

  // Geokoordinaten
  let lat = null;
  let lng = null;
  const geo = rawPoi["schema:geo"];
  if (geo) {
    const rawLat = geo["schema:latitude"] || geo["latitude"];
    const rawLng = geo["schema:longitude"] || geo["longitude"];
    lat = typeof rawLat === "object" ? parseFloat(rawLat["@value"]) : parseFloat(rawLat);
    lng = typeof rawLng === "object" ? parseFloat(rawLng["@value"]) : parseFloat(rawLng);
  }

  // Adresse
  const addr = rawPoi["schema:address"] || {};
  const street = addr["schema:streetAddress"] || addr["streetAddress"] || "";
  const postalCode = addr["schema:postalCode"] || addr["postalCode"] || "";
  const city = addr["schema:addressLocality"] || addr["schema:adressLocality"] || addr["addressLocality"] || "";
  const region = addr["schema:addressRegion"] || addr["addressRegion"] || "";

  // Bild
  let imageUrl = "";
  let imageLicense = "";
  let imageCopyright = "";
  let images = [];
  const img = rawPoi["schema:image"];
  if (Array.isArray(img) && img.length > 0) {
    images = img.map(i => {
      if (typeof i === "string") {
        return { url: i, license: "", copyright: "" };
      } else if (typeof i === "object" && i) {
        return {
          url: i["schema:contentUrl"] || i["contentUrl"] || "",
          license: i["schema:license"] || i["license"] || "",
          copyright: i["schema:copyrightNotice"] || i["copyrightNotice"] || ""
        };
      }
      return null;
    }).filter(i => i && i.url);
    if (images.length > 0) {
      imageUrl = images[0].url;
      imageLicense = images[0].license;
      imageCopyright = images[0].copyright;
    }
  } else if (typeof img === "object" && img) {
    const url = img["schema:contentUrl"] || img["contentUrl"] || "";
    if (url) {
      imageUrl = url;
      imageLicense = img["schema:license"] || img["license"] || "";
      imageCopyright = img["schema:copyrightNotice"] || img["copyrightNotice"] || "";
      images = [{ url, license: imageLicense, copyright: imageCopyright }];
    }
  } else if (typeof img === "string" && img) {
    imageUrl = img;
    images = [{ url: img, license: "", copyright: "" }];
  }

  // Distanzberechnung
  let distanceKm = null;
  if (lat !== null && lng !== null && refLat && refLng && !isNaN(lat) && !isNaN(lng)) {
    const R = 6371; // km
    const dLat = (lat - refLat) * Math.PI / 180;
    const dLon = (lng - refLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(refLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = Math.round(R * c * 10) / 10;
  }

  const isOutlet = classifyOutlet(rawPoi);
  const isCulinary = classifyCulinary(rawPoi);

  return {
    id,
    name,
    description,
    lat,
    lng,
    street,
    postalCode,
    city,
    region,
    imageUrl,
    imageLicense,
    imageCopyright,
    images,
    distanceKm,
    isKidsFriendly: classifyKidsFriendly(rawPoi),
    weatherType: classifyWeatherType(rawPoi),
    isFree: isFreeAdmission(rawPoi),
    isOutlet,
    isCulinary,
    category: isOutlet ? "outlet" : (isCulinary ? "culinary" : "attraction"),
    raw: rawPoi
  };
}

// ===========================================================================
// Vektor SVG Drop-Pin Generator
// ===========================================================================

function createSvgPin(type, isKids, weatherType, isOutlet, isCulinary) {
  let color = "#16a34a"; // Outdoor default
  let glyph = "🌲";

  if (type === "center") {
    color = "#d97706";
    glyph = "★";
  } else if (isOutlet) {
    color = "#c026d3";
    glyph = "🛍️";
  } else if (isCulinary) {
    color = "#b91c1c";
    glyph = "🍷";
  } else if (isKids) {
    color = "#ea580c";
    glyph = "🧸";
  } else if (weatherType === "indoor") {
    color = "#2563eb";
    glyph = "🏛️";
  } else if (weatherType === "hybrid") {
    color = "#7c3aed";
    glyph = "✨";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42" class="sw-svg-pin">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 13.5 24.3 15.1 25.8a1.2 1.2 0 0 0 1.8 0C18.5 40.3 32 26.5 32 16 32 7.163 24.837 0 16 0z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="16" cy="15" r="9" fill="#ffffff"/>
    <text x="16" y="16" font-size="11" text-anchor="middle" dominant-baseline="central">${glyph}</text>
  </svg>`;
}

// ===========================================================================
// Layout-Rendering & Event-Handling
// ===========================================================================

function renderInitialLayout(state) {
  const u = state.uid;
  state.root.innerHTML = `
    <div class="sw-fullscreen-wrapper" id="${u}-wrapper">
      <!-- 1. Full-Bleed Map Canvas -->
      <div id="${u}-map" class="sw-map-canvas"></div>

      <!-- Schwebender Top-Banner über der Karte (Zentriert & Voll konfigurierbar) -->
      <div class="sw-top-banner" id="${u}-top-banner">
        <h1 class="sw-top-banner-title">${escapeHtml(state.config.bannerTitel || ((state.config.titel || "Sehenswürdigkeiten") + " " + state.ort))}</h1>
        ${state.config.bannerUntertitel !== "" ? `<p class="sw-top-banner-subtitle">${escapeHtml(state.config.bannerUntertitel || "Ausflugsziele & Highlights in unserer Region")}</p>` : ""}
      </div>

      <!-- 2. Schwebende Map-Aktionen oben rechts (QR-Code, Foto-Katalog & Burger-Menü) -->
      <div class="sw-map-top-actions">
        <button id="${u}-qr-toggle" class="sw-action-btn sw-btn-qr" title="App auf dem Smartphone öffnen (QR-Code)" aria-label="QR-Code für Smartphone">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
          <span class="sw-btn-qr-text">Handy</span>
        </button>
        <button id="${u}-catalog-toggle" class="sw-btn-catalog" title="Vollbild-Fotogalerie aller Sehenswürdigkeiten öffnen">
          <span id="${u}-catalog-btn-icon" class="sw-catalog-btn-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </span>
          <span id="${u}-catalog-btn-text" class="sw-catalog-btn-text">Foto-Katalog</span>
        </button>
        <button class="sw-action-btn sw-action-btn-circle" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar" aria-label="Menü öffnen" title="Menü öffnen">
          <span>☰</span>
        </button>
      </div>

      <!-- 3. Integrierte Cockpit-Säule links (Option 1B) -->
      <aside id="${u}-cockpit" class="sw-cockpit" aria-label="Steuerungs- und Ergebnis-Cockpit">
        <!-- Cockpit Header: Brand & Einklapp-Button -->
        <div class="sw-cockpit-header">
          <div class="sw-cockpit-brand">
            <img src="assets/odas-app-icon.svg" class="sw-cockpit-logo" alt="Logo" onerror="this.src='favicon.png'">
            <div class="sw-cockpit-title-wrap">
              <h1 class="sw-cockpit-title">${escapeHtml(state.config.titel || "Sehenswürdigkeiten")}</h1>
              <p class="sw-cockpit-subtitle">${escapeHtml(state.ort)} &bull; ${state.umkreis} km Umkreis</p>
            </div>
          </div>
          <button id="${u}-cockpit-collapse-btn" class="sw-cockpit-collapse-btn" title="Cockpit einklappen" aria-label="Cockpit einklappen">
            <span class="sw-collapse-icon">◀</span>
          </button>
        </div>

        <!-- Cockpit Suche -->
        <div class="sw-cockpit-search-area">
          <div class="sw-search-wrapper">
            <span class="sw-search-icon">🔍</span>
            <input type="text" id="${u}-search" class="sw-search-input" placeholder="Nach Burg, Felsen, Museum suchen…" aria-label="Suche">
            <button id="${u}-search-clear" class="sw-search-clear" title="Suche löschen">✕</button>
          </div>
        </div>

        <!-- Cockpit Filter-Pills mit Live-Zählern (2-Zeiliges Wrap-Layout) -->
        <div class="sw-filter-pills sw-cockpit-filter-pills" id="${u}-filter-pills">
          <button class="sw-pill-btn sw-pill-kids ${state.filters.targetGroup === "kinder" ? "active" : ""}" data-filter="kinder">
            🧸 Kinder <span class="sw-pill-count" id="${u}-count-kids">-</span>
          </button>
          <button class="sw-pill-btn sw-pill-indoor ${state.filters.weather === "indoor" ? "active" : ""}" data-filter="indoor">
            🏛️ Indoor <span class="sw-pill-count" id="${u}-count-indoor">-</span>
          </button>
          <button class="sw-pill-btn sw-pill-outdoor ${state.filters.weather === "outdoor" ? "active" : ""}" data-filter="outdoor">
            🌲 Outdoor <span class="sw-pill-count" id="${u}-count-outdoor">-</span>
          </button>
          <button class="sw-pill-btn sw-pill-free ${state.filters.cost === "kostenlos" ? "active" : ""}" data-filter="kostenlos">
            🏷️ Gratis <span class="sw-pill-count" id="${u}-count-free">-</span>
          </button>
          <button class="sw-pill-btn sw-pill-outlet ${state.filters.outlet ? "active" : ""}" data-filter="outlet">
            🛍️ Outlets <span class="sw-pill-count" id="${u}-count-outlet">-</span>
          </button>
          <button class="sw-pill-btn sw-pill-culinary ${state.filters.culinary ? "active" : ""}" data-filter="culinary">
            🍷 Genuss <span class="sw-pill-count" id="${u}-count-culinary">-</span>
          </button>
          <button class="sw-pill-btn sw-pill-reset" id="${u}-filter-reset" style="display: none;" title="Filter zurücksetzen">
            ↺
          </button>
        </div>

        <!-- Cockpit List Header mit Zähler & Sortierung -->
        <div class="sw-cockpit-list-header">
          <h2 class="sw-cockpit-count-title" id="${u}-drawer-count-title">Ergebnisse (-)</h2>
          <div class="sw-cockpit-controls">
            <div class="sw-filter-select-wrap" id="${u}-filter-select-wrap">
              <select id="${u}-filter-select" class="form-select form-select-sm sw-filter-select" aria-label="Thema filtern">
                <option value="alle">Alle Themen</option>
                <option value="kinder">🧸 Kinder</option>
                <option value="indoor">🏛️ Indoor</option>
                <option value="outdoor">🌲 Outdoor</option>
                <option value="kostenlos">🏷️ Gratis</option>
                <option value="outlet">🛍️ Outlets</option>
                <option value="culinary">🍷 Genuss</option>
              </select>
              <button id="${u}-filter-select-reset" class="sw-filter-select-reset" title="Filter zurücksetzen" aria-label="Filter zurücksetzen" style="display: none;">✕</button>
            </div>
            <select id="${u}-sort-select" class="form-select form-select-sm sw-sort-select" aria-label="Ergebnisse sortieren">
              <option value="dist_asc" selected>Entfernung</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>

        <!-- Cockpit Scroll-Liste -->
        <div class="sw-cockpit-body" id="${u}-drawer-list">
          <div class="text-center py-5 text-muted">
            <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
            <div>Lade Sehenswürdigkeiten…</div>
          </div>
        </div>

        <!-- Cockpit Paginierung -->
        <div class="sw-cockpit-footer">
          <button id="${u}-page-prev" class="btn btn-sm btn-outline-secondary" disabled>&laquo; Zurück</button>
          <span id="${u}-page-info" class="small fw-semibold">Seite 1</span>
          <button id="${u}-page-next" class="btn btn-sm btn-outline-secondary" disabled>Weiter &raquo;</button>
        </div>
      </aside>

      <!-- 4. Schwebende Rand-Lasche links am Bildschirmrand (Option 2A) -->
      <button id="${u}-edge-tab" class="sw-edge-tab" title="Cockpit ausklappen" aria-label="Cockpit öffnen">
        <span class="sw-edge-tab-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></span>
        <span class="sw-edge-tab-label"><strong id="${u}-edge-count">-</strong> Treffer</span>
        <span class="sw-edge-tab-arrow">›</span>
      </button>

      <!-- 5. Glassmorphism Lade-Overlay -->
      <div id="${u}-loading-overlay" class="sw-loading-overlay">
        <div class="sw-loading-card">
          <div class="sw-loading-icon-wrap">
            <img src="assets/odas-app-icon.svg" class="sw-loading-icon" alt="Laden…" onerror="this.src='favicon.png'">
            <div class="sw-loading-spinner-ring"></div>
          </div>
          <h3 class="sw-loading-title">Sehenswürdigkeiten werden geladen…</h3>
          <p class="sw-loading-subtitle">DZT Knowledge Graph & OpenStreetMap &bull; ${escapeHtml(state.ort)}</p>
        </div>
      </div>

      <!-- 6. Vollbild-Katalog-Modus -->
      <div id="${u}-catalog-overlay" class="sw-catalog-overlay">
        <div class="sw-catalog-header">
          <div>
            <h2 class="h4 mb-0 fw-bold" id="${u}-catalog-title">Sehenswürdigkeiten Katalog</h2>
            <p class="text-muted small mb-0">Alle Ausflugsziele im Umkreis von ${state.umkreis} km um ${escapeHtml(state.ort)}</p>
          </div>
          <button id="${u}-catalog-back-btn" class="btn btn-outline-primary d-inline-flex align-items-center gap-2">
            <span>Zurück zur Karte</span>
          </button>
        </div>
        <div class="sw-catalog-grid" id="${u}-catalog-grid"></div>
      </div>

      <!-- 7. Diskrete Schwebepille für Schale 4 & Rechtliches -->
      <div class="sw-floating-footer">
        <button id="${u}-footer-pill" class="sw-footer-pill" title="Informationen zu Datenquellen, Methodik & Lizenzen">
          <span>Daten & Rechtliches &bull; © DZT & ODAS</span>
        </button>
      </div>

      <!-- 7b. Mobiler Floating View-Switcher (nur auf Mobile sichtbar) -->
      <button id="${u}-mobile-view-toggle" class="sw-mobile-view-toggle" aria-label="Ansicht wechseln">
        <span class="sw-mvt-icon">🏛️</span>
        <span class="sw-mvt-text" id="${u}-mvt-text">Sehenswürdigkeiten (-)</span>
      </button>

      <!-- 8. Schale-4 Modal Container -->
      <div class="modal fade" id="${u}-schale4-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0 shadow">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">Über diese App & Datenquellen</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
            </div>
            <div class="modal-body">
              <div class="mb-4">
                <h6 class="fw-bold mb-2">Methodik & Datenherkunft</h6>
                <div class="text-muted small">
                  ${state.config.datenquelleHinweis || "<p>Die Daten stammen aus dem offenen Knowledge Graph der Deutschen Zentrale für Tourismus (DZT).</p>"}
                </div>
              </div>
              <div class="mb-4">
                <h6 class="fw-bold mb-2">Offene Schnittstellen & Lizenzen</h6>
                <ul class="small mb-0">
                  <li><strong>Knowledge Graph:</strong> <a href="https://open-data-germany.org/" target="_blank" rel="noopener noreferrer">Open Data Germany (DZT)</a></li>
                  <li><strong>SPARQL-Endpunkt:</strong> <code>https://proxy.opendatagermany.io/api/ts/v1/kg/sparql</code></li>
                  <li><strong>Geodaten:</strong> OpenStreetMap-Kacheln datenschutzfreundlich eingebunden</li>
                </ul>
              </div>
              <div class="border-top pt-3 text-muted small">
                <p class="mb-1">${escapeHtml(state.config.fusszeile || "© 2026 | App und Daten: DZT Knowledge Graph & ODAS | Entwicklung: Ondics GmbH")}</p>
                <p class="mb-0">Weitere Angaben finden Sie im <a href="#impressum" class="sw-internal-page-link text-primary fw-semibold">Impressum</a> und in der <a href="#datenschutz" class="sw-internal-page-link text-primary fw-semibold">Datenschutzerklärung</a>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 9. Detail-Modal Container (Vollbild / XL Hero) -->
      <div class="modal fade" id="${u}-detail-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg overflow-hidden" id="${u}-detail-modal-content"></div>
        </div>
      </div>
    </div>
  `;

  // Modals direkt an document.body anhängen, um Stacking-Context-Konflikte mit Bootstrap-Backdrops zu vermeiden
  const schale4Modal = state.root.querySelector(`#${u}-schale4-modal`);
  const detailModal = state.root.querySelector(`#${u}-detail-modal`);
  if (schale4Modal) {
    document.body.appendChild(schale4Modal);
    state.appendedModals.push(schale4Modal);
  }
  if (detailModal) {
    document.body.appendChild(detailModal);
    state.appendedModals.push(detailModal);
  }

  // Event Listener binden
  bindHeaderEvents(state);
  bindDrawerEvents(state);
  bindCatalogEvents(state);
}

// ===========================================================================
// Event-Bindings
// ===========================================================================

function bindHeaderEvents(state) {
  const u = state.uid;
  const searchInput = state.root.querySelector(`#${u}-search`);
  const searchClear = state.root.querySelector(`#${u}-search-clear`);
  const filterPills = state.root.querySelector(`#${u}-filter-pills`);
  const resetBtn = state.root.querySelector(`#${u}-filter-reset`);
  const catalogToggle = state.root.querySelector(`#${u}-catalog-toggle`);
  const footerPill = state.root.querySelector(`#${u}-footer-pill`);

  // Sucheingabe
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.filters.search = searchInput.value.trim().toLowerCase();
      if (searchClear) {
        searchClear.style.display = state.filters.search ? "block" : "none";
      }
      state.page = 0;
      applyFilters(state);
      updateFilterCounts(state);
      updateMapMarkers(state);
      renderDrawerList(state);
      if (state.catalogMode) renderCatalogGrid(state);
    });
  }

  // Suche löschen
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      state.filters.search = "";
      searchClear.style.display = "none";
      state.page = 0;
      applyFilters(state);
      updateFilterCounts(state);
      updateMapMarkers(state);
      renderDrawerList(state);
      if (state.catalogMode) renderCatalogGrid(state);
    });
  }

  // Filter-Pills Klicks
  if (filterPills) {
    filterPills.addEventListener("click", (e) => {
      const btn = e.target.closest(".sw-pill-btn");
      if (!btn || btn.id === `${u}-filter-reset`) return;

      const filterType = btn.dataset.filter;
      if (filterType === "kinder") {
        state.filters.targetGroup = state.filters.targetGroup === "kinder" ? "alle" : "kinder";
      } else if (filterType === "indoor") {
        state.filters.weather = state.filters.weather === "indoor" ? "alle" : "indoor";
      } else if (filterType === "outdoor") {
        state.filters.weather = state.filters.weather === "outdoor" ? "alle" : "outdoor";
      } else if (filterType === "kostenlos") {
        state.filters.cost = state.filters.cost === "kostenlos" ? "alle" : "kostenlos";
      } else if (filterType === "outlet") {
        state.filters.outlet = !state.filters.outlet;
      } else if (filterType === "culinary") {
        state.filters.culinary = !state.filters.culinary;
      }

      state.page = 0;
      applyFilters(state);
      updateFilterCounts(state);
      updateMapMarkers(state);
      renderDrawerList(state);
      if (state.catalogMode) renderCatalogGrid(state);
    });
  }

  // Filter zurücksetzen
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.filters.search = "";
      state.filters.targetGroup = "alle";
      state.filters.weather = "alle";
      state.filters.cost = "alle";
      state.filters.outlet = false;
      state.filters.culinary = false;
      if (searchInput) searchInput.value = "";
      if (searchClear) searchClear.style.display = "none";
      state.page = 0;
      applyFilters(state);
      updateFilterCounts(state);
      updateMapMarkers(state);
      renderDrawerList(state);
      if (state.catalogMode) renderCatalogGrid(state);
    });
  }

  // Mobiles Themen-Dropdown Event-Handling
  const filterSelect = state.root.querySelector(`#${u}-filter-select`);
  const filterSelectReset = state.root.querySelector(`#${u}-filter-select-reset`);

  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      const val = filterSelect.value;
      state.filters.targetGroup = "alle";
      state.filters.weather = "alle";
      state.filters.cost = "alle";
      state.filters.outlet = false;
      state.filters.culinary = false;

      if (val === "kinder") state.filters.targetGroup = "kinder";
      else if (val === "indoor") state.filters.weather = "indoor";
      else if (val === "outdoor") state.filters.weather = "outdoor";
      else if (val === "kostenlos") state.filters.cost = "kostenlos";
      else if (val === "outlet") state.filters.outlet = true;
      else if (val === "culinary") state.filters.culinary = true;

      state.page = 0;
      applyFilters(state);
      updateFilterCounts(state);
      updateMapMarkers(state);
      renderDrawerList(state);
      if (state.catalogMode) renderCatalogGrid(state);
      scrollToTopOfCockpit(state);
    });
  }

  if (filterSelectReset) {
    filterSelectReset.addEventListener("click", (e) => {
      e.stopPropagation();
      state.filters.targetGroup = "alle";
      state.filters.weather = "alle";
      state.filters.cost = "alle";
      state.filters.outlet = false;
      state.filters.culinary = false;
      if (filterSelect) filterSelect.value = "alle";
      state.page = 0;
      applyFilters(state);
      updateFilterCounts(state);
      updateMapMarkers(state);
      renderDrawerList(state);
      if (state.catalogMode) renderCatalogGrid(state);
      scrollToTopOfCockpit(state);
    });
  }

  // QR-Code Toggle Button (Handy)
  const qrToggle = state.root.querySelector(`#${u}-qr-toggle`);
  if (qrToggle) {
    qrToggle.addEventListener("click", () => {
      openQrModal(state);
    });
  }

  // Katalog Toggle Button
  if (catalogToggle) {
    catalogToggle.addEventListener("click", () => {
      toggleCatalogMode(state);
    });
  }

  // Burgermenü Button -> Offcanvas öffnen
  const burgerBtn = state.root.querySelector(`[data-bs-target="#offcanvasNavbar"]`);
  if (burgerBtn) {
    burgerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById("offcanvasNavbar");
      if (target && window.bootstrap) {
        const oc = window.bootstrap.Offcanvas.getOrCreateInstance(target);
        oc.show();
      }
    });
  }

  // Footer Pill -> Schale-4 Modal
  if (footerPill) {
    footerPill.addEventListener("click", () => {
      const modalEl = document.getElementById(`${u}-schale4-modal`);
      if (modalEl && window.bootstrap) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }
    });
  }

  // Interne Modal-Links zu Impressum & Datenschutz: Modal schließen und Hash routen
  const schale4ModalEl = document.getElementById(`${u}-schale4-modal`);
  if (schale4ModalEl) {
    schale4ModalEl.querySelectorAll(".sw-internal-page-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetHref = link.getAttribute("href") || "#impressum";
        if (window.bootstrap && window.bootstrap.Modal) {
          const inst = window.bootstrap.Modal.getOrCreateInstance(schale4ModalEl);
          schale4ModalEl.addEventListener("hidden.bs.modal", () => {
            window.location.hash = targetHref;
          }, { once: true });
          inst.hide();
        } else {
          window.location.hash = targetHref;
        }
      });
    });
  }

  // Mobiler Floating View-Switcher (Karte vs. Liste)
  const mobileToggle = state.root.querySelector(`#${u}-mobile-view-toggle`);
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      const wrapper = state.root.querySelector(`#${u}-wrapper`);
      if (!wrapper) return;
      if (wrapper.classList.contains("sw-mobile-mode-list")) {
        exitMobileListMode(state);
      } else {
        enterMobileListMode(state);
      }
    });
  }
}

function exitMobileListMode(state) {
  const u = state.uid;
  const wrapper = state.root.querySelector(`#${u}-wrapper`);
  if (wrapper) wrapper.classList.remove("sw-mobile-mode-list");

  const cockpit = state.root.querySelector(`#${u}-cockpit`);
  if (cockpit) cockpit.classList.remove("sw-cockpit-collapsed");
  state.drawerCollapsed = false;

  const edgeTab = state.root.querySelector(`#${u}-edge-tab`);
  if (edgeTab) edgeTab.classList.remove("visible");

  state.root.classList.remove("sw-cockpit-is-collapsed");

  const mobileToggle = state.root.querySelector(`#${u}-mobile-view-toggle`);
  if (mobileToggle) {
    const iconSpan = mobileToggle.querySelector(".sw-mvt-icon");
    const textSpan = mobileToggle.querySelector(".sw-mvt-text");
    if (iconSpan) iconSpan.innerText = "🏛️";
    const count = state.filteredPois ? state.filteredPois.length : 0;
    if (textSpan) textSpan.innerText = `Sehenswürdigkeiten (${count})`;
  }

  if (state.map) {
    setTimeout(() => {
      try { state.map.invalidateSize(); } catch (_) {}
    }, 100);
  }
}

function enterMobileListMode(state) {
  const u = state.uid;
  const wrapper = state.root.querySelector(`#${u}-wrapper`);
  if (wrapper) wrapper.classList.add("sw-mobile-mode-list");

  const cockpit = state.root.querySelector(`#${u}-cockpit`);
  if (cockpit) cockpit.classList.remove("sw-cockpit-collapsed");
  state.drawerCollapsed = false;

  const edgeTab = state.root.querySelector(`#${u}-edge-tab`);
  if (edgeTab) edgeTab.classList.remove("visible");

  state.root.classList.remove("sw-cockpit-is-collapsed");

  const mobileToggle = state.root.querySelector(`#${u}-mobile-view-toggle`);
  if (mobileToggle) {
    const iconSpan = mobileToggle.querySelector(".sw-mvt-icon");
    const textSpan = mobileToggle.querySelector(".sw-mvt-text");
    if (iconSpan) iconSpan.innerText = "🗺️";
    if (textSpan) textSpan.innerText = "Karte";
  }
}

function scrollToTopOfCockpit(state) {
  const u = state.uid;
  const cockpit = state.root.querySelector(`#${u}-cockpit`);
  const listEl = state.root.querySelector(`#${u}-drawer-list`);
  if (cockpit) cockpit.scrollTo({ top: 0, behavior: "smooth" });
  if (listEl) listEl.scrollTo({ top: 0, behavior: "smooth" });
}

function bindDrawerEvents(state) {
  const u = state.uid;
  const cockpit = state.root.querySelector(`#${u}-cockpit`);
  const collapseBtn = state.root.querySelector(`#${u}-cockpit-collapse-btn`);
  const edgeTab = state.root.querySelector(`#${u}-edge-tab`);
  const prevBtn = state.root.querySelector(`#${u}-page-prev`);
  const nextBtn = state.root.querySelector(`#${u}-page-next`);
  const sortSelect = state.root.querySelector(`#${u}-sort-select`);

  function setCockpitState(collapsed) {
    state.drawerCollapsed = collapsed;
    if (cockpit) {
      cockpit.classList.toggle("sw-cockpit-collapsed", collapsed);
    }
    if (edgeTab) {
      edgeTab.classList.toggle("visible", collapsed);
    }
    if (collapsed) {
      state.root.classList.add("sw-cockpit-is-collapsed");
    } else {
      state.root.classList.remove("sw-cockpit-is-collapsed");
    }
  }

  // Für externe Aufrufe (z.B. aus Detail-Modal) am state exponieren
  state.setCockpitState = setCockpitState;

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        exitMobileListMode(state);
      } else {
        setCockpitState(true);
      }
    });
  }

  if (edgeTab) {
    edgeTab.addEventListener("click", () => {
      setCockpitState(false);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const val = sortSelect.value;
      state.sortBy = val;
      if (val === "name_asc") {
        state.filteredPois.sort((a, b) => a.name.localeCompare(b.name, "de"));
      } else if (val === "name_desc") {
        state.filteredPois.sort((a, b) => b.name.localeCompare(a.name, "de"));
      } else if (val === "dist_asc") {
        state.filteredPois.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      }
      state.page = 0;
      renderDrawerList(state);
      if (state.catalogMode) renderCatalogGrid(state);
      scrollToTopOfCockpit(state);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (state.page > 0) {
        state.page--;
        renderDrawerList(state);
        scrollToTopOfCockpit(state);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(state.filteredPois.length / state.pageSize);
      if (state.page < totalPages - 1) {
        state.page++;
        renderDrawerList(state);
        scrollToTopOfCockpit(state);
      }
    });
  }
}

function bindCatalogEvents(state) {
  const u = state.uid;
  const backBtn = state.root.querySelector(`#${u}-catalog-back-btn`);
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      toggleCatalogMode(state, false);
    });
  }
}

function toggleCatalogMode(state, forceState) {
  const u = state.uid;
  state.catalogMode = typeof forceState === "boolean" ? forceState : !state.catalogMode;

  const overlay = state.root.querySelector(`#${u}-catalog-overlay`);
  const toggleBtn = state.root.querySelector(`#${u}-catalog-toggle`);
  const btnIcon = state.root.querySelector(`#${u}-catalog-btn-icon`);
  const btnText = state.root.querySelector(`#${u}-catalog-btn-text`);

  const mobileToggle = state.root.querySelector(`#${u}-mobile-view-toggle`);
  if (mobileToggle) {
    mobileToggle.style.display = state.catalogMode ? "none" : "";
  }

  if (state.catalogMode) {
    if (overlay) overlay.classList.add("active");
    if (toggleBtn) toggleBtn.classList.add("active");
    if (btnIcon) btnIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>';
    if (btnText) btnText.textContent = "Zur Karte";
    renderCatalogGrid(state);
  } else {
    if (overlay) overlay.classList.remove("active");
    if (toggleBtn) toggleBtn.classList.remove("active");
    if (btnIcon) btnIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
    if (btnText) btnText.textContent = "Foto-Katalog";
    if (state.map) {
      setTimeout(() => state.map.invalidateSize(), 200);
    }
  }
}

// ===========================================================================
// Filterlogik & Live-Zähler
// ===========================================================================

function applyFilters(state) {
  const search = state.filters.search;
  const targetGroup = state.filters.targetGroup;
  const weather = state.filters.weather;
  const cost = state.filters.cost;
  const outlet = state.filters.outlet;
  const culinary = state.filters.culinary;

  state.filteredPois = state.allPois.filter(poi => {
    // Freitextsuche
    if (search) {
      const full = `${poi.name} ${poi.description} ${poi.city}`.toLowerCase();
      if (!full.includes(search)) return false;
    }

    // Zielgruppenfilter
    if (targetGroup === "kinder" && !poi.isKidsFriendly) return false;

    // Wetterfilter
    if (weather === "indoor" && poi.weatherType !== "indoor") return false;
    if (weather === "outdoor" && poi.weatherType !== "outdoor") return false;

    // Kostenfilter
    if (cost === "kostenlos" && !poi.isFree) return false;

    // Outlet Filter
    if (outlet && !poi.isOutlet) return false;

    // Genuss / Kulinarik Filter
    if (culinary && !poi.isCulinary) return false;

    return true;
  });

  // Sortierung anwenden
  const sortBy = state.sortBy || "dist_asc";
  if (sortBy === "name_asc") {
    state.filteredPois.sort((a, b) => a.name.localeCompare(b.name, "de"));
  } else if (sortBy === "name_desc") {
    state.filteredPois.sort((a, b) => b.name.localeCompare(a.name, "de"));
  } else if (sortBy === "dist_asc") {
    state.filteredPois.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }
}

function updateFilterCounts(state) {
  const u = state.uid;
  const search = state.filters.search;

  // Zähler berechnen unter Berücksichtigung der aktuellen Freitextsuche
  let kids = 0, indoor = 0, outdoor = 0, free = 0, outlet = 0, culinary = 0;
  state.allPois.forEach(poi => {
    if (search) {
      const full = `${poi.name} ${poi.description} ${poi.city}`.toLowerCase();
      if (!full.includes(search)) return;
    }
    if (poi.isKidsFriendly) kids++;
    if (poi.weatherType === "indoor") indoor++;
    if (poi.weatherType === "outdoor") outdoor++;
    if (poi.isFree) free++;
    if (poi.isOutlet) outlet++;
    if (poi.isCulinary) culinary++;
  });

  // Zähler in die Pills schreiben
  const cKids = state.root.querySelector(`#${u}-count-kids`);
  const cIndoor = state.root.querySelector(`#${u}-count-indoor`);
  const cOutdoor = state.root.querySelector(`#${u}-count-outdoor`);
  const cFree = state.root.querySelector(`#${u}-count-free`);
  const cOutlet = state.root.querySelector(`#${u}-count-outlet`);
  const cCulinary = state.root.querySelector(`#${u}-count-culinary`);

  if (cKids) cKids.textContent = kids;
  if (cIndoor) cIndoor.textContent = indoor;
  if (cOutdoor) cOutdoor.textContent = outdoor;
  if (cFree) cFree.textContent = free;
  if (cOutlet) cOutlet.textContent = outlet;
  if (cCulinary) cCulinary.textContent = culinary;

  // Active Klassen setzen & Tags mit 0 Treffern dynamisch ausblenden
  const pills = state.root.querySelectorAll(".sw-pill-btn");
  pills.forEach(p => {
    const f = p.dataset.filter;
    let isActive = false;
    let count = 0;

    if (f === "kinder") {
      isActive = state.filters.targetGroup === "kinder";
      count = kids;
    } else if (f === "indoor") {
      isActive = state.filters.weather === "indoor";
      count = indoor;
    } else if (f === "outdoor") {
      isActive = state.filters.weather === "outdoor";
      count = outdoor;
    } else if (f === "kostenlos") {
      isActive = state.filters.cost === "kostenlos";
      count = free;
    } else if (f === "outlet") {
      isActive = !!state.filters.outlet;
      count = outlet;
    } else if (f === "culinary") {
      isActive = !!state.filters.culinary;
      count = culinary;
    }

    if (f) {
      p.classList.toggle("active", isActive);
      p.style.display = (count > 0 || isActive) ? "inline-flex" : "none";
    }
  });

  // Reset Button sichtbar wenn mindestens ein Filter aktiv ist
  const isAnyActive = search || state.filters.targetGroup !== "alle" || state.filters.weather !== "alle" || state.filters.cost !== "alle" || state.filters.outlet || state.filters.culinary;
  const resetBtn = state.root.querySelector(`#${u}-filter-reset`);
  if (resetBtn) resetBtn.style.display = isAnyActive ? "inline-flex" : "none";

  // Mobiles Themen-Dropdown aktualisieren
  const filterSelect = state.root.querySelector(`#${u}-filter-select`);
  const filterSelectReset = state.root.querySelector(`#${u}-filter-select-reset`);
  if (filterSelect) {
    let activeKey = "alle";
    if (state.filters.targetGroup === "kinder") activeKey = "kinder";
    else if (state.filters.weather === "indoor") activeKey = "indoor";
    else if (state.filters.weather === "outdoor") activeKey = "outdoor";
    else if (state.filters.cost === "kostenlos") activeKey = "kostenlos";
    else if (state.filters.outlet) activeKey = "outlet";
    else if (state.filters.culinary) activeKey = "culinary";

    filterSelect.value = activeKey;
    filterSelect.classList.toggle("sw-filter-active", activeKey !== "alle");

    if (filterSelectReset) {
      filterSelectReset.style.display = activeKey !== "alle" ? "inline-flex" : "none";
    }

    const optAlle = filterSelect.querySelector('option[value="alle"]');
    const optKids = filterSelect.querySelector('option[value="kinder"]');
    const optIndoor = filterSelect.querySelector('option[value="indoor"]');
    const optOutdoor = filterSelect.querySelector('option[value="outdoor"]');
    const optFree = filterSelect.querySelector('option[value="kostenlos"]');
    const optOutlet = filterSelect.querySelector('option[value="outlet"]');
    const optCulinary = filterSelect.querySelector('option[value="culinary"]');

    const totalCount = state.allPois.length;
    if (optAlle) optAlle.textContent = `Alle Themen (${totalCount})`;
    if (optKids) { optKids.textContent = `🧸 Kinder (${kids})`; optKids.hidden = kids === 0 && activeKey !== "kinder"; }
    if (optIndoor) { optIndoor.textContent = `🏛️ Indoor (${indoor})`; optIndoor.hidden = indoor === 0 && activeKey !== "indoor"; }
    if (optOutdoor) { optOutdoor.textContent = `🌲 Outdoor (${outdoor})`; optOutdoor.hidden = outdoor === 0 && activeKey !== "outdoor"; }
    if (optFree) { optFree.textContent = `🏷️ Gratis (${free})`; optFree.hidden = free === 0 && activeKey !== "kostenlos"; }
    if (optOutlet) { optOutlet.textContent = `🛍️ Outlets (${outlet})`; optOutlet.hidden = outlet === 0 && activeKey !== "outlet"; }
    if (optCulinary) { optCulinary.textContent = `🍷 Genuss (${culinary})`; optCulinary.hidden = culinary === 0 && activeKey !== "culinary"; }
  }

  // Trefferzahlen in Cockpit, Rand-Lasche (Edge Tab) & mobilem Switcher
  const drawerCount = state.root.querySelector(`#${u}-drawer-count-title`);
  const edgeCount = state.root.querySelector(`#${u}-edge-count`);
  const mvtText = state.root.querySelector(`#${u}-mvt-text`);
  const countText = `${state.filteredPois.length}`;

  if (drawerCount) drawerCount.textContent = `Ergebnisse (${countText})`;
  if (edgeCount) edgeCount.textContent = countText;
  if (mvtText) {
    const wrapper = state.root.querySelector(`#${u}-wrapper`);
    if (wrapper && wrapper.classList.contains("sw-mobile-mode-list")) {
      mvtText.textContent = "Karte";
    } else {
      mvtText.textContent = `Sehenswürdigkeiten (${countText})`;
    }
  }
}

// ===========================================================================
// Leaflet Map & Markercluster Integration
// ===========================================================================

async function initLeafletMap(state) {
  if (state.map || state.disposed) return;
  const u = state.uid;
  const mapEl = state.root.querySelector(`#${u}-map`);
  if (!mapEl) return;

  // Leaflet-Karte initialisieren
  state.map = L.map(mapEl, {
    center: [state.lat, state.lng],
    zoom: 11,
    zoomControl: false // zoom control wird unten rechts platziert
  });

  // Home / Reset Control unten rechts
  const HomeControl = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function() {
      const container = L.DomUtil.create("div", "sw-home-control-bar leaflet-bar");
      const btn = L.DomUtil.create("button", "sw-map-home-btn", container);
      btn.type = "button";
      btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
      btn.title = `Ausgangsansicht (${escapeHtml(state.ort)}) wiederherstellen`;
      btn.setAttribute("aria-label", "Karte auf Ausgangsansicht zurücksetzen");
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.disableScrollPropagation(btn);
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        state.map.flyTo([state.lat, state.lng], 11, { duration: 0.8 });
        state.map.closePopup();
      });
      return container;
    }
  });
  // 1. Zoom-Control unten rechts (zuerst hinzufügen)
  L.control.zoom({ position: "bottomright" }).addTo(state.map);

  // 2. Home / Reset Control DANACH hinzufügen, damit Leaflet es ÜBER dem Zoom-Control einhängt!
  state.map.addControl(new HomeControl());

  // OpenStreetMap Kacheln
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(state.map);

  // Markercluster-Gruppe
  if (typeof L.markerClusterGroup === "function") {
    state.clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let sizeClass = "small";
        if (count >= 50) sizeClass = "large";
        else if (count >= 15) sizeClass = "medium";

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${sizeClass}`,
          iconSize: L.point(40, 40)
        });
      }
    });
    state.map.addLayer(state.clusterGroup);
  }

  // Zentrum / Heimatgemeinde Marker
  const centerIcon = L.divIcon({
    className: "sw-custom-svg-marker",
    html: createSvgPin("center", false, "hybrid"),
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });

  state.centerMarker = L.marker([state.lat, state.lng], { icon: centerIcon }).addTo(state.map);
  state.centerMarker.bindPopup(`
    <div class="p-1 text-center">
      <strong>${escapeHtml(state.ort)}</strong><br>
      <span class="text-muted small">Ausgangspunkt (${state.umkreis} km Umkreis)</span>
    </div>
  `);
}

function updateMapMarkers(state) {
  if (!state.map) return;
  const u = state.uid;

  if (state.clusterGroup) {
    state.clusterGroup.clearLayers();
  }
  state.markerMap.clear();

  state.filteredPois.forEach(poi => {
    if (!poi.lat || !poi.lng || isNaN(poi.lat) || isNaN(poi.lng)) return;

    const svgHtml = createSvgPin("poi", poi.isKidsFriendly, poi.weatherType, poi.isOutlet, poi.isCulinary);
    const pinIcon = L.divIcon({
      className: "sw-custom-svg-marker",
      html: svgHtml,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42]
    });

    const popupHtml = `
      <div style="min-width: 210px; max-width: 250px;">
        ${poi.imageUrl ? `<img src="${escapeHtml(poi.imageUrl)}" style="width:100%; height:90px; object-fit:cover; border-radius:6px; margin-bottom:8px;">` : ""}
        <h6 class="fw-bold mb-1" style="font-size:0.9rem;">${escapeHtml(poi.name)}</h6>
        <div class="text-muted small mb-2">${escapeHtml(poi.city || "")} ${poi.distanceKm !== null ? `&bull; <strong>${poi.distanceKm} km</strong>` : ""}</div>
        <div class="d-flex flex-wrap gap-1 mb-2">
          ${poi.isOutlet ? '<span class="badge" style="background:#c026d3; color:#fff; font-size:0.68rem;">🛍️ Outlet</span>' : ""}
          ${poi.isCulinary ? '<span class="badge" style="background:#b91c1c; color:#fff; font-size:0.68rem;">🍷 Genuss</span>' : ""}
          ${poi.isKidsFriendly ? '<span class="badge bg-warning text-dark" style="font-size:0.68rem;">🧸 Familie</span>' : ""}
          ${poi.weatherType === "indoor" ? '<span class="badge bg-primary" style="font-size:0.68rem;">🏛️ Indoor</span>' : '<span class="badge bg-success" style="font-size:0.68rem;">🌲 Outdoor</span>'}
          ${poi.isFree ? '<span class="badge bg-light text-dark border" style="font-size:0.68rem;">🏷️ Kostenlos</span>' : ""}
        </div>
        <button class="btn btn-sm btn-primary w-100 py-1" onclick="window.swOpenDetail_${u}('${escapeHtml(poi.id)}')">
          Details ansehen
        </button>
      </div>
    `;

    const marker = L.marker([poi.lat, poi.lng], { icon: pinIcon }).bindPopup(popupHtml);
    state.markerMap.set(poi.id, marker);

    if (state.clusterGroup) {
      state.clusterGroup.addLayer(marker);
    } else {
      marker.addTo(state.map);
    }
  });

  // Bounds anpassen wenn Punkte vorhanden
  if (state.filteredPois.length > 0 && state.map) {
    const validCoords = state.filteredPois.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
    if (validCoords.length > 0) {
      validCoords.push([state.lat, state.lng]);
      state.map.fitBounds(validCoords, { padding: [80, 80], maxZoom: 13 });
    }
  }
}

function focusPoiOnMap(state, poiId) {
  const marker = state.markerMap.get(poiId);
  const poi = state.allPois.find(p => p.id === poiId);
  if (!poi || !state.map) return;

  // Wenn Katalog-Modus aktiv ist, schließen
  if (state.catalogMode) {
    toggleCatalogMode(state, false);
  }

  // Auf Mobile: Listenmodus verlassen, damit Karte sichtbar wird
  exitMobileListMode(state);

  if (marker && state.clusterGroup) {
    state.clusterGroup.zoomToShowLayer(marker, () => {
      marker.openPopup();
    });
  } else if (poi.lat && poi.lng) {
    state.map.setView([poi.lat, poi.lng], 15);
  }
}

// ===========================================================================
// Trefferliste im Drawer (Links)
// ===========================================================================

function renderDrawerList(state) {
  const u = state.uid;
  const listEl = state.root.querySelector(`#${u}-drawer-list`);
  const prevBtn = state.root.querySelector(`#${u}-page-prev`);
  const nextBtn = state.root.querySelector(`#${u}-page-next`);
  const pageInfo = state.root.querySelector(`#${u}-page-info`);

  if (!listEl) return;

  const total = state.filteredPois.length;
  if (total === 0) {
    listEl.innerHTML = `
      <div class="text-center py-5 text-muted">
        <div class="h5 mb-2">Keine Treffer</div>
        <p class="small mb-0">Bitte Filtereinstellungen anpassen oder Suchbegriff ändern.</p>
      </div>
    `;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (pageInfo) pageInfo.textContent = "0 von 0";
    return;
  }

  const startIdx = state.page * state.pageSize;
  const pagePois = state.filteredPois.slice(startIdx, startIdx + state.pageSize);
  const totalPages = Math.ceil(total / state.pageSize);

  if (pageInfo) pageInfo.textContent = `Seite ${state.page + 1} von ${totalPages}`;
  if (prevBtn) prevBtn.disabled = state.page === 0;
  if (nextBtn) nextBtn.disabled = state.page >= totalPages - 1;

  let html = "";
  pagePois.forEach(poi => {
    html += `
      <div class="sw-clean-card" onclick="window.swFocusPoi_${u}('${escapeHtml(poi.id)}')">
        ${poi.imageUrl ? `
          <img src="${escapeHtml(poi.imageUrl)}" class="sw-card-thumb" alt="${escapeHtml(poi.name)}" loading="lazy">
        ` : `
          <div class="sw-card-thumb-placeholder">🏛️</div>
        `}
        <div class="sw-card-content">
          <div>
            <div class="sw-card-heading" title="${escapeHtml(poi.name)}">${escapeHtml(poi.name)}</div>
            <div class="sw-card-meta">
              ${poi.city ? escapeHtml(poi.city) : ""} ${poi.distanceKm !== null ? `&bull; <strong>${poi.distanceKm} km</strong>` : ""}
            </div>
            <div class="sw-badge-row">
              ${poi.isOutlet ? '<span class="sw-tag-badge sw-tag-outlet">🛍️ Outlet</span>' : ""}
              ${poi.isCulinary ? '<span class="sw-tag-badge sw-tag-culinary">🍷 Genuss</span>' : ""}
              ${poi.isKidsFriendly ? '<span class="sw-tag-badge sw-tag-kids">🧸 Familie</span>' : ""}
              ${poi.weatherType === "indoor" ? '<span class="sw-tag-badge sw-tag-indoor">🏛️ Indoor</span>' : '<span class="sw-tag-badge sw-tag-outdoor">🌲 Outdoor</span>'}
              ${poi.isFree ? '<span class="sw-tag-badge sw-tag-free">🏷️ Kostenlos</span>' : ""}
            </div>
          </div>
          <div class="sw-card-btn-row">
            <button class="sw-btn-detail-link" onclick="event.stopPropagation(); window.swOpenDetail_${u}('${escapeHtml(poi.id)}')">
              Details ansehen &raquo;
            </button>
          </div>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
  listEl.scrollTop = 0;
}

// ===========================================================================
// Vollbild-Katalog-Modus (3-Spalten-Gitter)
// ===========================================================================

function renderCatalogGrid(state) {
  const u = state.uid;
  const gridEl = state.root.querySelector(`#${u}-catalog-grid`);
  const titleEl = state.root.querySelector(`#${u}-catalog-title`);

  if (!gridEl) return;

  const total = state.filteredPois.length;
  if (titleEl) titleEl.textContent = `Sehenswürdigkeiten Katalog (${total})`;

  if (total === 0) {
    gridEl.innerHTML = `
      <div class="text-center py-5 text-muted col-12">
        <div class="h4 mb-2">Keine Sehenswürdigkeiten gefunden</div>
        <p class="small mb-0">Bitte Filtereinstellungen anpassen.</p>
      </div>
    `;
    return;
  }

  let html = "";
  // Zeige im Katalog bis zu 60 Ziele auf einmal
  const catalogPois = state.filteredPois.slice(0, 60);

  catalogPois.forEach((poi, idx) => {
    html += `
      <div class="sw-catalog-card" role="button" tabindex="0" onclick="window.swOpenDetail_${u}('${escapeHtml(poi.id)}')">
        <div class="sw-catalog-img-wrap">
          ${poi.imageUrl ? `
            <img src="${escapeHtml(poi.imageUrl)}" class="sw-catalog-img" alt="${escapeHtml(poi.name)}" ${idx < 12 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'} onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted fs-1\\'>🏛️</div>'">
          ` : `
            <div class="w-100 h-100 d-flex align-items-center justify-content-center bg-light text-muted fs-1">🏛️</div>
          `}
          ${poi.distanceKm !== null ? `
            <span class="sw-catalog-dist-badge">${poi.distanceKm} km</span>
          ` : ""}
        </div>
        <div class="sw-catalog-body">
          <h3 class="sw-catalog-card-title">${escapeHtml(poi.name)}</h3>
          <div class="text-muted small mb-2">${poi.city ? escapeHtml(poi.city) : ""} ${poi.region ? `(${escapeHtml(poi.region)})` : ""}</div>
          <p class="sw-catalog-card-desc">${escapeHtml(poi.description || "Keine Kurzbeschreibung verfügbar.")}</p>
          <div class="sw-badge-row">
            ${poi.isOutlet ? '<span class="sw-tag-badge sw-tag-outlet">🛍️ Outlet</span>' : ""}
            ${poi.isCulinary ? '<span class="sw-tag-badge sw-tag-culinary">🍷 Genuss</span>' : ""}
            ${poi.isKidsFriendly ? '<span class="sw-tag-badge sw-tag-kids">🧸 Familie</span>' : ""}
            ${poi.weatherType === "indoor" ? '<span class="sw-tag-badge sw-tag-indoor">🏛️ Indoor</span>' : '<span class="sw-tag-badge sw-tag-outdoor">🌲 Outdoor</span>'}
            ${poi.isFree ? '<span class="sw-tag-badge sw-tag-free">🏷️ Kostenlos</span>' : ""}
          </div>
          <div class="sw-catalog-actions">
            <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="event.stopPropagation(); window.swFocusPoi_${u}('${escapeHtml(poi.id)}')">
              Auf Karte
            </button>
            <button class="btn btn-sm btn-primary flex-grow-1" onclick="event.stopPropagation(); window.swOpenDetail_${u}('${escapeHtml(poi.id)}')">
              Details
            </button>
          </div>
        </div>
      </div>
    `;
  });

  gridEl.innerHTML = html;
}

// ===========================================================================
// Detail-Modal & ODTA JSON-LD Export (Option 3A: Vollbild/XL Hero)
// ===========================================================================

function openDetailModal(state, poiId) {
  const poi = state.allPois.find(p => p.id === poiId);
  if (!poi) return;
  const u = state.uid;

  const modalEl = document.getElementById(`${u}-detail-modal`);
  const modalContent = document.getElementById(`${u}-detail-modal-content`);
  if (!modalEl || !modalContent) return;

  const rawJson = JSON.stringify(poi.raw || {}, null, 2);

  modalContent.innerHTML = `
    ${poi.imageUrl ? `
      <div class="sw-detail-hero-wrap" id="${u}-detail-hero" style="cursor: pointer;" title="Tippen für Vollbild-Galerie">
        <img src="${escapeHtml(poi.imageUrl)}" class="sw-detail-hero-img" alt="${escapeHtml(poi.name)}">
        <div class="sw-detail-hero-gradient"></div>
        <button type="button" class="sw-detail-close-btn" data-bs-dismiss="modal" aria-label="Schließen" title="Schließen">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="sw-detail-hero-gallery-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <span>${(poi.images && poi.images.length > 1) ? `1 von ${poi.images.length} Fotos` : "Vollbildansicht"}</span>
          <span class="sw-gallery-zoom-hint">🔍</span>
        </div>
        <div class="sw-detail-hero-caption">
          <h2 class="sw-detail-hero-title">${escapeHtml(poi.name)}</h2>
          <div class="sw-detail-hero-subtitle">
            ${poi.city ? escapeHtml(poi.city) : ""} ${poi.region ? `(${escapeHtml(poi.region)})` : ""}
            ${poi.distanceKm !== null ? ` &bull; <strong>${poi.distanceKm} km entfernt</strong>` : ""}
          </div>
        </div>
        ${poi.imageCopyright || poi.imageLicense ? `
          <div class="sw-detail-hero-license">
            Bild: ${escapeHtml(poi.imageCopyright || "DZT")} ${poi.imageLicense ? `(${escapeHtml(poi.imageLicense)})` : ""}
          </div>
        ` : ""}
      </div>
    ` : `
      <div class="modal-header border-0 pb-0">
        <h3 class="modal-title fw-bold text-truncate pe-3">${escapeHtml(poi.name)}</h3>
        <button type="button" class="sw-detail-close-btn sw-detail-close-btn-inline" data-bs-dismiss="modal" aria-label="Schließen" title="Schließen">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `}

    <div class="modal-body p-4">
      <div class="d-flex flex-wrap gap-2 mb-4">
        ${poi.isOutlet ? '<span class="badge px-2.5 py-1.5 fs-6 fw-semibold" style="background:#c026d3; color:#fff;">🛍️ Outlet & Werksverkauf</span>' : ""}
        ${poi.isCulinary ? '<span class="badge px-2.5 py-1.5 fs-6 fw-semibold" style="background:#b91c1c; color:#fff;">🍷 Genuss & Brauerei/Weingut</span>' : ""}
        ${poi.isKidsFriendly ? '<span class="badge bg-warning text-dark px-2.5 py-1.5 fs-6 fw-semibold">🧸 Kinder- & Familienziel</span>' : ""}
        ${poi.weatherType === "indoor" ? '<span class="badge bg-primary px-2.5 py-1.5 fs-6 fw-semibold">🏛️ Wetterfest (Indoor)</span>' : '<span class="badge bg-success px-2.5 py-1.5 fs-6 fw-semibold">🌲 Freiluft (Outdoor)</span>'}
        ${poi.isFree ? '<span class="badge bg-light text-dark border px-2.5 py-1.5 fs-6 fw-semibold">🏷️ Kostenloser Eintritt</span>' : ""}
      </div>

      <div class="mb-4">
        <h5 class="fw-bold mb-2">Über dieses Ausflugsziel</h5>
        <p class="text-secondary fs-6" style="line-height: 1.7;">
          ${escapeHtml(poi.description || "Für dieses Ziel liegt im DZT Knowledge Graph keine ausführliche Beschreibung vor.")}
        </p>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6">
          <div class="p-3 bg-light rounded-3 h-100">
            <h6 class="fw-bold mb-2">Adresse & Lage</h6>
            <div class="small text-muted">
              ${poi.street ? `<div>${escapeHtml(poi.street)}</div>` : ""}
              ${poi.postalCode || poi.city ? `<div>${escapeHtml(poi.postalCode || "")} ${escapeHtml(poi.city || "")}</div>` : ""}
              ${poi.region ? `<div>${escapeHtml(poi.region)}</div>` : ""}
              ${poi.distanceKm !== null ? `<div class="mt-2 text-primary fw-semibold">&bull; ${poi.distanceKm} km von ${escapeHtml(state.ort)} entfernt</div>` : ""}
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="p-3 bg-light rounded-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <h6 class="fw-bold mb-2">Anreise & Navigation</h6>
              <p class="small text-muted mb-2">Route in externer Karten-App öffnen:</p>
            </div>
            ${(poi.lat && poi.lng) ? `
              <a href="https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}" 
                 target="_blank" rel="noopener noreferrer" 
                 class="btn btn-sm btn-outline-secondary w-100 d-inline-flex align-items-center justify-content-center gap-1">
                <span>Google Maps Route</span> <span>↗</span>
              </a>
            ` : `<button class="btn btn-sm btn-outline-secondary w-100" disabled>Keine Koordinaten</button>`}
          </div>
        </div>
      </div>

      <!-- ODTA Rohdaten Akkordeon -->
      <div class="accordion mb-2" id="${u}-accordion-raw">
        <div class="accordion-item border-0 bg-light rounded-3">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed bg-light rounded-3 py-2 px-3 small fw-semibold text-muted" type="button" data-bs-toggle="collapse" data-bs-target="#${u}-collapse-raw">
              <span>{ } ODTA / schema.org Rohdaten (JSON-LD)</span>
            </button>
          </h2>
          <div id="${u}-collapse-raw" class="accordion-collapse collapse" data-bs-parent="#${u}-accordion-raw">
            <div class="accordion-body p-2">
              <pre class="p-2 mb-2 bg-white rounded border small" style="max-height: 200px; overflow-y: auto;"><code>${escapeHtml(rawJson)}</code></pre>
              <button class="btn btn-sm btn-outline-secondary py-1" onclick="navigator.clipboard.writeText(${JSON.stringify(rawJson)}); this.textContent='Kopiert!';">
                In Zwischenablage kopieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer border-0 bg-light d-flex justify-content-between p-3">
      <button type="button" class="btn btn-primary d-inline-flex align-items-center gap-2 px-3" id="${u}-detail-show-on-map">
        <span>Auf Karte anzeigen</span>
      </button>
      <button type="button" class="btn btn-outline-secondary px-3" data-bs-dismiss="modal">Schließen</button>
    </div>
  `;

  if (window.bootstrap && window.bootstrap.Modal) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);

    const showOnMapBtn = modalContent.querySelector(`#${u}-detail-show-on-map`);
    if (showOnMapBtn) {
      showOnMapBtn.addEventListener("click", () => {
        // Modal schließen
        modal.hide();
        // Falls im Katalogmodus, zur Karte wechseln
        if (state.catalogMode) {
          toggleCatalogMode(state, false);
        }
        // Cockpit öffnen falls eingeklappt
        if (typeof state.setCockpitState === "function") {
          state.setCockpitState(false);
        }
        // Marker zentrieren und Popup öffnen
        focusPoiOnMap(state, poi.id);
      });
    }

    const closeBtns = modalContent.querySelectorAll(".sw-detail-close-btn");
    closeBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
      });
    });

    const heroWrap = modalContent.querySelector(`#${u}-detail-hero`);
    if (heroWrap) {
      heroWrap.addEventListener("click", (e) => {
        if (e.target.closest(".sw-detail-close-btn") || e.target.closest(".sw-detail-hero-close") || e.target.closest(".btn-close")) return;
        openLightbox(poi, 0);
      });
    }

    modal.show();
  }
}

// ===========================================================================
// Vollbild-Bildergalerie / Lightbox (Entscheidung 2A)
// ===========================================================================

function openLightbox(poi, initialIndex = 0) {
  const images = (poi.images && poi.images.length > 0)
    ? poi.images
    : (poi.imageUrl ? [{ url: poi.imageUrl, license: poi.imageLicense, copyright: poi.imageCopyright }] : []);

  if (images.length === 0) return;

  let currentIndex = initialIndex;
  if (currentIndex < 0 || currentIndex >= images.length) currentIndex = 0;

  // Vorhandenes Lightbox-Element entfernen falls vorhanden
  const existing = document.getElementById("sw-lightbox-overlay");
  if (existing) existing.remove();

  const lightbox = document.createElement("div");
  lightbox.id = "sw-lightbox-overlay";
  lightbox.className = "sw-lightbox-overlay";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-label", "Vollbild Galerie");
  lightbox.innerHTML = `
    <div class="sw-lightbox-backdrop"></div>
    <div class="sw-lightbox-top-bar">
      <div class="sw-lightbox-counter">${images.length > 1 ? `${currentIndex + 1} / ${images.length}` : ""}</div>
      <button class="sw-lightbox-close-btn" aria-label="Schließen" title="Schließen (Esc)">✕</button>
    </div>
    <div class="sw-lightbox-content">
      ${images.length > 1 ? `<button class="sw-lightbox-nav-btn sw-lightbox-prev" aria-label="Vorheriges Bild" title="Vorheriges Bild (Pfeiltaste links)">‹</button>` : ""}
      <div class="sw-lightbox-img-container">
        <img src="${escapeHtml(images[currentIndex].url)}" class="sw-lightbox-img" alt="${escapeHtml(poi.name)}" />
      </div>
      ${images.length > 1 ? `<button class="sw-lightbox-nav-btn sw-lightbox-next" aria-label="Nächstes Bild" title="Nächstes Bild (Pfeiltaste rechts)">›</button>` : ""}
    </div>
    <div class="sw-lightbox-bottom-bar">
      <div class="sw-lightbox-title">${escapeHtml(poi.name)}</div>
      <div class="sw-lightbox-caption">
        ${(images[currentIndex].copyright || images[currentIndex].license) ? `Bild: ${escapeHtml(images[currentIndex].copyright || "DZT")} ${images[currentIndex].license ? `(${escapeHtml(images[currentIndex].license)})` : ""}` : ""}
      </div>
    </div>
  `;

  document.body.appendChild(lightbox);
  // Sanftes Einblenden via requestAnimationFrame
  requestAnimationFrame(() => lightbox.classList.add("sw-lightbox-open"));

  // Alle Bilder des POIs vorab im Hintergrund laden & decodieren (kein Flackern)
  images.forEach((img) => {
    if (img && img.url) {
      const pre = new Image();
      pre.src = img.url;
      if (pre.decode) pre.decode().catch(() => {});
    }
  });

  let isTransitioning = false;

  function updateImage(idx, direction = 1) {
    if (isTransitioning) return;
    if (idx < 0) idx = images.length - 1;
    if (idx >= images.length) idx = 0;
    if (idx === currentIndex) return;

    const imgEl = lightbox.querySelector(".sw-lightbox-img");
    const counterEl = lightbox.querySelector(".sw-lightbox-counter");
    const captionEl = lightbox.querySelector(".sw-lightbox-caption");

    if (!imgEl) {
      currentIndex = idx;
      return;
    }

    isTransitioning = true;
    const slideOutClass = direction > 0 ? "sw-img-slide-out-left" : "sw-img-slide-out-right";
    const slideInClass = direction > 0 ? "sw-img-slide-in-right" : "sw-img-slide-in-left";

    // 1. Altes Bild gleitet weich aus
    imgEl.classList.add(slideOutClass);

    // 2. Neues Bild vorab decodieren, damit die Dimensionen sofort stabil sind
    const nextItem = images[idx];
    const tempImg = new Image();
    tempImg.src = nextItem.url;

    const applyNewImage = () => {
      currentIndex = idx;
      imgEl.src = nextItem.url;
      if (counterEl && images.length > 1) {
        counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
      }
      if (captionEl) {
        captionEl.textContent = (nextItem.copyright || nextItem.license)
          ? `Bild: ${escapeHtml(nextItem.copyright || "DZT")} ${nextItem.license ? `(${escapeHtml(nextItem.license)})` : ""}`
          : "";
      }

      // Sofortige Positionierung am Einstiegspunkt ohne Transition
      imgEl.style.transition = "none";
      imgEl.classList.remove(slideOutClass);
      imgEl.classList.add(slideInClass);
      void imgEl.offsetWidth; // Layout-Reflow erzwingen

      // Double-RAF: Stellt sicher, dass der Browser die Startposition vor der Transition rendert
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          imgEl.style.transition = "";
          imgEl.classList.remove(slideInClass);
          setTimeout(() => {
            isTransitioning = false;
          }, 220);
        });
      });
    };

    // Nach dem Ausblenden (120ms) das neue, decodierte Bild einblenden
    setTimeout(() => {
      if (tempImg.decode) {
        tempImg.decode().then(applyNewImage).catch(applyNewImage);
      } else if (tempImg.complete) {
        applyNewImage();
      } else {
        tempImg.onload = applyNewImage;
        tempImg.onerror = applyNewImage;
      }
    }, 120);
  }

  function closeLightbox() {
    lightbox.classList.remove("sw-lightbox-open");
    document.removeEventListener("keydown", handleKeydown);
    setTimeout(() => {
      if (lightbox && lightbox.parentNode) lightbox.remove();
    }, 250);
  }

  function handleKeydown(e) {
    if (e.key === "Escape") {
      closeLightbox();
    } else if (e.key === "ArrowLeft" && images.length > 1) {
      updateImage(currentIndex - 1, -1);
    } else if (e.key === "ArrowRight" && images.length > 1) {
      updateImage(currentIndex + 1, 1);
    }
  }

  document.addEventListener("keydown", handleKeydown);

  // Buttons & Backdrop
  const closeBtn = lightbox.querySelector(".sw-lightbox-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeLightbox();
    });
  }

  const backdrop = lightbox.querySelector(".sw-lightbox-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", closeLightbox);
  }

  const prevBtn = lightbox.querySelector(".sw-lightbox-prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateImage(currentIndex - 1, -1);
    });
  }

  const nextBtn = lightbox.querySelector(".sw-lightbox-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateImage(currentIndex + 1, 1);
    });
  }

  // Mobile Touch/Swipe Gesten (Option 2A & 3A)
  let touchStartX = 0;
  let touchStartY = 0;
  lightbox.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    if (e.changedTouches && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0 && images.length > 1) {
          updateImage(currentIndex + 1, 1);
        } else if (deltaX > 0 && images.length > 1) {
          updateImage(currentIndex - 1, -1);
        }
      }
    }
  }, { passive: true });
}

// ===========================================================================
// Dynamischer QR-Code Generator & Modal (Option 4A)
// ===========================================================================

async function openQrModal(state) {
  let modalEl = document.getElementById("sw-qr-modal");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.className = "modal fade sw-qr-modal";
    modalEl.id = "sw-qr-modal";
    modalEl.tabIndex = -1;
    modalEl.setAttribute("aria-hidden", "true");
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 shadow-lg text-center sw-qr-modal-content">
          <div class="modal-header border-0 pb-0 justify-content-end">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
          </div>
          <div class="modal-body px-4 pt-1 pb-4" id="sw-qr-modal-body"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  const modalBody = modalEl.querySelector("#sw-qr-modal-body");
  if (!modalBody) return;

  try {
    await ensureQrCodeLoaded();
  } catch (err) {
    console.warn("QR code library load error:", err);
  }

  // URL dynamisch aus aktueller Instanz erzeugen (immer mit #startseite)
  const currentUrl = window.location.href.split("#")[0] + "#startseite";

  let svgHtml = "";
  if (typeof window.qrcode === "function") {
    try {
      const qr = window.qrcode(0, "M");
      qr.addData(currentUrl);
      qr.make();
      svgHtml = qr.createSvgTag({ scalable: true });
    } catch (e) {
      console.error("QR generation failed:", e);
    }
  }

  modalBody.innerHTML = `
    <div class="sw-qr-icon-wrap">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
        <line x1="12" y1="18" x2="12.01" y2="18"></line>
      </svg>
    </div>
    <h3 class="h5 fw-bold text-dark mt-2 mb-1">Auf Smartphone öffnen</h3>
    <p class="small text-secondary mb-3" style="line-height: 1.4;">
      Scanne den QR-Code mit der Smartphone-Kamera, um diese Sehenswürdigkeiten-Ansicht direkt mobil aufzurufen.
    </p>
    <div class="sw-qr-svg-card mb-3">
      ${svgHtml || '<div class="text-danger small">QR-Code konnte nicht geladen werden</div>'}
    </div>
    <div class="d-flex flex-column gap-2 mt-1">
      <button class="btn btn-primary rounded-pill py-2 px-3 fw-semibold d-inline-flex align-items-center justify-content-center gap-2" id="sw-qr-copy-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span id="sw-qr-copy-text">Link kopieren</span>
      </button>
      <span class="text-muted text-truncate px-2" style="font-size: 0.75rem;" title="${escapeHtml(currentUrl)}">
        ${escapeHtml(currentUrl)}
      </span>
    </div>
  `;

  const copyBtn = document.getElementById("sw-qr-copy-btn");
  const copyText = document.getElementById("sw-qr-copy-text");
  if (copyBtn && copyText) {
    copyBtn.addEventListener("click", () => {
      const finish = () => {
        copyText.textContent = "Kopiert! ✓";
        setTimeout(() => {
          const t = document.getElementById("sw-qr-copy-text");
          if (t) t.textContent = "Link kopieren";
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentUrl).then(finish).catch(() => {
          fallbackClipboardCopy(currentUrl);
          finish();
        });
      } else {
        fallbackClipboardCopy(currentUrl);
        finish();
      }
    });
  }

  if (window.bootstrap && window.bootstrap.Modal) {
    const modalInst = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modalInst.show();
  }
}

function fallbackClipboardCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch (_) {}
}

function ensureQrNavMenuItem(state) {
  if (typeof document === "undefined" || !document.querySelector) return;
  const navList = document.querySelector("#offcanvasNavbar .navbar-nav");
  if (!navList) return;
  if (navList.querySelector(".sw-nav-item-qr")) return;

  const qrLi = document.createElement("li");
  qrLi.className = "nav-item sw-nav-item-qr";
  qrLi.innerHTML = `
    <a class="nav-link sw-nav-link-qr" href="#" role="button" aria-label="Auf Smartphone öffnen">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="me-2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
        <line x1="12" y1="18" x2="12.01" y2="18"></line>
      </svg>
      <span>Auf Smartphone öffnen</span>
    </a>
  `;
  const link = qrLi.querySelector("a");
  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const offcanvasEl = document.getElementById("offcanvasNavbar");
      if (offcanvasEl && window.bootstrap && window.bootstrap.Offcanvas) {
        const oc = window.bootstrap.Offcanvas.getInstance(offcanvasEl);
        if (oc) oc.hide();
      }
      openQrModal(state || window.__swCachedState);
    });
  }
  navList.appendChild(qrLi);
}

// Globales Offcanvas & Burger-Menü Setup
if (typeof document !== "undefined") {
  const initGlobalMenu = () => {
    ensureGlobalOffcanvasSetup();
    ensureQrNavMenuItem();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalMenu);
  } else {
    initGlobalMenu();
  }

  // Vor dem Öffnen in der Capture-Phase sicherstellen, dass das Offcanvas an document.body liegt
  document.addEventListener("click", (e) => {
    const toggler = e.target.closest('[data-bs-toggle="offcanvas"][data-bs-target="#offcanvasNavbar"], .navbar-toggler');
    if (toggler) {
      ensureGlobalOffcanvasSetup();
    }
  }, true);
}

// ===========================================================================
// Hilfsfunktionen & Error Rendering
// ===========================================================================

function renderErrorMessage(state, message) {
  const u = state.uid;
  state.root.innerHTML = `
    <div class="container py-5 text-center">
      <div class="alert alert-danger shadow-sm d-inline-block p-4" style="max-width: 600px;">
        <h4 class="alert-heading fw-bold mb-2">Sehenswürdigkeiten konnten nicht geladen werden</h4>
        <p class="mb-3">${escapeHtml(message)}</p>
        <hr>
        <p class="small mb-0 text-muted">Prüfen Sie die Internetverbindung oder die Instanz-Konfiguration im Open Data App Store.</p>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * ODAS Lifecycle Contract: Called by app-base.js on DOMContentLoaded.
 * Vendor libraries (Leaflet, MarkerCluster) are loaded dynamically in ensureLeafletAndCluster().
 */
function addToHead() {
  return "";
}

