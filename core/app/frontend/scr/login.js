/* Configuração do Particles.js */
particlesJS("particles-js", {
    "particles": {
        "number": { "value": 140, "density": { "enable": true, "value_area": 800 } },
        
        /* COR: Verde (Baseado no código fornecido #006400) */
        "color": { "value": "#006400" },
        
        "shape": { "type": "circle" },
        
        "opacity": { 
            "value": 0.7, 
            "random": false,
            "anim": {
                "enable": true,
                "speed": 2,
                "opacity_min": 0.4,
                "sync": false
            }
        },
        
        "size": { "value": 4, "random": true },
        
        "line_linked": {
            "enable": true,
            "distance": 150,
            /* Linhas da mesma cor */
            "color": "#006400",
            "opacity": 0.5,
            "width": 1.2
        },
        "move": { "enable": true, "speed": 4, "direction": "none", "random": false, "straight": false, "out_mode": "out", "bounce": false }
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {
            "onhover": { "enable": true, "mode": "grab" },
            "onclick": { "enable": true, "mode": "push" },
            "resize": true
        },
        "modes": {
            "grab": { "distance": 140, "line_linked": { "opacity": 0.9 } }
        }
    },
    "retina_detect": true
});