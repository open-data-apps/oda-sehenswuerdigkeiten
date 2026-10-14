# Changelog – Sehenswürdigkeiten

Alle wichtigen Änderungen an dieser Open Data App werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/) und diese App folgt [Semantic Versioning](https://semver.org/lang/de/).

## 1.8.11 - 2026-10-14
- FIX: Entfernungssortierung robuster: `ORDER BY ASC(COALESCE(<Abstand>, 1e9))` statt `DESC(BOUND(?lat))`; Ziele mit fehlenden **oder nicht numerischen** Koordinaten landen am Ende (ein Ausdrucksfehler sortierte in SPARQL bisher vor alle Zahlen). Gemessen am DZT-Endpunkt: HTTP 200, Entfernungen aufsteigend, Antwortzeit unverändert.
- CHORE: Ungenutzte Bibliothek `app/vendor/chartjs/` entfernt; fehlende MIT-Lizenzdatei `app/vendor/qrcode/LICENSE` ergänzt (Hash laut Vendor-Manifest).

## 1.8.10 - 2026-10-14
- FEAT: Mit Koordinaten sortiert die DZT-Abfrage nach Entfernung (Ziele ohne Koordinaten am Ende); geladen werden die nächstgelegenen 300 der gelieferten Treffer statt einer zufälligen Auswahl. Grenze, Paging und Antwortzeit unverändert (gemessen: Freiburg 25 km – die 300 liegen jetzt innerhalb von 2 km statt Median 17 km).
- FIX: Hinweis, Methodik und README benennen, dass die DZT-Umkreissuche zwischen Abrufen wechselnde Treffer liefern kann.
- CHANGE: Sitzungs-Cache-Schlüssel `v3`, damit zwischengespeicherte unsortierte Ergebnisse nicht weiterverwendet werden.

## 1.8.9 - 2026-10-14
- FIX: Ergebnisumfang transparent: Cockpit nennt „Geladen“ und „Passend zum Filter“, der Foto-Katalog „angezeigt von gefiltert · geladen“ (höchstens 60 Karten); Hinweis, dass die DZT-Abfrage höchstens 300 Datensätze lädt, die Quelle die Auswahl bestimmt (nicht zwingend die nächstgelegenen, wechselnd zwischen Abrufen) und keine vollständige Erfassung vorliegt. Abfrage, Grenzen und Paging unverändert.
- FIX: Leere Quelle („Keine Sehenswürdigkeiten geladen“) und leerer Filter („Keine Treffer“) werden in der Liste unterschieden; solange noch geladen wird, zeigen Hinweis, Liste und Katalog „Daten werden geladen …“ statt einer Leermeldung.
- CHANGE: DZT-Quellenwahl für Abruf und Fehleranzeige in `resolveSwDztSource()` zusammengeführt (Auswahl unverändert); die Fehleranzeige nennt jetzt den tatsächlich abgefragten DZT-Endpunkt, auch wenn ein Eintrag einen anderen Host enthält.
- DOCS: Beschreibung um Methodik mit 300/60-Grenzen ergänzt, Portal-Ebene „Open Data Germany“; lokale Config spiegelt die Paketbeschreibung (SPARQL-Endpunkt statt Query API v2); `kpiKontext1` beschreibt den geladenen Bestand; Link „Open Data Apps auf GitHub“ ergänzt; README: `apiurls` optional mit Standard-Endpunkt, vollständiger Testbefehl.
- TEST: `tests/result-scope.test.cjs` und `tests/source-config.test.cjs` gegen die ausgelieferte `app/app.js` und die Paketdateien.

## 1.8.8 - 2026-10-13
- FIX: Standard-Fehleranzeige gibt präzisere Tipps: ein „Failed to fetch“ ohne Proxy-Kontext erhält einen Netzwerk-Hinweis statt `proxyAktiv`; der 404-Hinweis gilt nur noch für echte HTTP-404-Antworten und nennt den lokal fehlenden Proxy/Relay statt pauschal „Datensatz auf dem Portal nicht gefunden“.

## 1.8.7 - 2026-10-13
- FIX: Fehler beim Laden zeigen die Portfolio-Standardfehleranzeige (renderOdasFehler, E0–E15) mit der tatsächlich genutzten SPARQL-Quelle statt einer eigenen Fehlerbox.
- FIX: Gemeindeverzeichnis als dokumentierter Lazy-Singleton; der Burladingen-Ausweichwert wird nicht mehr dauerhaft gecacht.
- CHORE: Ungenutzten Konfigurationsschalter `proxyAktiv` entfernt – DZT-Daten laufen immer über den Store-Relay `/dzt`.

## 1.8.6 - 2026-10-13
- PERF: R2-014: DZT-Abfrage wertet die Umkreissuche zuerst als Unterabfrage aus und prüft erst danach die Objekttypen; am DZT-Endpunkt ca. 13 s → 4 s bei gleichem Ergebnisumfang. Ohne Koordinaten bleibt die Abfrage unverändert.
- TEST: Aufbau der DZT-Abfrage mit und ohne Umkreis geprüft.

## 1.8.5 - 2026-10-09
- FIX: Burger-Menü verwendet die native Bootstrap-Transition statt einer abrupt anlaufenden eigenen Kurve; reduzierte Bewegung wird nicht mehr durch `!important` überschrieben.
- TEST: Opt-in-Browserregression für native Menütransition und reduzierte Bewegung ergänzt.

## 1.8.4 - 2026-10-08
- FIX: F-127: Katalogkarten per Enter/Leertaste aktivieren; Tastaturlistener instanzgebunden abbauen.
- DOC: F-128: Direkte Kachel-/Bild-/Nominatimkontakte, IP-/Headerübertragung, Store-Relay und Sitzungscache in Paket, lokaler Config und README klar unterscheiden.
- FIX: F-112: Unbekannte Antwortstrukturen als Formatfehler statt als leere Daten anzeigen; bekannte leere Listen bleiben gültig.
- FIX: F-111: Lokale Demo aus dem gelieferten ../assets-Pfad laden; alternativen Assetpfad weiter unterstützen. Demo-Fallback ausschließlich auf localhost/127.0.0.1, nicht nach Produktivfehlern.

## 1.8.3 - 2026-10-08
- FIX: F-113: Instanz vor dem Geocoding registrieren; veraltete Geocode-/Vendor-/Datenantworten dürfen Unterseiten und Instanzzustand nicht ersetzen. Veraltete Datenantworten schreiben nicht mehr in den DZT-Daten-Cache.
- FIX: F-113: Eigene Lightbox samt Tastaturlistener, Bootstrap-Dialoge und Backdrops beim Verlassen entfernen. Eigene Modals ohne Fade, damit keine Übergangs-Callbacks auf bereits freigegebene Instanzen zugreifen.
- FIX: F-114: Erhaltener Wrapper gilt nur für denselben Container und dieselbe Konfiguration; Session-Daten-Cache zusätzlich an die Quelle binden. Fertig geladene Filter/Karte bleiben bei unveränderter Rückkehr erhalten.

## 1.8.2 - 2026-10-02
- ENH: Verwendete ODAS-Dienste in `odas-services` deklariert.

## 1.8.1 - 2026-09-29

### Behoben
- **XSS über Inline-JavaScript geschlossen (Audit F-110):**
  - POI-IDs und Rohdaten-JSON werden nicht mehr in `onclick`-Attributen eingesetzt; stattdessen HTML-escapade `data-sw-action`-/`data-sw-poi-id`-Attribute mit delegiertem Klick-Handler (`registerSwActionHandler`).
  - Kopier-Button „In Zwischenablage kopieren" nutzt `data-sw-copy` statt `JSON.stringify` im Attribut; Kopieren funktioniert damit für alle Datensätze wieder (zuvor Syntaxfehler).
  - Neue Regressionstests: `tests/test_inline_js_sinks.js`.

## 1.8.0 - 2026-09-17

### Hinzugefügt & Verbessert
- **Intelligente 3-Stufen-Geocoding Engine (Option 1C):**
  - Ortsname genügt: Die Eingabe von geografischen Koordinaten ist nicht mehr zwingend erforderlich.
  - *Stufe 1 (Experten-Override):* Manuell eingetragene Koordinaten werden vorrangig genutzt.
  - *Stufe 2 (Offline-Lookup):* Integriertes Gemeindeverzeichnis (`assets/gemeinden.json`) löst über 240 Städte und Gemeinden in Baden-Württemberg und Deutschland sofort (0 ms Latenz) und 100 % DSGVO-konform ohne externen Serveraufruf auf.
  - *Stufe 3 (Online-Fallback):* Unbekannte Orte oder Stadtteile werden automatisiert über OpenStreetMap Nominatim geocodiert und im `sessionStorage` zwischengespeichert.
  - `latitude` und `longitude` in `app-package.json` auf optional gesetzt (`erforderlich: nein`).
- **Ruckelfreie Vollbildmodus-Bilderanimation (Pre-Decode & Smooth Transition):**
  - Vorab-Decodierung (`Image.decode()`) aller POI-Bilder beim Öffnen der Lightbox im Grafikspeicher.
  - Bildwechsel erfolgt erst nach erfolgreichem Decodieren mit Double-RAF und `translate3d`-Hardwarebeschleunigung.
  - Beseitigt das kurzzeitige Kollabieren/Springen der Bildgröße (Reflow-Jitter) beim Durchblättern von Fotos vollständig.
- **Mobiles Burger-Menü Bereinigung:**
  - Auf Smartphones (< 768px Displaybreite) wird der redundante Menüeintrag `[ 📱 Auf Smartphone öffnen ]` per Media-Query automatisch ausgeblendet, da der Nutzer sich bereits auf dem Mobilgerät befindet.

## 1.7.2 - 2026-09-17

### Behoben & Verbessert
- **Sekundärseiten Mobile-Header & Zurück-Button:**
  - Auf Smartphones überlappt der obere Zurück-Button nun nicht mehr mit der Überschrift (`position: static`, saubere vertikale Abstände).
  - Dezent-edles Glassmorphism-Pill-Design (`#f8fafc`, zarter Rahmen, kontrastreicher Text) fügt sich harmonisch in das UI ein.
  - Der redundante untere Zurück-Button am Seitenende wurde vollständig entfernt.
- **Detail-Modal Schließen-Button:**
  - Maßgeschneiderter runder Glassmorphism-Button mit gestochen scharfem SVG-Kreuz ersetzt Bootstraps unberechenbares `.btn-close`.
  - Konsistente Optik über alle Zustände (Normal, Hover, Fokus, Active) ohne asymmetrischen blauen Bootstrap-Glow.
- **Hover auf „Details ansehen »“ (Desktop):**
  - Störender grüner Hintergrund (`#2e6f72` aus geerbtem Branding-CSS) wurde entfernt.
  - Subtiles, stimmiges Hellblau (`#eff6ff`) mit klarem blauem Link-Text gewährleistet perfekte Lesbarkeit.

## 1.7.1 - 2026-09-17

### Behoben & Verbessert
- **Session-Storage Caching für DZT-Rohdaten:**
  - POIs werden nach dem Erstabruf sicher und datenschutzkonform im `sessionStorage` (`sw_dzt_cache_v1_*`) hinterlegt (2 Stunden TTL).
  - Beseitigt mehrsekündige Ladezeiten bei Kaltstarts und Seiten-Reloads auf Smartphones und Desktop drastisch – wiederholte Aufrufe laden in wenigen Millisekunden.
- **Radius-Auswahl & Fallback-Handling:**
  - In `app-package.json` wurde der Radius-Konfigurationsfehler behoben: Dropdown-Optionen für `umkreis` sind nun normgerechte flache String-Arrays (`["5", "10", "25", "50", "100"]`) anstelle von Objekten.
  - In `app/app.js` wird robuster Fallback für sowohl `configdata.umkreis` als auch `configdata.radiusKm` unterstützt.
- **Vollständige app-package.json Normierung:**
  - Alle `instanz-config`-Kategorien strikt auf die 5 kontrollierten ODAS-Standards (`allgemein`, `beschreibung`, `kontakt-rechtliches`, `datenherkunft`, `sonstiges`) umgestellt.
  - Standardisiertes `apiurls`-Array-Schema mit benannter `dztsparql`-Ressource.
  - `branding-css: ""` auf Top-Level ergänzt.
  - Fehlende Plattform-Pflichtfelder `sprache`, `standardSprache` und `datenStand` hinzugefügt.
  - Flache String-Arrays für alle Dropdowns (`umkreis`, `standardFilter`, `proxyAktiv`, `sprache`, `standardSprache`).

## [1.7.0] - 2026-09-17

### Behoben & Verbessert
- **Mobiles Burgermenü auf Sekundärseiten gefixt (Option 1A):**
  - `#offcanvasNavbar` wird global direkt an `document.body` umgehängt (beseitigt Stacking-Context-Isolierung durch CSS-Transforms im Header).
  - Universeller Capture-Phase Klick-Handler für `.navbar-toggler` und `data-bs-toggle="offcanvas"` stellt zuverlässiges Öffnen auf allen Seiten sicher.
- **Sekundärseiten Buttons & Textkonsistenz (Option 2A):**
  - Oberer und unterer Zurück-Button (`.sw-secondary-back-link` & `.sw-secondary-bottom-btn`) einheitlich im ODAS-Primärblau (`linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)`) gestaltet.
  - Text- und Inhaltsblöcke auf Sekundärseiten bleiben strikt linksbündig (`text-align: left !important`).
- **Sanfte Richtungsanimation für Vollbild-Lightbox (Option 3A):**
  - Weicher Richtungswechsel beim Navigieren durch Fotos: Altes Bild fährt in Navigationsrichtung aus, neues Bild gleitet sanft aus der Gegenrichtung herein (`Slide & Fade` via CSS-Transitions und RAF).
- **Home-Button Positionierung & Überdeckungsschutz (Option 4A):**
  - Der Home-Button (`🏠`) ist in Leaflet direkt **über** den Zoom-Tasten platziert.
  - Zoom- und Home-Controls erhalten großzügigen unteren Abstand (`margin-bottom: 52px` Desktop / `76px` Mobile), sodass weder Home-Button noch Zoom von Fußzeilen-Elementen verdeckt werden.
- **Intuitiveres Switcher-Label auf Mobile (Option 5A):**
  - Der schwebende Umschalt-Button heißt auf Smartphones nun aussagekräftig und themenbezogen **`🏛️ Sehenswürdigkeiten (300)`** statt nur abstrakt „Liste“.
- **Foto-Katalog Icon (Option 6A):**
  - Das Kamera-Icon wurde durch ein intuitives Bildergalerie-Symbol (Foto-Rahmen `🖼️` mit Landschaft & Sonne SVG) ersetzt.

## [1.6.0] - 2026-09-17

### Hinzugefügt & Verbessert
- **Sekundärseiten Zurück-Navigation (Option 1A):** Einheitliches, konsistentes Wording „← Zurück zur Karte“ in der oberen Leiste sowie im Abschluss-Button aller Sekundärseiten (`#beschreibung`, `#impressum`, `#kontakt`, `#datenschutz`).
- **Mobile Header Bündigkeit & Runder Foto-Katalog-Button (Option 2A):**
  - Auf Smartphones wird der Fotokatalog-Button zu einem kompakten, kreisrunden 38px Icon-Button (`[ 📸 ]`), bündig neben dem runden 38px Burger-Button (`[ ☰ ]`).
  - Der linke Titel-Banner ist auf 38px Höhe und `max-width: calc(100vw - 104px)` bei `top: 10px` optimiert: Exakt identische Baseline, harmonische vertikale Zentrierung und null Überlappung auch auf kompakten Smartphones.
- **Sekundärseiten Header-Zentrierung & Burger-Konsistenz (Option 3A):**
  - App-Icon (`#logo-bootstrap`) und Titel (`#title-text`) sind im Header der Sekundärseiten sowohl mobil als auch am Desktop zentriert angeordnet.
  - Der Burger-Menü-Button `.navbar-toggler` ist nun im identischen Design der Startseite als runder Glassmorphism-Button mit klarem `☰`-Symbol gestaltet.
- **Dynamischer QR-Code für Smartphone (Option 4A):**
  - Prominente Desktop-Aktion `[ 📱 Handy ]` in der Kopfleiste sowie universeller Menüeintrag `[ 📱 Auf Smartphone öffnen ]` im Offcanvas-Menü.
  - Erzeugt zur Laufzeit vollkommen lokal und datenschutzkonform ein skalierbares SVG aus der aktuellen Instanz-URL (`...#startseite`).
  - QR-Code Modal mit Vorschau, One-Click „Link kopieren“-Funktion und sichtbarem Direktlink.

## [1.5.0] - 2026-09-17

### Hinzugefügt & Verbessert
- **Vollbild-Bildergalerie & Lightbox (Option 2A):** Klick auf das Titelbild im Detail-Modal öffnet eine immersive, abgedunkelte Vollbild-Lightbox.
  - Erkennt Mehrfachbilder aus dem DZT Knowledge Graph (`schema:image` Array) und zeigt Bildzähler (`1 von 4 Fotos`), Touch-Wischgesten (Swipe left/right), Navigationstasten (`‹`/`›`, Pfeiltasten) und Bildnachweis/Lizenzangaben.
  - Ein dezent schwebendes Badge (`📸 1 von X Fotos • Tippen für Vollbild`) auf dem Titelbild signalisiert sofortige Interaktivität.
- **Mobile Sekundärseiten-Optimierung (Option 1A):**
  - Innenabstand auf Smartphones von 40px auf 16px reduziert – Text gewinnt die volle Bildschirmbreite.
  - Die Kopfleiste mit dem Zurück-Button haftet beim Scrollen am oberen Bildschirmrand (*sticky*), sodass man jederzeit mit einem Fingertipp zur Karte zurückkehrt.
  - Automatischer Zeilenumbruch für lange URLs und Mail-Adressen (`word-break: break-word`, `overflow-wrap: anywhere`) zur Vermeidung horizontaler Scrollbalken.
  - Daumenfreundlicher Vollbreiten-Button (`width: 100%`) am Seitenende.
- **Default-Sortierung synchronisiert (Option 1A):** Standardwert im Sortier-Dropdown zeigt nun wie die tatsächliche Initialreihenfolge korrekt „Entfernung“ (`dist_asc`) an.
- **Karten-Reset Home-Button (Option 2A):** Direkt an den Leaflet-Zoom-Controls zentriert ein präzise platzierter Home-Button (`🏠` SVG) die Karte per Klick sofort wieder auf die Ausgangsposition und den Startzoom.

## [1.4.2] - 2026-09-17

### Behoben & Verbessert
- **Mobiles Themen-Dropdown (Option 1A):** Auf Smartphones werden die horizontalen Filter-Pills durch ein elegantes, kompaktes Themen-Dropdown ersetzt.
- **Duale Dropdown-Kontrollzeile:** Themenauswahl (`[ 🏷️ Alle Themen (300) ▾ ]`) und Sortierung (`[ ↕️ Name (A-Z) ▾ ]`) teilen sich die Breite sauber nebeneinander – null Quetschen, kein horizontales Scrollen mehr und Nutzung des nativen Smartphone-Auswahlrads.
- **Schnell-Reset & Live-Counts:** Aktive Filter werden mit dezentem Blau hervorgehoben und erhalten ein direktes `✕`-Reset-Icon. Optionen mit 0 Treffern werden im Dropdown automatisch ausgeblendet.
- **Desktop-Beständigkeit:** Auf Desktop-Bildschirmen bleibt die vollständige 2-zeilige Pillen-Auswahl in der Cockpit-Säule unverändert erhalten.

## [1.4.1] - 2026-09-17

### Behoben & Verbessert
- **Mobiles Schließen (Option 2A):** Der Schließen-Pfeil im mobilen Listen-Header wurde durch ein klares `✕`-Symbol ersetzt. Das Beenden der mobilen Liste blockiert nicht mehr das Wiedereinblenden und synchronisiert sauber mit der Karte.
- **Kompakte 1-zeilige mobile Filterleiste (Option 1A):** Filter-Pills laufen auf Smartphones platzsparend in einer horizontal wischbaren Leiste. Suche und Filter scrollen mit dem Inhalt nach oben weg, sodass den Trefferkarten maximaler Bildschirmplatz zur Verfügung steht.
- **Paginierungs-Scroll-to-Top:** Beim Klick auf „Weiter »“ oder „« Zurück“ scrollt die Liste automatisch und sanft wieder an den Anfang.
- **Foto-Katalog Screenshot-Synchronisation:** Die ersten 12 Fotokarten im Vollbild-Katalog laden vorrangig (`loading="eager"`). Das Screenshot-Skript synchronisiert auf vollständig geladene Bilder (`img.complete && img.naturalWidth > 0`) für 100 % fehlerfreie Katalog-Aufnahmen.
- **Floating-Switcher im Foto-Katalog:** Während der Vollbild-Fotokatalog geöffnet ist, wird der schwebende mobile Umschalter ausgeblendet.

## [1.4.0] - 2026-09-17

### Hinzugefügt
- **Mobiles Bedienkonzept (Option 1A):** Schwebender View-Switcher `[ 📋 Liste (300) ]` / `[ 🗺️ Karte ]` am unteren Bildschirmrand auf Mobilgeräten (<768px). Bietet 100% Vollbild-Karte und 100% Vollbild-Trefferliste ohne Gesten-Konflikte.
- **State- & DOM-Caching:** Navigieren zwischen Startseite und Unterseiten zerstört nicht mehr die Karte oder den Abrufzustand; sofortiger Seitenwechsel ohne erneuten SPARQL-Netzwerkabruf.
- **Kommunale Burladingen-Texte:** Authentischer Text aus der Gastgeber-Perspektive der Stadt Burladingen (Fehlatal, Schwäbische Alb, Ortsteile und regionale Besonderheiten).
- **Sekundärseiten-Bereinigung (Option 2A):** Sämtliche verspielten Emojis in den Kopfbereichen von Beschreibung, Kontakt, Impressum und Datenschutz durch dezente, monochrome SVG-Icons und ruhige Typografie ersetzt.
- **Synchronisierte Kachel-Screenshots:** Screenshot-Aufnahme synchronisiert mit Leaflet `tilelayer.on('load')` zur vollständigen Vermeidung ungerenderter Kacheln.

## [1.3.0] - 2026-09-17

### Hinzugefügt
- **Schwebender Top-Banner:** Glassmorphism-Banner oben über der Karte (`bannerTitel`, `bannerUntertitel`), voll konfigurierbar über `app-package.json`.
- **Strikte Schema-Klassifikation:** Umstellung von Freitext-Keywords auf standardisierte Schema.org- und ODTA-Typen (`@type`) und Properties (`isAccessibleForFree`). Bergkirche wird nicht mehr fälschlicherweise als Genuss klassifiziert.
- **Dynamisches Ausblenden von 0-Tags:** Filter-Tags mit 0 Treffern werden automatisch ausgeblendet.
- **UI-Bereinigung:** Entfernung generierter Emojis aus Menü-Links, Headings und Buttons.

## [1.2.0] - 2026-09-16

### Hinzugefügt
- **Outlets & Werksverkäufe:** Abfrage und Erkennung von `schema:OutletStore` und `schema:ShoppingCenter` mit eigener Magentaviolett-Farbcodierung (`#c026d3`, `🛍️`) auf Karte und Badges.
- **Regionale Kulinarik & Genussorte:** Integration von Brauereien und Weingütern (`schema:Brewery`, `schema:Winery`) mit Rubinrot-Farbcodierung (`#b91c1c`, `🍷`).
- **2-Zeiliges Filter-Wrap-Layout (Option 1A):** Cockpit-Filterleiste bricht auf zwei Zeilen um (`flex-wrap: wrap; gap: 6px;`) – alle 6 Filterkategorien plus Reset-Button auf einen Blick ohne Quetschen oder horizontales Scrollen.
- **Live-Zähler & Filterung für Outlets und Genussorte:** Dynamische Zählung und Ein-Klick-Filterung in der Cockpit-Säule.
- **Erweiterung Schema & Konfiguration:** `isOutlet` und `isCulinary` im Tabellenschema dokumentiert, neue Voreinstellungen im Standardfilter.

## [1.1.0] - 2026-09-16

### Hinzugefügt
- **Full-Page Map Experience (100vw × 100vh):** Randlose, immersive Leaflet-Kartenansicht mit OpenStreetMap-Kacheln.
- **Marker-Clustering & Vektor-SVG-Pins:** `Leaflet.markercluster` bündelt nahe POIs in Performance-optimierten Clustern; individuelle Pins nutzen zentrierte, gestochen scharfe Vektor-SVG-Pins ohne Clipping/Emoji-Verschiebung.
- **Floating Glassmorphism Header:** Schwebende Header-Bar mit Ortsanzeige, Schnellsuchleiste, Katalog-Umschalter und Navigation.
- **Live-Count Filter-Pills:** Interaktive Pillen mit dynamischen Live-Zählern für Familie/Kinder, wetterfeste Indoor-Ziele, Outdoor-Aktivitäten und kostenlosen Eintritt.
- **Einklappbarer Seiten-Drawer (Desktop):** Schlanke 420px-Seitenleiste mit Bild-Karten, Entfernungsangaben und Schnellzugriff auf Details.
- **Vollbild Foto-Katalog:** Umschaltbare 4-Spalten-Galerie mit großflächigen Bildern, Kurzbeschreibungen und Direktabsprung auf die Karte.
- **Diskrete Schwebepille & Schale-4-Modal:** Platzsparende Fußleisten-Pille für Lizenzen, Methodik und Impressum im Schale-4-Dialog.

## [1.0.0] - 2026-09-16

### Hinzugefügt
- Initiale Version der Sehenswürdigkeiten-App für den Open Data App Store (ODAS).
- Datenanbindung an den Knowledge Graph der Deutschen Zentrale für Tourismus (DZT) über den gesicherten Store-Relay (`/dzt`).
- Konfigurierbarer regionaler Instanz-Zuschnitt über Ort, Geokoordinaten und Suchumkreis (10, 25, 50, 100 km).
- Familien- und Kinder-Filter für Spielplätze, Erlebnispfade, Märchen- und Schatzsuchen.
- Alltagstauglicher Wetterfilter (Indoor / wetterfest vs. Outdoor / Freiluft) für Regen- oder Hitzetage.
- Filter für kostenlosen Eintritt (`isAccessibleForFree`).
- Interaktive Leaflet-Karte mit typisierten Markern und Marker-Clustering.
- Paginierte Ergebnisliste mit Vorschaubildern und Entfernungsberechnung.
- Detail-Modal mit Öffnungszeiten, Barrierefreiheit, Bildlizenzen und Navigations-Link.
- ODTA-konformer JSON-LD Rohdaten-Export (Anzeigen, Kopieren, Download).
- Vollständige Schale-4-Komponenten (Methodik-Kasten, KPI-Kontexte, dreistufige Datenquellen-Verlinkung).
