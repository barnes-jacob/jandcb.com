(function () {
    const navbar = document.querySelector('.navbar');
    const navBtn = document.querySelector('.nav-toggle');
    const navMenu = document.getElementById('primary-nav');
    const submenuBtns = Array.from(document.querySelectorAll('[data-submenu-toggle]'));

    const isMobileOrMin = () => window.innerWidth <= 768;

    const openMenu = () => { 
                            if (!navBtn || !navMenu) return; 
                            navMenu.classList.add('open');  
                            navBtn.setAttribute('aria-expanded','true');  
                        };
    const closeMenu = () => { 
                                if (!navBtn || !navMenu) return; 
                                navMenu.classList.remove('open'); 
                                navBtn.setAttribute('aria-expanded','false'); 
                            };

    function parts(btn) {
        const li = btn.closest('.has-submenu');
        const id = btn.getAttribute('aria-controls');
        const submenu = id ? document.getElementById(id) : li?.querySelector('.submenu');
        return { li, submenu };
    }
    function openSub(btn) { 
                            const { li } = parts(btn); 
                            if (!li) return; li.classList.add('open');  
                            btn.setAttribute('aria-expanded','true'); 
                        }
    function closeSub(btn) { 
                                const { li } = parts(btn); 
                                if (!li) return; li.classList.remove('open'); 
                                btn.setAttribute('aria-expanded','false'); 
                            }
    function closeAllSubs() { submenuBtns.forEach(closeSub); }

    if (navBtn && navMenu) {
        navBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const opening = !navMenu.classList.contains('open');
            if (opening) openMenu(); else closeMenu();
            if (!opening) closeAllSubs(); 
        });

        navMenu.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (a) {
                closeMenu();
                closeAllSubs();
            }
        });
    }

    submenuBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const { li } = parts(btn);
            if (!li) return;
            const willOpen = !li.classList.contains('open');
            closeAllSubs();
            if (willOpen) openSub(btn);
        });
    });

    document.addEventListener('click', (e) => {
        if (navbar && navbar.contains(e.target)) return; 
        closeAllSubs();
        if (isMobileOrMin()) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
        closeAllSubs();
        if (isMobileOrMin()) closeMenu();
            submenuBtns[0]?.focus();
        }
    });

    window.addEventListener('resize', () => {
        closeAllSubs();
        closeMenu();
    });

    if (navBtn) navBtn.setAttribute('aria-expanded','false');
    submenuBtns.forEach((b) => b.setAttribute('aria-expanded','false'));
})();