/**
 * KatzenSpiel – Spiellogik des Jump-and-Run (ohne DOM, ohne Zeichnen).
 *
 * Koordinaten: x läuft entlang des Levels nach rechts, y ist die Höhe über
 * dem Boden (nach oben positiv). Der Spieler läuft nach links/rechts (lange
 * gehalten wird die Katze schneller), springt über Hindernisse, duckt sich
 * durch Tunnel, fängt Vögel und jagt Mäuse mit einem Satz nach vorn.
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

  var WALK = 230;            // px/s
  var SPRINT = 1.5;          // Faktor nach langem Halten
  var SPRINT_AFTER = 1.0;    // s gehalten, bis der Sprint beginnt
  var SPRINT_RAMP = 1.5;     // s bis zur vollen Sprintgeschwindigkeit
  var CRAWL = 120;           // px/s geduckt
  var ACCEL = 1500, AIR_ACCEL = 700, FRICTION = 2000;
  var POUNCE = { vx: 560, vy: 560, cooldown: 0.35 };

  var CAT = { w: 64, h: 50, duckH: 28, margin: 6 };
  var TUNNEL_GAP = 42;       // Höhe der Tunnelöffnung
  var TUNNEL_TOP = 270;      // Oberkante des Tunnels (nicht überspringbar)
  var START_LIVES = 9;
  var POINTS = { bird: 50, mouse: 30, obstacle: 10, level: 100 };
  var MOUSE = { flee: 190, wander: 35, scare: 210, catchX: 44, catchY: 70 }; // catchY: der ganze flache Satz zählt

  var GROUND_TYPES = {
    kiste: { w: 46, h: 46 },
    topf: { w: 38, h: 44 },
    heuballen: { w: 66, h: 56 }
  };

  var LEVELS = [
    { name: "Im Garten", length: 7000, types: ["kiste", "topf"], tunnel: 0, gap: [440, 660] },
    { name: "Hinterhof", length: 8500, types: ["kiste", "topf"], tunnel: 0.3, gap: [450, 680] },
    { name: "Im Park", length: 10000, types: ["kiste", "topf", "heuballen"], tunnel: 0.3, gap: [460, 700] },
    { name: "Über den Dächern", length: 11500, types: ["kiste", "heuballen"], tunnel: 0.35, gap: [470, 730] },
    { name: "Nachts im Garten", length: 13000, types: ["kiste", "topf", "heuballen"], tunnel: 0.4, gap: [480, 760] }
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
    var obstacles = [], birds = [], mice = [];
    var x = 1000, end = def.length - 450, prevEnd = 420;

    while (x < end) {
      // Maus in der Lücke vor dem Hindernis (sie bleibt zwischen den Hindernissen)
      if (x - prevEnd > 380 && rand() < 0.55) {
        var min = prevEnd + 30, max = x - 30;
        mice.push({ min: min, max: max, x: min + (max - min) * (0.55 + rand() * 0.3), dir: rand() < 0.5 ? -1 : 1, fleeing: false, caught: false, wander: rand() * 6 });
      }
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
      prevEnd = x;
      x += Math.round(between(rand, def.gap));
    }

    // Vögel: in festen Abständen, in Lauf- oder Sprunghöhe
    var heights = [36, 95, 140];
    for (var bx = 1200; bx < def.length - 300; bx += Math.round(between(rand, [560, 900]))) {
      birds.push({ x: bx, baseY: heights[Math.floor(rand() * heights.length)], phase: rand() * 6.28, caught: false });
    }

    return { index: index, name: def.name, length: def.length, goalX: def.length - 120, obstacles: obstacles, birds: birds, mice: mice };
  }

  function createGame(levelIndex, score, lives) {
    return {
      level: buildLevel(levelIndex || 0),
      cat: {
        x: 480, y: 0, vx: 0, vy: 0, facing: 1, ducking: false, onGround: true,
        sinceGround: 0, jumpBuffer: 0, held: 0, heldDir: 0, pouncing: false, pounceCooldown: 0, distance: 0
      },
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

  /** Aktueller Geschwindigkeitsfaktor durch langes Halten (1 … SPRINT). */
  function sprintFactor(cat) {
    var t = Math.max(0, Math.min(1, (cat.held - SPRINT_AFTER) / SPRINT_RAMP));
    return 1 + (SPRINT - 1) * t;
  }

  /** Position eines Vogels: Er kommt von oben herab, wenn die Katze näherkommt. */
  function birdPosition(bird, game) {
    var x = bird.x - game.time * 40;
    var swoop = Math.max(0, Math.min(280, Math.abs(x - game.cat.x) * 0.55 - 90));
    return { x: x, y: bird.baseY + swoop + Math.sin(bird.phase + game.time * 4) * 8 };
  }

  function approach(value, target, amount) {
    if (value < target) return Math.min(target, value + amount);
    return Math.max(target, value - amount);
  }

  function updateMouse(m, game, dt) {
    var cat = game.cat, d = m.x - cat.x;
    m.fleeing = Math.abs(d) < MOUSE.scare;
    var speed;
    if (m.fleeing) {
      m.dir = d >= 0 ? 1 : -1;
      speed = MOUSE.flee;
    } else {
      m.wander += dt;
      if (Math.sin(m.wander * 1.3) > 0.97) m.dir = -m.dir;
      speed = MOUSE.wander;
    }
    m.x += m.dir * speed * dt;
    m.cornered = false;
    if (m.x < m.min) { m.x = m.min; m.cornered = m.fleeing; if (!m.fleeing) m.dir = 1; }
    if (m.x > m.max) { m.x = m.max; m.cornered = m.fleeing; if (!m.fleeing) m.dir = -1; }
  }

  /**
   * Ein Simulationsschritt. input: { left, right, duck, jumpHeld, jump (beim
   * Drücken), pounce (beim Drücken) }. Gibt Ereignisse zurück ("jump",
   * "pounce", "land", "hit", "bird", "mouse", "level", "gameover").
   */
  function step(game, dt, input) {
    var events = [];
    if (game.status !== "running") return events;
    input = input || {};
    var cat = game.cat, level = game.level;

    game.time += dt;
    if (game.invulnerable > 0) game.invulnerable = Math.max(0, game.invulnerable - dt);
    cat.pounceCooldown = Math.max(0, cat.pounceCooldown - dt);

    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var wantDuck = Boolean(input.duck);

    // Langes Halten in dieselbe Richtung macht schneller
    if (dir !== 0 && dir === cat.heldDir) cat.held += dt;
    else cat.held = 0;
    cat.heldDir = dir;
    if (dir !== 0 && !cat.pouncing) cat.facing = dir;

    // Satz nach vorn (Mäusejagd)
    if (input.pounce && cat.onGround && !wantDuck && cat.pounceCooldown <= 0) {
      cat.pouncing = true;
      cat.onGround = false;
      cat.vy = POUNCE.vy;
      cat.vx = cat.facing * POUNCE.vx;
      cat.sinceGround = COYOTE;
      events.push("pounce");
    }

    // Laufen
    if (!cat.pouncing) {
      var ducked = wantDuck && cat.onGround;
      var target = dir * (ducked ? CRAWL : WALK * sprintFactor(cat));
      var rate = dir !== 0 ? (cat.onGround ? ACCEL : AIR_ACCEL) : (cat.onGround ? FRICTION : AIR_ACCEL * 0.5);
      cat.vx = approach(cat.vx, target, rate * dt);
    }

    // Springen (mit „Coyote Time“ und Sprungpuffer, damit es sich fair anfühlt)
    if (input.jump) cat.jumpBuffer = JUMP_BUFFER;
    else cat.jumpBuffer = Math.max(0, cat.jumpBuffer - dt);
    cat.sinceGround = cat.onGround ? 0 : cat.sinceGround + dt;
    var canJump = (cat.onGround || cat.sinceGround < COYOTE) && !cat.pouncing;
    if (cat.jumpBuffer > 0 && canJump && !wantDuck && cat.vy <= 0) {
      cat.vy = JUMP_SPEED;
      cat.onGround = false;
      cat.sinceGround = COYOTE;
      cat.jumpBuffer = 0;
      events.push("jump");
    }
    if (!input.jumpHeld && !cat.pouncing && cat.vy > JUMP_CUT) cat.vy = JUMP_CUT;

    // Bewegung und Schwerkraft
    var oldX = cat.x;
    cat.x = Math.max(40, Math.min(level.length, cat.x + cat.vx * dt));
    if (cat.x !== oldX + cat.vx * dt) cat.vx = 0; // am Levelrand
    cat.distance += Math.abs(cat.x - oldX);
    if (!cat.onGround) {
      cat.vy -= (GRAVITY + (wantDuck && !cat.pouncing ? FAST_FALL : 0)) * dt;
      cat.y += cat.vy * dt;
      if (cat.y <= 0) {
        cat.y = 0;
        cat.vy = 0;
        cat.onGround = true;
        if (cat.pouncing) {
          cat.pouncing = false;
          cat.pounceCooldown = POUNCE.cooldown;
          cat.vx *= 0.4;
        }
        events.push("land");
      }
    }
    cat.ducking = wantDuck && cat.onGround;

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

    // Mäuse: flüchten vor der Katze, fangen nur mit einem Satz
    level.mice.forEach(function (m) {
      if (m.caught) return;
      updateMouse(m, game, dt);
      if (cat.pouncing && Math.abs(m.x - (cat.x + cat.facing * 18)) < MOUSE.catchX && cat.y < MOUSE.catchY) {
        m.caught = true;
        game.score += POINTS.mouse;
        game.popups.push({ text: "+" + POINTS.mouse, x: m.x, y: 30, age: 0 });
        events.push("mouse");
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
    WALK: WALK,
    SPRINT: SPRINT,
    CRAWL: CRAWL,
    POUNCE: POUNCE,
    buildLevel: buildLevel,
    createGame: createGame,
    catBox: catBox,
    sprintFactor: sprintFactor,
    birdPosition: birdPosition,
    step: step
  };
})(typeof window !== "undefined" ? window : globalThis);
