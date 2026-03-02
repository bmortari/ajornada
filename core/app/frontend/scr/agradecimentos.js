// Sistema de animações para página de agradecimentos
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de Agradecimentos carregada com sucesso!');

    // Intersection Observer para animações ao scroll
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Para de observar após animar
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Seleciona elementos para animar
    const elementsToAnimate = document.querySelectorAll(
        '.agradecimento-section, .photo-item, .thanks-item, .text-content'
    );

    elementsToAnimate.forEach(el => {
        el.classList.add('will-animate');
        observer.observe(el);
    });

    // Efeito elegante no hero ao rolar - SEM parallax problemático
    const hero = document.querySelector('.hero-agradecimentos');
    if (hero) {
        let lastScroll = 0;
        let ticking = false;
        
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    const scrolled = window.pageYOffset;
                    
                    // Adiciona classe quando rola mais de 50px para transição suave
                    if (scrolled > 50) {
                        hero.classList.add('scrolled');
                    } else {
                        hero.classList.remove('scrolled');
                    }
                    
                    lastScroll = scrolled;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // Adiciona efeito de hover suave nas fotos
    const photoItems = document.querySelectorAll('.photo-item');
    photoItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
        });
    });

    // Adiciona estilo para animação
    const style = document.createElement('style');
    style.textContent = `
        .will-animate {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Log das seções para debug
    console.log(`Elementos animados: ${elementsToAnimate.length}`);

    // Adiciona efeito de fade gradual para citações
    const quotes = document.querySelectorAll('.quote-box');
    quotes.forEach((quote, index) => {
        setTimeout(() => {
            observer.observe(quote);
        }, index * 100);
    });

    // Smooth scroll para links internos (se houver)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Easter egg: adiciona confetti ao clicar no ícone de coração (opcional)
    const heroIcon = document.querySelector('.hero-icon i');
    if (heroIcon) {
        let clickCount = 0;
        heroIcon.addEventListener('click', function() {
            clickCount++;
            this.style.transform = 'scale(1.3)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
            
            if (clickCount >= 5) {
                console.log('❤️ Obrigado por todo o carinho e apoio! ❤️');
                clickCount = 0;
            }
        });
    }

    console.log('Sistema de animações inicializado - Versão otimizada');
});

// Função para adicionar efeito de reveal ao carregar imagens (quando substituir placeholders)
function revealImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Exporta funções úteis
window.agradecimentosUtils = {
    revealImages: revealImages,
    scrollToTop: function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    scrollToBottom: function() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
};