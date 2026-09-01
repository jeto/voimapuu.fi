// Sphere
const CANVAS_PAD = 240;

const dirFromAngles = (azDeg, elDeg) => {
    const az = (azDeg * Math.PI) / 180;
    const el = (elDeg * Math.PI) / 180;
    const cz = Math.cos(el);
    return [Math.sin(az) * cz, Math.sin(el), -Math.cos(az) * cz];
};

window._p5 = new p5((p) => {
    let rot = 0;
    const stage = document.getElementById('stage');

    p.setup = () => {
        const rect = stage.getBoundingClientRect();
        const c = p.createCanvas(
            rect.width + CANVAS_PAD * 2,
            rect.height + CANVAS_PAD * 2,
            p.WEBGL,
        );
        c.parent(stage);
        p.pixelDensity(window.devicePixelRatio || 1);
        p.noStroke();
    };

    p.windowResized = () => {
        const rect = stage.getBoundingClientRect();
        p.resizeCanvas(rect.width + CANVAS_PAD * 2, rect.height + CANVAS_PAD * 2);
    };

    p.draw = () => {
        p.background(255);

        rot += 0.005 * 3;
        const spinDeg = (rot * 180) / Math.PI;
        const wobbleDeg = (Math.sin(rot * 0.6) * 0.25 * 180) / Math.PI;

        p.ambientLight(158, 46, 154);

        const kDir = dirFromAngles(-33 + spinDeg, -19 + wobbleDeg);
        p.directionalLight(242, 116, 13, kDir[0], kDir[1], kDir[2]);

        const rDir = dirFromAngles(40 + spinDeg, 10 + wobbleDeg);
        p.directionalLight(17, 207, 232, rDir[0], rDir[1], rDir[2]);

        p.ambientMaterial(255);
        p.specularMaterial(169, 111, 96);
        p.shininess(0);

        p.sphere(280, 96, 96);
    };
});

// Grain animation
(function () {
    const grain = document.querySelector('.grain');
    const svgs = [0, 13, 27, 44, 78, 103, 156, 211].map(seed =>
        `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>`
    );
    const uris = svgs.map(s => `url("${s}")`);

    let i = 0, last = 0;
    function tick(t) {
        if (t - last >= 67) {
            grain.style.backgroundImage = uris[i++ % uris.length];
            last = t;
        }
        requestAnimationFrame(tick);
    }

    let loaded = 0;
    svgs.forEach(src => {
        const img = new Image();
        img.onload = img.onerror = () => {
            if (++loaded === svgs.length) requestAnimationFrame(tick);
        };
        img.src = src;
    });
})();

// LED nav marquee
(function () {
    const DP = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dp'));
    const STEP_MS = 50;

    function init() {
        document.querySelectorAll('.led-item').forEach(item => {
            const text = item.querySelector('.led-text');
            const itemW  = item.clientWidth;
            const naturalLeft = text.getBoundingClientRect().left - item.getBoundingClientRect().left;
            const cl = itemW;

            item.style.position = 'relative';
            const ghost = text.cloneNode(true);
            ghost.setAttribute('aria-hidden', 'true');
            ghost.style.cssText = `position:absolute;left:${naturalLeft}px;top:50%;`
                + `transform:translateX(${cl}px) translateY(-50%);pointer-events:none`;
            item.appendChild(ghost);

            let running = false, offset = 0, lastStep = 0, rafId;
            let hovered = false;

            function tick(t) {
                if (!running) return;
                if (t - lastStep >= STEP_MS) {
                    offset -= DP;
                    if (offset < -cl) offset += cl;
                    text.style.transform  = `translateX(${offset}px)`;
                    ghost.style.transform = `translateX(${offset + cl}px) translateY(-50%)`;
                    lastStep = t;
                }
                rafId = requestAnimationFrame(tick);
            }

            function start() {
                if (running) return;
                offset = 0;
                text.style.transform  = '';
                ghost.style.transform = `translateX(${cl}px) translateY(-50%)`;
                running = true;
                rafId = requestAnimationFrame(tick);
            }

            function stop() {
                running = false;
                cancelAnimationFrame(rafId);
                offset = 0;
                text.style.transform  = '';
                ghost.style.transform = `translateX(${cl}px) translateY(-50%)`;
            }

            function syncActive() {
                if (item.classList.contains('active')) start();
                else if (!hovered) stop();
            }

            item.addEventListener('mouseenter', () => { hovered = true; start(); });
            item.addEventListener('mouseleave', () => { hovered = false; syncActive(); });

            new MutationObserver(syncActive)
                .observe(item, { attributes: true, attributeFilter: ['class'] });

            syncActive();
        });
    }

    document.fonts.ready.then(init);
})();

// SPA router and rendering
(function () {
    const BASE = '/2026';
    const NAV_SECTIONS = ['info', 'ohjelma', 'artistit'];
    const stage = document.getElementById('stage');
    const landing = document.querySelector('.content');

    function getRoute(pathname) {
        const path = pathname.slice(BASE.length) || '/';
        const artistMatch = path.match(/^\/artistit\/(.+)$/);
        if (artistMatch) return { section: 'artist', slug: decodeURIComponent(artistMatch[1]) };
        if (path.startsWith('/info')) return { section: 'info' };
        if (path.startsWith('/ohjelma')) return { section: 'ohjelma' };
        if (path.startsWith('/artistit')) return { section: 'artistit' };
        return { section: 'landing' };
    }

    const footer = document.querySelector('.led-footer');
    const backBtn = document.querySelector('.led-back');
    let activeSec = null;
    let zIndexTimer = null;

    function render({ section, slug }) {
        const isLanding = section === 'landing';

        stage.classList.toggle('faded', !isLanding);
        if (window._p5) isLanding ? window._p5.loop() : window._p5.noLoop();

        landing.classList.toggle('hidden', !isLanding);
        if (footer) footer.classList.toggle('hidden', !isLanding);
        if (backBtn) backBtn.classList.toggle('hidden', isLanding);

        const next = isLanding ? null : document.getElementById(`section-${section}`);

        // Sweep every section so no stale `.visible` lingers between rapid clicks
        document.querySelectorAll('.page-section').forEach(el => {
            if (el !== next) {
                el.classList.remove('visible');
                el.style.zIndex = '';
            }
        });

        if (zIndexTimer) clearTimeout(zIndexTimer);
        if (next) {
            next.style.zIndex = '3';
            next.classList.add('visible');
            if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
            }
            zIndexTimer = setTimeout(() => { next.style.zIndex = ''; }, 600);
            activeSec = next;
        } else {
            activeSec = null;
        }

        document.querySelectorAll('.led-item').forEach((item, i) => {
            const match = NAV_SECTIONS[i] === (section === 'artist' ? 'artistit' : section);
            item.classList.toggle('active', match);
        });

        if (section === 'artist' && slug) renderArtist(slug).then(() => {
            if (next) next.scrollTop = 0;
        });
        if (section === 'ohjelma') renderOhjelma();

        const hash = window.location.hash;
        if (hash) requestAnimationFrame(() => {
            document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    function navigate(path) {
        history.pushState(null, '', path);
        render(getRoute(path));
    }

    document.querySelectorAll('.led-item').forEach((item, i) => {
        item.addEventListener('click', () => navigate(`${BASE}/${NAV_SECTIONS[i]}`));
    });

    if (backBtn) backBtn.addEventListener('click', () => navigate(BASE));

    window.addEventListener('popstate', () => render(getRoute(window.location.pathname)));

    const GRADIENTS = [
        'linear-gradient(155deg, rgba(158,46,154,0.35) 0%, rgba(17,207,232,0.25) 100%)',
        'linear-gradient(155deg, rgba(242,116,13,0.35) 0%, rgba(158,46,154,0.28) 100%)',
        'linear-gradient(155deg, rgba(17,207,232,0.3) 0%, rgba(242,116,13,0.25) 100%)',
        'linear-gradient(155deg, rgba(158,46,154,0.28) 0%, rgba(242,116,13,0.32) 100%)',
        'linear-gradient(155deg, rgba(17,207,232,0.25) 0%, rgba(158,46,154,0.35) 100%)',
        'linear-gradient(155deg, rgba(242,116,13,0.28) 0%, rgba(17,207,232,0.3) 100%)',
    ];

    let artistsCache = null;

    async function loadArtists() {
        if (artistsCache) return artistsCache;
        try {
            const res = await fetch(`${BASE}/artists.json`);
            artistsCache = (await res.json()).sort((a, b) => a.name.localeCompare(b.name, 'fi'));
        } catch (e) {
            artistsCache = [];
        }
        return artistsCache;
    }

    const PALETTE_COLORS = ['rgb(158,46,154)', 'rgb(242,116,13)', 'rgb(17,207,232)'];

    async function renderArtistGrid() {
        const artists = await loadArtists();
        const grid = document.getElementById('artist-grid');
        if (!grid) return;
        grid.innerHTML = artists.map((a, i) => {
            const thumbSrc = a.thumbnail || a.image;
            const bgStyle = thumbSrc
                ? `background: url('${BASE}/${thumbSrc}') center/cover no-repeat`
                : `background: ${GRADIENTS[i % GRADIENTS.length]}`;
            const hoverColor = PALETTE_COLORS[i % PALETTE_COLORS.length];
            return `<div class="artist-card" data-slug="${a.slug}" style="--hover-color:${hoverColor}">
                <div class="artist-thumb">
                    <div class="artist-bg" style="${bgStyle}"></div>
                </div>
                <div class="artist-label">
                    <div class="artist-name">${a.name}</div>
                </div>
            </div>`;
        }).join('');
        grid.querySelectorAll('.artist-card').forEach(card => {
            card.addEventListener('click', () => navigate(`${BASE}/artistit/${card.dataset.slug}`));
        });
    }

    async function renderArtist(slug) {
        const artists = await loadArtists();
        const a = artists.find(x => x.slug === slug);
        const detail = document.getElementById('artist-detail');
        if (!a) { detail.innerHTML = '<p>Artistia ei löydy.</p>'; return; }
        const bgStyle = a.image
            ? `background: url('${BASE}/${a.image}') center/cover no-repeat`
            : `background: ${GRADIENTS[artists.indexOf(a) % GRADIENTS.length]}`;
        detail.innerHTML = `<div class="artist-split">
                <div class="artist-photo">
                    <div class="artist-photo-bg" style="${bgStyle}"></div>
                </div>
                <div class="artist-content">
                    <button class="artist-back" onclick="history.back()">« Takaisin</button>
                    <h2 class="artist-content-name">${a.name}</h2>
                    ${a.description ? a.description.split('\n\n').map(p => `<p class="artist-content-bio">${p.replace(/\n/g, '<br>')}</p>`).join('') : ''}
                    ${(Array.isArray(a.media) ? a.media : a.media ? [a.media] : []).map(src => `<iframe class="artist-media" src="${src}" scrolling="no" allow="autoplay"></iframe>`).join('')}
                </div>
            </div>`;
    }

    async function initFooterMarquee() {
        const inner = document.querySelector('.footer-inner');
        if (!inner) return;
        const [artists] = await Promise.all([loadArtists(), document.fonts.ready]);
        const names = artists.filter(a => a.name !== 'TBA').map(a => a.name);
        if (!names.length) return;

        const dp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dp'));
        const STEP = 50;

        // Non-breaking spaces so trailing whitespace isn't stripped from offsetWidth
        const SEP = '  ·  ';
        const label = names.join(SEP) + SEP;

        const probe = document.createElement('span');
        probe.className = 'footer-text';
        probe.textContent = label;
        probe.style.transform = 'translateY(-50%)';
        probe.style.visibility = 'hidden';
        inner.appendChild(probe);
        const stride = probe.offsetWidth;
        inner.removeChild(probe);

        const n = Math.ceil(inner.clientWidth / stride) + 2;
        const copies = Array.from({ length: n }, (_, i) => {
            const s = document.createElement('span');
            s.className = 'footer-text';
            s.textContent = label;
            if (i > 0) s.setAttribute('aria-hidden', 'true');
            s.style.transform = `translateX(${i * stride}px) translateY(-50%)`;
            inner.appendChild(s);
            return s;
        });

        let offset = 0, last = 0;
        function tick(t) {
            if (t - last >= STEP) {
                offset -= dp;
                if (offset < -stride) offset += stride;
                copies.forEach((s, i) => {
                    s.style.transform = `translateX(${offset + i * stride}px) translateY(-50%)`;
                });
                last = t;
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // Festival is over; serving the archived snapshot instead of the live sheet.
    // For next year, point OHJELMA_URL back at the published Google Sheet CSV, e.g.:
    // const OHJELMA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTHhUhQqVy8nSI_6odNTmAmb3LSCKB02pgt5K--N6souyAifLzSHwsHlkY6u66qnJ4IDtzx30MeG2C5/pub?gid=106610374&single=true&output=csv';
    const OHJELMA_URL = `${BASE}/ohjelma.csv`;
    const DAYS = ['Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];

    function parseCsvRow(line) {
        const out = []; let cur = '', q = false;
        for (const c of line) {
            if (c === '"') q = !q;
            else if (c === ',' && !q) { out.push(cur); cur = ''; }
            else cur += c;
        }
        out.push(cur);
        return out;
    }

    function timeToMins(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    async function loadOhjelma() {
        try {
            const res = await fetch(OHJELMA_URL);
            const text = await res.text();
            const rows = text.trim().split('\n').map(parseCsvRow);
            // Columns: Stage, Päivä, Aloitus, Lopetus, Mitä
            const slotsByDay = {};
            for (let i = 1; i < rows.length; i++) {
                const [venue, day, start, end, name] = rows[i].map(c => c.trim());
                if (!venue || !day || !start || !name) continue;
                if (!slotsByDay[day]) slotsByDay[day] = {};
                if (!slotsByDay[day][start]) slotsByDay[day][start] = { time: start, end, events: [] };
                slotsByDay[day][start].events.push({ name, venue });
            }
            const byDay = {};
            for (const day of Object.keys(slotsByDay)) {
                byDay[day] = Object.values(slotsByDay[day])
                    .sort((a, b) => timeToMins(a.time) - timeToMins(b.time));
            }
            return byDay;
        } catch (e) { return {}; }
    }

    async function renderOhjelma() {
        const container = document.getElementById('ohjelma-content');
        const filtersEl = document.getElementById('ohjelma-filters');
        if (!container) return;
        const [byDay, artists] = await Promise.all([loadOhjelma(), loadArtists()]);
        const artistMap = new Map(artists.map(a => [a.name.toLowerCase(), a.slug]));

        const VENUE_COLORS = {
            'Päälava':   'rgb(242,116,13)',
            'Laavulava': 'rgb(158,46,154)',
            'Työpaja':   'rgb(17,207,232)',
            'Cafe Disco':'rgb(220,80,180)',
            'Ruoka':     'rgb(120,200,100)',
        };

        const allVenues = new Set();

        container.innerHTML = DAYS.map(day => {
            const slots = byDay[day] || [];
            slots.forEach(({ events }) => events.forEach(({ venue }) => allVenues.add(venue)));
            const venueStarts = {};
            slots.forEach(({ time, events }) =>
                events.forEach(({ venue }) => {
                    (venueStarts[venue] = venueStarts[venue] || new Set()).add(time);
                })
            );
            const rowsHtml = slots.flatMap(({ time, end, events }) =>
                events.map(({ name, venue }) => {
                    const showEnd = end && !venueStarts[venue]?.has(end);
                    const overnight = showEnd && timeToMins(end) < timeToMins(time);
                    const timeLabel = showEnd
                        ? `${time}–${end}${overnight ? '<sup>+1</sup>' : ''}`
                        : time;
                    const c = VENUE_COLORS[venue] || 'rgba(255,255,255,0.28)';
                    const slug = artistMap.get(name.toLowerCase());
                    const nameHtml = slug
                        ? `<span class="act act-link" data-slug="${slug}">${name}</span>`
                        : `<span class="act">${name}</span>`;
                    return `<tr data-venue="${venue}"><td>${timeLabel}</td><td>${nameHtml}</td><td style="color:${c}">${venue}</td></tr>`;
                })
            ).join('');
            return `<div id="${day.toLowerCase()}" class="ohjelma-anchor">
                <div class="day-label">${day}</div>
                ${rowsHtml
                    ? `<table class="schedule-table"><thead><tr><th>Aika</th><th>Ohjelma</th><th>Paikka</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
                    : `<p style="font-family:'Doto',sans-serif;font-variation-settings:'ROND' 100;font-weight:900;font-size:13px;letter-spacing:0.06em;color:rgba(255,255,255,0.28);margin:0">Ohjelma tulossa</p>`}
            </div>`;
        }).join('');

        container.querySelectorAll('.act-link').forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => navigate(`${BASE}/artistit/${el.dataset.slug}`));
        });

        if (filtersEl && allVenues.size > 0) {
            filtersEl.innerHTML = [
                `<button class="filter-pill active" data-venue="" style="--pill-color:#fff">Kaikki</button>`,
                ...[...allVenues].map(v => {
                    const c = VENUE_COLORS[v] || 'rgba(255,255,255,0.5)';
                    return `<button class="filter-pill" data-venue="${v}" style="--pill-color:${c}">${v}</button>`;
                })
            ].join('');

            function applyVenueFilter(venue) {
                filtersEl.querySelectorAll('.filter-pill').forEach(p =>
                    p.classList.toggle('active', p.dataset.venue === venue));
                container.querySelectorAll('tr[data-venue]').forEach(row => {
                    row.style.display = (!venue || row.dataset.venue === venue) ? '' : 'none';
                });
                const url = new URL(window.location);
                if (venue) url.searchParams.set('venue', venue);
                else url.searchParams.delete('venue');
                history.replaceState(null, '', url);
            }

            filtersEl.addEventListener('click', e => {
                const pill = e.target.closest('.filter-pill');
                if (!pill) return;
                applyVenueFilter(pill.dataset.venue);
            });

            const savedVenue = new URLSearchParams(window.location.search).get('venue');
            if (savedVenue) applyVenueFilter(savedVenue);
        }
    }

    render(getRoute(window.location.pathname));
    renderArtistGrid();
    renderOhjelma();
    initFooterMarquee();
    window.vpNavigate = navigate;
})();

// Ohjelma sub-nav scroll tracking
(function () {
    const section = document.getElementById('section-ohjelma');
    const scroller = section.querySelector('.ohjelma-schedule') || section;
    const subnav = document.getElementById('ohjelma-subnav');
    if (!section || !subnav) return;

    const links = Array.from(subnav.querySelectorAll('a'));
    const anchors = () => Array.from(section.querySelectorAll('.ohjelma-anchor'));
    let suppressUpdate = false;
    let suppressTimer;

    function setActive(id) {
        links.forEach(l => l.classList.remove('active'));
        const active = subnav.querySelector(`a[href="#${id}"]`);
        if (active) {
            active.classList.add('active');
            active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    links.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const id = link.getAttribute('href').slice(1);
            const target = section.querySelector('#' + id);
            if (target) {
                const targetScrollTop = target.getBoundingClientRect().top
                    - scroller.getBoundingClientRect().top
                    + scroller.scrollTop
                    - subnav.offsetHeight;
                suppressUpdate = true;
                clearTimeout(suppressTimer);
                scroller.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
                suppressTimer = setTimeout(() => {
                    suppressUpdate = false;
                    updateActive();
                }, 600);
            }
            setActive(id);
            const _u = new URL(window.location); _u.hash = id; history.replaceState(null, '', _u);
        });
    });

    function updateActive() {
        if (suppressUpdate) return;
        const els = anchors();
        if (!els.length) return;
        const containerRect = scroller.getBoundingClientRect();
        const visibleTop = containerRect.top + subnav.offsetHeight + 4;
        for (const el of els) {
            if (el.getBoundingClientRect().bottom > visibleTop) {
                setActive(el.id);
                return;
            }
        }
        setActive(els[els.length - 1].id);
    }

    scroller.addEventListener('scroll', updateActive, { passive: true });
    setActive('torstai');
})();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/2026/sw.js');
}

