# hello-claude – Dino-Taskverwaltung 🦖

Eine einfache Taskverwaltung im Browser, nur mit HTML, CSS und JavaScript –
ohne Datenbank, ohne Build-Schritt. Die Tasks werden im `localStorage` des
Browsers gespeichert und bleiben so auch nach einem Neuladen erhalten.

Das Design ist im Comic-Stil mit Dinosauriern gehalten (selbst gezeichnete
SVG-Grafiken, Schriften „Bangers“ und „Comic Neue“ von Google Fonts).

## Funktionen

- Tasks anlegen mit Titel, Priorität (niedrig / mittel / hoch) und optionalem Fälligkeitsdatum
- Tasks abhaken, per Doppelklick umbenennen und löschen
- Filter (Alle / Offen / Erledigt) und Suche
- Sortierung: offene vor erledigten, dann nach Priorität und Fälligkeit
- Überfällige Tasks werden rot markiert
- „Erledigte löschen“ räumt abgeschlossene Tasks auf

## Katzen-Morphing 🐱

Auf `katzen.html` (verlinkt von der Dino-Taskliste) lädt man zwei Katzenfotos
und mischt sie per Schieberegler:

1. Zwei Fotos wählen (oder „Beispielkatzen laden“). Die Fotos werden
   quadratisch zugeschnitten und verlassen das Gerät nicht.
2. Zehn nummerierte Merkmalspunkte (Ohrspitzen, Stirn, Augen, Nase, Maul,
   Kinn, Wangen) bei beiden Katzen auf dieselben Stellen ziehen.
3. Mischverhältnis einstellen, Animation abspielen oder das Ergebnis als PNG
   speichern. Optional lässt sich das Dreiecksnetz einblenden.

Technik: Aus den Punkten wird ein Delaunay-Dreiecksnetz berechnet. Jedes
Dreieck beider Fotos wird per affiner Abbildung auf die Zwischenposition
verzerrt, anschließend werden beide Bilder überblendet (`js/morph.js`).

## Gesichter-Morphing 🙂

`gesichter.html` (ebenfalls von der Taskliste verlinkt) funktioniert wie das
Katzen-Morphing, nur für Menschen:

1. Zwei Porträtfotos wählen (oder „Beispielgesichter laden“).
2. Die Gesichtspunkte werden automatisch erkannt – mit dem
   [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker),
   der lokal im Browser läuft. Von den 478 erkannten Punkten werden 54 genutzt
   (Kontur, Augenbrauen, Augen mit Iris, Nase, Mund). Die Fotos werden
   automatisch um das Gesicht zugeschnitten, sodass beide Gesichter gleich groß sind.
3. Falsch sitzende Punkte lassen sich per Finger oder Maus verschieben.
4. Mischen, animieren, als PNG speichern.

Das Erkennungsmodell (ca. 13 MB, von jsDelivr und Google) wird beim ersten Foto
einmalig geladen; die Fotos selbst verlassen das Gerät nicht. Ohne Verbindung
werden Standardpunkte gesetzt, die man von Hand anpasst.

Die Beispielgesichter sind gezeichnete Comic-Figuren; ihre Punkte stehen in
`js/gesichter-demo.js`.

## Katzen-Jump'n'Run 🐈

`katzenspiel.html` (von der Taskliste verlinkt) ist ein kleines Jump-and-Run
mit einer roten Katze mit weißem Bauch:

- 5 Level (Garten, Hinterhof, Park, Dächer, Nacht), jedes endet am Futternapf
- die Katze läuft nur, wenn man ◀/▶ hält; wer lange in eine Richtung hält,
  wird bis zu 1,5-mal schneller (Sprint mit Staubwolken und Speed-Linien)
- über Kisten, Blumentöpfe und Heuballen **springen**, durch Kartons **ducken**
  und dabei langsam weiterkriechen
- **🐾 Satz**: flacher Sprung nach vorn – nur damit fängt man die flinken
  Mäuse (**+30 Punkte**), die zwischen den Hindernissen herumflitzen und flüchten
- Vögel kommen von oben – wer sie fängt, bekommt **+50 Punkte**
- **9 Leben**, nach einem Treffer kurz unverwundbar; sind alle weg, startet nur
  das aktuelle Level neu
- Steuerung auf dem iPad: links ◀ ▶, rechts 🐾 Satz, ⬇ Ducken, ⬆ Springen
  (mehrere Finger gleichzeitig). Tastatur: ←/→ laufen, Leertaste/↑ springen
  (länger drücken = höher), ↓ ducken, X Satz, P Pause
- Animationen: Trab und Galopp passend zur Geschwindigkeit, Stehen mit
  wedelndem Schwanz und Blinzeln, Satz-Pose, Stauchen bei der Landung, Sterne
  beim Fangen
- Rekord wird im Browser gespeichert; Geräusche (🔊) und Musik (🎵) lassen
  sich getrennt abschalten
- entspannte Akustik-Pop-Hintergrundmusik (`js/musik.js`): eigene Komposition
  in G-Dur mit 92 BPM – gezupfte bzw. geschlagene Akustikgitarre (Karplus-Strong),
  Bass, weicher Beat, Flächenklang und eine Refrain-Melodie. Sie wird live per
  Web Audio erzeugt, es gibt keine Audiodateien. In Safari auf iPad/iPhone wird
  die Wiedergabe als „Medienwiedergabe“ markiert (`navigator.audioSession`, bei
  älteren Versionen über ein stilles `<audio>`), damit sie wie in Chrome auch im
  Lautlos-Modus zu hören ist.

Die Spielregeln (`js/spiel.js`) sind vom Zeichnen (`js/katzenspiel.js`)
getrennt. Ein Test lässt einen Bot alle Level durchspielen und prüft so, dass
jedes Level ohne Treffer schaffbar ist.

## Amiga-Demo 🕹️

`demo.html` (von der Taskliste verlinkt) ist eine kleine Demo im Stil der
Amiga-Demoszene, gerechnet in echter Low-Res-Auflösung (320×200, pixelig
hochskaliert, optional mit Röhren-Scanlines und im Vollbild) – live oder als
Video (Release „videos“: `demo.mp4`, mit Ton):

- Szenen: Intro mit Sternenfeld und Copper-Bars, wellendes Chrom-Logo,
  Sinus-Scroller, Glenz-Vektor-Würfel, Boing-Ball auf lila Gitter, Plasma mit
  Greetings und ein Finale mit allem zusammen; Blitz und Wackeln im Takt
- synthetischer Sound (`js/demo-musik.js`): eigener Tracker-Song in a-Moll mit
  125 BPM – Sägezahn-Bass mit Filter-Sweeps und Sub-Bass, der beim Kick
  „pumpt“, Kick, Snare, Hi-Hats, Chip-Arpeggios und eine Lead-Stimme mit Echo.
  Alles live per Web Audio, keine Samples. Die Grafik folgt der Musik.
- „Ohne Ton“ startet die Demo mit eigener Uhr

## Katzen-Demo 🌈🐈

`katzendemo.html` (von der Taskliste verlinkt) ist eine zweite Demo im
Amiga-Stil, diesmal mit Katzen – live im Browser oder als fertiges Video
(Release „videos“: `katzendemo.mp4`, 70 Sekunden, 1280×800, mit Ton):

1. **Regenbogen-Flug:** die rote Katze fliegt mit großem Regenbogen-Schweif
   durchs Sternenfeld, begleitet von kleinen Regenbogen-Katzen
2. **Wollknäuel-Jagd:** ein Regenbogen-Wollknäuel hüpft im Takt über das
   Gitter, die Katzen jagen hinterher und springen auf der Snare
3. **Katzenband „The Miaus“:** Schlagzeug, Bass, Gesang („MIAU“), Gitarre und
   Keyboard spielen synchron zu ihrer Spur; davor tanzen Regenbogen-Katzen auf
   den Hinterbeinen
4. **Longcats:** zwei sehr lange Katzen wachsen über den Bildschirm hinaus
5. **Finale** mit Konfetti und Greetings, im Video danach „THE END“

Sound (`js/katzendemo-musik.js`): eigener Synth-Song in F-Dur, 130 BPM, im
Stil der Amiga-Demo – Sägezahn-Bass, „Schnurr“-Bass (Sub-Bass mit Flattern),
der beim Kick pumpt, Drums, Chip-Arpeggios und ein „Miau“-Synth als Lead.
Der Song ist als Daten beschrieben (`KatzenDemoMusik.at(schritt)`); Musik und
Grafik lesen daraus, deshalb passen Bild und Ton auch im Video exakt. Das Video
entsteht, indem `katzendemo.renderAt(t, true)` Bild für Bild gerendert und mit
dem offline erzeugten Ton per ffmpeg zusammengesetzt wird.

## Katzenfrieden 🌿💃

`katzenfrieden.html` (von der Taskliste verlinkt) ist die dritte Demo –
live oder als Video (Release „videos“: `katzenfrieden.mp4`, 88 Sekunden, 1280×800, mit Ton):

1. **Streit:** fünf verfeindete Katzen im nächtlichen Hinterhof machen einen
   Buckel, sträuben das Fell und fauchen sich an („FAUCH!“, „GRRR!“ …); zwei
   raufen sich in einer Comic-Staubwolke
2. **Katzenminze:** ein Beutel fällt vom Himmel und platzt, die Blätter regnen
   herab, die Katzen werden neugierig
3. **Wälzen:** alle rollen sich auf dem Rücken in der Minze – mit Herzchen
   und psychedelischem Himmel
4. **Frieden:** die Katzen stehen auf und werden Freunde
5. **Griechischer Tanz:** vor weißen Häusern mit blauen Kuppeln tanzen sie in
   der Seitenansicht in einer Reihe, Pfote auf dem Rücken des Vordermanns, und
   werfen die Beine hoch – mit zwei Longcats, „OPA!“ und zerbrechenden Tellern.
   Wie beim echten Volkstanz wird die Musik immer schneller (100 → 180 BPM).

Sound (`js/frieden-musik.js`): eigene Komposition im Stil der anderen Demos –
angespannter d-Moll-Teil mit tiefem Bass und Fauchen, magischer Übergang,
träumerischer Wälz-Teil mit Schnurr-Bass, dann ein Tanz in d-Hidschas mit
Bouzouki-artigem Tremolo, Oom-pah-Bass und Klatschen. Wegen des
Tempowechsels hat jeder Schritt eine feste Startzeit (`stepTime`/`stepAt`),
die Musik und Grafik gemeinsam nutzen.

## Zwei Katzen 🍀🌈

`zweikatzen.html` (von der Taskliste verlinkt) erzählt eine Geschichte in
vier Szenen, gesehen aus dem Zimmer heraus (Fenster mit Fensterbank, daneben
die Tür) – live oder als Video (Release „videos“: `zweikatzen.mp4`, 105 Sekunden, mit Ton):

1. Die **Glückskatze** (dreifarbig, mit Halsband und Glöckchen, winkt wie eine
   Winkekatze) sitzt drinnen am Fenster; die **Regenbogenkatze** spaziert
   draußen vorbei. Sie starren sich an und knurren („GRRR!“ – auch hörbar).
2. Umgekehrt: die Regenbogenkatze sitzt drinnen, die Glückskatze läuft vorbei.
   Spannende Musik, dunkler Himmel und ein Duell im Splitscreen.
3. Niemand sitzt drinnen. Draußen kommen beide von zwei Seiten und schauen
   sich an – diesmal ohne Knurren.
4. Die Tür geht auf. Beide zögern, dann Nasenstupser und Herz. Sie gehen
   gemeinsam hinein, springen auf die Fensterbank und sitzen zusammen am
   Fenster; ihre Schwänze formen ein Herz. Romantische Musik zum Sonnenuntergang.

Musik (`js/geschichte-musik.js`): eigene Komposition mit eigenem Tempo und
eigener Stimmung pro Szene – leicht (96 BPM), spannend (120 BPM), ruhig mit
Spieluhr, zögerlich mit Tür-Knarren, romantisch mit Harfe und Streichern.

## Katzen-Habanera 🎤

`habanera.html` (von der Taskliste verlinkt, auch als Video im Release „videos“)
ist ein knapp einminütiger
**gezeichneter Comic**: Eine Diva mit Schleife und ein Kater mit Kappe singen
nachts auf dem Dach die Habanera aus Bizets „Carmen“ (1875, gemeinfrei) – als
Pop-Rock-Rap. Ablauf: Vorspiel → Strophe (erst sie, dann er) → Katzen-Rap →
Aufbau → Rock-Refrain zu zweit → Miau-Battle → großer Refrain → ein Nachbar
ruft „RUHE!!!“ und wirft einen Stiefel.

Zeichenstil (`js/habanera.js`, `css/habanera.css`): kein Pixel-Look, sondern
Tusche und Aquarell auf Papier in 1280×800. Jede Form besteht aus wenigen
Stützpunkten, die sieben Mal pro Sekunde neu verwackelt und als weiche Kurve
doppelt nachgezogen werden („Line Boil“ wie im handgezeichneten Trickfilm).
Die Flächen laufen leicht über die Linie und haben einen dunkleren Rand;
darüber liegt eine Papierstruktur. Dazu Sprechblasen, in denen die gerade
gesungene Silbe aufleuchtet, Zackenblasen für den Rap, Erzählkästen,
Schlagwörter, Noten, Kamerafahrten und harte Schnitte wie zwischen
Comic-Panels. Münder, Gesten und Blasen lesen dieselben Song-Daten wie die
Musik.

Musik (`js/habanera-musik.js`): Bass und Gitarren sind gezupfte Saiten
(Karplus-Strong), die Rock-Gitarre läuft durch eine Verzerrung, die
Katzenstimmen sind Formant-Synthese („mi-a-u“ mit Vibrato, angeschliffenen
Tönen und Atem); dazu Hall und leicht ungenaues Timing wie bei echten
Spielern. Alles entsteht live im Browser, ohne Aufnahmen.

## SINGULARITY ⚫

`singularity.html` (von der Taskliste verlinkt, auch als Video
im Release „videos“) ist eine gut zweiminütige
Shader-Demo (WebGL2) als eine einzige Eskalation. Die ersten 80 Sekunden sind
fast monochrom mit einer Akzentfarbe, die bei jedem harten Schnitt wechselt;
danach bricht die Farbe herein. Der Lichtpunkt vom Anfang kehrt in der
Atempause, am Tunnelende und vor der Explosion wieder.

| Wort | Bild | Farbe |
| --- | --- | --- |
| SINGULARITY | ein Lichtpunkt, Herzschlag | – |
| ORDER | Flug durch ein sauberes Stabgitter | – |
| DETERMINISTIC | Gitterstäbe biegen sich zur Bahn des Lorenz-Attraktors; acht Bahnen laufen exakt übereinander | Cyan |
| UNPREDICTABLE | die Bahnen fächern zu einem Knäuel auf, das Gitter dahinter zerfällt | Cyan |
| ENTROPY | Würfel lösen sich aus dem Gitter, kippen und treiben auseinander | Orange |
| BREAK | alles zerspringt in Splitter, harte Schnitte | Orange |
| SELF-SIMILAR | stetiger Zoom in eine Fraktal-Kathedrale aus Kugelformen, die im Kleinen aussieht wie im Großen | Blau |
| INFINITE | Flug durch die Kathedrale, die sich bei jedem Schnitt umbaut | Violett |
| EVENT HORIZON | Atempause, dann ein schwarzes Loch mit gebogenen Lichtstrahlen; seine Scheibe zieht sich zusammen … | Violett |
| – | … und wird zu einem flüssig morphenden, schillernden Objekt | Acid |
| FASTER … NOW | runder Tunnel in Acid-Farben: erst Kacheln, die sich in fließende Muster auflösen, bis zum Ende immer schneller | Acid |
| – | Schwarz und Stille, ein Herzschlag – dann erfasst eine Lichtwelle Galaxie und Universum | Weiß |

Am Ende steht Schwarz auf Weiß „SINGULARITY“ und ein „Nochmal“-Knopf.

Technik (`js/singularity.js`): Ein Chaos-Regler (0…1) aus der Musik steuert
Tempo, Kamerawackeln, Farbsäume, Bildstörungen und Schlieren; die
Filterbewegung des Basses verformt die Geometrie. Pro Bild drei Durchgänge:
Szene per Raymarching in eine Textur (Auflösung passt sich an, Partikel additiv
darüber), Feedback (das vorige Bild wird gezoomt und gedreht untergemischt),
Nachbearbeitung (Bloom, Farbsäume, Glitch, Körnung, Kinobalken). Die Partikel
des Attraktors haben drei Positionen (Gitterstab, gemeinsame Bahn, eigene
Bahn), zwischen denen überblendet wird. Szenenwechsel blenden weich über, indem das
alte Bild als Schliere ausklingt; hart bleibt nur der Schnitt auf BREAK.

Sound (`js/singularity-musik.js`): eigene Komposition, Tempo 80 → 224 BPM mit
gemeinsamer Zeittabelle für Musik und Grafik. Herzschlag und Glocke, präzise
Arpeggios, die ihre Ordnung verlieren, Drum-and-Bass mit Reese-Bass, Halftime
am Ereignishorizont, ein heller, treibender Morph-Teil in Dur, im Tunnel eine
Acid-Linie und ein Shepard-Ton (scheint endlos zu steigen), dann Stille, ein
Herzschlag und eine Explosion mit hartem Schlussschlag. Das Motiv aus vier
Tönen bleibt, nur die Terz wechselt von Moll nach Dur.

## Happy Birthday Andi! 🎂🎸

`andi.html` (von der Taskliste verlinkt) ist eine Geburtstags-Demo für Andi,
aufgebaut auf der Katzen-Demo – live oder als Video (Release „videos“: `andi.mp4`, mit Ton).
Die Andi-Katze ist schwarz mit verspiegelter Sonnenbrille, Partyhut und
Regenbogen-Schimmer:

1. Andi fliegt allein auf einer E-Gitarre durch den Weltraum
2. Regenbogenschweif, kleine und große Begleiter, höheres Tempo
3. Wollknäuel-Jagd – erst mit zwei, dann mit vier kleinen Katzen
4. Mega-Geburtstagsparty von The Miaus mit Andi an der Gitarre, Torte,
   Luftballons, Wimpeln, tanzenden Katzen, Longcats und Konfetti:
   „HAPPY BIRTHDAY ANDI!“

Die Musik (`js/andi-musik.js`) ist der Song der Katzen-Demo, neu arrangiert.

## Glühwürmchen ✨

`gluehwuermchen.html` (von der Taskliste verlinkt) ist eine kleine, ruhige
Mini-Demo: Glühwürmchen schweben über einer nächtlichen Wiese. Wo man tippt
oder zieht, sammeln sie sich und kreisen um den Finger; dazu erklingen leise
Glockentöne in einer pentatonischen Tonleiter (oben hoch, unten tief).

## HYPERFLUX ⚡

`neon.html` (von der Taskliste verlinkt, auch als Video im Release „videos“) ist
eine moderne Echtzeit-Demo mit
GPU-Shadern (WebGL2) statt Pixel-Art. Sechs Szenen folgen der Musik:

1. **System Boot** – Flug durch einen Daten-Tunnel aus Leiterbahnen
2. **Terraform** – 3D-Landschaft mit Neon-Gitter, Polarlicht und Sonne
3. **Deep Blue** – Ozean mit Spiegelungen, Sonnenglitzern und leuchtenden Kämmen
4. **Acid** – Kaleidoskop aus Ringen und verzerrtem Farbrauschen
5. **Morph** – flüssiges, schillerndes Objekt: Kugel → Torus → Würfel → Oktaeder
6. **Overdrive** – Ozean, Morph-Objekt und Acid-Himmel zusammen

Technik (`js/neon.js`): Raymarching in eine kleinere Textur, deren Auflösung
sich an die Geschwindigkeit des Geräts anpasst; ein zweiter Durchgang legt
Bloom, Farbsäume, Glitch beim Szenenwechsel, Vignette und Körnung darüber.
Ohne WebGL2 erscheint ein Hinweis. „Weniger Blitze“ schwächt die schnellen
Lichtwechsel ab (bei „reduzierte Bewegung“ im System automatisch aktiv).

Sound (`js/neon-musik.js`): eigener Track in e-Moll, 145 BPM – harter Kick,
rollender Bass, verzerrte Acid-Linie, Supersaw-Lead und -Stabs, Riser und
Einschläge; ein weicher Begrenzer am Ausgang hält die Spitzen unter 0,9.

## Videos 🎬

Die Videos liegen **nicht im Repo**, sondern im GitHub-Release
[„videos“](https://github.com/schwarzf/hello-claude/releases/tag/videos); die
Demo-Seiten verlinken direkt darauf. Erzeugt werden sie vom Workflow
„Demo-Videos“ (`.github/workflows/videos.yml`), der nur von Hand läuft
(Actions → Demo-Videos → Run workflow):

- `fehlende` (Standard): nur Videos, die im Release noch fehlen
- `alle`: alles neu
- eine Liste wie `habanera,neon`: genau diese Demos neu, z. B. nach einer Änderung

`tools/video/render.js` zeichnet jede Demo Bild für Bild (30 fps, PNG) in
headless Chromium, berechnet den Ton offline und baut mit ffmpeg ein MP4
(1280×800, H.264 CRF 18, visuell verlustfrei). Lokal:
`node tools/video/render.js habanera habanera.mp4`. Eine neue Demo bekommt
ein Video durch einen Eintrag in `tools/video/demos.js`.

## Starten

`index.html` direkt im Browser öffnen – fertig.

Für die vollständigen Tests empfiehlt sich ein lokaler Webserver:

```bash
python3 -m http.server 8000
# dann im Browser: http://localhost:8000/index.html
```

## Testen

`test.html` öffnen (z. B. http://localhost:8000/test.html). Die Seite führt aus:

- **Video-Test**: jede Demo mit festem Ablauf verlinkt ihr Video im Release „videos“
- **Unit-Tests** für die Logik in `js/taskstore.js` (mit In-Memory-Speicher)
- **Unit-Tests** für das Morphing in `js/morph.js` (Dreiecksnetz, Verzerrung, Überblendung)
- **Unit-Tests** für die Gesichtspunkte in `js/face.js` (Auswahl, Zuschnitt, Vorlage)
- **Unit-Tests** für das Katzenspiel in `js/spiel.js` (Laufen, Sprint, Physik, Treffer, Mäuse, Vögel, Leben, Bot spielt alle Level)
- **Unit-Tests** für die Musik in `js/musik.js` (Tonart, Songaufbau, Saitenklang, Offline-Aufnahme)
- **Unit-Tests** für den Demo-Sound in `js/demo-musik.js` (Tonart, Songaufbau, Bassanteil, Pegel)
- **Unit-Tests** für den Katzen-Demo-Sound in `js/katzendemo-musik.js` (Tonart, Band-Ereignisse, Bassanteil, Pegel)
- **Unit-Tests** für den Katzenfrieden-Sound in `js/frieden-musik.js` (Ablauf, Tempo-Steigerung, Zeittabelle, Bassanteil, Pegel)
- **Unit-Tests** für die Katzen-Habanera (`js/habanera-musik.js`): Bizets Melodie, Aufbau, wer wann singt oder rappt, Pegel; der UI-Test prüft alle Szenen, offene Münder, Sprechblasen und die wackelnde Tuschelinie
- **Unit-Tests** für SINGULARITY (`js/singularity-musik.js`): Ablauf, Tempo-Rampe, Chaos-Regler, Motiv, Lautstärke im Tunnel und die Stille danach; der UI-Test prüft Shader, alle Szenen, Schwarz in der Stille und Weiß am Ende
- **Unit-Tests** für den HYPERFLUX-Sound in `js/neon-musik.js` (Aufbau, Tonart, Begrenzer, Bassanteil); der UI-Test prüft, dass die Shader kompilieren und jede Szene ein Bild zeichnet
- **Unit-Tests** für die Zwei-Katzen-Musik in `js/geschichte-musik.js` (Szenen, Tempi, wer wann knurrt, Pegel)
- **UI-Tests**, die `index.html`, `katzen.html` und `gesichter.html` in einem iframe laden und bedienen (inkl. Katzenspiel)

Die automatische Gesichtserkennung selbst wird auf der Testseite nicht geprüft,
weil sie das Modell aus dem Netz braucht.

Deine eigenen Tasks werden während der UI-Tests gesichert und danach
wiederhergestellt. Wird `test.html` direkt als Datei (`file://`) geöffnet,
blockieren manche Browser den Zugriff auf das iframe – dann laufen nur die
Unit-Tests und die UI-Tests werden mit einem Hinweis übersprungen.

## Hinweis zum Zwischenspeicher

GitHub Pages lässt Browser Dateien bis zu 10 Minuten zwischenspeichern. Damit
nach einer Änderung nicht alte Skripte mit neuen Seiten gemischt werden, hängen
alle CSS- und JS-Adressen eine Versionsnummer an (`?v=…`). Bei Änderungen an
CSS oder JS die Nummer in allen HTML-Dateien erhöhen.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Oberfläche der Taskverwaltung |
| `katzen.html` | Katzen-Morphing |
| `gesichter.html` | Gesichter-Morphing |
| `katzenspiel.html` | Katzen-Jump'n'Run |
| `demo.html` | Amiga-Demo |
| `katzendemo.html` | Katzen-Demo |
| `katzenfrieden.html` | Demo „Katzenfrieden“ |
| `habanera.html` | Comic „Katzen-Habanera“ (`js/habanera.js`, `js/habanera-musik.js`, `css/habanera.css`) |
| `singularity.html` | Shader-Demo SINGULARITY (`js/singularity.js`, `js/singularity-musik.js`, `css/singularity.css`) |
| `neon.html` | Shader-Demo HYPERFLUX |
| `andi.html` | Geburtstags-Demo für Andi (`js/andi.js`, `js/andi-musik.js`) |
| `gluehwuermchen.html` | Mini-Demo Glühwürmchen (`js/gluehwuermchen.js`) |
| `zweikatzen.html` | Demo „Zwei Katzen“ |
| `tools/video/` | Video-Rendering (`render.js`, Liste der Demos in `demos.js`) |
| `.github/workflows/videos.yml` | Workflow „Demo-Videos“ → Release „videos“ |
| `test.html` | Testseite |
| `js/taskstore.js` | Datenlogik (Anlegen, Ändern, Filtern, Speichern) |
| `js/app.js` | Verbindung von Oberfläche und Logik |
| `js/morph.js` | Morphing-Logik (Delaunay, affine Verzerrung, Überblendung) |
| `js/katzen.js` | Oberfläche des Katzen-Morphings |
| `js/face.js` | Gesichtspunkte, Zuschnitt und MediaPipe-Erkennung |
| `js/gesichter.js` | Oberfläche des Gesichter-Morphings |
| `js/gesichter-demo.js` | Punkte der Beispielgesichter |
| `js/spiel.js` | Spielregeln des Jump'n'Run (Physik, Level, Treffer) |
| `js/katzenspiel.js` | Zeichnen, Steuerung und Ablauf des Spiels |
| `js/musik.js` | Hintergrundmusik des Spiels (Web Audio) |
| `js/demo-musik.js` | Synthetischer Demo-Sound |
| `js/demo.js` | Effekte und Ablauf der Amiga-Demo |
| `js/katzendemo-musik.js` | Song der Katzen-Demo (Miau-Synth, Schnurr-Bass) |
| `js/katzendemo.js` | Szenen der Katzen-Demo (Pixel-Art-Katzen, Band, Longcats) |
| `js/frieden-musik.js` | Song von Katzenfrieden (mit Tempo-Steigerung) |
| `js/frieden.js` | Szenen von Katzenfrieden (Streit, Minze, Tanz) |
| `js/neon-musik.js` | Soundtrack von HYPERFLUX |
| `js/neon.js` | Shader und Ablauf von HYPERFLUX (WebGL2) |
| `js/geschichte-musik.js` | Musik zu „Zwei Katzen“ |
| `js/geschichte.js` | Szenen von „Zwei Katzen“ (Zimmer, Glücks- und Regenbogenkatze) |
| `js/tests.js` | Testframework und Testfälle |
| `css/style.css` | Comic-Dino-Styles |
| `css/katzen.css` | Katzen-Styles |
| `css/gesichter.css` | Pop-Art-Comic-Styles der Gesichterseite |
| `css/katzenspiel.css` | Styles des Spiels |
| `css/demo.css` | Styles der Amiga-Demo |
| `css/neon.css` | Styles von HYPERFLUX |
| `img/` | Grafiken als SVG (Dinos, Katzen, Comic-Gesichter, Pfoten) |
