/**
 * KatzenSpiel – Spiellogik des Jump-and-Run (ohne DOM, ohne Zeichnen).
 *
 * Koordinaten: x läuft entlang des Levels nach rechts, y ist die Höhe über
 * dem Boden (nach oben positiv). Die Katze läuft automatisch; der Spieler
 * springt über Hindernisse, duckt sich durch Tunnel und fängt Vögel.
 */
(function (global) {
  "use strict";

  var GRAVITY = 2600;        // px/s²
  var JUMP_SPEED = 900;      // px/s → Sprunghöhe ca. 155 px
  var JUMP_CUT = 380;        // Sprung wird niedriger, wenn man früh loslässt
  var FAST_FALL = 2600;      // zusätzliche Schwerkraft beim Ducken in der Luft
  var COYOTE = 0.1;          // s: Springen kurz nach Verlassen des Bodens erlaubt
  var JUMP_BUFFER = 0.15;    // s: zu früh gedrückter Sprung wird gemerkt
  var INVULNERABLE = 1.5;    // s nach einem Treffer

  var CAT = { w: 64, h: 50, duckH: 28, margin: 6 };
  var TUNNEL_GAP = 42;       // Höhe der Tunnelöffnung
  var TUNNEL_TOP = 270;      // Oberkante des Tunnels (nicht überspringbar)
  var START_LIVES = 9;
  var POINTS = { bird: 50, obstacle: 10, level: 100 };

  var GROUND_TYPES = {
    kiste: { w: 46, h: 46 },
    topf: { w: 38, h: 44 },
    heuballen: { w: 66, h: 56 }
  };

  var LEVELS = [
    { name: "Im Garten", speed: 230, length: 7000, types: ["kiste", "topf"], tunnel: 0, gap: [1.9, 2.9] },
    { name: "Hinterhof", speed: 250, length: 8500, types: ["kiste", "topf"], tunnel: 0.3, gap: [1.8, 2.7] },
    { name: "Im Park", speed: 270, length: 10000, types: ["kiste", "topf", "heuballen"], tunnel: 0.3, gap: [1.7, 2.6] },
    { name: "Über den Dächern", speed: 295, length: 11500, types: ["kiste", "heuballen"], tunnel: 0.35, gap: [1.6, 2.5] },
    { name: "Nachts im Garten", speed: 320, length: 13000, types: ["kiste", "topf", "heuballen"], tunnel: 0.4, gap: [1.5, 2.4] }
  ];

  /** Kleiner deterministischer Zufallsgenerator, damit Level immer gleich aussehen. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function between(rand, range) { return range[0] + rand() * (range[1] - range[0]); }

  function buildLevel(index) {
    var def = LEVELS[index];
    var rand = rng(1000 + index * 7919);
    var obstacles = [], birds = [];
    var x = 700, end = def.length - 450;

    while (x < end) {
      if (rand() < def.tunnel) {
        var w = Math.round(between(rand, [150, 250]));
        obstacles.push({ kind: "tunnel", type: "tunnel", x: x, w: w, bottom: TUNNEL_GAP, top: TUNNEL_TOP });
        x += w;
      } else {
        var type = def.types[Math.floor(rand() * def.types.length)];
        var t = GROUND_TYPES[type];
        obstacles.push({ kind: "ground", type: type, x: x, w: t.w, bottom: 0, top: t.h });
        x += t.w;
      }
      x += Math.round(def.speed * between(rand, def.gap));
    }

    // Vögel: in festen Abständen, in Lauf- oder Sprunghöhe
    var heights = [36, 95, 140];
    for (var bx = 900; bx < def.length - 300; bx += Math.round(def.speed * between(rand, [2.2, 3.6]))) {
      birds.push({ x: bx, baseY: heights[Math.floor(rand() * heights.length)], phase: rand() * 6.28, caught: false });
    }

    return { index: index, name: def.name, speed: def.speed, length: def.length, goalX: def.length - 120, obstacles: obstacles, birds: birds };
  }

  function createGame(levelIndex, score, lives) {
    return {
      level: buildLevel(levelIndex || 0),
      cat: { x: 0, y: 0, vy: 0, ducking: false, onGround: true, sinceGround: 0, jumpBuffer: 0 },
      lives: lives === undefined ? START_LIVES : lives,
      score: score || 0,
      levelStartScore: score || 0,
      time: 0,
      invulnerable: 0,
      status: "running",
      passed: 0,
      popups: []
    };
  }

  /** Hitbox der Katze (etwas kleiner als die Zeichnung, das macht das Spiel fairer). */
  function catBox(cat) {
    var h = cat.ducking ? CAT.duckH : CAT.h;
    return {
      left: cat.x - CAT.w / 2 + CAT.margin,
      right: cat.x + CAT.w / 2 - CAT.margin,
      bottom: cat.y + CAT.margin / 2,
      top: cat.y + h - CAT.margin
    };
  }

  function overlaps(box, o) {
    return box.right > o.x && box.left < o.x + o.w && box.top > o.bottom && box.bottom < o.top;
  }

  /** Position eines Vogels: Er kommt von oben herab, wenn die Katze näherkommt. */
  function birdPosition(bird, game) {
    var x = bird.x - game.time * 40;
    var swoop = Math.max(0, Math.min(280, (x - game.cat.x - 160) * 0.55));
    return { x: x, y: bird.baseY + swoop + Math.sin(bird.phase + game.time * 4) * 8 };
  }

  /**
   * Ein Simulationsschritt. input: { jump: true beim Drücken, jumpHeld, duck }.
   * Gibt eine Liste von Ereignissen zurück ("jump", "hit", "bird", "level", "gameover").
   */
  function step(game, dt, input) {
    var events = [];
    if (game.status !== "running") return events;
    input = input || {};
    var cat = game.cat, level = game.level;

    game.time += dt;
    if (game.invulnerable > 0) game.invulnerable = Math.max(0, game.invulnerable - dt);
    cat.x += level.speed * dt;

    // Springen (mit „Coyote Time“ und Sprungpuffer, damit es sich fair anfühlt)
    if (input.jump) cat.jumpBuffer = JUMP_BUFFER;
    else cat.jumpBuffer = Math.max(0, cat.jumpBuffer - dt);
    cat.sinceGround = cat.onGround ? 0 : cat.sinceGround + dt;

    var canJump = cat.onGround || cat.sinceGround < COYOTE;
    if (cat.jumpBuffer > 0 && canJump && !input.duck && cat.vy <= 0) {
      cat.vy = JUMP_SPEED;
      cat.onGround = false;
      cat.sinceGround = COYOTE;
      cat.jumpBuffer = 0;
      events.push("jump");
    }
    if (!input.jumpHeld && cat.vy > JUMP_CUT) cat.vy = JUMP_CUT;

    // Schwerkraft
    if (!cat.onGround) {
      cat.vy -= (GRAVITY + (input.duck ? FAST_FALL : 0)) * dt;
      cat.y += cat.vy * dt;
      if (cat.y <= 0) {
        cat.y = 0;
        cat.vy = 0;
        cat.onGround = true;
      }
    }
    cat.ducking = Boolean(input.duck) && cat.onGround;

    // Hindernisse
    var box = catBox(cat);
    level.obstacles.forEach(function (o) {
      if (!o.done && box.left > o.x + o.w) {
        o.done = true;
        if (!o.hit) {
          game.passed++;
          game.score += POINTS.obstacle;
        }
      }
      if (game.invulnerable <= 0 && overlaps(box, o)) {
        o.hit = true;
        game.lives--;
        game.invulnerable = INVULNERABLE;
        events.push("hit");
      }
    });

    // Vögel fangen
    var cx = cat.x, cy = cat.y + (cat.ducking ? CAT.duckH : CAT.h) / 2;
    level.birds.forEach(function (b) {
      if (b.caught) return;
      var p = birdPosition(b, game);
      if (Math.abs(p.x - cx) < 46 && Math.abs(p.y - cy) < 42) {
        b.caught = true;
        game.score += POINTS.bird;
        game.popups.push({ text: "+" + POINTS.bird, x: p.x, y: p.y, age: 0 });
        events.push("bird");
      }
    });

    game.popups.forEach(function (p) { p.age += dt; });
    game.popups = game.popups.filter(function (p) { return p.age < 1; });

    if (game.lives <= 0) {
      game.status = "gameover";
      events.push("gameover");
    } else if (cat.x >= level.goalX) {
      game.score += POINTS.level;
      game.status = level.index === LEVELS.length - 1 ? "won" : "level";
      events.push("level");
    }
    return events;
  }

  global.KatzenSpiel = {
    LEVELS: LEVELS,
    CAT: CAT,
    GROUND_TYPES: GROUND_TYPES,
    TUNNEL_GAP: TUNNEL_GAP,
    TUNNEL_TOP: TUNNEL_TOP,
    START_LIVES: START_LIVES,
    POINTS: POINTS,
    JUMP_SPEED: JUMP_SPEED,
    GRAVITY: GRAVITY,
    buildLevel: buildLevel,
    createGame: createGame,
    catBox: catBox,
    birdPosition: birdPosition,
    step: step
  };
})(typeof window !== "undefined" ? window : globalThis);
