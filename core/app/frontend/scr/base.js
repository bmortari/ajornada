document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SELETORES GERAIS ---
    const body = document.body;
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const menuItemsWithSubmenu = document.querySelectorAll('.has-submenu > a');
    const themeToggle = document.getElementById('theme-toggle');

    // --- 2. LÓGICA DA SIDEBAR (COLAPSAR/EXPANDIR) ---
    
    // Verifica se existe uma preferência salva para o estado da sidebar
    const sidebarState = localStorage.getItem('sidebar-state');
    if (sidebarState === 'collapsed') {
        body.classList.add('sidebar-collapsed');
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            // Em mobile, toggle da classe sidebar-open
            if (window.innerWidth <= 768) {
                body.classList.toggle('sidebar-open');
            } else {
                // Em desktop, comportamento normal de colapsar
                body.classList.toggle('sidebar-collapsed');

                // Salva a preferência do usuário
                if (body.classList.contains('sidebar-collapsed')) {
                    localStorage.setItem('sidebar-state', 'collapsed');
                } else {
                    localStorage.setItem('sidebar-state', 'expanded');
                }
            }
        });
    }

    // Fecha sidebar mobile ao clicar no overlay
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && body.classList.contains('sidebar-open')) {
            const sidebar = document.querySelector('.sidebar');
            const isClickInsideSidebar = sidebar && sidebar.contains(e.target);
            const isToggleButton = sidebarToggle && sidebarToggle.contains(e.target);

            if (!isClickInsideSidebar && !isToggleButton) {
                body.classList.remove('sidebar-open');
            }
        }
    });

    // Ajusta comportamento ao redimensionar janela
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            body.classList.remove('sidebar-open');
        }
    });

    // --- 3. LÓGICA DO SUBMENU (ACCORDION) ---
    
    menuItemsWithSubmenu.forEach(item => {
        item.addEventListener('click', (e) => {
            // Se a sidebar estiver colapsada, não abre o submenu (melhor UX)
            // Ou você pode optar por expandir a sidebar primeiro
            if (body.classList.contains('sidebar-collapsed')) {
                body.classList.remove('sidebar-collapsed');
                localStorage.setItem('sidebar-state', 'expanded');
            }

            // Impede navegação se o link for vazio
            const href = item.getAttribute('href');
            if (!href || href === '#' || href === 'javascript:void(0)') {
                e.preventDefault();
            }

            const submenu = item.nextElementSibling;
            const arrow = item.querySelector('.submenu-arrow');

            if (submenu) {
                // Fecha outros submenus abertos (opcional, estilo Accordion real)
                // document.querySelectorAll('.submenu.expanded').forEach(s => {
                //    if(s !== submenu) s.classList.remove('expanded');
                // });

                submenu.classList.toggle('expanded');
                if (arrow) arrow.classList.toggle('rotate');
            }
        });
    });

    // --- 4. LÓGICA DO TEMA DARK/LIGHT ---
    
    const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;
    const themeText = themeToggle ? themeToggle.querySelector('span') : null;

    // Verifica preferência de tema salva
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        updateThemeUI(true);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            
            const isDark = body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeUI(isDark);
        });
    }

    function updateThemeUI(isDark) {
        if (!themeIcon || !themeText) return;

        if (isDark) {
            themeIcon.classList.replace('uil-moon', 'uil-sun');
            themeText.textContent = 'Modo Claro';
        } else {
            themeIcon.classList.replace('uil-sun', 'uil-moon');
            themeText.textContent = 'Modo Escuro';
        }
    }
});