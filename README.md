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
hochskaliert, optional mit Röhren-Scanlines und im Vollbild):

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
(`video/katzendemo.mp4`, 70 Sekunden, 1280×800, mit Ton):

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
live oder als Video (`video/katzenfrieden.mp4`, 88 Sekunden, 1280×800, mit Ton):

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

## Starten

`index.html` direkt im Browser öffnen – fertig.

Für die vollständigen Tests empfiehlt sich ein lokaler Webserver:

```bash
python3 -m http.server 8000
# dann im Browser: http://localhost:8000/index.html
```

## Testen

`test.html` öffnen (z. B. http://localhost:8000/test.html). Die Seite führt aus:

- **Unit-Tests** für die Logik in `js/taskstore.js` (mit In-Memory-Speicher)
- **Unit-Tests** für das Morphing in `js/morph.js` (Dreiecksnetz, Verzerrung, Überblendung)
- **Unit-Tests** für die Gesichtspunkte in `js/face.js` (Auswahl, Zuschnitt, Vorlage)
- **Unit-Tests** für das Katzenspiel in `js/spiel.js` (Laufen, Sprint, Physik, Treffer, Mäuse, Vögel, Leben, Bot spielt alle Level)
- **Unit-Tests** für die Musik in `js/musik.js` (Tonart, Songaufbau, Saitenklang, Offline-Aufnahme)
- **Unit-Tests** für den Demo-Sound in `js/demo-musik.js` (Tonart, Songaufbau, Bassanteil, Pegel)
- **Unit-Tests** für den Katzen-Demo-Sound in `js/katzendemo-musik.js` (Tonart, Band-Ereignisse, Bassanteil, Pegel)
- **Unit-Tests** für den Katzenfrieden-Sound in `js/frieden-musik.js` (Ablauf, Tempo-Steigerung, Zeittabelle, Bassanteil, Pegel)
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
| `video/katzendemo.mp4` | Katzen-Demo als Video |
| `katzenfrieden.html` | Demo „Katzenfrieden“ |
| `video/katzenfrieden.mp4` | Katzenfrieden als Video |
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
| `js/tests.js` | Testframework und Testfälle |
| `css/style.css` | Comic-Dino-Styles |
| `css/katzen.css` | Katzen-Styles |
| `css/gesichter.css` | Pop-Art-Comic-Styles der Gesichterseite |
| `css/katzenspiel.css` | Styles des Spiels |
| `css/demo.css` | Styles der Amiga-Demo |
| `img/` | Grafiken als SVG (Dinos, Katzen, Comic-Gesichter, Pfoten) |
