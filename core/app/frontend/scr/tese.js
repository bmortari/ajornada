document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.chapter-content');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    // Função para atualizar visibilidade das setas
    function updateArrowVisibility(activeIndex) {
        btnPrev.style.display = activeIndex === 0 ? 'none' : 'flex';
        btnNext.style.display = activeIndex === tabs.length - 1 ? 'none' : 'flex';
    }

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');

            // Remove classes ativas
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Adiciona classe ativa
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');

            // Atualiza setas
            updateArrowVisibility(index);

            // Scroll suave para o topo
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });

    // Lógica da Seta Próximo
    btnNext.addEventListener('click', () => {
        const currentActive = document.querySelector('.tab-btn.active');
        const nextTab = currentActive.nextElementSibling;
        if (nextTab && nextTab.classList.contains('tab-btn')) {
            nextTab.click();
        }
    });

    // Lógica da Seta Anterior
    btnPrev.addEventListener('click', () => {
        const currentActive = document.querySelector('.tab-btn.active');
        const prevTab = currentActive.previousElementSibling;
        if (prevTab && prevTab.classList.contains('tab-btn')) {
            prevTab.click();
        }
    });

    // Inicializa visibilidade (Capa não tem "Anterior")
    updateArrowVisibility(0);
});