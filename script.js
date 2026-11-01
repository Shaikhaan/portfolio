(function () {
  var c = document.getElementById('sky'), ctx = c.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAD = 0, TH0 = .545, W, H, dpr, back, clouds, city, comet, bloom, beacons = [], meteors = [], lastSpawn = 0, sparks = [], strands = [];
  var prog = 0, target = 0; // scroll progress 0..1, eased toward target

  // Seeded random numbers, so the sky and the city are laid out the same on every visit
  var SEED = 3, seed = SEED;
  function rnd() {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rand(a, b) { return a + rnd() * (b - a); }

  // Some browsers (older Safari) ignore canvas blur filters; there, glows use canvas shadows instead
  var canBlur = (function () {
    try {
      var t = document.createElement('canvas'); t.width = t.height = 9;
      var x = t.getContext('2d'); x.filter = 'blur(2px)'; x.fillStyle = '#fff'; x.fillRect(4, 4, 1, 1);
      return x.getImageData(1, 4, 1, 1).data[3] > 0;
    } catch (e) { return false; }
  })();
  function soft(x, px, color) {
    if (canBlur) x.filter = 'blur(' + px + 'px)';
    else { x.shadowBlur = px * 2; x.shadowColor = color; }
  }
  function sharp(x) { x.filter = 'none'; x.shadowBlur = 0; x.shadowColor = 'rgba(0,0,0,0)'; }
  function padded() {
    var l = document.createElement('canvas'); l.width = (W + 2 * PAD) * dpr; l.height = (H + 2 * PAD) * dpr;
    var x = l.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr); return x;
  }
  function layer(h) { var l = document.createElement('canvas'); l.width = W * dpr; l.height = (h || H) * dpr; var x = l.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return x; }

  function setup() {
    seed = SEED;
    // Smaller or weaker devices draw at a lower resolution
    var weak = innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
    dpr = Math.min(devicePixelRatio || 1, weak ? 1.25 : 1.5);
    W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var horizon = H * .7;

    // Back: deep blue night that turns violet toward the city's light, with a dense field of stars
    back = layer();
    var bg = back.createLinearGradient(0, 0, 0, horizon);
    bg.addColorStop(0, '#081325'); bg.addColorStop(.45, '#122a4e'); bg.addColorStop(.8, '#25406e'); bg.addColorStop(1, '#4b4d8c');
    back.fillStyle = bg; back.fillRect(0, 0, W, H);
    var haze = back.createRadialGradient(W * .45, horizon, 0, W * .45, horizon, W * .7);
    haze.addColorStop(0, 'rgba(215,150,255,.45)'); haze.addColorStop(.4, 'rgba(150,120,255,.15)'); haze.addColorStop(1, 'rgba(150,120,255,0)');
    back.fillStyle = haze; back.fillRect(0, 0, W, H);
    for (var i = 0; i < W * H / 2500; i++) {
      var sx = rand(0, W), sy = rand(0, horizon * .92), big = rnd() < .04;
      back.globalAlpha = big ? 1 : rand(.25, .85);
      back.fillStyle = rnd() < .15 ? '#cfe2ff' : '#fff';
      back.beginPath(); back.arc(sx, sy, big ? 1.4 : rand(.3, .9), 0, 7); back.fill();
      if (big) {
        var sg = back.createRadialGradient(sx, sy, 0, sx, sy, 7);
        sg.addColorStop(0, 'rgba(190,220,255,.6)'); sg.addColorStop(1, 'rgba(190,220,255,0)');
        back.fillStyle = sg; back.beginPath(); back.arc(sx, sy, 7, 0, 7); back.fill();
      }
    }
    back.globalAlpha = 1;

    // Clouds, painted the way the film does them: each bank is a cluster of rounded puffs with a
    // thin silver rim along the top, a dark blue body, a violet underside lit by the city, and
    // a little brush texture on top
    clouds = layer(H * 1.2);
    var paint = layer(H * 1.2);
    function bank(cx, cy, w, h) {
      var puffs = [], n = Math.round(w / 5), k;
      for (k = 0; k < n; k++) {
        var u = rand(-1, 1), edge = 1 - u * u;
        puffs.push({ x: cx + u * w * .5, y: cy - rand(0, h * .45) * edge + rand(-h * .06, h * .12), r: h * rand(.14, .36) * (.4 + .6 * edge) });
      }
      // Smaller puffs bubbling off the tops and sides
      for (k = 0; k < n * .6; k++) {
        var p = puffs[(rnd() * puffs.length) | 0];
        puffs.push({ x: p.x + rand(-1, 1) * p.r, y: p.y - rand(.2, .9) * p.r, r: p.r * rand(.25, .5) });
      }
      var t = paint, lit = Math.min(1, cy / (H * .6));
      t.clearRect(0, 0, W, H * 1.2);
      t.save();
      t.beginPath();
      puffs.forEach(function (q) { t.moveTo(q.x + q.r, q.y); t.arc(q.x, q.y, q.r, 0, 7); });
      t.fillStyle = 'rgb(' + Math.round(196 + lit * 20) + ',' + Math.round(210 + lit * 5) + ',245)';
      t.fill();
      t.globalCompositeOperation = 'source-atop';
      t.filter = 'blur(2px)';
      t.fillStyle = 'rgb(' + Math.round(92 + lit * 25) + ',' + Math.round(108 + lit * 15) + ',' + Math.round(150 + lit * 20) + ')';
      puffs.forEach(function (q) { t.beginPath(); t.arc(q.x + q.r * .05, q.y + q.r * .3, q.r * .95, 0, 7); t.fill(); });
      t.filter = 'blur(8px)';
      t.fillStyle = 'rgba(30,40,70,.28)';
      puffs.forEach(function (q) { t.beginPath(); t.arc(q.x, q.y + q.r * .6, q.r * .75, 0, 7); t.fill(); });
      t.filter = 'none';
      var under = t.createLinearGradient(0, cy - h * .1, 0, cy + h * .35);
      under.addColorStop(0, 'rgba(170,135,240,0)'); under.addColorStop(1, 'rgba(170,135,240,' + (.15 + lit * .3) + ')');
      t.fillStyle = under; t.fillRect(cx - w, cy - h, w * 2, h * 2);
      for (k = 0; k < w / 2; k++) {
        t.fillStyle = rnd() < .5 ? 'rgba(210,222,250,.07)' : 'rgba(8,14,28,.09)';
        t.beginPath(); t.ellipse(cx + rand(-.5, .5) * w, cy - rand(-.1, .6) * h, rand(4, 16), rand(1.5, 5), rand(-.3, .3), 0, 7); t.fill();
      }
      t.restore();
      clouds.save(); clouds.filter = 'blur(.6px)'; clouds.drawImage(t.canvas, 0, 0, W, H * 1.2); clouds.restore();
    }
    [[.12, .08, 1.2], [.5, .03, 1], [.86, .12, 1.1], [.3, .2, .9], [.7, .27, 1], [.05, .33, .8], [.95, .38, .7], [.42, .42, .55], [.2, .55, .45], [.78, .58, .45]]
      .forEach(function (b) { bank(b[0] * W, b[1] * H, W * .44 * b[2] * (W < 700 ? 1.7 : 1), Math.min(H * .1, W * .2) * b[2]); });

    // City: three rows of towers that get darker and sharper toward you, with violet haze between
    // the rows. Windows are also drawn on a separate layer that is blurred and added back as glow.
    city = layer();
    var lights = layer();
    beacons = [];
    function row(base, minH, maxH, body, lightP, scale, dim) {
      var x = -10;
      while (x < W + 10) {
        var bw = rand(24, 64) * scale, mid = 1 - Math.abs(x / W - .45) * 1.6;
        var bh = rand(minH, maxH) * (.5 + Math.max(0, mid)) * scale, top = base - bh;
        var g = city.createLinearGradient(0, top, 0, base);
        g.addColorStop(0, body[0]); g.addColorStop(1, body[1]);
        city.fillStyle = g;
        city.fillRect(x, top, bw, bh + 2);
        var shape = rnd();
        if (shape < .04) { city.beginPath(); city.ellipse(x + bw / 2, top, bw / 2, bw * .3, 0, Math.PI, 0); city.fill(); }
        else if (shape < .32) { city.fillRect(x + bw * .2, top - bh * .08, bw * .6, bh * .08 + 1); }
        else if (shape < .42) { city.fillRect(x + bw / 2 - 1, top - bh * .12, 2, bh * .12); }
        for (var wy = top + 5 * scale; wy < base - 4; wy += 6.5 * scale) {
          var floorLit = rnd() < .5 ? lightP * 1.8 : lightP * .5;
          for (var wx = x + 3 * scale; wx < x + bw - 4 * scale; wx += 5.5 * scale) {
            if (rnd() < floorLit) {
              var warm = rnd() < .65;
              var col = warm ? 'rgba(255,210,140,' : (rnd() < .5 ? 'rgba(225,238,255,' : 'rgba(255,170,220,');
              var a = rand(.5, 1) * dim;
              city.fillStyle = col + a + ')'; city.fillRect(wx, wy, 2.2 * scale, 2.6 * scale);
              lights.fillStyle = col + a + ')'; lights.fillRect(wx, wy, 2.2 * scale, 2.6 * scale);
            }
          }
        }
        if (bh > maxH * .85 * scale && rnd() < .6) beacons.push({ x: x + bw / 2, y: top - bh * .12 - 2, p: rand(0, 6.3) });
        x += bw + rand(1, 7);
      }
    }
    function hazeBand(y, a) {
      var g = city.createLinearGradient(0, y - H * .08, 0, y);
      g.addColorStop(0, 'rgba(170,130,255,0)'); g.addColorStop(1, 'rgba(170,130,255,' + a + ')');
      city.fillStyle = g; city.fillRect(0, y - H * .08, W, H * .08);
    }
    row(horizon + H * .02, H * .04, H * .11, ['#575c9c', '#40457f'], .14, .75, .55);
    hazeBand(horizon + H * .04, .3);
    row(horizon + H * .07, H * .03, H * .09, ['#323d6c', '#222a4c'], .2, 1, .85);
    hazeBand(horizon + H * .09, .18);
    city.fillStyle = '#121a2e'; city.fillRect(0, horizon + H * .12, W, H);
    row(horizon + H * .15, H * .02, H * .06, ['#1e2644', '#12182c'], .28, 1.25, 1);
    // Glow from the lit windows
    city.save();
    city.globalCompositeOperation = 'lighter';
    soft(city, 4, 'rgba(255,210,150,.8)'); city.globalAlpha = canBlur ? .7 : .35; city.drawImage(lights.canvas, 0, 0, W, H);
    soft(city, 16, 'rgba(200,150,255,.6)'); city.globalAlpha = canBlur ? .5 : .25; city.drawImage(lights.canvas, 0, 0, W, H);
    sharp(city);
    city.restore();
    // Railing in the foreground, then mist fading the bottom into the page
    var ry = H * .9;
    city.fillStyle = '#070b14';
    city.fillRect(0, ry, W, 4);
    for (var bx = 0; bx < W; bx += 16) city.fillRect(bx, ry, 2.5, H * .1);
    var mist = city.createLinearGradient(0, H * .8, 0, H);
    mist.addColorStop(0, 'rgba(10,20,36,0)'); mist.addColorStop(1, 'rgba(10,20,36,.95)');
    city.fillStyle = mist; city.fillRect(0, H * .8, W, H * .2);

    sparks = []; strands = [];
    for (var m = 0; m < 90; m++) sparks.push({ f: rnd(), o: rand(.05, .95), r: rand(.5, 1.6), p: rand(0, 6.3) });
    // Fine streaks that feather off the outer edge of the tail
    for (var q = 0; q < 140; q++) strands.push({ f: rand(.15, 1), o: rand(.55, 1.05), len: rand(12, 60), a: rand(.08, .3) });
    // The comet is painted once onto an oversized layer, then slid along its path as you scroll
    PAD = Math.round(Math.max(W, H) * .35);
    comet = padded(); bloom = padded(); paintComet(comet, TH0);
  }

  // Comet path: in from beyond the top right, curving down toward the city
  function pt(t) {
    var x0 = W * 1.02, y0 = -H * .12, cx = W * .62, cy = H * .15, x1 = W * .25, y1 = H * .9;
    var u = 1 - t;
    return { x: u * u * x0 + 2 * u * t * cx + t * t * x1, y: u * u * y0 + 2 * u * t * cy + t * t * y1 };
  }
  // Unit tangent (direction of travel) and the normal pointing to the tail's outer, right-hand side
  function frame(t) {
    var a = pt(Math.max(0, t - .002)), b = pt(Math.min(1, t + .002));
    var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    return { tx: dx / l, ty: dy / l, nx: -dy / l, ny: dx / l };
  }
  function ribbonWidth() { return Math.min(W, 1400) * .17; }
  // Point inside the tail: s runs 0 (head) to 1 (far end), o runs 0 (inner white edge) to 1 (outer haze)
  function at(th, t0, s, o) {
    var t = th - (th - t0) * s, p = pt(t), f = frame(t), w = 1.5 + ribbonWidth() * Math.pow(s, 1.25);
    if (f.nx > 0) { f.nx = -f.nx; f.ny = -f.ny; }
    return { x: p.x - f.nx * w * o, y: p.y - f.ny * w * o, f: f, w: w };
  }

  function paintComet(x, th) {
    var t0 = 0, N = 60;
    x.clearRect(-PAD, -PAD, W + 2 * PAD, H + 2 * PAD);
    x.save();
    x.globalCompositeOperation = 'lighter';
    var far = at(th, t0, 1, .3), head = at(th, t0, 0, 0);
    // Colour bands across the tail, from the white inner edge out to a wide violet-blue haze
    var bands = [
      [.55, 1.15, '90,120,255', .22, 10],
      [.42, .78, '150,90,255', .45, 6],
      [.28, .55, '255,90,190', .75, 4],
      [.2, .32, '120,255,210', .4, 3],
      [.04, .24, '80,225,255', 1, 3],
      [0, .045, '255,255,255', .9, 2],
      [0, .015, '255,255,255', 1, 0]
    ];
    bands.forEach(function (b) {
      x.beginPath();
      for (var i = 0; i <= N; i++) { var q = at(th, t0, i / N, b[0]); if (i) x.lineTo(q.x, q.y); else x.moveTo(q.x, q.y); }
      for (var j = N; j >= 0; j--) { var r = at(th, t0, j / N, b[1]); x.lineTo(r.x, r.y); }
      x.closePath();
      var g = x.createLinearGradient(head.x, head.y, far.x, far.y);
      g.addColorStop(0, 'rgba(' + b[2] + ',' + b[3] * .4 + ')');
      g.addColorStop(.12, 'rgba(' + b[2] + ',' + b[3] + ')');
      g.addColorStop(1, 'rgba(' + b[2] + ',' + b[3] * .7 + ')');
      x.fillStyle = g;
      soft(x, b[4], 'rgba(' + b[2] + ',' + b[3] + ')');
      x.fill();
    });
    sharp(x);
    // Feathered streaks off the outer edge, swept back along the tail
    x.lineCap = 'round'; x.lineWidth = 1;
    strands.forEach(function (s) {
      var q = at(th, t0, s.f, s.o), dx = -q.f.nx * .8 - q.f.tx * .6, dy = -q.f.ny * .8 - q.f.ty * .6;
      if (q.f.nx > 0) { dx = q.f.nx * .8 - q.f.tx * .6; dy = q.f.ny * .8 - q.f.ty * .6; }
      x.strokeStyle = 'rgba(150,170,255,' + s.a + ')';
      x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(q.x + dx * s.len * s.f, q.y + dy * s.len * s.f); x.stroke();
    });

    // The split. A thin blue streak runs on from the tip to a bright blue point;
    // a second streak leaves the tail higher up and ends in a red-orange spark.
    var reach = H * .09;
    var hf = frame(th), tip = pt(th);
    var blue = { x: tip.x + hf.tx * reach, y: tip.y + hf.ty * reach };
    var from = at(th, t0, .2, .5);
    var red = { x: from.x + hf.tx * reach * 1.25, y: from.y + hf.ty * reach * 1.25 };
    function streak(a, b, color, w) {
      var g = x.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(' + color + ',0)'); g.addColorStop(.4, 'rgba(' + color + ',.7)'); g.addColorStop(1, 'rgba(' + color + ',1)');
      x.strokeStyle = g; x.lineWidth = w; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
    }
    function spark(p, r, inner, outer) {
      var g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, '#fff'); g.addColorStop(.2, inner); g.addColorStop(1, outer);
      x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.fill();
    }
    var back = at(th, t0, .08, .02);
    streak(back, blue, '160,225,255', 2.2);
    streak(back, blue, '90,170,255', 6);
    streak(from, red, '150,160,255', 1.3);
    spark(blue, 12, 'rgba(110,200,255,.9)', 'rgba(110,200,255,0)');
    spark(red, 10, 'rgba(255,110,70,.95)', 'rgba(255,90,60,0)');
    // A small flared "V" trailing the red spark
    x.strokeStyle = 'rgba(255,120,80,.8)'; x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(red.x - hf.tx * 9 + hf.nx * 4, red.y - hf.ty * 9 + hf.ny * 4); x.lineTo(red.x, red.y);
    x.lineTo(red.x - hf.tx * 9 - hf.nx * 4, red.y - hf.ty * 9 - hf.ny * 4); x.stroke();
    x.restore();

    // Bloom: add a blurred copy of the whole comet on top of itself so it glows
    var full = [-PAD, -PAD, W + 2 * PAD, H + 2 * PAD];
    bloom.clearRect(full[0], full[1], full[2], full[3]);
    bloom.drawImage(x.canvas, full[0], full[1], full[2], full[3]);
    x.save();
    x.globalCompositeOperation = 'lighter';
    soft(x, 22, 'rgba(150,210,255,.7)'); x.globalAlpha = canBlur ? .45 : .2; x.drawImage(bloom.canvas, full[0], full[1], full[2], full[3]);
    soft(x, 6, 'rgba(255,255,255,.5)'); x.globalAlpha = canBlur ? .25 : .1; x.drawImage(bloom.canvas, full[0], full[1], full[2], full[3]);
    sharp(x);
    x.restore();
  }

  function drawComet(time) {
    // The tip falls as you scroll, but stops well above the towers. Only the finished image moves.
    var th = .46 + .17 * prog, a = pt(TH0), b = pt(th), dx = b.x - a.x, dy = b.y - a.y;
    ctx.drawImage(comet.canvas, dx - PAD, dy - PAD, W + 2 * PAD, H + 2 * PAD);
    if (lite) return;
    // Glitter inside the tail, redrawn every frame so it can shimmer
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#fff';
    sparks.forEach(function (s) {
      var f = reduce ? s.f : (s.f + time * .00002) % 1, q = at(TH0, 0, f, s.o); q.x += dx; q.y += dy;
      ctx.globalAlpha = (reduce ? .7 : .4 + .5 * Math.sin(s.p + time * .002)) * Math.min(1, f * 4);
      ctx.beginPath(); ctx.arc(q.x, q.y, s.r, 0, 7); ctx.fill();
      // The bigger sparkles get a four-point glint
      if (s.r > 1.2) {
        var L = s.r * 5;
        ctx.fillRect(q.x - L, q.y - .4, L * 2, .8);
        ctx.fillRect(q.x - .4, q.y - L, .8, L * 2);
      }
    });
    // A soft gleam that slides down the bright edge toward the tip every few seconds
    var k = reduce ? .35 : 1 - (time / 4500) % 1, gq = at(TH0, 0, k, .05); gq.x += dx; gq.y += dy;
    var gg = ctx.createRadialGradient(gq.x, gq.y, 0, gq.x, gq.y, 40);
    gg.addColorStop(0, 'rgba(255,255,255,.45)'); gg.addColorStop(.25, 'rgba(170,235,255,.12)'); gg.addColorStop(1, 'rgba(170,235,255,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gq.x, gq.y, 40, 0, 7); ctx.fill();
    ctx.restore();
  }

  // Meteors: fragments of the comet falling out of the cloud base. Most are blue-white,
  // the odd one burns red and throws off a few sparks.
  function spawn(now) {
    var red = Math.random() < .14;
    meteors.push({
      x: rand(W * .05, W * .95), y: rand(H * .12, H * .4),
      ang: rand(1.35, 1.75) + (Math.random() < .5 ? 0 : -.05),
      len: red ? rand(60, 120) : rand(120, 320), speed: rand(.12, .3) * H / 1000,
      born: now, life: rand(1600, 3200), red: red
    });
  }

  function drawMeteor(m, now) {
    var age = (now - m.born) / m.life;
    if (age > 1) return false;
    var dist = (now - m.born) * m.speed;
    var hx = m.x + Math.cos(m.ang) * dist, hy = m.y + Math.sin(m.ang) * dist;
    var tl = Math.min(m.len, dist + 20);
    var tx = hx - Math.cos(m.ang) * tl, ty = hy - Math.sin(m.ang) * tl;
    var fade = age < .15 ? age / .15 : 1 - (age - .15) / .85;
    var col = m.red ? '255,120,90' : '140,215,255';
    var g = ctx.createLinearGradient(tx, ty, hx, hy);
    g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(1, 'rgba(' + col + ',' + fade + ')');
    ctx.strokeStyle = g; ctx.lineCap = 'round';
    ctx.lineWidth = 6; ctx.globalAlpha = .25; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.globalAlpha = 1; ctx.stroke();
    var hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 8);
    hg.addColorStop(0, 'rgba(255,255,255,' + fade + ')'); hg.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, 7); ctx.fill();
    if (m.red) {
      ctx.fillStyle = 'rgba(255,170,120,' + fade + ')';
      for (var s = 0; s < 6; s++) {
        var a = m.ang + Math.PI + rand(-.6, .6), r = rand(3, 14);
        ctx.fillRect(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 1.2, 1.2);
      }
    }
    return true;
  }

  function draw(now) {
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(back.canvas, 0, 0, W, H);
    drawComet(now);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (reduce) {
      // A still frame: a handful of streaks frozen mid-fall
      if (!meteors.length) for (var i = 0; i < 7; i++) { spawn(0); meteors[i].born = -rand(300, 900); }
      meteors.forEach(function (m) { drawMeteor(m, 0); });
    } else {
      if (!lite && now - lastSpawn > rand(900, 1600)) { spawn(now); lastSpawn = now; }
      meteors = meteors.filter(function (m) { return drawMeteor(m, now); });
    }
    ctx.restore();
    // Clouds rise a little as you scroll down the page
    ctx.drawImage(clouds.canvas, 0, -prog * H * .12, W, H * 1.2);
    ctx.drawImage(city.canvas, 0, 0, W, H);
    // Red aircraft lights on the tallest towers, pulsing slowly
    beacons.forEach(function (b) {
      ctx.globalAlpha = reduce ? .8 : .45 + .4 * Math.sin(b.p + now * .002);
      ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.arc(b.x, b.y, 1.6, 0, 7); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function readScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  }

  // The preview frame can start at zero size; wait for a real size, and rebuild if it changes.
  // On phones the address bar changes the height a little while scrolling; that is not worth a rebuild.
  function sized() { return innerWidth > 0 && innerHeight > 0; }
  function changed() { return W !== innerWidth || Math.abs(H - innerHeight) > H * .25; }
  function ensure() {
    if (!sized()) return false;
    if (!back || changed()) { setup(); readScroll(); meteors = []; }
    return true;
  }
  function safeDraw(t) { if (ensure()) { try { draw(t); } catch (e) { back = null; } } }

  // If the device struggles to keep up, drop the small effects and draw every other frame
  var lite = false, avg = 16, lastT = 0, odd = false;
  var running = true;
  function loop(t) {
    if (!running) return;
    requestAnimationFrame(loop);
    var dt = t - lastT; lastT = t;
    if (dt > 0 && dt < 250) avg = avg * .95 + dt * .05;
    if (!lite && avg > 26) lite = true;
    prog += (target - prog) * .08;
    if (lite && (odd = !odd)) return;
    safeDraw(t);
  }

  if (sized()) { setup(); readScroll(); prog = target; }
  if (reduce) {
    safeDraw(0);
    addEventListener('scroll', function () { readScroll(); prog = target; safeDraw(0); }, { passive: true });
  } else {
    addEventListener('scroll', readScroll, { passive: true });
    requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', function () {
      var was = running; running = !document.hidden;
      if (running && !was) requestAnimationFrame(loop);
    });
  }
  // Copy email
  document.getElementById('copy').addEventListener('click', function () {
    var btn = this, el = document.getElementById('email');
    function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = 'Copy email'; }, 1600); }
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(el);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected, press Ctrl+C');
    }
    if (navigator.clipboard) navigator.clipboard.writeText(el.textContent).then(function () { done('Copied'); }, fallback);
    else fallback();
  });

  addEventListener('resize', function () { if (sized() && changed()) { setup(); readScroll(); if (reduce) { prog = target; safeDraw(0); } } });
})();
