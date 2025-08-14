(function initHeroMatrix() {
  const hero   = document.getElementById('home');
  const canvas = document.getElementById('hero-matrix');
  if (!hero || !canvas) return;

  const ctx = canvas.getContext('2d');

  // TODO: maybe document more than the cfg?
  const cfg = {
    fontPx: 16,

    // Global opacity multiplier for all chars
    opacity: 0.8,

    // Erase -> transparency (prevents burn-in / black wash)
    erase: 0.95,             // perframe destination-out alpha
    hardScrubAfter: 10,      // frames idle -> stronger erase
    hardClearAfter: 10,      // frames idle -> clearRect

    // Motion / strands
    speedMin: 0.05,
    speedMax: 0.5,
    tailMin: 8,
    tailMax: 20,

    // Blob radius around cursor
    radiusXpx: 100, //200        
    radiusYpx: 125, //200

    // Smooth Y-radius jitter (no flicker)
    jitterYRange: 100,       // +-range (
    jitterMs: 250,           // pick new target every N ms
    smoothFactorY: 0.08,     // easing toward Y radius target

    // Smooth cursor center (fixes “blocky” jumps)
    posSmooth: 0.18,         // 0..1 fraction toward target per frame
    maxStepPx: 60,           // cap pixels-per-framea
    deadZonePx: 12,          // ignore tiny target deltas

    // Edge fade
    edgeFadeCols: 10,

    // Colors
    color: '#50fa7b',
    head:  '#c6ffd7',
  };

  const KATAKANA = Array.from({length:96}, (_,i)=>String.fromCharCode(0x30A0+i)).join('');
  const ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const EXTRA = 'abcdefghijklmnopqrstuvwxyz#$%&*+-<>?';
  const CHARS = (KATAKANA + ASCII + EXTRA).split('');
  const rndChar = () => CHARS[(Math.random()*CHARS.length)|0];

  let dpr=1, colW=0, rowH=0, cols=0, rows=0;
  let yHeads=[], speeds=[], tails=[];
  let colJitter=[];
  let framesSinceInput = 999;

  const mouseTgt = { xpx:0, ypx:0, inside:false };
  const center   = { xpx:0, ypx:0 }; 

  let baseRy=0, ry=0, ryTgt=0, lastJitterTime=0;

  const clamp = (v,min,max)=> v<min?min:v>max?max:v;
  const smoothstep = (t)=> t<=0?0 : t>=1?1 : t*t*(3-2*t);
  const randInt = (min,max)=> (Math.floor(Math.random()*(max-min+1))+min);

  function sizeToHero() {
    const r = hero.getBoundingClientRect();
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width  = Math.max(1, Math.floor(r.width  * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));

    rowH = Math.max(8, Math.floor(cfg.fontPx * dpr));
    colW = rowH;
    cols = Math.max(1, Math.floor(canvas.width  / colW));
    rows = Math.max(1, Math.floor(canvas.height / rowH));

    ctx.setTransform(1,0,0,1,0,0);
    ctx.font = `${rowH}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textBaseline = 'top';

    yHeads = Array.from({length: cols}, () => (Math.random()*rows)|0);
    speeds = Array.from({length: cols}, () => cfg.speedMin + Math.random()*(cfg.speedMax - cfg.speedMin));
    tails  = Array.from({length: cols}, () => (cfg.tailMin + Math.random()*(cfg.tailMax - cfg.tailMin))|0);
    colJitter = Array.from({length: cols}, () => (Math.random()*2-1) * cfg.jitterYRange * 0.6 * dpr);

    baseRy = cfg.radiusYpx * dpr;
    ry = baseRy;
    ryTgt = baseRy;

    center.xpx = canvas.width * 0.5;
    center.ypx = canvas.height * 0.5;
  }

  function onPointerMove(clientX, clientY) {
    const r = hero.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    mouseTgt.inside = x>=0 && y>=0 && x<=r.width && y<=r.height;
    if (!mouseTgt.inside) return;
    mouseTgt.xpx = x * dpr;
    mouseTgt.ypx = y * dpr;
    framesSinceInput = 0;
  }

  function drawGlyph(c, r, ch, color, a) {
    if (r < 0 || r >= rows || a <= 0) return;
    ctx.globalAlpha = a * cfg.opacity;
    ctx.fillStyle = color;
    ctx.fillText(ch, c * colW, r * rowH);
  }

  function columnEdgeFactor(c) {
    const d = Math.min(c, cols - 1 - c);
    const t = clamp(d / Math.max(1, cfg.edgeFadeCols), 0, 1);
    return smoothstep(t);
  }

  function updateCenter() {
    if (!mouseTgt.inside) return;
    const maxStep = cfg.maxStepPx * dpr;
    let dx = mouseTgt.xpx - center.xpx;
    let dy = mouseTgt.ypx - center.ypx;

    if (Math.abs(dx) < cfg.deadZonePx * dpr) dx = 0;
    if (Math.abs(dy) < cfg.deadZonePx * dpr) dy = 0;

    dx *= cfg.posSmooth;
    dy *= cfg.posSmooth;

    dx = clamp(dx, -maxStep, maxStep);
    dy = clamp(dy, -maxStep, maxStep);

    center.xpx += dx;
    center.ypx += dy;
  }

  function updateRy(now) {
    if (now - lastJitterTime > cfg.jitterMs) {
      const jitter = randInt(-cfg.jitterYRange, cfg.jitterYRange) * dpr;
      ryTgt = Math.max(40 * dpr, baseRy + jitter);
      lastJitterTime = now;
    }
    ry += (ryTgt - ry) * cfg.smoothFactorY;
  }

  function tick(now = performance.now()) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1; 
    ctx.fillStyle = `rgba(0,0,0,${cfg.erase})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    framesSinceInput++;
    if (framesSinceInput > cfg.hardScrubAfter) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (framesSinceInput > cfg.hardClearAfter) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      framesSinceInput = cfg.hardClearAfter;
    }

    updateCenter();
    updateRy(now);

    const rx = cfg.radiusXpx * dpr;
    let drewAnything = false;

    for (let c = 0; c < cols; c++) {
      const colCenterX = (c + 0.5) * colW;
      if (!mouseTgt.inside || Math.abs(colCenterX - center.xpx) > rx) continue;

      yHeads[c] += speeds[c];
      let head = Math.floor(yHeads[c]);
      if (head >= rows + 12) {
        yHeads[c] = -((Math.random()*rows)|0);
        head = Math.floor(yHeads[c]);
        speeds[c] = cfg.speedMin + Math.random()*(cfg.speedMax - cfg.speedMin);
        tails[c]  = (cfg.tailMin + Math.random()*(cfg.tailMax - cfg.tailMin))|0;
      }

      const tailLen = tails[c];
      const edgeA = columnEdgeFactor(c);
      const colBaseA = 0.35 + 0.65 * edgeA;
      const ryCol = Math.max(24 * dpr, ry + colJitter[c]);

      const headYpx = head * rowH + rowH * 0.5;
      if (Math.abs(headYpx - center.ypx) <= ryCol) {
        drawGlyph(c, head, rndChar(), cfg.head, colBaseA);
        drewAnything = true;
      }

      for (let i = 1; i <= tailLen; i++) {
        const r = head - i;
        const glyphYpx = r * rowH + rowH * 0.5;
        if (Math.abs(glyphYpx - center.ypx) > ryCol) continue;

        const t = i / (tailLen + 1);
        const hann = Math.sin(Math.PI * t);
        let a = colBaseA * 0.95 * hann;

        const dist = Math.abs(glyphYpx - center.ypx);
        const taper = clamp(1 - dist / (ryCol * 0.9), 0, 1);
        a *= 0.45 + 0.55 * taper;

        drawGlyph(c, r, rndChar(), cfg.color, a);
        drewAnything = true;
      }

      if (Math.random() < 0.25) {
        const skipR = head - ((Math.random() * tailLen) | 0);
        const y = skipR * rowH;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(c * colW, y, colW, rowH);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    if (!drewAnything) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }

    requestAnimationFrame(tick);
  }

  function onMouseMove(e){
    const events = (e.getCoalescedEvents && e.getCoalescedEvents()) || [e];
    const last = events[events.length - 1];
    onPointerMove(last.clientX, last.clientY);
  }
  function onTouchMove(e){
    const t = e.touches && e.touches[0];
    if (t) onPointerMove(t.clientX, t.clientY);
  }
  function onLeave(){ mouseTgt.inside = false; }

  window.addEventListener('resize', sizeToHero, { passive: true });
  hero.addEventListener('mousemove', onMouseMove,  { passive: true });
  hero.addEventListener('mouseleave', onLeave,     { passive: true });
  hero.addEventListener('touchmove',  onTouchMove, { passive: true });
  hero.addEventListener('touchend',   onLeave,     { passive: true });

  sizeToHero();
  tick();
})();
