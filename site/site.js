/*
  mashenstein.com — three small jobs, no dependencies.

    0. Hold the page until the game's three faces have loaded.
    1. Wire every PLAY button to body[data-play-url], or mark them COMING SOON.
    2. Load the trailer only when somebody asks for it.
    3. Send Gary in from a different corner every so often.
    4. Rotate Eggshell's grievances on the wall.
*/
(() => {
  'use strict';

  // ── 0. the faces ───────────────────────────────────────────────────────
  //
  // index.html marks the document pending before anything paints; this takes it
  // off. The wordmark is set glyph by glyph at spacing measured for Lilita One,
  // so showing it in a fallback face is worse than showing nothing for a moment
  // — but only for a moment: whatever happens, the page is up within a second
  // and a half, because a font CDN having a bad day must cost a swap and not
  // the site.
  const show = () => document.documentElement.classList.remove('fonts-pending');
  const FACES = ["400 1rem 'Lilita One'", "600 1rem 'Fredoka'", "400 1rem 'Permanent Marker'"];
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => document.fonts.ready),
      new Promise((done) => setTimeout(done, 1500)),
    ]).then(show, show);
  } else {
    show();
  }

  // ── 1. the play link ───────────────────────────────────────────────────
  //
  // One attribute on <body> drives every PLAY control on the page. Empty means
  // there is no build to point at yet, and the buttons say so rather than
  // pretending to be links — a gold button that goes nowhere reads as broken,
  // and "COMING SOON" is at least true.
  const url = (document.body.dataset.playUrl || '').trim();
  for (const btn of document.querySelectorAll('[data-play]')) {
    if (url) {
      btn.href = url;
      btn.removeAttribute('data-soon');
      btn.removeAttribute('aria-disabled');
    } else {
      btn.removeAttribute('href');
      btn.dataset.soon = '';
      btn.setAttribute('aria-disabled', 'true');
    }
  }

  // ── 2. the trailer ─────────────────────────────────────────────────────
  //
  // A YouTube embed is roughly a megabyte and several trackers before anyone
  // has pressed anything, so the page ships a still and swaps the iframe in on
  // the click. nocookie, autoplay, because the click WAS the play button.
  const facade = document.querySelector('.tube-play');
  if (facade) {
    facade.addEventListener('click', () => {
      const id = facade.dataset.video;
      // A page opened straight off the disk has no origin for YouTube to check,
      // and it answers that with "Error 153: video player configuration error"
      // rather than a player. Nothing is wrong with the page — it plays the
      // moment the same file is served over http — but a preview that shows an
      // error card is a preview that lies, so on file:// send the viewer to
      // YouTube instead of embedding a complaint.
      if (location.protocol !== 'http:' && location.protocol !== 'https:') {
        window.open(`https://youtu.be/${id}`, '_blank', 'noopener');
        return;
      }
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.title = 'MASHENSTEIN trailer';
      frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      facade.replaceWith(frame);
      frame.focus();
      // Gary stops peeking once the trailer is running — a character leaning
      // into the corner of a page is a joke, and the same character leaning
      // over a video somebody is watching is an obstruction. He stays away for
      // the rest of the visit: knowing when the video stopped would mean
      // loading YouTube's iframe API, which is a script and a tracker to buy
      // back a gag nobody is waiting for.
      document.body.classList.add('trailer-live');
    });
  }

  // ── 3. gary ────────────────────────────────────────────────────────────
  //
  // Three entrances, one picked at random each time and never the same one
  // twice running, with an irregular gap between visits. A character who
  // appears in the same corner on the same schedule stops being someone
  // looking in and becomes part of the furniture.
  const gary = document.querySelector('.gary');
  if (gary && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ENTRANCES = ['from-bl', 'from-br', 'from-right'];
    let last = -1;
    const visit = () => {
      // Once the trailer is running he is finished for the visit.
      if (document.body.classList.contains('trailer-live')) return;
      let i = Math.floor(Math.random() * ENTRANCES.length);
      if (i === last) i = (i + 1) % ENTRANCES.length;
      last = i;
      // classList, not className: on an SVG element className is an
      // SVGAnimatedString and assigning a string to it silently does nothing.
      gary.classList.add(ENTRANCES[i]);
      // NOT { once: true }. Three animations end during a visit — the peek and
      // both halves of the blink — and the blinks bubble their animationend up
      // from the eye groups. `once` would spend the listener on whichever fired
      // first, which is a blink, and Gary would never be rescheduled.
      const done = (e) => {
        if (e.target !== gary) return;
        gary.removeEventListener('animationend', done);
        gary.classList.remove(ENTRANCES[i]);
        setTimeout(visit, 12000 + Math.random() * 18000);
      };
      gary.addEventListener('animationend', done);
    };
    setTimeout(visit, 5000);
  }

  // ── 4. the grievances ──────────────────────────────────────────────────
  //
  // Copied from EGGSHELL_TAUNTS in src/data/jokes.js. In game they rotate every
  // 55–75 seconds during a run; on a page nobody stays on that long, so they
  // come round faster. Typed rather than swapped, because everything else he
  // says arrives on a typewriter too.
  const TAUNTS = [
    'YOU ARE DOING VERY ADEQUATELY. I HAVE MADE A NOTE.',
    'MY IQ IS 300 AND YOURS IS A HIGH SCORE.',
    'I HAVE FILED A FORM DISPUTING THAT LAST JUMP.',
    'THIS COPTER IS FINE. THE BEEPING IS DECORATIVE.',
    'A CHILD COULD DO THIS. A CHILD DID. I FIRED HIM.',
    'THE FOURTH HEALTH BAR IS REAL. PROBABLY.',
    'I HAVE BEEN LOSING TO PLUMBERS SINCE 1986.',
    'MY DOCTORATE IS IN STATISTICS. IT HAS NEVER ONCE HELPED.',
    'FOUR DECADES IN THIS SEAT. THE ERGONOMICS ARE ATROCIOUS.',
  ];

  const wall = document.querySelector('[data-taunt]');
  if (!wall) return;

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let order = shuffle(TAUNTS.slice());
  let next = 0;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function take() {
    if (next >= order.length) { order = shuffle(order); next = 0; }
    return order[next++];
  }

  // Only types while the section is actually on screen — a timer running
  // against an element nobody is looking at is just heat.
  let live = false;
  new IntersectionObserver((entries) => {
    for (const e of entries) live = e.isIntersecting;
  }, { threshold: 0.2 }).observe(wall);

  function cycle() {
    const line = take();
    if (still || !live) {
      wall.textContent = line;
      setTimeout(cycle, live ? 7000 : 2000);
      return;
    }
    wall.textContent = '';
    let i = 0;
    const type = setInterval(() => {
      wall.textContent = line.slice(0, ++i);
      if (i >= line.length) { clearInterval(type); setTimeout(cycle, 5200); }
    }, 1000 / 40);   // 40 chars/sec, the cold open's own typing speed
  }

  cycle();
})();
