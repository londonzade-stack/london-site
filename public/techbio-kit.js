/*!
 * TechBio Kit 1.0.0
 * Procedural "tech bio" visuals: white hairline wireframe objects, glyph wave fields,
 * mint-node schematic graphs and organic bio strands on a flat charcoal ground.
 * Original procedural geometry. No images. The only external resource is three.js r160,
 * loaded on first use from https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js
 * Works inline (classic <script>), inside <iframe srcdoc>, with or without a sandbox origin.
 */
(function (root) {
  'use strict';
  if (root.TechBio && root.TechBio.version) return;

  var VERSION = '1.0.0';
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  var COLORS = {
    bg: '#121314', bg2: '#16171a', ink: '#f3f4f2', muted: '#8d9196', faint: '#55595e',
    line: '#ffffff', node: '#a6f3c3', hair: 'rgba(255,255,255,0.14)'
  };
  var GLYPHS = '{}()[]<>/\\|;:=+-*01ef8ixao#%&$~^?!lkcz';

  /* ------------------------------------------------------------------ three loader */
  var THREE = null, threeP = null;
  function loadThree() {
    if (!threeP) {
      var url = root.TECHBIO_THREE_URL || THREE_URL;
      threeP = (root.THREE && root.THREE.WebGLRenderer ? Promise.resolve(root.THREE) : import(url))
        .then(function (m) { THREE = m; return m; });
    }
    return threeP;
  }

  /* ------------------------------------------------------------------ math utils */
  var TAU = Math.PI * 2, DEG = Math.PI / 180;
  var clamp = function (v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  var damp = function (c, t, lambda, dt) { return lerp(c, t, 1 - Math.exp(-lambda * dt)); };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  function rng(seed) {
    var s = (seed >>> 0) || 0x9e3779b9;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  var V = {
    add: function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; },
    sub: function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
    mul: function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; },
    madd: function (a, b, s) { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; },
    dot: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cross: function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
    len: function (a) { return Math.hypot(a[0], a[1], a[2]); },
    norm: function (a) { var l = Math.hypot(a[0], a[1], a[2]); return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; },
    lerp: function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  };
  var Z3 = [0, 0, 0];

  function parseColor(c, fb) {
    if (fb === undefined) fb = [1, 1, 1];
    if (Array.isArray(c)) return c;
    if (typeof c !== 'string') return fb;
    c = c.trim();
    if (c[0] === '#') {
      var h = c.slice(1);
      if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join('');
      var n = parseInt(h.slice(0, 6), 16);
      return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1];
    }
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] === undefined ? 1 : p[3]];
    }
    return fb;
  }
  function rgba(c, a) { var p = parseColor(c); return 'rgba(' + Math.round(p[0] * 255) + ',' + Math.round(p[1] * 255) + ',' + Math.round(p[2] * 255) + ',' + a + ')'; }
  function resolveBg(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var p = parseColor(getComputedStyle(n).backgroundColor, null);
      if (p && p[3] > 0.5) return p.slice(0, 3);
    }
    return parseColor(COLORS.bg).slice(0, 3);
  }
  function $(el) { return typeof el === 'string' ? document.querySelector(el) : el; }

  /* ------------------------------------------------------------------ environment */
  var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduced = !!(mq && mq.matches);
  var pointer = { x: 0, y: 0 };
  if (mq) {
    var onMq = function (e) { reduced = e.matches; Ticker.items.forEach(function (i) { i.invalidate && i.invalidate(); }); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  root.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var w = root.innerWidth || 1, h = root.innerHeight || 1;
    pointer.x = clamp((e.clientX / w) * 2 - 1, -1, 1);
    pointer.y = clamp((e.clientY / h) * 2 - 1, -1, 1);
  }, { passive: true });
  document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { pointer.x = 0; pointer.y = 0; } });

  /* ------------------------------------------------------------------ shared ticker (one rAF for the whole kit) */
  var Ticker = {
    items: [], raf: 0, last: 0, frame: 0,
    add: function (it) { this.items.push(it); this.items.sort(function (a, b) { return a.priority - b.priority; }); this.wake(); },
    remove: function (it) { var i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); },
    wake: function () { if (!this.raf) this.raf = requestAnimationFrame(this.tick); },
    tick: function (now) {
      var T = Ticker; T.raf = 0; T.frame++;
      var dt = T.last ? clamp((now - T.last) / 1000, 0, 0.05) : 1 / 60; T.last = now;
      var again = false, list = T.items.slice();
      for (var i = 0; i < list.length; i++) { try { if (list[i]._step(dt)) again = true; } catch (err) { console.warn('[TechBio]', err); } }
      if (again) T.raf = requestAnimationFrame(T.tick); else T.last = 0;
    }
  };
  function observe(el, inst) {
    if (!('IntersectionObserver' in root)) return null;
    var io = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) inst.visible = es[i].isIntersecting;
      if (inst.visible) { inst.dirty = true; Ticker.wake(); }
    }, { rootMargin: '120px' });
    io.observe(el);
    return io;
  }
  function makeCanvas(host, z) {
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;';
    if (z != null) c.style.zIndex = z;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(c);
    return c;
  }

  /* ------------------------------------------------------------------ geometry builder */
  function Builder() { this.lp = []; this.ln = []; this.lw = []; this.lr = []; this.fp = []; this.fn = []; this.anchors = {}; }
  Builder.prototype.line = function (a, b, w, na, nb, ra, rb) {
    if (w === undefined) w = 1; na = na || Z3; nb = nb || na;
    this.lp.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    this.ln.push(na[0], na[1], na[2], nb[0], nb[1], nb[2]);
    this.lw.push(w, w);
    this.lr.push(ra == null ? NaN : ra, rb == null ? (ra == null ? NaN : ra) : rb);
  };
  Builder.prototype.curve = function (pts, w, closed, nrm, rs) {
    var n = pts.length; if (n < 2) return;
    var m = n - 1 + (closed ? 1 : 0);
    for (var i = 0; i < m; i++) {
      var j = (i + 1) % n;
      var na = nrm ? (Array.isArray(nrm[0]) ? nrm[i] : nrm) : Z3, nb = nrm ? (Array.isArray(nrm[0]) ? nrm[j] : nrm) : Z3;
      this.line(pts[i], pts[j], w, na, nb, rs ? (Array.isArray(rs) ? rs[i] : rs) : null, rs ? (Array.isArray(rs) ? rs[j] : rs) : null);
    }
  };
  Builder.prototype.tri = function (a, b, c, na, nb, nc) {
    this.fp.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.fn.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
  };
  /* P: rows i x columns j of points. ring = curve along j for fixed i; long = curve along i for fixed j. */
  Builder.prototype.mesh = function (P, o) {
    o = o || {};
    var ni = P.length, nj = P[0].length, ci = !!o.ci, cj = !!o.cj, self = this;
    var at = function (i, j) { return P[ci ? (i + ni) % ni : clamp(i, 0, ni - 1)][cj ? (j + nj) % nj : clamp(j, 0, nj - 1)]; };
    var N = P.map(function (row, i) {
      return row.map(function (_, j) {
        var n = V.norm(V.cross(V.sub(at(i + 1, j), at(i - 1, j)), V.sub(at(i, j + 1), at(i, j - 1))));
        return o.flip ? V.mul(n, -1) : n;
      });
    });
    var lr = o.lr, i, j, w;
    var R = function (i, j) { return lr ? (typeof lr === 'function' ? lr(i, j) : lr) : null; };
    if (o.ring) {
      var rj0 = o.ringSpan ? o.ringSpan[0] : 0, rj1 = o.ringSpan ? o.ringSpan[1] : nj - (cj ? 0 : 1);
      for (i = 0; i < ni; i++) {
        w = typeof o.ring === 'function' ? o.ring(i, ni) : o.ring; if (!w) continue;
        for (j = rj0; j < rj1; j++) { var k = (j + 1) % nj; self.line(P[i][j], P[i][k], w, N[i][j], N[i][k], R(i, j), R(i, k)); }
      }
    }
    if (o.long) {
      var li0 = o.longSpan ? o.longSpan[0] : 0, li1 = o.longSpan ? o.longSpan[1] : ni - (ci ? 0 : 1);
      for (j = 0; j < nj; j++) {
        w = typeof o.long === 'function' ? o.long(j, nj) : o.long; if (!w) continue;
        for (i = li0; i < li1; i++) { var k2 = (i + 1) % ni; self.line(P[i][j], P[k2][j], w, N[i][j], N[k2][j], R(i, j), R(k2, j)); }
      }
    }
    if (o.fill !== false) {
      for (i = 0; i < ni - (ci ? 0 : 1); i++) {
        var i2 = (i + 1) % ni;
        for (j = 0; j < nj - (cj ? 0 : 1); j++) {
          var j2 = (j + 1) % nj;
          self.tri(P[i][j], P[i2][j], P[i2][j2], N[i][j], N[i2][j], N[i2][j2]);
          self.tri(P[i][j], P[i2][j2], P[i][j2], N[i][j], N[i2][j2], N[i][j2]);
        }
      }
    }
    return { P: P, N: N };
  };
  Builder.prototype.grid = function (f, ni, nj, o) {
    o = o || {};
    var P = [];
    for (var i = 0; i < ni + (o.ci ? 0 : 1); i++) {
      var row = [];
      for (var j = 0; j < nj + (o.cj ? 0 : 1); j++) row.push(f(i / ni, j / nj, i, j));
      P.push(row);
    }
    return this.mesh(P, o);
  };
  Builder.prototype.mark = function () { return { l: this.lp.length, f: this.fp.length }; };
  Builder.prototype.map = function (from, fp, fnrm) {
    var a = this.lp, b = this.ln, i, r;
    for (i = from.l; i < a.length; i += 3) { r = fp([a[i], a[i + 1], a[i + 2]]); a[i] = r[0]; a[i + 1] = r[1]; a[i + 2] = r[2]; r = fnrm([b[i], b[i + 1], b[i + 2]]); b[i] = r[0]; b[i + 1] = r[1]; b[i + 2] = r[2]; }
    a = this.fp; b = this.fn;
    for (i = from.f; i < a.length; i += 3) { r = fp([a[i], a[i + 1], a[i + 2]]); a[i] = r[0]; a[i + 1] = r[1]; a[i + 2] = r[2]; r = fnrm([b[i], b[i + 1], b[i + 2]]); b[i] = r[0]; b[i + 1] = r[1]; b[i + 2] = r[2]; }
  };
  Builder.prototype.mirror = function (from, axis) {
    axis = axis === undefined ? 2 : axis;
    var l1 = this.lp.length, f1 = this.fp.length, i;
    for (i = from.l; i < l1; i += 3) {
      this.lp.push(this.lp[i] * (axis === 0 ? -1 : 1), this.lp[i + 1] * (axis === 1 ? -1 : 1), this.lp[i + 2] * (axis === 2 ? -1 : 1));
      this.ln.push(this.ln[i] * (axis === 0 ? -1 : 1), this.ln[i + 1] * (axis === 1 ? -1 : 1), this.ln[i + 2] * (axis === 2 ? -1 : 1));
    }
    for (i = from.l / 3; i < l1 / 3; i++) { this.lw.push(this.lw[i]); this.lr.push(this.lr[i]); }
    for (i = from.f; i < f1; i += 3) {
      this.fp.push(this.fp[i] * (axis === 0 ? -1 : 1), this.fp[i + 1] * (axis === 1 ? -1 : 1), this.fp[i + 2] * (axis === 2 ? -1 : 1));
      this.fn.push(this.fn[i] * (axis === 0 ? -1 : 1), this.fn[i + 1] * (axis === 1 ? -1 : 1), this.fn[i + 2] * (axis === 2 ? -1 : 1));
    }
  };
  Builder.prototype.rotY180 = function () {
    var f = function (p) { return [-p[0], p[1], -p[2]]; };
    this.map({ l: 0, f: 0 }, f, f);
    for (var k in this.anchors) this.anchors[k] = f(this.anchors[k]);
  };

  /* --- shared shape helpers --- */
  function lathe(B, o) {
    var seg = o.seg || 24, c = o.c, ax = o.axis || 'x';
    var P = o.prof.map(function (pr) {
      var row = [];
      for (var j = 0; j < seg; j++) {
        var a = j / seg * TAU + (o.phase || 0), d = pr[0], r = pr[1], ca = Math.cos(a) * r, sa = Math.sin(a) * r;
        row.push(ax === 'x' ? [c[0] + d, c[1] + ca, c[2] + sa] : ax === 'y' ? [c[0] + ca, c[1] + d, c[2] + sa] : [c[0] + ca, c[1] + sa, c[2] + d]);
      }
      return row;
    });
    var le = o.longEvery || 2;
    return B.mesh(P, {
      cj: true,
      ring: function (i) { var w = o.prof[i][2]; return w === undefined ? (o.ringW === undefined ? 0.35 : o.ringW) : w; },
      long: function (j) { return j % le === 0 ? (o.longW === undefined ? 0.3 : o.longW) : 0; },
      fill: o.fill !== false, lr: o.lr
    });
  }
  function frames(pts, up) {
    var n = pts.length, T = [], N = [], Bn = [], i;
    for (i = 0; i < n; i++) T.push(V.norm(V.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
    var u = up || [0, 1, 0];
    var nrm = V.norm(V.cross(V.cross(T[0], u), T[0]));
    if (V.len(nrm) < 0.5) nrm = V.norm(V.cross(T[0], [1, 0, 0]));
    for (i = 0; i < n; i++) {
      if (i > 0) nrm = V.norm(V.sub(nrm, V.mul(T[i], V.dot(nrm, T[i]))));
      N.push(nrm); Bn.push(V.cross(T[i], nrm));
    }
    return { T: T, N: N, B: Bn };
  }
  function tube(B, pts, rad, sides, o) {
    o = o || {}; sides = sides || 8;
    var F = frames(pts, o.up), n = pts.length;
    var P = pts.map(function (p, i) {
      var r = typeof rad === 'function' ? rad(i / (n - 1)) : rad, row = [];
      for (var j = 0; j < sides; j++) { var a = j / sides * TAU; row.push(V.add(p, V.add(V.mul(F.N[i], Math.cos(a) * r), V.mul(F.B[i], Math.sin(a) * r)))); }
      return row;
    });
    return B.mesh(P, {
      cj: true,
      ring: o.ring !== undefined ? o.ring : function (i) { return (o.ringEvery && i % o.ringEvery === 0) ? (o.ringW === undefined ? 0.2 : o.ringW) : ((i === 0 || i === n - 1) && o.endW ? o.endW : 0); },
      long: o.longW === undefined ? 0.3 : o.longW,
      fill: o.fill === undefined ? true : o.fill, lr: o.lr
    });
  }
  function catmull(ctrl, samples, closed) {
    var n = ctrl.length, out = [], segs = closed ? n : n - 1;
    var get = function (i) { return closed ? ctrl[(i + n) % n] : ctrl[clamp(i, 0, n - 1)]; };
    for (var s = 0; s <= samples - (closed ? 1 : 0); s++) {
      var t = s / samples * segs, i = Math.min(segs - 1, Math.floor(t)), f = t - i;
      var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2), f2 = f * f, f3 = f2 * f;
      out.push(p1.map(function (_, k) { return 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3); }));
    }
    return out;
  }
  function resample(pts, n, closed) {
    var L = [0], i;
    for (i = 1; i < pts.length + (closed ? 1 : 0); i++) { var a = pts[i - 1], b = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0))); }
    var total = L[L.length - 1], out = [], k = 0;
    for (i = 0; i < n; i++) {
      var d = total * i / (closed ? n : n - 1);
      while (k < L.length - 2 && L[k + 1] < d) k++;
      var t = (d - L[k]) / ((L[k + 1] - L[k]) || 1), A = pts[k], Bp = pts[(k + 1) % pts.length];
      out.push(A.map(function (v, q) { return v + (Bp[q] - v) * t; }));
    }
    return out;
  }
  function rrect(w, d, r, seg) {
    seg = seg || 6; var hw = w / 2 - r, hd = d / 2 - r, out = [];
    var cs = [[hw, hd], [-hw, hd], [-hw, -hd], [hw, -hd]];
    for (var k = 0; k < 4; k++) for (var s = 0; s <= seg; s++) { var a = (k * 90 + s * 90 / seg) * DEG; out.push([cs[k][0] + r * Math.cos(a), cs[k][1] + r * Math.sin(a)]); }
    return out;
  }
  function chaikin(pts, it) { for (var q = 0; q < it; q++) { var o = []; for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]); o.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } pts = o; } return pts; }
  function densify(poly, per) { var o = []; for (var i = 0; i < poly.length; i++) { var a = poly[i], b = poly[(i + 1) % poly.length]; for (var s = 0; s < per; s++) o.push([lerp(a[0], b[0], s / per), lerp(a[1], b[1], s / per)]); } return o; }
  function circle(c, r, n, axis) {
    var out = []; n = n || 24;
    for (var i = 0; i < n; i++) { var a = i / n * TAU, x = Math.cos(a) * r, y = Math.sin(a) * r; out.push(axis === 'x' ? [c[0], c[1] + x, c[2] + y] : axis === 'z' ? [c[0] + x, c[1] + y, c[2]] : [c[0] + x, c[1], c[2] + y]); }
    return out;
  }

  /* ================================================================== MODELS */

  /* ---------- business jet (built nose +x, then turned so nose points screen-left) ---------- */
  function modelJet(B) {
    var R = 0.5, NOSE = 0.19, TAIL0 = 0.6;
    var fus = function (t) {
      var r = R, yc = 0, sz = 1;
      if (t < NOSE) { var u = t / NOSE; r = R * Math.pow(Math.max(0, 1 - Math.pow(1 - u, 1.85)), 0.72); yc = -0.26 * R * Math.pow(1 - u, 2.2); }
      else if (t > TAIL0) { var v = Math.min(1, (t - TAIL0) / (1 - TAIL0)); r = R * (1 - 0.8 * Math.pow(v, 1.45)); yc = 0.64 * R * Math.pow(v, 1.5); sz = 1 - 0.16 * v; }
      return { x: 5 - 10 * t, yc: yc, ry: r * 1.04, rz: r * sz };
    };
    var fnrm = function (t, th) { var f = fus(t); return V.norm([0, Math.cos(th) / Math.max(f.ry, 1e-3), Math.sin(th) / Math.max(f.rz, 1e-3)]); };
    var fpt = function (t, th, off) { var f = fus(t), n = fnrm(t, th); off = off || 0; return [f.x, f.yc + f.ry * Math.cos(th) + n[1] * off, f.rz * Math.sin(th) + n[2] * off]; };

    // fuselage skin
    var NI = 60, NJ = 48, ts = [];
    for (var i = 0; i <= NI; i++) { var s = i / NI; ts.push(0.5 - 0.5 * Math.cos(Math.PI * Math.pow(s, 0.92))); }
    var P = ts.map(function (t) { var row = []; for (var j = 0; j < NJ; j++) row.push(fpt(t, j / NJ * TAU)); return row; });
    B.mesh(P, {
      cj: true,
      ring: function (i) { return i < 2 ? 0 : (i % 5 === 0 ? 0.48 : 0.28); },
      long: function (j) { return j % 12 === 0 ? 0.55 : (j % 2 === 0 ? 0.3 : 0.17); }
    });
    // tail cap / APU
    var fe = fus(1);
    lathe(B, { c: [fe.x, fe.yc, 0], prof: [[0, fe.rz, 0.5], [-0.06, fe.rz * 0.8, 0.4], [-0.12, fe.rz * 0.45, 0.6], [-0.13, 0.0001, 0]], seg: 24, longEvery: 3, longW: 0.28 });
    // radome seam
    var seam = []; for (var q = 0; q < 40; q++) seam.push(fpt(0.05, q / 40 * TAU, 0.002));
    B.curve(seam, 0.8, true);

    // windows both sides
    [1, -1].forEach(function (sg) {
      var thc = sg * 73 * DEG;
      for (var k = 0; k < 7; k++) {
        var tc = 0.268 + k * 0.0405;
        [[1, 1.0], [1.45, 0.42]].forEach(function (sc) {
          var pts = [], nr = [];
          for (var q = 0; q < 26; q++) { var a = q / 26 * TAU, t = tc + 0.0098 * sc[0] * Math.cos(a), th = thc + 0.27 * sc[0] * Math.sin(a); pts.push(fpt(t, th, 0.004)); nr.push(fnrm(t, th)); }
          B.curve(pts, sc[1], true, nr);
        });
      }
      // windshield panes
      var panes = [
        [[0.074, 10], [0.114, 5], [0.12, 57], [0.082, 69]],
        [[0.119, 6], [0.155, 8], [0.153, 52], [0.124, 56]]
      ];
      panes.forEach(function (pane) {
        var poly = chaikin(densify(pane, 6), 2);
        [[1, 1.0], [0.82, 0.45]].forEach(function (sc) {
          var cx = 0, cy = 0; pane.forEach(function (p) { cx += p[0] / 4; cy += p[1] / 4; });
          var pts = [], nr = [];
          poly.forEach(function (p) { var t = cx + (p[0] - cx) * sc[0], th = sg * (cy + (p[1] - cy) * sc[0]) * DEG; pts.push(fpt(t, th, 0.005)); nr.push(fnrm(t, th)); });
          B.curve(pts, sc[1], true, nr);
        });
      });
    });
    // door (left side = -z in build frame)
    var door = chaikin(densify([[0.18, -22], [0.214, -22], [0.214, -118], [0.18, -118]], 5), 2);
    var dp = [], dn = []; door.forEach(function (p) { dp.push(fpt(p[0], p[1] * DEG, 0.004)); dn.push(fnrm(p[0], p[1] * DEG)); });
    B.curve(dp, 0.9, true, dn);
    B.line(fpt(0.2, -64 * DEG, 0.005), fpt(0.205, -64 * DEG, 0.005), 0.7);
    // belly / service panel lines
    [0.33, 0.47].forEach(function (t) { var pts = []; for (var q = 0; q <= 10; q++) pts.push(fpt(t + q * 0.006, (180 + 28) * DEG, 0.003)); B.curve(pts, 0.4); });

    // ---- lifting surfaces
    var K = 10, xs = [];
    for (var k2 = 0; k2 <= K; k2++) xs.push((1 - Math.cos(Math.PI * k2 / K)) / 2);
    var loop = []; for (k2 = K; k2 >= 0; k2--) loop.push([xs[k2], 1]); for (k2 = 1; k2 < K; k2++) loop.push([xs[k2], -1]);
    var sect = function (st, xi, sg, camber) {
      var yt = 5 * st.th * (0.2969 * Math.sqrt(xi) - 0.126 * xi - 0.3516 * xi * xi + 0.2843 * xi * xi * xi - 0.1036 * xi * xi * xi * xi);
      var h = (sg * yt + (camber || 0) * 4 * xi * (1 - xi)) * st.c;
      return [st.le[0] - xi * st.c, st.le[1] + st.n[1] * h, st.le[2] + st.n[2] * h];
    };
    var surf = function (stations, camber, wts) {
      wts = wts || {};
      var PP = stations.map(function (st) { return loop.map(function (l) { return sect(st, l[0], l[1], camber); }); });
      B.mesh(PP, {
        cj: true,
        ring: function (i, n) { return (i === n - 1) ? 0.75 : (i === 0 ? 0 : (wts.rib === undefined ? 0.24 : wts.rib)); },
        long: function (j) { return j === K ? 0.9 : j === 0 ? 0.8 : (j % 2 === 0 ? (wts.span === undefined ? 0.3 : wts.span) : 0.16); }
      });
      // tip cap fill
      var last = PP[PP.length - 1], cc = [0, 0, 0];
      last.forEach(function (p) { cc = V.add(cc, V.mul(p, 1 / last.length)); });
      var tn = V.norm(V.sub(cc, stations[stations.length - 2].le));
      for (var q = 0; q < last.length; q++) B.tri(cc, last[q], last[(q + 1) % last.length], tn, tn, tn);
      return PP;
    };

    // main wing with blended winglet (right side, +z), then mirrored
    var W = { x0: 1.02, y0: -0.27, z0: 0.16, A: 4.25, dih: 4.5 * DEG, sw: 33 * DEG, cr: 1.85, ct: 0.5, yeh: 0.72, yehS: 0.33, th0: 0.12, th1: 0.09, wr: 0.2, cant: 78 * DEG, wh: 0.62, wsw: 52 * DEG, wct: 0.2 };
    var Bl = W.wr * (W.cant - W.dih);
    var wingSt = function (l) {
      var zA = W.z0 + W.A * Math.cos(W.dih), yA = W.y0 + W.A * Math.sin(W.dih), xA = W.x0 - Math.tan(W.sw) * W.A;
      var cz = zA - W.wr * Math.sin(W.dih), cy = yA + W.wr * Math.cos(W.dih);
      var z, y, ang, x, c, th, s;
      if (l <= W.A) {
        ang = W.dih; z = W.z0 + l * Math.cos(ang); y = W.y0 + l * Math.sin(ang); x = W.x0 - Math.tan(W.sw) * l;
        s = l / W.A; c = W.ct + (W.cr - W.ct) * (1 - s) + W.yeh * Math.pow(Math.max(0, 1 - s / W.yehS), 2); th = lerp(W.th0, W.th1, s);
      } else if (l <= W.A + Bl) {
        var a = (l - W.A) / W.wr; ang = W.dih + a; z = cz + W.wr * Math.sin(ang); y = cy - W.wr * Math.cos(ang);
        x = xA - Math.tan(W.wsw) * (l - W.A) * 0.8; s = (l - W.A) / (Bl + W.wh); c = lerp(W.ct, W.wct, s); th = W.th1;
      } else {
        var e = l - W.A - Bl; ang = W.cant;
        z = cz + W.wr * Math.sin(W.cant) + e * Math.cos(ang); y = cy - W.wr * Math.cos(W.cant) + e * Math.sin(ang);
        x = xA - Math.tan(W.wsw) * (Bl * 0.8 + e); s = (Bl + e) / (Bl + W.wh); c = lerp(W.ct, W.wct, s); th = lerp(W.th1, 0.08, s);
      }
      return { le: [x, y, z], c: c, th: th, n: [0, Math.cos(ang), -Math.sin(ang)] };
    };
    var m0 = B.mark();
    var ls = []; for (k2 = 0; k2 <= 22; k2++) ls.push(W.A * k2 / 22);
    for (k2 = 1; k2 <= 5; k2++) ls.push(W.A + Bl * k2 / 5);
    for (k2 = 1; k2 <= 5; k2++) ls.push(W.A + Bl + W.wh * k2 / 5);
    surf(ls.map(wingSt), 0.018);
    var wsp = function (l, xi, sg) { var st = wingSt(l), p = sect(st, xi, sg || 1, 0.018); return V.madd(p, st.n, 0.004 * (sg || 1)); };
    var wline = function (l0, l1, xi, w) { var pts = []; for (var q = 0; q <= 12; q++) pts.push(wsp(lerp(l0, l1, q / 12), xi)); B.curve(pts, w, false, [0, 1, 0]); };
    var cline = function (l, xi0, xi1, w) { var pts = []; for (var q = 0; q <= 6; q++) pts.push(wsp(l, lerp(xi0, xi1, q / 6))); B.curve(pts, w, false, [0, 1, 0]); };
    wline(0.08 * W.A, 0.56 * W.A, 0.73, 0.75); wline(0.58 * W.A, 0.93 * W.A, 0.76, 0.75);
    [0.08, 0.56, 0.58, 0.93].forEach(function (f) { cline(f * W.A, 0.73, 1, 0.7); });
    [[0.2, 0.31], [0.33, 0.44]].forEach(function (sp) { wline(sp[0] * W.A, sp[1] * W.A, 0.56, 0.5); wline(sp[0] * W.A, sp[1] * W.A, 0.69, 0.5); cline(sp[0] * W.A, 0.56, 0.69, 0.5); cline(sp[1] * W.A, 0.56, 0.69, 0.5); });
    var tipR = wingSt(W.A + Bl + W.wh).le, midR = wingSt(W.A * 0.55).le;
    B.mirror(m0, 2);

    // vertical fin
    var F = { x0: -2.38, y0: 0.26, H: 1.98, sw: 47 * DEG, cr: 2.3, ct: 1.05 };
    var fst = []; for (k2 = 0; k2 <= 10; k2++) { var lf = F.H * k2 / 10; fst.push({ le: [F.x0 - Math.tan(F.sw) * lf, F.y0 + lf, 0], c: lerp(F.cr, F.ct, k2 / 10), th: 0.1, n: [0, 0, 1] }); }
    surf(fst, 0, { rib: 0.22 });
    [1, -1].forEach(function (sg) { var pts = []; for (var q = 0; q <= 10; q++) { var lf = F.H * (0.08 + 0.84 * q / 10), st = { le: [F.x0 - Math.tan(F.sw) * lf, F.y0 + lf, 0], c: lerp(F.cr, F.ct, lf / F.H), th: 0.1, n: [0, 0, 1] }; var p = sect(st, 0.7, sg); p[2] += sg * 0.004; pts.push(p); } B.curve(pts, 0.6, false, [0, 0, sg]); });
    var finTop = [F.x0 - Math.tan(F.sw) * F.H, F.y0 + F.H, 0];
    // horizontal stabiliser (T-tail)
    var S = { x0: finTop[0] + 0.12, y0: finTop[1] - 0.03, A: 1.9, sw: 31 * DEG, dih: 3 * DEG, cr: 0.98, ct: 0.42 };
    var m1 = B.mark();
    var sst = []; for (k2 = 0; k2 <= 9; k2++) { var l2 = S.A * k2 / 9; sst.push({ le: [S.x0 - Math.tan(S.sw) * l2, S.y0 + l2 * Math.sin(S.dih), l2 * Math.cos(S.dih)], c: lerp(S.cr, S.ct, k2 / 9), th: 0.09, n: [0, 1, 0] }); }
    surf(sst, 0, { rib: 0.22 });
    var stabTip = sst[sst.length - 1].le;
    B.mirror(m1, 2);
    // T-junction bullet
    lathe(B, { c: [finTop[0] + 0.25, finTop[1] - 0.01, 0], prof: [[0.12, 0.0001, 0], [0.02, 0.05, 0.4], [-0.25, 0.075, 0.35], [-0.7, 0.07, 0.35], [-1.05, 0.03, 0.5], [-1.12, 0.0001, 0]], seg: 16, longEvery: 2, longW: 0.3 });

    // engines + pylons (right), mirrored
    var E = { x: -1.62, y: 0.34, z: 0.99 };
    var m2 = B.mark();
    lathe(B, { c: [E.x, E.y, E.z], seg: 36, longEvery: 2, longW: 0.3, prof: [
      [-0.24, 0.268, 0.35], [-0.12, 0.276, 0.3], [-0.04, 0.287, 0.35], [-0.008, 0.301, 0.6], [0, 0.317, 1.0], [-0.012, 0.333, 0.75],
      [-0.05, 0.347, 0.45], [-0.2, 0.364, 0.32], [-0.48, 0.373, 0.32], [-0.85, 0.369, 0.32], [-1.22, 0.348, 0.32], [-1.58, 0.306, 0.32],
      [-1.86, 0.268, 0.4], [-1.98, 0.252, 0.85], [-1.96, 0.236, 0.4]] });
    lathe(B, { c: [E.x, E.y, E.z], seg: 18, longEvery: 2, longW: 0.32, prof: [[-0.11, 0.0001, 0], [-0.15, 0.05, 0.4], [-0.2, 0.083, 0.45], [-0.25, 0.092, 0.5]] });
    for (var bl = 0; bl < 22; bl++) {
      var a0 = bl / 22 * TAU, bp = [];
      for (var q2 = 0; q2 <= 4; q2++) { var rr = lerp(0.094, 0.266, q2 / 4), aa = a0 + (rr - 0.09) * 1.7; bp.push([E.x - 0.25, E.y + rr * Math.cos(aa), E.z + rr * Math.sin(aa)]); }
      B.curve(bp, 0.34, false, [1, 0, 0]);
    }
    lathe(B, { c: [E.x, E.y, E.z], seg: 18, longEvery: 3, longW: 0.28, prof: [[-1.9, 0.17, 0.4], [-2.02, 0.14, 0.35], [-2.16, 0.075, 0.35], [-2.24, 0.0001, 0]] });
    var pyl = []; for (k2 = 0; k2 <= 3; k2++) { var zz = lerp(0.3, E.z - 0.3, k2 / 3); pyl.push({ le: [-1.86 - k2 * 0.05, E.y - 0.03, zz], c: 1.2, th: 0.12, n: [0, 1, 0] }); }
    surf(pyl, 0, { rib: 0.2, span: 0.28 });
    B.mirror(m2, 2);

    B.anchors = {
      nose: [5.0, fus(0).yc, 0],
      cockpit: fpt(0.116, 0, 0.01),
      door: fpt(0.197, -70 * DEG, 0.01),
      windows: fpt(0.38, 73 * DEG, 0.01),
      windowsL: fpt(0.38, -73 * DEG, 0.01),
      wingtipR: [tipR[0] - 0.05, tipR[1], tipR[2]],
      wingtipL: [tipR[0] - 0.05, tipR[1], -tipR[2]],
      wingR: midR, wingL: [midR[0], midR[1], -midR[2]],
      tail: [finTop[0] - 0.35, finTop[1] + 0.02, 0],
      stabR: stabTip, stabL: [stabTip[0], stabTip[1], -stabTip[2]],
      engineR: [E.x, E.y, E.z], engineL: [E.x, E.y, -E.z],
      tailcone: [fe.x - 0.12, fe.yc, 0],
      belly: [0.4, -0.5, 0],
      center: [0, 0, 0]
    };
    B.rotY180();
  }

  /* ---------- laptop (front edge toward viewer +z, lid hinged at back) ---------- */
  function modelLaptop(B, o, rnd) {
    var Wd = 3.1, D = 2.1, Hb = 0.095, LT = 0.055, CR = 0.13, open = (o.open === undefined ? 112 : o.open) * DEG;
    var slab = function (w, d, r, y0, y1, wt) {
      var loopA = rrect(w - 0.05, d - 0.05, r - 0.02, 7).map(function (p) { return [p[0], y0, p[1]]; });
      var loopM = rrect(w, d, r, 7).map(function (p) { return [p[0], lerp(y0, y1, 0.45), p[1]]; });
      var loopB = rrect(w, d, r, 7).map(function (p) { return [p[0], y1, p[1]]; });
      var loopI = rrect(w - 0.05, d - 0.05, r - 0.02, 7).map(function (p) { return [p[0], y1 + 0.001, p[1]]; });
      var n = loopB.length, side = loopB.map(function (p) { return V.norm([p[0], 0, p[2] * (w / d)]); });
      B.curve(loopA, wt[0], true, [0, -1, 0]); B.curve(loopM, wt[1], true, side); B.curve(loopB, wt[2], true, side); B.curve(loopI, wt[3], true, [0, 1, 0]);
      for (var i = 0; i < n; i += 2) { B.line(loopA[i], loopM[i], 0.2, side[i]); B.line(loopM[i], loopB[i], 0.2, side[i]); }
      var cB = [0, y0, 0], cT = [0, y1, 0], up = [0, 1, 0], dn = [0, -1, 0];
      for (i = 0; i < n; i++) {
        var j = (i + 1) % n;
        B.tri(cB, loopA[j], loopA[i], dn, dn, dn); B.tri(cT, loopB[i], loopB[j], up, up, up);
        B.tri(loopA[i], loopA[j], loopM[j], side[i], side[j], side[j]); B.tri(loopA[i], loopM[j], loopM[i], side[i], side[j], side[i]);
        B.tri(loopM[i], loopM[j], loopB[j], side[i], side[j], side[j]); B.tri(loopM[i], loopB[j], loopB[i], side[i], side[j], side[i]);
      }
    };
    // base
    slab(Wd, D, CR, 0, Hb, [0.5, 0.35, 0.85, 0.35]);
    var y = Hb + 0.004, up = [0, 1, 0];
    var rect = function (x0, z0, x1, z1, yy, w, ch, nrm) {
      ch = ch || 0.016;
      B.curve([[x0 + ch, yy, z0], [x1 - ch, yy, z0], [x1, yy, z0 + ch], [x1, yy, z1 - ch], [x1 - ch, yy, z1], [x0 + ch, yy, z1], [x0, yy, z1 - ch], [x0, yy, z0 + ch]], w, true, nrm || up);
    };
    // keyboard
    var kw = 2.56, u = kw / 14.5, gap = 0.022, kx0 = -kw / 2, kz = -0.93;
    var rows = [
      { h: 0.1, keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5] },
      { h: 0.162, keys: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5] },
      { h: 0.162, keys: [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
      { h: 0.162, keys: [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75] },
      { h: 0.162, keys: [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25] },
      { h: 0.162, keys: [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1] }
    ];
    rows.forEach(function (row) {
      var x = kx0;
      row.keys.forEach(function (kk) { var w = kk * u; rect(x + gap / 2, kz + gap / 2, x + w - gap / 2, kz + row.h - gap / 2, y, 0.42); x += w; });
      kz += row.h;
    });
    var kwell = rrect(kw + 0.1, (kz + 0.93) + 0.1, 0.05, 3).map(function (p) { return [p[0], y - 0.002, p[1] + (kz - 0.93) / 2]; });
    B.curve(kwell, 0.4, true, up);
    // speaker grilles
    [-1, 1].forEach(function (sg) { for (var r = 0; r < 16; r++) for (var c = 0; c < 3; c++) { var x = sg * (1.36 + c * 0.035), z = -0.9 + r * 0.055; B.line([x, y, z], [x, y, z + 0.022], 0.25, up); } });
    // trackpad
    var tp = rrect(1.25, 0.76, 0.06, 5).map(function (p) { return [p[0], y, p[1] + 0.5]; });
    B.curve(tp, 0.75, true, up);
    // front notch
    var notch = []; for (var q = 0; q <= 10; q++) { var a = Math.PI + q / 10 * Math.PI; notch.push([Math.cos(a) * 0.17, Hb + 0.002, D / 2 + Math.sin(a) * 0.04 - 0.0]); }
    B.curve(notch, 0.55, false, up);
    // hinge barrel
    lathe(B, { c: [-1.05, Hb + 0.012, -D / 2 + 0.05], axis: 'x', prof: [[0, 0.046, 0.5], [2.1, 0.046, 0.5]], seg: 12, longEvery: 3, longW: 0.3 });

    // lid (built closed, screen face down, then rotated open about the hinge)
    var m = B.mark();
    slab(Wd, D, CR, Hb, Hb + LT, [0.6, 0.3, 0.75, 0.3]);
    var sy = Hb - 0.003, dn = [0, -1, 0];
    var bez = rrect(Wd - 0.16, D - 0.16, 0.08, 5).map(function (p) { return [p[0], sy, p[1]]; });
    B.curve(bez, 0.5, true, dn);
    var ax0 = -Wd / 2 + 0.14, ax1 = Wd / 2 - 0.14, az0 = -D / 2 + 0.2, az1 = D / 2 - 0.13;
    rect(ax0, az0, ax1, az1, sy, 0.85, 0.01, dn);
    // screen content: editor
    var top = az1 - 0.05;
    B.line([ax0 + 0.02, sy, top - 0.05], [ax1 - 0.02, sy, top - 0.05], 0.4, dn);
    for (var dd = 0; dd < 3; dd++) { var cc = circle([ax0 + 0.07 + dd * 0.055, sy, top - 0.005], 0.014, 10, 'y'); B.curve(cc, 0.45, true, dn); }
    var sideX = ax0 + 0.46;
    B.line([sideX, sy, top - 0.05], [sideX, sy, az0 + 0.02], 0.35, dn);
    for (var r2 = 0; r2 < 14; r2++) { var zz = top - 0.13 - r2 * 0.095, ind = (r2 % 4 === 0) ? 0 : 0.05; B.line([ax0 + 0.06 + ind, sy, zz], [ax0 + 0.06 + ind + 0.12 + rnd() * 0.18, sy, zz], 0.3, dn); }
    for (r2 = 0; r2 < 24; r2++) {
      var z3 = top - 0.12 - r2 * 0.064; if (z3 < az0 + 0.04) break;
      if (rnd() < 0.12) continue;
      var indent = [0, 1, 2, 2, 3, 1][Math.floor(rnd() * 6)] * 0.08, x0 = sideX + 0.1 + indent;
      var len = 0.25 + rnd() * 1.15, x1 = Math.min(ax1 - 0.08, x0 + len);
      B.line([sideX + 0.03, sy, z3], [sideX + 0.06, sy, z3], 0.22, dn);
      var mid = x0 + (x1 - x0) * (0.2 + rnd() * 0.3);
      B.line([x0, sy, z3], [mid - 0.02, sy, z3], 0.42, dn);
      B.line([mid + 0.02, sy, z3], [x1, sy, z3], 0.3, dn);
    }
    var cam = circle([0, sy, D / 2 - 0.08], 0.014, 10, 'y'); B.curve(cam, 0.5, true, dn);
    var hz = -D / 2, hy = Hb;
    var rot = function (p) { var dy = p[1] - hy, dz = p[2] - hz, c = Math.cos(-open), s = Math.sin(-open); return [p[0], hy + dy * c - dz * s, hz + dy * s + dz * c]; };
    var rotN = function (n) { var c = Math.cos(-open), s = Math.sin(-open); return [n[0], n[1] * c - n[2] * s, n[1] * s + n[2] * c]; };
    B.map(m, rot, rotN);
    B.anchors = {
      screen: rot([0, sy, (az0 + az1) / 2]), screenTL: rot([ax0, sy, az1]), screenTR: rot([ax1, sy, az1]),
      screenBL: rot([ax0, sy, az0]), camera: rot([0, sy, D / 2 - 0.08]), lidTop: rot([0, Hb + LT, D / 2]),
      keyboard: [0, y, -0.45], trackpad: [0, y, 0.5], frontL: [-Wd / 2, Hb, D / 2], frontR: [Wd / 2, Hb, D / 2],
      hingeL: [-Wd / 2 + 0.1, Hb, -D / 2], hingeR: [Wd / 2 - 0.1, Hb, -D / 2], center: [0, 0.6, 0]
    };
  }

  /* ---------- game controller (top +y, grips toward viewer +z) ---------- */
  function modelController(B) {
    var half = [[0, -0.8], [0.55, -0.8], [0.95, -0.82], [1.22, -0.78], [1.42, -0.64], [1.55, -0.4], [1.63, -0.1], [1.72, 0.25], [1.82, 0.62], [1.86, 0.92], [1.8, 1.14], [1.64, 1.27], [1.44, 1.27], [1.27, 1.14], [1.14, 0.88], [1.0, 0.6], [0.8, 0.44], [0.5, 0.38], [0, 0.38]];
    var ctrl = half.concat(half.slice(1, -1).reverse().map(function (p) { return [-p[0], p[1]]; }));
    var NU = 176, NV = 26;
    var out = resample(catmull(ctrl, ctrl.length * 30, true), NU, true);
    var segs = [[[-0.95, -0.22], [0.95, -0.22]], [[0.95, -0.22], [1.5, 0.95]], [[-0.95, -0.22], [-1.5, 0.95]]];
    var near = function (p) {
      var best = null, bd = 1e9;
      segs.forEach(function (sg) { var a = sg[0], b = sg[1], dx = b[0] - a[0], dz = b[1] - a[1], t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)), q = [a[0] + dx * t, a[1] + dz * t], d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; best = q; } });
      return best;
    };
    var S = out.map(near);
    for (var it = 0; it < 60; it++) S = S.map(function (s, i) { var a = S[(i - 1 + NU) % NU], b = S[(i + 1) % NU]; return [s[0] * 0.5 + (a[0] + b[0]) * 0.25, s[1] * 0.5 + (a[1] + b[1]) * 0.25]; });
    var P = out.map(function (p, i) {
      var tg = smooth(0.05, 0.95, p[1]), ht = lerp(0.19, 0.29, tg), ym = lerp(0, -0.1, tg), ex = 2 / lerp(3.3, 2.3, tg), s = S[i], row = [];
      for (var j = 0; j <= NV; j++) {
        var al = -Math.PI / 2 + Math.PI * j / NV, ca = Math.cos(al), sa = Math.sin(al);
        var f = Math.pow(Math.abs(ca), ex), g = (sa < 0 ? -1 : 1) * Math.pow(Math.abs(sa), ex);
        row.push([s[0] + (p[0] - s[0]) * f, ym + ht * g, s[1] + (p[1] - s[1]) * f]);
      }
      return row;
    });
    B.mesh(P, {
      ci: true,
      ring: function (i) { return i % 4 === 0 ? 0.26 : 0; }, ringSpan: [5, NV - 5],
      long: function (j) { return (j === 0 || j === NV) ? 0 : j === NV / 2 ? 0.8 : (j > NV / 2 ? (j % 1 === 0 ? 0.3 : 0) : 0.2); }
    });
    var top = 0.195, up = [0, 1, 0];
    // touchpad
    var tpad = rrect(1.02, 0.6, 0.08, 6);
    B.curve(tpad.map(function (p) { return [p[0], top + 0.012, p[1] - 0.42]; }), 0.7, true, up);
    B.curve(rrect(0.96, 0.54, 0.06, 6).map(function (p) { return [p[0], top + 0.014, p[1] - 0.42]; }), 0.25, true, up);
    for (var g = 1; g < 6; g++) B.line([-0.48 + g * 0.16, top + 0.013, -0.69], [-0.48 + g * 0.16, top + 0.013, -0.15], 0.12, up);
    // sticks
    [-1, 1].forEach(function (sg) {
      var c = [sg * 0.47, top, 0.15];
      B.curve(circle([c[0], top + 0.004, c[2]], 0.29, 32, 'y'), 0.5, true, up);
      B.curve(circle([c[0], top + 0.004, c[2]], 0.21, 32, 'y'), 0.25, true, up);
      lathe(B, { c: c, axis: 'y', seg: 22, longEvery: 2, longW: 0.3, prof: [[0, 0.125, 0.35], [0.09, 0.125, 0.3], [0.12, 0.19, 0.3], [0.15, 0.235, 0.55], [0.185, 0.245, 0.85], [0.2, 0.226, 0.5], [0.192, 0.16, 0.35], [0.182, 0.085, 0.3], [0.178, 0.0001, 0]] });
    });
    // d-pad
    var dc = [-1.0, top, -0.3], aw = 0.085, al2 = 0.245;
    var cross = [[aw, -al2], [aw, -aw], [al2, -aw], [al2, aw], [aw, aw], [aw, al2], [-aw, al2], [-aw, aw], [-al2, aw], [-al2, -aw], [-aw, -aw], [-aw, -al2]];
    [0.005, 0.04].forEach(function (h, k) { B.curve(cross.map(function (p) { return [dc[0] + p[0], top + h, dc[2] + p[1]]; }), k ? 0.75 : 0.4, true, up); });
    cross.forEach(function (p) { B.line([dc[0] + p[0], top + 0.005, dc[2] + p[1]], [dc[0] + p[0], top + 0.04, dc[2] + p[1]], 0.3, V.norm([p[0], 0, p[1]])); });
    B.curve(circle([dc[0], top + 0.003, dc[2]], 0.36, 36, 'y'), 0.32, true, up);
    // face buttons
    var bc = [1.0, top, -0.3];
    [[0, -0.235], [0.235, 0], [0, 0.235], [-0.235, 0]].forEach(function (off) {
      var c = [bc[0] + off[0], top, bc[2] + off[1]];
      lathe(B, { c: c, axis: 'y', seg: 18, longEvery: 3, longW: 0.3, prof: [[0, 0.1, 0.35], [0.035, 0.1, 0.55], [0.05, 0.088, 0.75], [0.052, 0.0001, 0]] });
      B.curve(circle([c[0], top + 0.054, c[2]], 0.042, 14, 'y'), 0.5, true, up);
    });
    B.curve(circle([bc[0], top + 0.003, bc[2]], 0.39, 36, 'y'), 0.32, true, up);
    // small buttons, speaker, home
    [-1, 1].forEach(function (sg) { B.curve(rrect(0.08, 0.2, 0.04, 4).map(function (p) { return [sg * 0.7 + p[0], top + 0.01, -0.66 + p[1]]; }), 0.55, true, up); });
    B.curve(circle([0, top + 0.006, 0.17], 0.075, 18, 'y'), 0.6, true, up);
    for (var r3 = 0; r3 < 3; r3++) for (var c3 = 0; c3 < 7; c3++) { var x = -0.18 + c3 * 0.06, z = -0.02 + r3 * 0.045; B.line([x, top + 0.004, z], [x + 0.025, top + 0.004, z], 0.3, up); }
    // shoulders L1/L2
    [-1, 1].forEach(function (sg) {
      var l1 = catmull([[0.74, 0.05, -0.83], [1.1, 0.06, -0.86], [1.36, 0.055, -0.78], [1.5, 0.04, -0.6]], 18).map(function (p) { return [sg * p[0], p[1], p[2]]; });
      tube(B, l1, 0.062, 10, { longW: 0.3, ringEvery: 3, ringW: 0.22, endW: 0.4 });
      var l2 = catmull([[0.8, -0.1, -0.86], [1.12, -0.1, -0.92], [1.4, -0.12, -0.84], [1.56, -0.15, -0.64]], 18).map(function (p) { return [sg * p[0], p[1], p[2]]; });
      tube(B, l2, 0.085, 10, { longW: 0.26, ringEvery: 3, ringW: 0.2, endW: 0.4 });
    });
    B.anchors = {
      stickL: [-0.47, top + 0.2, 0.15], stickR: [0.47, top + 0.2, 0.15], dpad: [dc[0], top + 0.04, dc[2]], buttons: [bc[0], top + 0.05, bc[2]],
      touchpad: [0, top + 0.012, -0.42], gripL: [-1.66, -0.12, 1.22], gripR: [1.66, -0.12, 1.22], shoulderL: [-1.2, 0.08, -0.88],
      shoulderR: [1.2, 0.08, -0.88], top: [0, top, -0.8], home: [0, top, 0.17], center: [0, 0, 0]
    };
  }

  /* ---------- globe with flight arcs ---------- */
  function modelGlobe(B, o, rnd) {
    var sp = function (lat, lon, r) { return [r * Math.cos(lat) * Math.cos(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.sin(lon)]; };
    B.grid(function (u, v) { return sp(-Math.PI / 2 + Math.PI * u, v * TAU, 1); }, 24, 48, {
      cj: true, ring: function (i) { return (i > 0 && i < 24 && i % 2 === 0) ? (i === 12 ? 0.6 : 0.3) : 0; }, long: function (j) { return j % 2 === 0 ? 0.28 : 0; }
    });
    var cities = [[40.7, -74], [51.5, -0.1], [25.2, 55.3], [35.7, 139.7], [-33.9, 151.2], [34, -118.2], [30.3, -81.6], [1.35, 103.8]];
    var pts = cities.map(function (c) { return sp(c[0] * DEG, -c[1] * DEG, 1); });
    var arcs = [[6, 1], [1, 2], [2, 7], [5, 3], [0, 6]];
    arcs.forEach(function (ab) {
      var a = pts[ab[0]], b = pts[ab[1]], line = [];
      for (var q = 0; q <= 40; q++) { var t = q / 40, p = V.norm(V.lerp(a, b, t)); line.push(V.mul(p, 1 + 0.18 * Math.sin(Math.PI * t) * V.len(V.sub(a, b)) * 0.5)); }
      B.curve(line, 0.85);
    });
    pts.forEach(function (p) { var n = V.norm(p), t1 = V.norm(V.cross(n, [0, 1, 0])), t2 = V.cross(n, t1), ring = []; for (var q = 0; q < 12; q++) { var a = q / 12 * TAU; ring.push(V.add(V.mul(n, 1.004), V.add(V.mul(t1, Math.cos(a) * 0.03), V.mul(t2, Math.sin(a) * 0.03)))); } B.curve(ring, 0.6, true, n); });
    var orb = []; for (var q = 0; q < 96; q++) { var a = q / 96 * TAU; orb.push([Math.cos(a) * 1.32, Math.sin(a) * 0.32, Math.sin(a) * 1.28]); }
    B.curve(orb, 0.45, true);
    B.anchors = { jax: pts[6], london: pts[1], dubai: pts[2], tokyo: pts[3], sydney: pts[4], la: pts[5], ny: pts[0], singapore: pts[7], north: [0, 1, 0], orbit: [1.32, 0, 0], center: [0, 0, 0] };
  }

  /* ---------- DNA helix object ---------- */
  function modelHelix(B, o) {
    var turns = o.turns || 2.6, H = 3.4, r = 0.46, n = 160, s0 = [], s1 = [];
    for (var i = 0; i <= n; i++) { var t = i / n, a = t * turns * TAU, yy = -H / 2 + H * t; s0.push([Math.cos(a) * r, yy, Math.sin(a) * r]); s1.push([Math.cos(a + Math.PI) * r, yy, Math.sin(a + Math.PI) * r]); }
    tube(B, s0, 0.05, 8, { longW: 0.4, ringEvery: 8, ringW: 0.18 });
    tube(B, s1, 0.05, 8, { longW: 0.4, ringEvery: 8, ringW: 0.18 });
    for (i = 4; i < n; i += 6) { var m = V.lerp(s0[i], s1[i], 0.5); tube(B, [s0[i], V.lerp(s0[i], m, 0.5), V.lerp(m, s0[i], 0.06)], 0.018, 5, { longW: 0.3, fill: false }); tube(B, [s1[i], V.lerp(s1[i], m, 0.5), V.lerp(m, s1[i], 0.06)], 0.018, 5, { longW: 0.3, fill: false }); }
    B.anchors = { top: [0, H / 2, 0], bottom: [0, -H / 2, 0], mid: [r, 0, 0], center: [0, 0, 0] };
  }

  var MODELS = {
    jet: { build: modelJet, rotation: [17, 30, -3], axis: [-1, 0, 0] },
    laptop: { build: modelLaptop, rotation: [24, -30, 0], axis: [0, 0.4, -1] },
    controller: { build: modelController, rotation: [50, -6, -5], axis: [1, 0, 0] },
    globe: { build: modelGlobe, rotation: [16, 30, -14], axis: [0, -1, 0] },
    helix: { build: modelHelix, rotation: [8, 0, -24], axis: [0, 1, 0] }
  };

  /* ---------- finalize builder → typed arrays (normalised to unit bounding sphere) ---------- */
  function finalize(B, o) {
    o = o || {};
    var lp = B.lp, c = [0, 0, 0], s = 1, i, k;
    if (o.normalize !== false) {
      var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      [lp, B.fp].forEach(function (arr) { for (var i2 = 0; i2 < arr.length; i2 += 3) for (var k2 = 0; k2 < 3; k2++) { var v = arr[i2 + k2]; if (v < mn[k2]) mn[k2] = v; if (v > mx[k2]) mx[k2] = v; } });
      c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      var r = 0;
      [lp, B.fp].forEach(function (arr) { for (var i2 = 0; i2 < arr.length; i2 += 3) { var d = Math.hypot(arr[i2] - c[0], arr[i2 + 1] - c[1], arr[i2 + 2] - c[2]); if (d > r) r = d; } });
      s = 1 / (r || 1);
    }
    var P = new Float32Array(lp.length); for (i = 0; i < lp.length; i++) P[i] = (lp[i] - c[i % 3]) * s;
    var Fp = new Float32Array(B.fp.length); for (i = 0; i < B.fp.length; i++) Fp[i] = (B.fp[i] - c[i % 3]) * s;
    var n = lp.length / 3, ax = V.norm(o.axis || [1, 0, 0]), proj = new Float32Array(n), rmin = Infinity, rmax = -Infinity;
    for (i = 0; i < n; i++) { var d = P[i * 3] * ax[0] + P[i * 3 + 1] * ax[1] + P[i * 3 + 2] * ax[2]; proj[i] = d; if (d < rmin) rmin = d; if (d > rmax) rmax = d; }
    var Rv = new Float32Array(n), rr = rng(9), jit = o.jitter === undefined ? 0.05 : o.jitter;
    for (i = 0; i < n; i += 2) {
      var j = (rr() - 0.5) * jit;
      for (k = i; k < i + 2; k++) { var e = B.lr[k]; Rv[k] = (e !== e) ? clamp((proj[k] - rmin) / ((rmax - rmin) || 1) * 0.94 + 0.03 + j) : e; }
    }
    var anchors = {};
    for (var key in B.anchors) { var a = B.anchors[key]; anchors[key] = [(a[0] - c[0]) * s, (a[1] - c[1]) * s, (a[2] - c[2]) * s]; }
    return { P: P, N: new Float32Array(B.ln), W: new Float32Array(B.lw), R: Rv, F: Fp, FN: new Float32Array(B.fn), anchors: anchors };
  }

  /* ================================================================== SHADERS */
  var LINE_VS = [
    'attribute float aW; attribute float aR;',
    'uniform float uOpacity, uNear, uFar, uFadeMin, uRim, uReveal, uSoft, uTime, uBreath, uWave, uFront;',
    'varying float vA;',
    'void main(){',
    '  vec3 p = position;',
    '  if (uBreath > 0.0) p += normal * uBreath * sin(uTime * 0.9 + aR * 11.0);',
    '  if (uWave > 0.0) { p.y += uWave * sin(uTime * 0.42 + aR * 5.0); p.z += uWave * cos(uTime * 0.33 + aR * 4.0); }',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  float facing = 0.5;',
    '  if (length(normal) > 0.01) facing = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));',
    '  float rim = 1.0 + uRim * pow(1.0 - facing, 3.0);',
    '  float fade = mix(1.0, uFadeMin, smoothstep(uNear, uFar, -mv.z));',
    '  float vis = clamp((uReveal * (1.0 + uSoft) - aR) / uSoft, 0.0, 1.0);',
    '  float front = vis * (1.0 - vis) * 4.0;',
    '  vA = aW * rim * fade * uOpacity * vis * (1.0 + front * uFront);',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var LINE_FS = [
    'uniform vec3 uColor; varying float vA;',
    'void main(){ float a = clamp(vA, 0.0, 1.0); gl_FragColor = vec4(uColor * a, a); }'
  ].join('\n');
  var FILL_VS = [
    'varying float vF;',
    'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vF = 1.0 - abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }'
  ].join('\n');
  var FILL_FS = [
    'uniform vec3 uFill; uniform float uAlpha, uLift; varying float vF;',
    'void main(){ vec3 c = uFill + vec3(uLift * vF * vF); gl_FragColor = vec4(c * uAlpha, uAlpha); }'
  ].join('\n');
  var GLYPH_VS = [
    'attribute vec2 aLL; attribute float aGlyph; attribute float aRand;',
    'uniform float uTime, uSpin, uAmp, uFreq, uSize, uPx, uRef, uOpacity, uNear, uFar, uFadeMin, uLimb, uTwinkle, uShape, uAspect, uReveal;',
    'uniform vec4 uMask;',
    'varying float vA; varying float vG;',
    'void main(){',
    '  vec3 p; vec3 n; float edge = 1.0;',
    '  if (uShape < 0.5) {',
    '    float lat = aLL.x; float lon = aLL.y + uSpin;',
    '    vec3 s = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));',
    '    float w = sin(lon * uFreq + uTime * 0.6) * cos(lat * uFreq * 1.3 - uTime * 0.45) + 0.5 * sin(lat * uFreq * 2.1 + lon * uFreq * 0.7 + uTime * 0.3);',
    '    p = s * (1.0 + uAmp * w); n = s;',
    '  } else {',
    '    float x = aLL.x, z = aLL.y;',
    '    float h = sin(x * uFreq + uTime * 0.5) * 0.6 + sin(z * uFreq * 1.37 - uTime * 0.4) * 0.5 + sin((x * 0.7 + z) * uFreq * 0.63 + uTime * 0.27) * 0.6;',
    '    p = vec3(x, h * uAmp, z); n = vec3(0.0, 1.0, 0.0);',
    '    edge = smoothstep(1.0, 0.62, abs(x)) * smoothstep(1.0, 0.62, abs(z));',
    '  }',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  float depth = -mv.z;',
    '  float a = uOpacity * edge;',
    '  if (uShape < 0.5) { float facing = dot(normalize(normalMatrix * n), normalize(-mv.xyz)); a *= smoothstep(0.0, uLimb, facing); }',
    '  a *= mix(1.0, uFadeMin, smoothstep(uNear, uFar, depth));',
    '  a *= 1.0 - uTwinkle + uTwinkle * (0.5 + 0.5 * sin(uTime * (0.5 + aRand * 1.1) + aRand * 61.0));',
    '  a *= 0.45 + 0.55 * fract(aRand * 7.31);',
    '  a *= smoothstep(0.0, 0.25, uReveal * 1.25 - fract(aRand * 3.7) * 1.0);',
    '  vec4 cp = projectionMatrix * mv;',
    '  if (uMask.w > 0.5) { vec2 sc = cp.xy / cp.w * 0.5 + 0.5; sc.y = 1.0 - sc.y; vec2 d = (sc - uMask.xy) * vec2(uAspect, 1.0); a *= 1.0 - smoothstep(uMask.z * 0.3, uMask.z, length(d)); }',
    '  gl_PointSize = clamp(uSize * uPx * uRef / max(depth, 0.001), 0.0, 48.0);',
    '  vA = a; vG = aGlyph;',
    '  gl_Position = cp;',
    '}'
  ].join('\n');
  var GLYPH_FS = [
    'uniform sampler2D uAtlas; uniform float uCells; uniform vec3 uColor;',
    'varying float vA; varying float vG;',
    'void main(){',
    '  vec2 cell = vec2(mod(vG, uCells), floor(vG / uCells));',
    '  float t = texture2D(uAtlas, (cell + gl_PointCoord) / uCells).a;',
    '  float a = t * vA; if (a < 0.004) discard;',
    '  gl_FragColor = vec4(uColor * a, a);',
    '}'
  ].join('\n');

  function additive(mat) {
    mat.transparent = true; mat.depthWrite = false;
    mat.blending = THREE.CustomBlending; mat.blendEquation = THREE.AddEquation;
    mat.blendSrc = THREE.OneFactor; mat.blendDst = THREE.OneFactor;
    mat.blendSrcAlpha = THREE.OneFactor; mat.blendDstAlpha = THREE.OneFactor;
    return mat;
  }
  function lineMaterial(depthFunc) {
    var m = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Vector3(1, 1, 1) }, uOpacity: { value: 1 }, uNear: { value: 1 }, uFar: { value: 3 }, uFadeMin: { value: 0.4 },
        uRim: { value: 1.4 }, uReveal: { value: 1 }, uSoft: { value: 0.12 }, uTime: { value: 0 }, uBreath: { value: 0 }, uWave: { value: 0 }, uFront: { value: 0.9 }
      },
      vertexShader: LINE_VS, fragmentShader: LINE_FS
    });
    additive(m);
    m.depthTest = true; m.depthFunc = depthFunc || THREE.LessEqualDepth;
    return m;
  }
  function fillMaterial() {
    var m = new THREE.ShaderMaterial({
      uniforms: { uFill: { value: new THREE.Vector3(0.07, 0.075, 0.08) }, uAlpha: { value: 1 }, uLift: { value: 0.03 } },
      vertexShader: FILL_VS, fragmentShader: FILL_FS, side: THREE.DoubleSide, transparent: true, depthWrite: true,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2
    });
    m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation;
    m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor; m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    return m;
  }
  function setVec(u, c) { var p = parseColor(c); u.value.set(p[0], p[1], p[2]); }

  /* ---------- camera framing with lens shift (object centre lands at x,y; projected diameter = sizePx) ---------- */
  function frameCamera(cam, W, H, fov, x, y, sizePx, radius) {
    radius = radius || 1;
    var tanH = Math.tan(fov * DEG / 2);
    var d = Math.max(radius * 1.15, (radius * H) / (tanH * Math.max(1, sizePx)));
    cam.fov = fov; cam.aspect = W / H;
    cam.position.set(0, 0, d); cam.lookAt(0, 0, 0);
    cam.near = Math.max(d * 0.02, d - radius * 2.5); cam.far = d + radius * 3;
    cam.setViewOffset(W, H, W / 2 - x * W, H / 2 - y * H, W, H);
    cam.updateProjectionMatrix();
    return d;
  }
  function resolveSize(s, w, h) {
    if (typeof s === 'function') return s(w, h);
    if (typeof s === 'string' && /px$/.test(s)) return parseFloat(s);
    return (+s || 0.8) * Math.min(w, h);
  }

  /* ================================================================== STAGE */
  function Stage(el, opts) {
    el = $(el);
    if (!el) throw new Error('[TechBio] stage container not found');
    this.o = Object.assign({ dpr: 1.75, background: null, antialias: true, zIndex: null }, opts || {});
    this.priority = 0; this.layers = []; this.visible = true; this.dirty = true; this.ready = false; this.time = 0;
    this.w = 1; this.h = 1; this.dprNow = 1;
    if (el.tagName === 'CANVAS') { this.canvas = el; this.host = el; this.own = false; }
    else { this.host = el; this.own = true; this.canvas = makeCanvas(el, this.o.zIndex); }
    this.canvas.classList.add('tb-canvas');
    var self = this;
    this.io = observe(this.host, this);
    if ('ResizeObserver' in root) { this.ro = new ResizeObserver(function () { self.resize(); }); this.ro.observe(this.host); }
    else root.addEventListener('resize', this._onResize = function () { self.resize(); });
    this.whenReady = loadThree().then(function () { self._init(); return self; }).catch(function (e) { console.warn('[TechBio] three.js unavailable', e); self.failed = true; });
  }
  Stage.prototype._init = function () {
    if (this.destroyed) return;
    var r;
    try { r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.o.antialias, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }); }
    catch (e) { console.warn('[TechBio] WebGL unavailable'); this.failed = true; (this.own ? this.host : this.canvas).classList.add('tb-nogl'); return; }
    this.renderer = r; r.autoClear = false;
    if (this.o.background) { var c = parseColor(this.o.background); r.setClearColor(new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace), 1); }
    else r.setClearColor(0x000000, 0);
    var self = this;
    this.canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; });
    this.canvas.addEventListener('webglcontextrestored', function () { self.lost = false; self.invalidate(); });
    this.ready = true;
    this.layers.forEach(function (l) { if (!l.ready) l._init(); });
    this.resize();
    Ticker.add(this);
  };
  Stage.prototype.resize = function () {
    var el = this.own ? this.host : this.canvas;
    this.w = Math.max(1, el.clientWidth); this.h = Math.max(1, el.clientHeight);
    if (this.renderer) {
      this.dprNow = Math.min(root.devicePixelRatio || 1, this.o.dpr);
      this.renderer.setPixelRatio(this.dprNow); this.renderer.setSize(this.w, this.h, false);
      var self = this; this.layers.forEach(function (l) { if (l.ready) l._resize(self.w, self.h); });
    }
    this.invalidate();
  };
  Stage.prototype.invalidate = function () { this.dirty = true; Ticker.wake(); };
  Stage.prototype._step = function (dt) {
    if (!this.ready || this.destroyed || this.lost || !this.visible) return false;
    var anim = !reduced;
    if (!anim && !this.dirty) return false;
    this.dirty = false;
    if (anim) this.time += dt;
    this.rect = this.canvas.getBoundingClientRect(); this.rectFrame = Ticker.frame;
    var r = this.renderer;
    r.clear(true, true, true);
    for (var i = 0; i < this.layers.length; i++) {
      var l = this.layers[i]; if (!l.ready || l.hidden) continue;
      l._update(this.time, anim ? dt : 0, anim);
      r.clearDepth();
      r.render(l.scene, l.camera);
    }
    Graphs.forEach(function (g) { g.dirty = true; });
    return anim;
  };
  Stage.prototype._add = function (layer) {
    this.layers.push(layer);
    this.layers.sort(function (a, b) { return (a.o.z || 0) - (b.o.z || 0); });
    if (this.ready) { layer._init(); layer._resize(this.w, this.h); }
    this.invalidate();
    return layer;
  };
  Stage.prototype.wireframe = function (o) { return this._add(new WireLayer(this, o)); };
  Stage.prototype.glyphField = function (o) { return this._add(new GlyphLayer(this, o)); };
  Stage.prototype.strands = function (o) { return this._add(new StrandLayer(this, o)); };
  Stage.prototype.graph = function (o) {
    if (!this._graph) this._graph = new NodeGraph(this.own ? this.host : (this.canvas.parentElement || document.body), Object.assign({ zIndex: this.o.zIndex }, o || {}));
    else if (o) this._graph.set(o);
    return this._graph;
  };
  Stage.prototype.destroy = function () {
    if (this.destroyed) return;
    this.destroyed = true;
    this.layers.slice().forEach(function (l) { l._dispose(); });
    this.layers = [];
    Ticker.remove(this);
    if (this.io) this.io.disconnect(); if (this.ro) this.ro.disconnect(); if (this._onResize) root.removeEventListener('resize', this._onResize);
    if (this._graph) this._graph.destroy();
    if (this.renderer) { this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) { } }
    if (this.own && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  /* ================================================================== LAYER BASE */
  function Layer(stage, opts, defaults) {
    this.stage = stage;
    this.o = Object.assign({}, defaults, opts || {});
    this.pt = this.p = clamp(+this.o.progress || 0);
    this.px = 0; this.py = 0; this.intro = this.o.intro && this.o.intro !== 'none' ? 0 : 1; this.introT = 0;
    this.hidden = false; this.ready = false; this.L = { x: 0.5, y: 0.5, size: 100 };
  }
  Layer.prototype.setProgress = function (p) { this.pt = clamp(+p || 0); if (reduced || !this.o.smoothing) this.p = this.pt; this.stage.invalidate(); return this; };
  Layer.prototype.set = function (o) { Object.assign(this.o, o || {}); if (this.ready) { this._apply && this._apply(); this._resize(this.stage.w, this.stage.h); } this.stage.invalidate(); return this; };
  Layer.prototype.show = function () { this.hidden = false; this.stage.invalidate(); return this; };
  Layer.prototype.hide = function () { this.hidden = true; this.stage.invalidate(); return this; };
  Layer.prototype.replay = function () { this.intro = 0; this.introT = 0; this.stage.invalidate(); return this; };
  Layer.prototype._layout = function (w, h) {
    var o = this.o, L = o.layout ? (o.layout(w, h) || {}) : {};
    var x = L.x !== undefined ? L.x : o.x, y = L.y !== undefined ? L.y : o.y, s = L.size !== undefined ? L.size : o.size;
    this.L = { x: x, y: y, size: resolveSize(s, w, h), extra: L };
    return this.L;
  };
  Layer.prototype._resize = function (w, h) { this._layout(w, h); };
  Layer.prototype._base = function (dt, anim) {
    var o = this.o;
    this.p = anim ? damp(this.p, this.pt, 1 / Math.max(0.01, o.smoothing || 0.01), dt) : this.pt;
    var par = anim ? (o.parallax || 0) : 0;
    this.px = anim ? damp(this.px, pointer.x * par, 2.2, dt) : 0;
    this.py = anim ? damp(this.py, pointer.y * par, 2.2, dt) : 0;
    if (!anim || !o.intro || o.intro === 'none') this.intro = 1;
    else if (this.intro < 1) { this.introT += dt; this.intro = clamp((this.introT - (o.introDelay || 0)) / (o.introDuration || 2)); }
  };
  Layer.prototype._dispose = function () {
    if (this.scene) this.scene.traverse(function (ob) { if (ob.geometry) ob.geometry.dispose(); if (ob.material) ob.material.dispose(); });
    if (this.tex) this.tex.dispose();
    this.ready = false; this.destroyed = true;
  };
  Layer.prototype.destroy = function () {
    var st = this.stage, i = st.layers.indexOf(this);
    if (i >= 0) st.layers.splice(i, 1);
    this._dispose();
    if (this._ownsStage) st.destroy(); else st.invalidate();
  };

  /* ================================================================== WIREFRAME LAYER */
  var WIRE_DEFAULTS = {
    model: 'jet', x: 0.5, y: 0.5, size: 0.8, layout: null, rotation: null, spin: 0, drift: 1, parallax: 1, fov: 30,
    color: '#ffffff', opacity: 1, hidden: 0.1, fill: 'auto', fillOpacity: 1, fillLift: 0.03, rim: 1.4, depthFade: 0.55,
    progress: 0, progressRotation: [0, 0, 0], progressOffset: [0, 0], progressScale: 1, smoothing: 0.35,
    intro: 'draw', introDuration: 2.6, introDelay: 0, scanGlow: 0.9, z: 0, seed: 7, open: 112, name: null, nodes: null, links: null
  };
  function WireLayer(stage, opts) { Layer.call(this, stage, opts, WIRE_DEFAULTS); }
  WireLayer.prototype = Object.create(Layer.prototype);
  WireLayer.prototype._init = function () {
    var o = this.o, T = THREE;
    var def = typeof o.model === 'function' ? { build: o.model, rotation: [0, 0, 0] } : (MODELS[o.model] || MODELS.jet);
    this.def = def;
    var B = new Builder(); def.build(B, o, rng(o.seed));
    var g = finalize(B, { axis: def.axis });
    this.anchorsLocal = g.anchors;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(o.fov, 1, 0.1, 100);
    this.group = new T.Group(); this.scene.add(this.group);
    var lg = new T.BufferGeometry();
    lg.setAttribute('position', new T.BufferAttribute(g.P, 3)); lg.setAttribute('normal', new T.BufferAttribute(g.N, 3));
    lg.setAttribute('aW', new T.BufferAttribute(g.W, 1)); lg.setAttribute('aR', new T.BufferAttribute(g.R, 1));
    this.matFront = lineMaterial(T.LessEqualDepth); this.matBack = lineMaterial(T.GreaterDepth);
    this.front = new T.LineSegments(lg, this.matFront); this.front.renderOrder = 2; this.front.frustumCulled = false;
    this.back = new T.LineSegments(lg, this.matBack); this.back.renderOrder = 3; this.back.frustumCulled = false;
    if (g.F.length) {
      var fg = new T.BufferGeometry();
      fg.setAttribute('position', new T.BufferAttribute(g.F, 3)); fg.setAttribute('normal', new T.BufferAttribute(g.FN, 3));
      this.fillMat = fillMaterial(); this.fill = new T.Mesh(fg, this.fillMat); this.fill.renderOrder = 1; this.fill.frustumCulled = false;
      this.group.add(this.fill);
    }
    this.group.add(this.front); this.group.add(this.back);
    this.ready = true;
    this._apply();
    if (o.nodes) this._attachNodes();
  };
  WireLayer.prototype._apply = function () {
    var o = this.o;
    [this.matFront, this.matBack].forEach(function (m) { setVec(m.uniforms.uColor, o.color); m.uniforms.uRim.value = o.rim; m.uniforms.uFront.value = o.scanGlow; });
    if (this.fill) {
      var fc = o.fill === 'auto' ? (this.stage.o.background ? parseColor(this.stage.o.background) : resolveBg(this.stage.host)) : parseColor(o.fill === 'none' ? '#000' : o.fill);
      this.fillMat.uniforms.uFill.value.set(fc[0], fc[1], fc[2]);
      this.fillMat.uniforms.uLift.value = o.fillLift;
      this.fill.visible = o.fill !== 'none';
    }
    this.back.visible = o.hidden > 0 && o.fill !== 'none';
    this.rot0 = o.rotation || this.def.rotation || [0, 0, 0];
  };
  WireLayer.prototype._update = function (t, dt, anim) {
    var o = this.o; this._base(dt, anim);
    var p = this.p, dr = anim ? o.drift : 0, pr = o.progressRotation || [0, 0, 0], po = o.progressOffset || [0, 0];
    var rx = this.rot0[0] + pr[0] * p + dr * 1.6 * Math.sin(t * 0.23) - this.py * 4;
    var ry = this.rot0[1] + pr[1] * p + dr * 2.4 * Math.sin(t * 0.16 + 1.3) + this.px * 7 + (anim ? o.spin * t : 0);
    var rz = this.rot0[2] + pr[2] * p + dr * 1.1 * Math.sin(t * 0.19 + 2.1);
    this.group.rotation.set(rx * DEG, ry * DEG, rz * DEG, 'XYZ');
    var intro = easeInOut(this.intro);
    var sc = lerp(1, o.progressScale, p) * (o.intro === 'fade' ? lerp(0.96, 1, intro) : 1);
    var W = this.stage.w, H = this.stage.h;
    var cx = this.L.x + po[0] * p + this.px * 0.006, cy = this.L.y + po[1] * p + dr * 0.008 * Math.sin(t * 0.41) + this.py * 0.004;
    var d = frameCamera(this.camera, W, H, o.fov, cx, cy, this.L.size * sc, 1);
    var reveal = o.intro === 'draw' ? intro : 1, alpha = o.intro === 'fade' ? intro : 1;
    var self = this;
    [this.matFront, this.matBack].forEach(function (m, k) {
      var u = m.uniforms;
      u.uNear.value = d - 1; u.uFar.value = d + 1; u.uFadeMin.value = 1 - o.depthFade;
      u.uReveal.value = reveal; u.uOpacity.value = 0.62 * o.opacity * alpha * (k ? o.hidden : 1); u.uTime.value = t;
    });
    if (this.fill) this.fillMat.uniforms.uAlpha.value = o.fillOpacity * Math.min(alpha, o.intro === 'draw' ? smooth(0.3, 1, this.intro) : 1);
    void self;
  };
  var _v3 = null;
  WireLayer.prototype.project = function (pt, off) {
    if (!this.ready || !pt) return null;
    var st = this.stage;
    if (st.rectFrame !== Ticker.frame || !st.rect) { st.rect = st.canvas.getBoundingClientRect(); st.rectFrame = Ticker.frame; }
    if (!_v3) _v3 = new THREE.Vector3();
    _v3.set(pt[0], pt[1], pt[2]).applyMatrix4(this.group.matrixWorld).project(this.camera);
    off = off || [0, 0];
    return { x: st.rect.left + (_v3.x * 0.5 + 0.5) * st.rect.width + off[0], y: st.rect.top + (0.5 - _v3.y * 0.5) * st.rect.height + off[1], z: _v3.z, alpha: this.hidden ? 0 : smooth(0.35, 0.9, this.intro) };
  };
  WireLayer.prototype.anchor = function (name, off) {
    var self = this;
    return function () { var a = typeof name === 'string' ? (self.anchorsLocal && self.anchorsLocal[name]) : name; return self.project(a, off); };
  };
  Object.defineProperty(WireLayer.prototype, 'anchorNames', { get: function () { return this.anchorsLocal ? Object.keys(this.anchorsLocal) : (MODEL_ANCHORS[this.o.model] || []); } });
  WireLayer.prototype.nodeId = function (a) { return (this.o.name || this.o.model) + '.' + a; };
  WireLayer.prototype._attachNodes = function () {
    var self = this, g = this.stage.graph();
    var nodes = this.o.nodes.map(function (n) { if (typeof n === 'string') n = { anchor: n }; return Object.assign({}, n, { id: n.id || self.nodeId(n.anchor), at: self.anchor(n.anchor, n.offset) }); });
    var links = (this.o.links || []).map(function (l) { return [self.nodeId(l[0]), self.nodeId(l[1])]; });
    g.add(nodes, links);
  };
  var MODEL_ANCHORS = {
    jet: ['nose', 'cockpit', 'door', 'windows', 'windowsL', 'wingtipL', 'wingtipR', 'wingL', 'wingR', 'tail', 'stabL', 'stabR', 'engineL', 'engineR', 'tailcone', 'belly', 'center'],
    laptop: ['screen', 'screenTL', 'screenTR', 'screenBL', 'camera', 'lidTop', 'keyboard', 'trackpad', 'frontL', 'frontR', 'hingeL', 'hingeR', 'center'],
    controller: ['stickL', 'stickR', 'dpad', 'buttons', 'touchpad', 'gripL', 'gripR', 'shoulderL', 'shoulderR', 'top', 'home', 'center'],
    globe: ['jax', 'london', 'dubai', 'tokyo', 'sydney', 'la', 'ny', 'singapore', 'north', 'orbit', 'center'],
    helix: ['top', 'bottom', 'mid', 'center']
  };

  /* ================================================================== GLYPH FIELD LAYER */
  var GLYPH_DEFAULTS = {
    shape: 'sphere', x: 0.12, y: 1.08, size: 1.5, layout: null, spacing: 15, rowRatio: 0.78, rows: 0, cols: 0,
    glyphs: GLYPHS, glyphSize: 8.5, color: '#ffffff', opacity: 0.72, amplitude: 0.035, frequency: 5, speed: 1, spin: 1.2,
    tilt: null, roll: null, twinkle: 0.3, dotRatio: 0.18, depthFade: 0.85, limb: 0.45, mask: null, fov: 30, parallax: 1,
    progress: 0, progressSpin: 30, progressPhase: 2, smoothing: 0.4, seed: 3, intro: 'fade', introDuration: 2.4, introDelay: 0, z: -1
  };
  var atlasCache = {};
  function glyphAtlas(chars) {
    if (atlasCache[chars]) return atlasCache[chars];
    var list = Array.from(chars).slice(0, 63); list.push('·');
    var cells = 8, cs = 64, c = document.createElement('canvas'); c.width = c.height = cells * cs;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '500 ' + Math.round(cs * 0.6) + 'px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
    list.forEach(function (ch, i) {
      var x = (i % cells) * cs + cs / 2, y = Math.floor(i / cells) * cs + cs / 2 + cs * 0.03;
      if (ch === '·') { g.beginPath(); g.arc(x, y, cs * 0.085, 0, TAU); g.fill(); } else g.fillText(ch, x, y);
    });
    var tex = new THREE.CanvasTexture(c); tex.flipY = false; tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    return (atlasCache[chars] = { tex: tex, cells: cells, count: list.length, dot: list.length - 1 });
  }
  function GlyphLayer(stage, opts) {
    var wave = opts && opts.shape === 'wave';
    var d = Object.assign({}, GLYPH_DEFAULTS, wave ? { x: 0.5, y: 0.78, size: 2.2, tilt: 24, roll: 0, amplitude: 0.09, frequency: 3.2, spacing: 13, spin: 0 } : { tilt: 14, roll: -10 });
    Layer.call(this, stage, opts, d);
  }
  GlyphLayer.prototype = Object.create(Layer.prototype);
  GlyphLayer.prototype._init = function () {
    var T = THREE, o = this.o;
    this.atlas = glyphAtlas(o.glyphs);
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(o.fov, 1, 0.1, 100);
    this.group = new T.Group(); this.scene.add(this.group);
    this.mat = new T.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uSpin: { value: 0 }, uAmp: { value: o.amplitude }, uFreq: { value: o.frequency }, uSize: { value: o.glyphSize },
        uPx: { value: 1 }, uRef: { value: 3 }, uOpacity: { value: o.opacity }, uNear: { value: 1 }, uFar: { value: 3 }, uFadeMin: { value: 0.15 },
        uLimb: { value: o.limb }, uTwinkle: { value: o.twinkle }, uShape: { value: 0 }, uAspect: { value: 1 }, uReveal: { value: 1 },
        uMask: { value: new T.Vector4(0, 0, 1, 0) }, uAtlas: { value: this.atlas.tex }, uCells: { value: this.atlas.cells }, uColor: { value: new T.Vector3(1, 1, 1) }
      },
      vertexShader: GLYPH_VS, fragmentShader: GLYPH_FS, depthTest: false
    });
    additive(this.mat);
    this.ready = true;
    this._apply();
  };
  GlyphLayer.prototype._apply = function () {
    var o = this.o, u = this.mat.uniforms;
    u.uAmp.value = o.amplitude; u.uFreq.value = o.frequency; u.uSize.value = o.glyphSize; u.uLimb.value = o.limb; u.uTwinkle.value = o.twinkle;
    u.uShape.value = o.shape === 'wave' ? 1 : 0; u.uFadeMin.value = 1 - o.depthFade; setVec(u.uColor, o.color);
    if (o.mask) u.uMask.value.set(o.mask[0], o.mask[1], o.mask[2], 1); else u.uMask.value.w = 0;
    this._geoKey = null;
  };
  GlyphLayer.prototype._resize = function (w, h) {
    this._layout(w, h);
    var o = this.o, cols, rows;
    if (o.shape === 'wave') { cols = o.cols || clamp(Math.round(this.L.size / o.spacing), 40, 360); rows = o.rows || Math.round(cols * o.rowRatio); }
    else { cols = o.cols || clamp(Math.round(Math.PI * this.L.size / o.spacing), 60, 480); rows = o.rows || Math.round(cols * 0.5 * o.rowRatio); }
    var key = o.shape + ':' + cols + 'x' + rows + ':' + o.seed + ':' + o.dotRatio;
    if (key !== this._geoKey) { this._geoKey = key; this._build(cols, rows); }
  };
  GlyphLayer.prototype._build = function (cols, rows) {
    var T = THREE, o = this.o, rnd = rng(o.seed), ll = [], gl = [], rr = [], nG = this.atlas.count - 1;
    var pushPt = function (a, b) { ll.push(a, b); gl.push(rnd() < o.dotRatio ? nG : Math.floor(rnd() * nG)); rr.push(rnd()); };
    if (o.shape === 'wave') {
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) pushPt(-1 + 2 * (c + (r % 2) * 0.5) / (cols - 1), -1 + 2 * r / (rows - 1));
    } else {
      for (var r2 = 0; r2 < rows; r2++) {
        var lat = -Math.PI / 2 + Math.PI * (r2 + 0.5) / rows, n = Math.max(1, Math.round(cols * Math.cos(lat)));
        for (var c2 = 0; c2 < n; c2++) pushPt(lat, (c2 + (r2 % 2) * 0.5) / n * TAU);
      }
    }
    var N = gl.length, geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aLL', new T.BufferAttribute(new Float32Array(ll), 2));
    geo.setAttribute('aGlyph', new T.BufferAttribute(new Float32Array(gl), 1));
    geo.setAttribute('aRand', new T.BufferAttribute(new Float32Array(rr), 1));
    if (this.points) { this.group.remove(this.points); this.points.geometry.dispose(); }
    this.points = new T.Points(geo, this.mat); this.points.frustumCulled = false;
    this.group.add(this.points);
    this.count = N;
  };
  GlyphLayer.prototype._update = function (t, dt, anim) {
    var o = this.o; this._base(dt, anim);
    var u = this.mat.uniforms, p = this.p, W = this.stage.w, H = this.stage.h;
    var tilt = o.tilt, roll = o.roll;
    this.group.rotation.set((tilt + this.py * 2) * DEG, 0, roll * DEG, 'XYZ');
    var cx = this.L.x + this.px * 0.004, cy = this.L.y + this.py * 0.003;
    var d = frameCamera(this.camera, W, H, o.fov, cx, cy, this.L.size, 1);
    u.uTime.value = t * o.speed + o.progressPhase * p;
    u.uSpin.value = ((anim ? o.spin * t : 0) + o.progressSpin * p + this.px * 3) * DEG;
    u.uPx.value = this.stage.dprNow; u.uRef.value = d; u.uNear.value = d - 1; u.uFar.value = d + 1; u.uAspect.value = W / H;
    var intro = this.intro; u.uReveal.value = o.intro === 'fade' ? easeOut(intro) : 1;
    u.uOpacity.value = o.opacity;
  };

  /* ================================================================== BIO STRANDS LAYER */
  var STRAND_FROM = {
    left: [-0.03, 0.44, -24], right: [1.03, 0.5, 204], top: [0.5, -0.04, -70], bottom: [0.45, 1.04, 72],
    'top-left': [-0.03, -0.03, -36], 'top-right': [1.03, -0.03, 216], 'bottom-left': [-0.03, 1.03, 24], 'bottom-right': [1.03, 1.03, 156]
  };
  var STRAND_DEFAULTS = {
    kind: 'spine', from: 'left', x: null, y: null, angle: null, size: 1.0, layout: null, twist: -58, tilt: 16,
    color: '#ffffff', opacity: 0.9, breathe: 1, speed: 1, seed: 5, fov: 34, parallax: 1, count: 16, ribs: true, ribLength: 1, filaments: 1,
    progress: 0, progressTwist: 24, progressGrow: false, smoothing: 0.45, intro: 'grow', introDuration: 3.4, introDelay: 0, rim: 1.6, depthFade: 0.5, z: -0.5
  };
  function strandCurve(seed, wobble) {
    var r = rng(seed), ctrl = [];
    for (var i = 0; i <= 5; i++) ctrl.push([i / 5, (Math.sin(i * 1.3 + seed) * 0.04 + (r() - 0.5) * 0.02) * wobble, (Math.cos(i * 1.1 + seed) * 0.03) * wobble]);
    ctrl[0] = [0, 0, 0];
    var C = catmull(ctrl, 240), F = frames(C, [0, 1, 0]);
    return {
      C: C, F: F,
      at: function (s) { var f = clamp(s) * 240, i = Math.min(239, Math.floor(f)), t = f - i; return { p: V.lerp(C[i], C[i + 1], t), T: F.T[i], N: F.N[i], B: F.B[i] }; }
    };
  }
  function linePts(a, b, n) { var o = []; for (var i = 0; i <= n; i++) o.push(V.lerp(a, b, i / n)); return o; }
  function strandSpine(B, o, rnd) {
    var cv = strandCurve(o.seed, 1), nV = o.count, ribs = [];
    for (var k = 0; k < nV; k++) {
      var s = 0.02 + k * (0.96 / (nV - 1)), sz = lerp(1.12, 0.62, s), rv = 0.026 * sz, fr = cv.at(s), hl = 0.96 / (nV - 1) * 0.34;
      var prof = [-1, -0.55, -0.15, 0.15, 0.55, 1].map(function (tau) { return [tau * hl, rv * (1 + 0.26 * tau * tau)]; });
      var P = prof.map(function (pr) { var c = V.madd(fr.p, fr.T, pr[0]), row = []; for (var j = 0; j < 12; j++) { var a = j / 12 * TAU; row.push(V.add(c, V.add(V.mul(fr.N, Math.cos(a) * pr[1]), V.mul(fr.B, Math.sin(a) * pr[1])))); } return row; });
      B.mesh(P, { cj: true, ring: function (i) { return (i === 0 || i === 5) ? 0.42 : 0.26; }, long: 0.24, fill: false, lr: s });
      [-1, 1].forEach(function (e) { B.curve(circle([0, 0, 0], 1, 12).map(function (q) { return V.add(V.madd(fr.p, fr.T, e * hl), V.add(V.mul(fr.N, q[0] * rv * 0.55), V.mul(fr.B, q[2] * rv * 0.55))); }), 0.18, true, fr.T, s); });
      var d1 = V.norm(V.add(V.mul(fr.N, 0.85), V.mul(fr.T, -0.55))), base = V.madd(fr.p, fr.N, rv * 0.8);
      tube(B, linePts(base, V.madd(base, d1, rv * 2.3), 6), function (r) { return rv * lerp(0.42, 0.14, r); }, 6, { longW: 0.26, ringEvery: 2, ringW: 0.16, fill: false, lr: s });
      [-1, 1].forEach(function (side) {
        var d2 = V.norm(V.add(V.mul(fr.B, side * 0.92), V.add(V.mul(fr.N, 0.3), V.mul(fr.T, -0.12))));
        var tb = V.madd(fr.p, fr.B, side * rv * 0.7), tip = V.madd(tb, d2, rv * 1.8);
        tube(B, linePts(tb, tip, 5), function (r) { return rv * lerp(0.32, 0.2, r); }, 6, { longW: 0.24, ringEvery: 5, ringW: 0.16, fill: false, lr: s });
        if (o.ribs && k >= 1 && k <= nV - 2) {
          var Rr = rv * 10.5 * o.ribLength * (0.5 + 0.6 * Math.sin(Math.PI * Math.min(1, 0.12 + s * 0.95))), pts = [], rs = [];
          for (var q = 0; q <= 34; q++) {
            var ph = q / 34, a = ph * 2.3;
            pts.push(V.add(tip, V.add(V.mul(fr.B, side * Rr * Math.sin(a)), V.add(V.mul(fr.N, -Rr * 0.8 * (1 - Math.cos(a))), V.mul(fr.T, Rr * 0.42 * ph * ph)))));
            rs.push(s + 0.05 * ph);
          }
          tube(B, pts, function (r) { return rv * 0.36 * (1 - 0.6 * r); }, 6, { longW: 0.3, ringEvery: 6, ringW: 0.09, fill: false, lr: function (i) { return rs[i]; } });
          ribs.push({ k: k, side: side, pts: pts, s: s, fr: fr });
        }
      });
    }
    // filaments between ribs
    var nf = Math.round(54 * o.filaments);
    for (var f = 0; f < nf && ribs.length > 2; f++) {
      var r1 = ribs[Math.floor(rnd() * ribs.length)], cand = ribs.filter(function (r) { return r !== r1 && Math.abs(r.k - r1.k) <= 2; });
      var r2 = cand[Math.floor(rnd() * cand.length)] || ribs[0];
      var a1 = r1.pts[Math.floor(rnd() * 30)], a2 = r2.pts[Math.floor(rnd() * 30)];
      var mid = V.add(V.lerp(a1, a2, 0.5), [(rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.05 - 0.02, (rnd() - 0.5) * 0.05]);
      var pts2 = [], rs2 = [];
      for (var q2 = 0; q2 <= 14; q2++) { var t = q2 / 14; pts2.push(V.add(V.mul(a1, (1 - t) * (1 - t)), V.add(V.mul(mid, 2 * t * (1 - t)), V.mul(a2, t * t)))); rs2.push(lerp(r1.s, r2.s, t) + 0.03); }
      B.curve(pts2, 0.1 + rnd() * 0.12, false, null, rs2);
    }
    // fibres wrapping the column
    for (var h = 0; h < 4; h++) {
      var pts3 = [], rs3 = [];
      for (var q3 = 0; q3 <= 320; q3++) { var s3 = q3 / 320, fr3 = cv.at(s3), a3 = s3 * (18 + h * 3) + h * 1.7, r3 = 0.038 * lerp(1.15, 0.6, s3) * (1 + 0.25 * Math.sin(s3 * 37 + h)); pts3.push(V.add(fr3.p, V.add(V.mul(fr3.N, Math.cos(a3) * r3), V.mul(fr3.B, Math.sin(a3) * r3)))); rs3.push(s3); }
      B.curve(pts3, 0.13, false, null, rs3);
    }
    // loose web strands drifting alongside
    for (var wv = 0; wv < Math.round(10 * o.filaments); wv++) {
      var off = [(rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.22], ph2 = rnd() * 6, pts4 = [], rs4 = [];
      for (var q4 = 0; q4 <= 80; q4++) { var s4 = q4 / 80, fr4 = cv.at(s4), amp = 0.5 + 0.5 * Math.sin(s4 * 3 + ph2); pts4.push(V.add(fr4.p, V.add(V.mul(fr4.N, off[0] * amp), V.mul(fr4.B, off[1] * amp)))); rs4.push(s4); }
      B.curve(pts4, 0.08, false, null, rs4);
    }
  }
  function strandDNA(B, o, rnd) {
    var cv = strandCurve(o.seed + 3, 1.2), turns = o.turns || 6.5, n = 360, s0 = [], s1 = [], rs = [];
    for (var i = 0; i <= n; i++) {
      var s = i / n, fr = cv.at(s), a = s * turns * TAU, rh = 0.052 * lerp(1.15, 0.7, s);
      s0.push(V.add(fr.p, V.add(V.mul(fr.N, Math.cos(a) * rh), V.mul(fr.B, Math.sin(a) * rh))));
      s1.push(V.add(fr.p, V.add(V.mul(fr.N, Math.cos(a + Math.PI) * rh), V.mul(fr.B, Math.sin(a + Math.PI) * rh))));
      rs.push(s);
    }
    var lr = function (i) { return rs[i]; };
    tube(B, s0, function (r) { return 0.008 * lerp(1.1, 0.7, r); }, 6, { longW: 0.38, ringEvery: 10, ringW: 0.12, fill: false, lr: lr });
    tube(B, s1, function (r) { return 0.008 * lerp(1.1, 0.7, r); }, 6, { longW: 0.38, ringEvery: 10, ringW: 0.12, fill: false, lr: lr });
    for (i = 3; i < n; i += 6) {
      var m = V.lerp(s0[i], s1[i], 0.5);
      B.line(s0[i], V.lerp(s0[i], m, 0.9), 0.34, null, null, rs[i]); B.line(s1[i], V.lerp(s1[i], m, 0.9), 0.34, null, null, rs[i]);
      var o0 = V.mul(V.norm(V.sub(s1[i], s0[i])), 0.004), side = V.mul(V.norm(V.cross(V.sub(s1[i], s0[i]), cv.at(rs[i]).T)), 0.004);
      B.line(V.add(s0[i], side), V.add(V.lerp(s0[i], m, 0.9), side), 0.16, null, null, rs[i]);
      void o0;
    }
    for (var h = 0; h < 2; h++) {
      var pts = [], rr2 = [];
      for (i = 0; i <= n; i++) { var s2 = i / n, fr2 = cv.at(s2), a2 = s2 * turns * TAU * 0.5 + h * Math.PI, rh2 = 0.11 * lerp(1.1, 0.7, s2); pts.push(V.add(fr2.p, V.add(V.mul(fr2.N, Math.cos(a2) * rh2), V.mul(fr2.B, Math.sin(a2) * rh2)))); rr2.push(s2); }
      B.curve(pts, 0.1, false, null, rr2);
    }
    void rnd;
  }
  function strandWeb(B, o, rnd) {
    var rv = function () { return [(rnd() - 0.5), (rnd() - 0.5), (rnd() - 0.5)]; };
    var tips = [];
    var branch = function (p, dir, len, depth, s0) {
      var pts = [p], rs = [s0], cur = p, d = dir, steps = 26;
      for (var i = 1; i <= steps; i++) { d = V.norm(V.add(d, V.mul(rv(), 0.16))); cur = V.madd(cur, d, len / steps); pts.push(cur); rs.push(s0 + len * i / steps); }
      B.curve(pts, 0.1 + 0.08 * (3 - depth), false, null, rs);
      tips.push({ p: cur, s: s0 + len }); tips.push({ p: pts[13], s: rs[13] });
      if (depth < 3) for (var b = 0, nb = 2 + Math.floor(rnd() * 2); b < nb; b++) { var idx = Math.floor(steps * (0.25 + rnd() * 0.65)); branch(pts[idx], V.norm(V.add(d, V.mul(rv(), 1.3))), len * 0.55, depth + 1, rs[idx]); }
    };
    var nm = Math.max(1, Math.round(5 * o.filaments));
    for (var m = 0; m < nm; m++) branch([0, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12], V.norm([1, (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.7]), 0.85, 0, 0);
    for (var k = 0; k < tips.length * 0.6; k++) {
      var a = tips[Math.floor(rnd() * tips.length)], b2 = tips[Math.floor(rnd() * tips.length)];
      if (V.len(V.sub(a.p, b2.p)) > 0.3 || a === b2) continue;
      var mid = V.add(V.lerp(a.p, b2.p, 0.5), [0, -0.03, 0]), pts = [], rs = [];
      for (var q = 0; q <= 10; q++) { var t = q / 10; pts.push(V.add(V.mul(a.p, (1 - t) * (1 - t)), V.add(V.mul(mid, 2 * t * (1 - t)), V.mul(b2.p, t * t)))); rs.push(lerp(a.s, b2.s, t)); }
      B.curve(pts, 0.08, false, null, rs);
    }
  }
  var STRAND_KINDS = { spine: strandSpine, dna: strandDNA, web: strandWeb };
  function StrandLayer(stage, opts) { Layer.call(this, stage, opts, STRAND_DEFAULTS); }
  StrandLayer.prototype = Object.create(Layer.prototype);
  StrandLayer.prototype._init = function () {
    var T = THREE, o = this.o, B = new Builder(), rnd = rng(o.seed);
    String(o.kind).split('+').forEach(function (k) { (STRAND_KINDS[k.trim()] || strandSpine)(B, o, rnd); });
    var g = finalize(B, { normalize: false, axis: [1, 0, 0], jitter: 0.02 });
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(o.fov, 1, 0.1, 100);
    this.outer = new T.Group(); this.inner = new T.Group(); this.inner.position.x = -0.5;
    this.outer.add(this.inner); this.scene.add(this.outer);
    var lg = new T.BufferGeometry();
    lg.setAttribute('position', new T.BufferAttribute(g.P, 3)); lg.setAttribute('normal', new T.BufferAttribute(g.N, 3));
    lg.setAttribute('aW', new T.BufferAttribute(g.W, 1)); lg.setAttribute('aR', new T.BufferAttribute(g.R, 1));
    this.mat = lineMaterial(T.AlwaysDepth); this.mat.depthTest = false;
    this.lines = new T.LineSegments(lg, this.mat); this.lines.frustumCulled = false; this.inner.add(this.lines);
    this.ready = true; this._apply();
  };
  StrandLayer.prototype._apply = function () { var o = this.o, u = this.mat.uniforms; setVec(u.uColor, o.color); u.uRim.value = o.rim; u.uSoft.value = 0.14; u.uFront.value = 0.6; };
  StrandLayer.prototype._resize = function (w, h) {
    var o = this.o, f = STRAND_FROM[o.from] || STRAND_FROM.left, L = o.layout ? (o.layout(w, h) || {}) : {};
    var x = L.x !== undefined ? L.x : (o.x != null ? o.x : f[0]), y = L.y !== undefined ? L.y : (o.y != null ? o.y : f[1]);
    var ang = L.angle !== undefined ? L.angle : (o.angle != null ? o.angle : f[2]), size = resolveSize(L.size !== undefined ? L.size : o.size, w, h);
    this.L = { x: x, y: y, angle: ang, size: size };
  };
  StrandLayer.prototype._update = function (t, dt, anim) {
    var o = this.o; this._base(dt, anim);
    var p = this.p, L = this.L, W = this.stage.w, H = this.stage.h, br = anim ? o.breathe : 0, a = L.angle * DEG;
    var tw = o.twist + o.progressTwist * p + br * 4 * Math.sin(t * 0.21 * o.speed);
    this.outer.rotation.set(tw * DEG, (o.tilt + this.px * 3) * DEG, a + br * 0.012 * Math.sin(t * 0.17), 'ZYX');
    var creep = br * 0.012 * Math.sin(t * 0.11 * o.speed);
    var cxp = L.x * W + Math.cos(a) * L.size * (0.5 + creep), cyp = L.y * H - Math.sin(a) * L.size * (0.5 + creep);
    var d = frameCamera(this.camera, W, H, o.fov, cxp / W + this.px * 0.005, cyp / H + this.py * 0.004, L.size, 0.5);
    var u = this.mat.uniforms, intro = this.intro;
    u.uNear.value = d - 0.35; u.uFar.value = d + 0.35; u.uFadeMin.value = 1 - o.depthFade;
    u.uReveal.value = (o.intro === 'grow' ? easeInOut(intro) : 1) * (o.progressGrow ? p : 1);
    u.uOpacity.value = 0.62 * o.opacity * (o.intro === 'fade' ? easeOut(intro) : 1);
    u.uTime.value = t * o.speed; u.uBreath.value = 0.0035 * br; u.uWave.value = 0.006 * br;
  };

  /* ================================================================== NODE GRAPH (2D overlay) */
  var Graphs = [];
  var GRAPH_DEFAULTS = {
    nodes: [], links: [], progress: 'auto', duration: 2.6, delay: 0.3, stagger: 0.55,
    lineColor: 'rgba(255,255,255,0.4)', lineWidth: 1, nodeColor: COLORS.node, nodeSize: 1, glow: 1,
    bracketSize: 24, bracketColor: 'rgba(255,255,255,0.32)', labelColor: 'rgba(243,244,242,0.6)',
    labelFont: '500 10px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
    breathe: true, pulse: 0, pulseSpeed: 0.12, dpr: 1.75, zIndex: null, smoothing: 0.3, onFrame: null
  };
  function glowSprite(c) {
    var p = parseColor(c), s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s;
    var g = cv.getContext('2d'), grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    var col = function (a) { return 'rgba(' + Math.round(p[0] * 255) + ',' + Math.round(p[1] * 255) + ',' + Math.round(p[2] * 255) + ',' + a + ')'; };
    grd.addColorStop(0, col(0.85)); grd.addColorStop(0.16, col(0.5)); grd.addColorStop(0.4, col(0.13)); grd.addColorStop(1, col(0));
    g.fillStyle = grd; g.fillRect(0, 0, s, s); return cv;
  }
  function NodeGraph(el, opts) {
    el = $(el);
    if (!el) throw new Error('[TechBio] graph container not found');
    this.el = el; this.priority = 10; this.o = Object.assign({}, GRAPH_DEFAULTS, opts || {});
    this.nodes = []; this.links = []; this.map = {}; this.visible = true; this.dirty = true; this.time = 0;
    this.auto = this.o.progress === 'auto';
    this.pt = this.p = this.auto ? 0 : clamp(+this.o.progress || 0); this.autoT = 0; this._pos = [];
    this.canvas = makeCanvas(el, this.o.zIndex); this.canvas.classList.add('tb-graph');
    this.ctx = this.canvas.getContext('2d');
    this.sprite = glowSprite(this.o.nodeColor);
    var self = this;
    this.io = observe(el, this);
    if ('ResizeObserver' in root) { this.ro = new ResizeObserver(function () { self._resize(); }); this.ro.observe(el); }
    this._resize();
    this.add(this.o.nodes, this.o.links);
    Graphs.push(this); Ticker.add(this);
  }
  NodeGraph.prototype._resize = function () {
    var w = Math.max(1, this.el.clientWidth), h = Math.max(1, this.el.clientHeight), d = Math.min(root.devicePixelRatio || 1, this.o.dpr);
    this.w = w; this.h = h; this.dpr = d;
    this.canvas.width = Math.round(w * d); this.canvas.height = Math.round(h * d);
    this.invalidate();
  };
  NodeGraph.prototype.invalidate = function () { this.dirty = true; Ticker.wake(); };
  NodeGraph.prototype.add = function (nodes, links) {
    var self = this;
    (nodes || []).forEach(function (n, i) {
      if (typeof n === 'function' || Array.isArray(n) || (n && n.nodeType === 1)) n = { at: n };
      var node = Object.assign({ id: n.id != null ? String(n.id) : 'n' + self.nodes.length, bracket: false, size: 1, glow: 1, dot: true }, n);
      if (typeof node.at === 'string') node.at = document.querySelector(node.at);
      node.index = self.nodes.length; self.nodes.push(node); self.map[node.id] = node;
      void i;
    });
    (links || []).forEach(function (l) { self.link(l); });
    this.invalidate();
    return this;
  };
  NodeGraph.prototype.link = function (a, b, o) {
    var spec = Array.isArray(a) ? { from: a[0], to: a[1] } : (typeof a === 'object' && a !== null && !(a.nodeType) ? a : { from: a, to: b });
    if (o) Object.assign(spec, o);
    var self = this, get = function (r) { return typeof r === 'number' ? self.nodes[r] : self.map[String(r)]; };
    var A = get(spec.from), Bn = get(spec.to);
    if (!A || !Bn) { console.warn('[TechBio] link: unknown node', spec.from, spec.to); return this; }
    this.links.push(Object.assign({ a: A, b: Bn, opacity: 1, bend: 0, dashed: false }, spec));
    this.invalidate();
    return this;
  };
  NodeGraph.prototype.setNodes = function (nodes, links) { this.nodes = []; this.links = []; this.map = {}; return this.add(nodes, links); };
  NodeGraph.prototype.setProgress = function (p) { this.auto = false; this.pt = clamp(+p || 0); if (reduced) this.p = this.pt; this.invalidate(); return this; };
  NodeGraph.prototype.replay = function () { this.auto = true; this.autoT = 0; this.p = 0; this.invalidate(); return this; };
  NodeGraph.prototype.set = function (o) { Object.assign(this.o, o || {}); if (o && o.nodeColor) this.sprite = glowSprite(o.nodeColor); this.invalidate(); return this; };
  NodeGraph.prototype.positions = function () { return this._pos.slice(); };
  NodeGraph.prototype._resolve = function (n, rect) {
    var at = n.at, p = null, off = n.offset || [0, 0];
    if (typeof at === 'function') { var q = at(); if (q) p = { x: q.x - rect.left, y: q.y - rect.top, alpha: q.alpha === undefined ? 1 : q.alpha }; }
    else if (at && at.nodeType === 1) { var r = at.getBoundingClientRect(), an = n.anchor || [0.5, 0.5]; p = { x: r.left + r.width * an[0] - rect.left, y: r.top + r.height * an[1] - rect.top, alpha: 1 }; }
    else if (Array.isArray(at)) p = { x: at[0] * this.w, y: at[1] * this.h, alpha: 1 };
    else if (at && typeof at.x === 'number') p = { x: at.x, y: at.y, alpha: 1 };
    if (!p) return null;
    p.x += off[0]; p.y += off[1];
    return p;
  };
  NodeGraph.prototype._step = function (dt) {
    if (this.destroyed || !this.visible) return false;
    var anim = !reduced;
    if (!anim && !this.dirty) return false;
    this.dirty = false;
    var o = this.o;
    if (anim) this.time += dt;
    if (this.auto) { if (anim) { this.autoT += dt; this.p = easeInOut(clamp((this.autoT - o.delay) / o.duration)); } else this.p = 1; }
    else this.p = anim ? damp(this.p, this.pt, 1 / Math.max(0.01, o.smoothing), dt) : this.pt;
    this._draw(anim);
    return anim;
  };
  NodeGraph.prototype._draw = function (anim) {
    var ctx = this.ctx, o = this.o, d = this.dpr, rect = this.el.getBoundingClientRect(), t = this.time, self = this;
    var sx = rect.width / this.w || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    var pos = this.nodes.map(function (n) { var p = self._resolve(n, rect); if (p && sx !== 1) { p.x /= sx; p.y /= sx; } return p; });
    var nL = this.links.length, st = clamp(o.stagger), len = 1 / (1 + Math.max(0, nL - 1) * st), P = this.p;
    var nodeT = this.nodes.map(function () { return Infinity; });
    // edges
    ctx.lineCap = 'round';
    this.links.forEach(function (l, i) {
      var start = i * len * st, q = clamp((P - start) / len);
      nodeT[l.a.index] = Math.min(nodeT[l.a.index], start); nodeT[l.b.index] = Math.min(nodeT[l.b.index], start + len * 0.85);
      var A = pos[l.a.index], Bp = pos[l.b.index]; if (!A || !Bp || q <= 0) return;
      var al = Math.min(A.alpha, Bp.alpha) * l.opacity; if (al <= 0.01) return;
      ctx.strokeStyle = l.color || o.lineColor; ctx.globalAlpha = al; ctx.lineWidth = l.width || o.lineWidth;
      ctx.setLineDash(l.dashed ? [3, 4] : []);
      ctx.beginPath();
      var mx = (A.x + Bp.x) / 2, my = (A.y + Bp.y) / 2, dx = Bp.x - A.x, dy = Bp.y - A.y;
      var cx = mx - dy * l.bend, cy = my + dx * l.bend, end = null;
      if (!l.bend) { end = { x: A.x + dx * q, y: A.y + dy * q }; ctx.moveTo(A.x, A.y); ctx.lineTo(end.x, end.y); }
      else { ctx.moveTo(A.x, A.y); for (var s = 1; s <= 32; s++) { var u = s / 32 * q, iu = 1 - u; end = { x: iu * iu * A.x + 2 * iu * u * cx + u * u * Bp.x, y: iu * iu * A.y + 2 * iu * u * cy + u * u * Bp.y }; ctx.lineTo(end.x, end.y); } }
      ctx.stroke();
      if (q < 1 && end) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * 0.8; ctx.drawImage(self.sprite, end.x - 6, end.y - 6, 12, 12); ctx.globalCompositeOperation = 'source-over'; }
      if (anim && o.pulse > 0 && q >= 1) {
        var ph = (t * o.pulseSpeed + i * 0.37) % 1, pp = ph * o.pulse; if (pp < 1) {
          var px = A.x + dx * pp, py = A.y + dy * pp;
          if (l.bend) { var iu2 = 1 - pp; px = iu2 * iu2 * A.x + 2 * iu2 * pp * cx + pp * pp * Bp.x; py = iu2 * iu2 * A.y + 2 * iu2 * pp * cy + pp * pp * Bp.y; }
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * Math.sin(pp * Math.PI) * 0.7; ctx.drawImage(self.sprite, px - 5, py - 5, 10, 10); ctx.globalCompositeOperation = 'source-over';
        }
      }
    });
    ctx.setLineDash([]);
    // nodes, brackets, labels
    var out = [];
    this.nodes.forEach(function (n, i) {
      var p = pos[i]; if (!p) { out.push({ id: n.id, visible: false }); return; }
      var t0 = nodeT[i] === Infinity ? (i / Math.max(1, self.nodes.length)) * 0.6 : nodeT[i];
      var a = smooth(t0, t0 + 0.12, P) * p.alpha * (n.hidden ? 0 : 1);
      out.push({ id: n.id, x: p.x, y: p.y, alpha: a, visible: a > 0.01 });
      if (a <= 0.01) return;
      var s = (n.size || 1) * o.nodeSize, br = o.breathe && anim ? 0.82 + 0.18 * Math.sin(t * 1.1 + i * 1.7) : 1;
      if (n.bracket) {
        var bs = (typeof n.bracket === 'number' ? n.bracket : (n.bracketSize || o.bracketSize)), bo = n.bracketOffset || [0, 0];
        var x0 = Math.round(p.x - bs / 2 + bo[0]) + 0.5, y0 = Math.round(p.y - bs / 2 + bo[1]) + 0.5;
        ctx.globalAlpha = a; ctx.strokeStyle = o.bracketColor; ctx.lineWidth = 1;
        if (n.bracket === 'corners') {
          var c = bs * 0.28; ctx.beginPath();
          [[x0, y0, 1, 1], [x0 + bs, y0, -1, 1], [x0, y0 + bs, 1, -1], [x0 + bs, y0 + bs, -1, -1]].forEach(function (k) { ctx.moveTo(k[0] + k[2] * c, k[1]); ctx.lineTo(k[0], k[1]); ctx.lineTo(k[0], k[1] + k[3] * c); });
          ctx.stroke();
        } else ctx.strokeRect(x0, y0, bs, bs);
      }
      if (n.dot !== false) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * o.glow * (n.glow === undefined ? 1 : n.glow) * br;
        var R = 12 * s; ctx.drawImage(self.sprite, p.x - R, p.y - R, R * 2, R * 2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
        ctx.strokeStyle = rgba(o.nodeColor, 0.9); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, 3.6 * s, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#f2fff7'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 * s, 0, TAU); ctx.fill();
      }
      if (n.label) {
        ctx.globalAlpha = a; ctx.fillStyle = o.labelColor; ctx.font = o.labelFont;
        var side = n.labelSide || 'right', gap = (n.bracket ? (n.bracketSize || o.bracketSize) / 2 : 6) + 8;
        ctx.textBaseline = side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : 'middle';
        ctx.textAlign = side === 'left' ? 'right' : side === 'right' ? 'left' : 'center';
        ctx.fillText(String(n.label).toUpperCase(), p.x + (side === 'right' ? gap : side === 'left' ? -gap : 0), p.y + (side === 'top' ? -gap : side === 'bottom' ? gap : 0));
      }
    });
    ctx.globalAlpha = 1;
    this._pos = out;
    if (o.onFrame) try { o.onFrame(out, this); } catch (e) { console.warn(e); }
  };
  NodeGraph.prototype.destroy = function () {
    if (this.destroyed) return; this.destroyed = true;
    Ticker.remove(this); var i = Graphs.indexOf(this); if (i >= 0) Graphs.splice(i, 1);
    if (this.io) this.io.disconnect(); if (this.ro) this.ro.disconnect();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  /* ================================================================== SCROLL HELPER */
  function scroll(el, cb, o) {
    el = $(el); o = o || {};
    var mode = o.mode || 'through', raf = 0, last = -1;
    var calc = function () {
      raf = 0;
      var r = el.getBoundingClientRect(), vh = root.innerHeight || document.documentElement.clientHeight, p;
      if (mode === 'exit') p = -r.top / Math.max(1, r.height);
      else if (mode === 'enter') p = (vh - r.top) / Math.max(1, vh);
      else if (mode === 'pin') p = -r.top / Math.max(1, r.height - vh);
      else p = (vh - r.top) / Math.max(1, vh + r.height);
      p = clamp(p);
      if (Math.abs(p - last) > 1e-4) { last = p; cb(p); }
    };
    var on = function () { if (!raf) raf = requestAnimationFrame(calc); };
    root.addEventListener('scroll', on, { passive: true }); root.addEventListener('resize', on);
    calc();
    return { update: calc, get progress() { return last; }, destroy: function () { root.removeEventListener('scroll', on); root.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); } };
  }

  /* ================================================================== PUBLIC API */
  function own(LayerFn, el, o) { var so = {}; ['dpr', 'background', 'zIndex', 'antialias'].forEach(function (k) { if (o && o[k] !== undefined) so[k] = o[k]; }); var st = new Stage(el, so); var l = st._add(new LayerFn(st, o)); l._ownsStage = true; return l; }
  var TechBio = {
    version: VERSION,
    colors: COLORS,
    glyphs: GLYPHS,
    models: Object.keys(MODELS),
    anchors: MODEL_ANCHORS,
    get ready() { return loadThree(); },
    get reducedMotion() { return reduced; },
    stage: function (el, o) { return new Stage(el, o); },
    wireframe: function (el, o) { return own(WireLayer, el, o); },
    glyphField: function (el, o) { return own(GlyphLayer, el, o); },
    strands: function (el, o) { return own(StrandLayer, el, o); },
    nodeGraph: function (el, o) { return new NodeGraph(el, o); },
    scroll: scroll,
    defineModel: function (name, build, opts) { MODELS[name] = Object.assign({ build: function (B, o, r) { build(B, o, r, TechBio.shapes); }, rotation: [0, 0, 0], axis: [1, 0, 0] }, opts || {}); MODEL_ANCHORS[name] = (opts && opts.anchors) || []; TechBio.models = Object.keys(MODELS); },
    shapes: { lathe: lathe, tube: tube, rrect: rrect, circle: circle, catmull: catmull, V: V },
    util: { clamp: clamp, lerp: lerp, smooth: smooth, damp: damp, easeInOut: easeInOut, rng: rng, pointer: pointer }
  };
  root.TechBio = TechBio;
  try { root.dispatchEvent(new CustomEvent('techbio:ready', { detail: TechBio })); } catch (e) { }
})(typeof window !== 'undefined' ? window : this);
