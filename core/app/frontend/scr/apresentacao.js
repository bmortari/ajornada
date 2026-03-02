/* =========================================
   APRESENTAÇÃO DE SLIDES - JAVASCRIPT
   Navegação, Transições e Atalhos de Teclado
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTOS ---
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const navDotsContainer = document.getElementById('navDots');
    const progressFill = document.getElementById('progressFill');
    const currentSlideEl = document.getElementById('currentSlide');
    const totalSlidesEl = document.getElementById('totalSlides');
    
    // --- ESTADO ---
    let currentSlide = 1;
    const totalSlides = slides.length;
    let isAnimating = false;
    
    // --- INICIALIZAÇÃO ---
    totalSlidesEl.textContent = totalSlides;
    createNavDots();
    updateUI();
    
    // --- CRIAR DOTS DE NAVEGAÇÃO ---
    function createNavDots() {
        for (let i = 1; i <= totalSlides; i++) {
            const dot = document.createElement('div');
            dot.classList.add('nav-dot');
            if (i === 1) dot.classList.add('active');
            dot.dataset.slide = i;
            dot.addEventListener('click', () => goToSlide(i));
            navDotsContainer.appendChild(dot);
        }
    }
    
    // --- NAVEGAÇÃO ---
    function goToSlide(slideNumber) {
        if (isAnimating || slideNumber === currentSlide) return;
        if (slideNumber < 1 || slideNumber > totalSlides) return;
        
        isAnimating = true;
        
        const direction = slideNumber > currentSlide ? 'next' : 'prev';
        const currentSlideEl = document.querySelector(`.slide[data-slide="${currentSlide}"]`);
        const nextSlideEl = document.querySelector(`.slide[data-slide="${slideNumber}"]`);
        
        // Animação de saída
        currentSlideEl.classList.add(direction === 'next' ? 'exit-left' : 'exit-right');
        currentSlideEl.classList.remove('active');
        
        // Preparar próximo slide
        nextSlideEl.style.transform = direction === 'next' ? 'translateX(50px)' : 'translateX(-50px)';
        
        // Pequeno delay para a transição
        setTimeout(() => {
            nextSlideEl.classList.add('active');
            nextSlideEl.style.transform = '';
            
            currentSlide = slideNumber;
            updateUI();
            
            // Limpar classes de animação
            setTimeout(() => {
                currentSlideEl.classList.remove('exit-left', 'exit-right');
                isAnimating = false;
            }, 300);
        }, 100);
    }
    
    function nextSlide() {
        if (currentSlide < totalSlides) {
            goToSlide(currentSlide + 1);
        }
    }
    
    function prevSlide() {
        if (currentSlide > 1) {
            goToSlide(currentSlide - 1);
        }
    }
    
    // --- ATUALIZAR UI ---
    function updateUI() {
        // Atualizar indicador
        currentSlideEl.textContent = currentSlide;
        
        // Atualizar barra de progresso
        const progress = (currentSlide / totalSlides) * 100;
        progressFill.style.width = `${progress}%`;
        
        // Atualizar botões
        prevBtn.disabled = currentSlide === 1;
        nextBtn.disabled = currentSlide === totalSlides;
        
        // Atualizar dots
        document.querySelectorAll('.nav-dot').forEach(dot => {
            dot.classList.remove('active');
            if (parseInt(dot.dataset.slide) === currentSlide) {
                dot.classList.add('active');
            }
        });
    }
    
    // --- EVENT LISTENERS ---
    
    // Botões
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);
    
    // Teclado
    document.addEventListener('keydown', (e) => {
        // Ignorar se estiver digitando em input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                prevSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(1);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides);
                break;
            case 'f':
            case 'F':
                toggleFullscreen();
                break;
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
        }
    });
    
    // Touch/Swipe para mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    const presentationContainer = document.querySelector('.presentation-container');
    
    presentationContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    presentationContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - próximo slide
                nextSlide();
            } else {
                // Swipe right - slide anterior
                prevSlide();
            }
        }
    }
    
    // --- FULLSCREEN ---
    function toggleFullscreen() {
        const container = document.querySelector('.presentation-container');
        
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    // Ajustar quando entrar/sair do fullscreen
    document.addEventListener('fullscreenchange', () => {
        const container = document.querySelector('.presentation-container');
        if (document.fullscreenElement) {
            container.style.borderRadius = '0';
            container.style.height = '100vh';
        } else {
            container.style.borderRadius = '';
            container.style.height = '';
        }
    });
    
    // --- CLICK PARA AVANÇAR (área do slide) ---
    slides.forEach(slide => {
        slide.addEventListener('click', (e) => {
            // Ignorar se clicar em link ou botão
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
                e.target.closest('a') || e.target.closest('button')) {
                return;
            }
            
            // Verificar posição do clique
            const rect = slide.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const slideWidth = rect.width;
            
            // Clicar na metade esquerda = anterior, direita = próximo
            if (clickX < slideWidth * 0.3) {
                prevSlide();
            } else if (clickX > slideWidth * 0.7) {
                nextSlide();
            }
        });
    });
    
    // --- PRELOAD DE IMAGENS ---
    function preloadImages() {
        const images = document.querySelectorAll('.presentation-container img');
        images.forEach(img => {
            if (img.dataset.src) {
                const preload = new Image();
                preload.src = img.dataset.src;
            }
        });
    }
    
    preloadImages();
    
    // --- AUTO-PLAY (opcional, desabilitado por padrão) ---
    let autoPlayInterval = null;
    const autoPlayDelay = 10000; // 10 segundos
    
    function startAutoPlay() {
        if (autoPlayInterval) return;
        autoPlayInterval = setInterval(() => {
            if (currentSlide < totalSlides) {
                nextSlide();
            } else {
                stopAutoPlay();
            }
        }, autoPlayDelay);
    }
    
    function stopAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
    }
    
    // Parar autoplay ao interagir
    presentationContainer.addEventListener('click', stopAutoPlay);
    document.addEventListener('keydown', stopAutoPlay);
    
    // Expor funções globalmente se necessário
    window.slidePresentation = {
        next: nextSlide,
        prev: prevSlide,
        goTo: goToSlide,
        startAutoPlay,
        stopAutoPlay,
        toggleFullscreen
    };
    
});