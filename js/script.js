/* ============================================================
   EcoBhoomi Enterprise — Site Scripts
   ============================================================ */

console.log('%cEcoBhoomi Enterprise', 'color:#FF6B1A;font-weight:bold;font-size:14px;');

/* ---------- Navbar scroll effect ---------- */
const navbar = document.getElementById('navbar');
const setNavbarState = () => {
    if (window.scrollY > 30) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
};
window.addEventListener('scroll', setNavbarState, { passive: true });
setNavbarState();

/* ---------- Mobile menu toggle ---------- */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
    });
});

/* ---------- Smooth scroll (fallback for older browsers) ---------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

/* ---------- Reveal-on-scroll ---------- */
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

/* ---------- Animated stats counter ---------- */
const animateCount = (el) => {
    const target = parseInt(el.dataset.target, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const value = Math.round(target * ease(p));
        el.textContent = value + suffix;
        if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
};
const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCount(entry.target);
            statObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.4 });
document.querySelectorAll('.stat-num').forEach(el => statObserver.observe(el));

/* ---------- Back to top ---------- */
const backToTop = document.getElementById('backToTop');
const toggleBackToTop = () => {
    if (window.scrollY > 600) backToTop.classList.add('show');
    else backToTop.classList.remove('show');
};
window.addEventListener('scroll', toggleBackToTop, { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ============================================================
   PRODUCTS
   ============================================================ */
const products = [
    'Bohagi Black Jeera Masala 160ML-250ML Rs.10-Rs.20.jpg',
    'Bohagi Jeera Masala 160ML-250ML Rs.10-Rs.20.jpg',
    'Bohagi Cola Jeera 160ML-250ML Rs.10-Rs.20.jpg',
    'Bohagi Nimbu Pani 160ML-250ML Rs.10-Rs.20.jpg',
    'Bohagi Nimbu Shikanji 160ML-250ML Rs.10-Rs.20.jpg',
    'Bohagi Shikanji 160ML-250ML Rs.10-Rs.20.jpg',
    'Bohagi Mango Kesar 160ML-250ML Rs.10-Rs.20.jpg',
    'Frego Energy Drink 160ML-250ML Rs.10-Rs.20.jpg',
    'Frego Yak Bull 250ML Rs.30.jpg',
    'Fregor Fruit Beer 250ML Rs.30.jpg',
    'Fregor Mojito 250ML Rs.30.jpg',
    'Frizee Apple 160ML-250ML Rs.10-Rs.20.jpg',
    'Kenpo Cola 160ML-250ML Rs.10-Rs.20.jpg',
    'Kenpo Orange 160ML-250ML Rs.10-Rs.20.jpg',
    'Kenpo Clear Lemon 160ML-250ML Rs.10-Rs.20.jpg'
];

const removeExtension = (filename) => filename.replace(/\.(jpg|jpeg|png)$/i, '');

const loadProducts = () => {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    products.forEach((product, idx) => {
        const clean = removeExtension(product);
        const priceMatch = clean.match(/Rs\..+/);
        const price = priceMatch ? priceMatch[0] : '';
        const name = clean.split('Rs.')[0].replace(/[-_]/g, ' ').trim();

        const card = document.createElement('div');
        card.classList.add('product-card', 'reveal');
        card.style.transitionDelay = `${(idx % 8) * 60}ms`;

        const img = document.createElement('img');
        img.src = `./images/products/${product}`;
        img.alt = name;
        img.loading = 'lazy';
        img.addEventListener('click', () => showModal(img.src, name));
        card.appendChild(img);

        const h3 = document.createElement('h3');
        h3.textContent = name;
        card.appendChild(h3);

        if (price) {
            const p = document.createElement('p');
            p.textContent = `MRP: ${price}`;
            card.appendChild(p);
        }

        grid.appendChild(card);
        revealObserver.observe(card);
    });
};

/* ---------- Image modal ---------- */
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-image');
const modalClose = document.getElementById('modalClose');

const showModal = (src, alt = '') => {
    modalImg.src = src;
    modalImg.alt = alt;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
};
const hideModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
};
modalClose.addEventListener('click', hideModal);
modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) hideModal(); });

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', loadProducts);
