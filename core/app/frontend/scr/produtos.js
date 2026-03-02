/* --- produtos.js --- */
document.addEventListener('DOMContentLoaded', () => {
    // Exemplo: Adicionar um efeito visual ao carregar os cards sequencialmente
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.animation = `fadeIn 0.5s ease-out forwards ${index * 0.1}s`;
    });
});