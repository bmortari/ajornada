/* --- nativa.js --- */
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona uma classe para ativar animações quando os elementos entram na tela
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Opcional: parar de observar após aparecer
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Seleciona seções para animar
    document.querySelectorAll('.hero-section, .about-section, .why-section, .challenge-section').forEach(section => {
        section.style.opacity = '0';
        section.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        section.style.transform = 'translateY(20px)';
        observer.observe(section);
    });

    // Função auxiliar para injetar classe visible
    const style = document.createElement('style');
    style.innerHTML = `
        .visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
});