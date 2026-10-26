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
- **UI-Tests**, die `index.html` in einem iframe laden und bedienen

Deine eigenen Tasks werden während der UI-Tests gesichert und danach
wiederhergestellt. Wird `test.html` direkt als Datei (`file://`) geöffnet,
blockieren manche Browser den Zugriff auf das iframe – dann laufen nur die
Unit-Tests und die UI-Tests werden mit einem Hinweis übersprungen.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Oberfläche der Taskverwaltung |
| `test.html` | Testseite |
| `js/taskstore.js` | Datenlogik (Anlegen, Ändern, Filtern, Speichern) |
| `js/app.js` | Verbindung von Oberfläche und Logik |
| `js/tests.js` | Testframework und Testfälle |
| `css/style.css` | Comic-Dino-Styles |
| `img/` | Dino-Grafiken (T-Rex, Dino-Ei, Fußspuren) als SVG |
