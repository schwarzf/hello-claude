/**
 * Alle Demos, die als Video im Release „videos“ erscheinen.
 * frame: Ausdruck mit t (Sekunden), der ein Bild zeichnet;
 * audio: Ausdruck mit DUR, der ein Promise<AudioBuffer> liefert;
 * pixel: 320×200-Demo, wird ohne Weichzeichnen auf 1280×800 vergrößert;
 * gl: WebGL-Canvas, wird auf 1280×800 gesetzt; tail: Ausblenden am Ende (s);
 * teile: so viele Jobs rendern die Demo parallel (für lange Shader-Demos);
 * size: Videogröße, falls nicht 1280×800 (z. B. 16:9).
 */
"use strict";
module.exports = {
  demo:          { page: "demo.html", canvas: "demo", pixel: true, dur: "demo.duration()", frame: "demo.renderVideo(t, 1 / 30)", audio: "DemoMusik.render(DUR + 2.5, 44100)", tail: 2.5 },
  katzendemo:    { page: "katzendemo.html", canvas: "demo", pixel: true, dur: "katzendemo.duration()", frame: "katzendemo.renderAt(t, true)", audio: "KatzenDemoMusik.render(DUR, 44100, true)" },
  katzenfrieden: { page: "katzenfrieden.html", canvas: "demo", pixel: true, dur: "frieden.duration()", frame: "frieden.renderAt(t, true)", audio: "FriedenMusik.render(DUR, 44100, true)" },
  zweikatzen:    { page: "zweikatzen.html", canvas: "demo", pixel: true, dur: "geschichte.duration()", frame: "geschichte.renderAt(t, true)", audio: "GeschichteMusik.render(DUR, 44100, true)" },
  andi:          { page: "andi.html", canvas: "demo", pixel: true, dur: "andi.duration()", frame: "andi.renderAt(t, true)", audio: "AndiMusik.render(DUR, 44100, true)" },
  morgenlicht:   { page: "morgenlicht.html", canvas: "demo", size: [1280, 720], dur: "MorgenlichtMusik.DURATION", frame: "morgenlicht.renderAt(t)", audio: "MorgenlichtMusik.render(DUR, 44100, 0)" },
  regenkatze:    { page: "regenkatze.html", canvas: "demo", dur: "RegenkatzeMusik.DURATION + 1", frame: "regenkatze.renderAt(t)", audio: "RegenkatzeMusik.render(DUR, 44100, 0)" },
  drachen:       { page: "drachen.html", canvas: "demo", pixel: true, dur: "DrachenMusik.DURATION + 1.5", frame: "drachen.renderAt(t)", audio: "DrachenMusik.render(DUR, 44100, 0)" },
  roadtrip:      { page: "roadtrip.html", canvas: "demo", pixel: true, dur: "RoadtripMusik.DURATION + 1.5", frame: "roadtrip.renderAt(t)", audio: "RoadtripMusik.render(DUR, 44100, 0)" },
  rave:          { page: "rave.html", canvas: "demo", pixel: true, dur: "RaveMusik.DURATION + 1.5", frame: "rave.renderAt(t)", audio: "RaveMusik.render(DUR, 44100, 0)" },
  habanera:      { page: "habanera.html", canvas: "demo", dur: "HabaneraMusik.DURATION + 1.5", frame: "habanera.renderAt(t)", audio: "HabaneraMusik.render(DUR, 44100, 0)" },
  neon:          { page: "neon.html", canvas: "gl", gl: true, dur: "neon.duration()", teile: 4, frame: "neon.renderAt(t, true, 1)", audio: "NeonMusik.render(DUR, 44100, true)" },
  singularity:   { page: "singularity.html", canvas: "gl", gl: true, dur: "singularity.duration() + 1.5", teile: 6, frame: "singularity.renderAt(t, 1)", audio: "SingularityMusik.render(DUR, 44100, 0)" }
};
