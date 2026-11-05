/* ============================================================
   Portofolio: script.js
   Isi: tema warna, navigasi, filter proyek, efek tilt, form
   kontak, dan scene 3D (bola cair) di latar halaman.
   Ubah data dasar di bagian CONFIG.
   ============================================================ */
(() => {
  'use strict';

  /* ---------- CONFIG ---------- */
  const CONFIG = {
    email: 'email@contoh.com',
    themeKey: 'portfolio-theme',
    threeSrc: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    // Layar sempit atau tinggi = bola 3D di atas teks. Harus sama dengan media query di style.css.
    stackQuery: '(max-aspect-ratio: 9/10), (max-width: 825.98px)',
  };
  const THEMES = ['pine', 'ember', 'orchid'];

  /* ---------- Helper ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (_) { /* diabaikan */ } },
  };

  /* ---------- Tema warna ---------- */
  function applyTheme(name, persist) {
    const theme = THEMES.includes(name) ? name : THEMES[0];
    root.setAttribute('data-theme', theme);
    $$('.swatches button').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.theme === theme));
    });
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    if (persist) storage.set(CONFIG.themeKey, theme);
    window.dispatchEvent(new CustomEvent('themechange'));
  }

  function initTheme() {
    applyTheme(storage.get(CONFIG.themeKey) || root.getAttribute('data-theme'), false);
    $$('.swatches button').forEach((btn) => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.theme, true));
    });
  }

  /* ---------- Navigasi ---------- */
  function initNav() {
    const nav = $('.site-nav');
    const toggle = $('.menu-toggle');
    const menu = $('#menu');
    if (!nav) return;

    // Latar navigasi muncul setelah halaman digulir
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Menu layar penuh di ponsel
    if (toggle && menu) {
      const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
        menu.classList.toggle('is-open', open);
        document.body.classList.toggle('is-locked', open);
      };
      toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
      $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
      window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
      window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
        if (e.matches) setOpen(false);
      });
    }

    // Tandai menu sesuai bagian yang sedang dibaca
    if (menu && 'IntersectionObserver' in window) {
      const links = new Map($$('a[href^="#"]', menu).map((a) => [a.getAttribute('href').slice(1), a]));
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.remove('is-active'));
          const current = links.get(entry.target.id);
          if (current) current.classList.add('is-active');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach((section) => spy.observe(section));
    }
  }

  /* ---------- Filter proyek ---------- */
  function initFilters() {
    const buttons = $$('.filters button');
    const projects = $$('.project');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        buttons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        projects.forEach((project) => {
          const categories = (project.dataset.category || '').split(/\s+/);
          project.hidden = !(filter === 'all' || categories.includes(filter));
        });
      });
    });
  }

  /* ---------- Efek miring pada kartu proyek (khusus mouse) ---------- */
  function initTilt() {
    if (!finePointer || reduceMotion) return;
    $$('[data-tilt]').forEach((el) => {
      let frame = 0;
      el.addEventListener('pointermove', (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          el.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
          el.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(frame);
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Kontak dan footer ---------- */
  function initContact() {
    $$('[data-email]').forEach((a) => {
      a.setAttribute('href', 'mailto:' + CONFIG.email);
      a.textContent = CONFIG.email;
    });

    const form = $('#contact-form');
    const note = $('#form-note');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const email = String(data.get('email') || '').trim();
        const message = String(data.get('message') || '').trim();
        const subject = encodeURIComponent('Pesan dari ' + name + ' lewat portofolio');
        const body = encodeURIComponent(message + '\n\n' + name + '\n' + email);
        window.location.href = 'mailto:' + CONFIG.email + '?subject=' + subject + '&body=' + body;
        if (note) note.textContent = 'Membuka aplikasi email kamu.';
      });
    }

    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- Scene 3D: bola cair ---------- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Gagal memuat ' + src));
      document.head.appendChild(s);
    });
  }

  function initStage() {
    const THREE = window.THREE;
    const canvas = $('#stage');
    if (!THREE || !canvas) { root.classList.add('no-webgl'); return; }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      root.classList.add('no-webgl');
      return;
    }
    renderer.setClearColor(0x000000, 0);
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

    const FOV = 45;
    const CAM_Z = 7;
    const HALF_H = Math.tan((FOV * Math.PI) / 360) * CAM_Z; // setengah tinggi area terlihat di z = 0

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    camera.position.set(0, 0, CAM_Z);

    const small = window.innerWidth < 760;
    const SEG_W = small ? 56 : 96;
    const SEG_H = small ? 40 : 64;
    const RADIUS = 1.55;
    const OUTER = RADIUS * 1.1; // jari-jari terluar bola pada skala 1 (termasuk tonjolan), dipakai untuk tata letak
    const TINT = 0.85;

    /* Bola: geometri bola yang titiknya digeser tiap frame */
    const geometry = new THREE.SphereGeometry(RADIUS, SEG_W, SEG_H);
    const position = geometry.attributes.position;
    const count = position.count;
    const dirs = new Float32Array(count * 3); // arah satuan tiap titik
    for (let i = 0; i < count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      const len = Math.hypot(x, y, z) || 1;
      dirs[i * 3] = x / len;
      dirs[i * 3 + 1] = y / len;
      dirs[i * 3 + 2] = z / len;
    }
    const colors = new Float32Array(count * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.25 });
    const orb = new THREE.Mesh(geometry, material);
    orb.frustumCulled = false;
    scene.add(orb);

    /* Debu cahaya di belakang bola */
    const sprite = (() => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const DUST = small ? 380 : 820;
    const dustPositions = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const r = 3 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dustPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      dustPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.75;
      dustPositions[i * 3 + 2] = r * Math.cos(phi) * 0.6 - 4;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      size: 0.07,
      map: sprite,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.frustumCulled = false;
    scene.add(dust);

    /* Cahaya */
    const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.45);
    const key = new THREE.PointLight(0xffffff, 1.2, 40);
    key.position.set(4, 3, 6);
    const fill = new THREE.PointLight(0xffffff, 0.9, 40);
    fill.position.set(-5, -2, 4);
    const rim = new THREE.PointLight(0xffffff, 1.1, 40);
    rim.position.set(0, 3, -4);
    scene.add(hemi, key, fill, rim);

    /* Warna mengikuti tema (variabel CSS) */
    const colA = new THREE.Color();
    const colB = new THREE.Color();
    const colC = new THREE.Color();
    const white = new THREE.Color(0xffffff);
    const readColor = (name, fallback) => {
      const value = getComputedStyle(root).getPropertyValue(name).trim();
      return new THREE.Color(value || fallback);
    };
    function applyPalette() {
      colA.copy(readColor('--accent', '#ffb48a'));
      colB.copy(readColor('--accent-2', '#8fe3bf'));
      colC.copy(readColor('--accent-3', '#f4e3a0'));
      key.color.copy(colA).lerp(white, 0.55);
      fill.color.copy(colB).lerp(white, 0.35);
      rim.color.copy(colC);
      hemi.color.copy(colB).lerp(white, 0.5);
      hemi.groundColor.copy(readColor('--bg', '#0a1512'));
      dustMaterial.color.copy(colB);
    }

    /* Merapikan normal di jahitan bola dan kutubnya */
    const cols = SEG_W + 1;
    function smoothSeams() {
      const nrm = geometry.attributes.normal.array;
      for (let y = 0; y <= SEG_H; y++) {
        const a = y * cols * 3;
        const b = (y * cols + SEG_W) * 3;
        let nx = nrm[a] + nrm[b];
        let ny = nrm[a + 1] + nrm[b + 1];
        let nz = nrm[a + 2] + nrm[b + 2];
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
        nrm[a] = nx; nrm[b] = nx;
        nrm[a + 1] = ny; nrm[b + 1] = ny;
        nrm[a + 2] = nz; nrm[b + 2] = nz;
      }
      [0, SEG_H].forEach((row) => {
        let nx = 0, ny = 0, nz = 0;
        for (let x = 0; x < cols; x++) {
          const k = (row * cols + x) * 3;
          nx += nrm[k]; ny += nrm[k + 1]; nz += nrm[k + 2];
        }
        const l = Math.hypot(nx, ny, nz) || 1;
        for (let x = 0; x < cols; x++) {
          const k = (row * cols + x) * 3;
          nrm[k] = nx / l; nrm[k + 1] = ny / l; nrm[k + 2] = nz / l;
        }
      });
    }

    /* Satu frame bentuk dan warna bola. (dx, dy) = arah kursor dari pusat bola. */
    function updateOrb(t, dx, dy) {
      const dz = 1.8;
      const dl = Math.hypot(dx, dy, dz);
      const px = dx / dl;
      const py = dy / dl;
      const pz = dz / dl;
      const amp = 0.085;

      for (let i = 0; i < count; i++) {
        const x = dirs[i * 3];
        const y = dirs[i * 3 + 1];
        const z = dirs[i * 3 + 2];

        const n = Math.sin(x * 2.2 + t * 0.8) * Math.cos(y * 1.9 - t * 0.6)
          + Math.sin(y * 3.1 + z * 2.3 + t * 1.1) * 0.5
          + Math.cos(z * 2.7 - x * 1.4 + t * 0.5) * 0.35;

        const d = x * px + y * py + z * pz;
        const bulge = d > 0 ? d * d * d * pointer.strength : 0;
        const r = RADIUS * (1 + n * amp + bulge * 0.2);
        position.setXYZ(i, x * r, y * r, z * r);

        const s = clamp(0.5 + n * 0.32, 0, 1);
        const w = Math.min(1, bulge * 1.4);
        let cr = colA.r + (colB.r - colA.r) * s;
        let cg = colA.g + (colB.g - colA.g) * s;
        let cb = colA.b + (colB.b - colA.b) * s;
        cr += (colC.r - cr) * w;
        cg += (colC.g - cg) * w;
        cb += (colC.b - cb) * w;
        colors[i * 3] = cr * TINT;
        colors[i * 3 + 1] = cg * TINT;
        colors[i * 3 + 2] = cb * TINT;
      }

      position.needsUpdate = true;
      geometry.computeVertexNormals();
      smoothSeams();
      geometry.attributes.normal.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }

    /* Tata letak. Teks hero diukur, lalu bola ditaruh di ruang kosong yang tersisa:
       layar lebar = di kanan teks, layar sempit atau tinggi = di atas teks.
       Aturan "sempit atau tinggi" sama dengan media query di style.css (CONFIG.stackQuery). */
    const stackQuery = window.matchMedia(CONFIG.stackQuery);

    function computeTarget() {
      const scrollY = window.scrollY;
      const nav = $('.site-nav');
      const hero = $('.hero');
      const navBottom = nav ? nav.getBoundingClientRect().bottom : 68;
      let textRight = 0;
      let textTop = Infinity;
      $$('.hero__title, .hero__role, .hero__lead, .hero__actions, .hero__status').forEach((el) => {
        const b = el.getBoundingClientRect();
        textRight = Math.max(textRight, b.right);
        textTop = Math.min(textTop, b.top + scrollY);
      });
      if (!isFinite(textTop)) { textRight = w * 0.5; textTop = h * 0.6; }

      // cx, cy, r dalam piksel kanvas, diukur dari pojok kiri atas halaman
      let cx;
      let cy;
      let r;
      if (stackQuery.matches) {
        const top = navBottom + 12;
        const bottom = Math.max(top + 100, textTop - 16);
        r = Math.min((bottom - top) / 2, w * 0.34);
        cx = w / 2;
        cy = (top + bottom) / 2;
      } else {
        const left = textRight + 24;
        const right = w - 16;
        r = Math.min((right - left) / 2, h * 0.3);
        cx = (left + right) / 2;
        // Sejajar dengan tengah hero, tapi tidak lebih rendah dari tengah area yang terlihat
        const mid = hero ? hero.getBoundingClientRect().top + scrollY + hero.offsetHeight / 2 : h / 2;
        cy = clamp(Math.min(mid, (navBottom + h) / 2), navBottom + r, Math.max(navBottom + r, h - r));
      }
      r = Math.max(r, 40);

      const px = (h / 2) / HALF_H; // piksel per satuan dunia pada z = 0
      return { x: (cx - w / 2) / px, y: -(cy - h / 2) / px, s: r / (OUTER * px) };
    }

    /* Status */
    let w = 0;
    let h = 0;
    let time = 0;
    let intro = reduceMotion ? 1 : 0;
    let lastOpacity = -1;
    const view = { x: 0, y: 0, s: 1 };
    let target = { x: 0, y: 0, s: 1 }; // posisi dan ukuran tujuan bola, dihitung dari teks hero
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, active: false };

    function resize(force) {
      const nw = document.documentElement.clientWidth || window.innerWidth;
      const nh = window.innerHeight;
      // Abaikan perubahan tinggi kecil (bilah alamat di ponsel) agar tidak patah-patah
      if (!force && nw === w && Math.abs(nh - h) < 140) return;
      w = nw;
      h = nh;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nw < 760 ? 1.5 : 2));
      renderer.setSize(w, h); // ukuran CSS kanvas ikut diatur, jadi tidak melar saat bilah alamat berubah
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      target = computeTarget();
    }

    function frame(dt) {
      time += dt;
      if (intro < 1) intro = Math.min(1, intro + dt / 1.8);
      const eased = 1 - Math.pow(1 - intro, 3);

      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;

      const aspect = w / h;
      const ease = reduceMotion ? 1 : 0.08;
      view.x += (target.x - view.x) * ease;
      view.y += (target.y - view.y) * ease;
      view.s += (target.s - view.s) * ease;

      // Bola naik dan mengecil saat halaman digulir, lalu keluar dari layar
      const k = clamp(window.scrollY / window.innerHeight, 0, 3);
      orb.position.set(view.x + pointer.x * 0.15, view.y + pointer.y * 0.1 + k * 2.2, 0);
      orb.scale.setScalar(Math.max(0.001, view.s * (0.55 + 0.45 * eased) * (1 - Math.min(k, 1.5) * 0.15)));

      // Bola condong ke arah kursor kalau kursor dekat. Setelah keluar dari
      // layar, bentuknya tidak perlu dihitung lagi (hemat baterai).
      orb.visible = k < 2.4;
      if (orb.visible) {
        const rx = pointer.x * HALF_H * aspect - orb.position.x;
        const ry = pointer.y * HALF_H - orb.position.y;
        const near = pointer.active ? Math.max(0, 1 - Math.hypot(rx, ry) / 4.5) : 0;
        pointer.strength += (near - pointer.strength) * 0.08;
        updateOrb(time, rx, ry);
      }

      dust.rotation.y = time * 0.02;
      dust.rotation.x = Math.sin(time * 0.1) * 0.05;
      dust.position.x = -pointer.x * 0.3;

      const opacity = clamp(intro * 1.5, 0, 1) * (1 - Math.min(k, 1) * 0.55);
      if (Math.abs(opacity - lastOpacity) > 0.005) {
        canvas.style.opacity = opacity.toFixed(3);
        lastOpacity = opacity;
      }

      renderer.render(scene, camera);
    }

    /* Mulai */
    resize(true);
    Object.assign(view, target);
    applyPalette();
    window.addEventListener('themechange', applyPalette);
    window.addEventListener('resize', () => resize(false));

    // Ukur ulang tata letak kalau teks hero berubah ukuran (font selesai dimuat, teks turun baris)
    let redraw = () => {};
    const relayout = () => { target = computeTarget(); redraw(); };
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(relayout);
      ['.hero', '.hero__inner'].forEach((sel) => { const el = $(sel); if (el) observer.observe(el); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

    if (reduceMotion) {
      // Tanpa animasi: gambar ulang hanya saat perlu
      let queued = false;
      redraw = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; frame(0); });
      };
      window.addEventListener('scroll', redraw, { passive: true });
      window.addEventListener('themechange', redraw);
      window.addEventListener('resize', redraw);
      frame(0);
      return;
    }

    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.active = true;
    }, { passive: true });
    window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer.active = false; });
    root.addEventListener('pointerleave', () => { pointer.active = false; });

    let last = 0;
    function tick(now) {
      requestAnimationFrame(tick);
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      frame(dt);
    }
    requestAnimationFrame((now) => { last = now; tick(now); });
  }

  /* ---------- Mulai ---------- */
  function boot() {
    initTheme();
    initNav();
    initFilters();
    initTilt();
    initContact();
    loadScript(CONFIG.threeSrc)
      .then(initStage)
      .catch(() => root.classList.add('no-webgl'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
