/* ═══════════════════════════════════════════════
   fx.js — Visual Effects: Particles + GSAP Animations
   ═══════════════════════════════════════════════ */

const FX = (() => {
  let particlesInit = false;
  let animationsInit = false;
  let pulseTween = null;

  // ── Reset flags (called when leaving the home tab) ──
  function resetHome() {
    particlesInit = false;
    animationsInit = false;
    if (pulseTween) {
      pulseTween.kill();
      pulseTween = null;
    }
  }

  // ── tsParticles — Homepage floating particles ──
  async function initHomeParticles() {
    if (particlesInit || typeof tsParticles === 'undefined') return;
    const container = document.getElementById('tsparticles-home');
    if (!container) return;

    await tsParticles.load('tsparticles-home', {
      fullScreen: false,
      background: { color: 'transparent' },
      fpsLimit: 30,
      particles: {
        number: { value: 35, density: { enable: true, area: 900 } },
        color: { value: ['#ffffff', '#a78bfa', '#f472b6'] },
        shape: { type: 'circle' },
        opacity: {
          value: { min: 0.15, max: 0.5 },
          animation: { enable: true, speed: 0.8, minimumValue: 0.1, sync: false }
        },
        size: {
          value: { min: 1, max: 3 },
          animation: { enable: true, speed: 1, minimumValue: 0.5, sync: false }
        },
        move: {
          enable: true,
          speed: 0.6,
          direction: 'top',
          random: true,
          straight: false,
          outModes: { default: 'out' }
        },
        life: { duration: { value: 8, sync: false } }
      },
      detectRetina: true
    });

    particlesInit = true;
  }

  // ── GSAP — Homepage entrance animations ──
  function initHomeAnimations() {
    if (animationsInit || typeof gsap === 'undefined') return;

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // Featured showcase slides up + fades in
    tl.from('.featured-showcase', {
      y: 40,
      opacity: 0,
      duration: 0.7,
    });

    // Game panels stagger in
    tl.from('.game-panel-btn', {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.12,
    }, '-=0.3');

    // Landing banner slides up
    tl.from('.landing-banner', {
      y: 20,
      opacity: 0,
      duration: 0.5,
    }, '-=0.2');

    // Featured select button pulses
    pulseTween = gsap.to('.featured-select-btn', {
      scale: 1.08,
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1.5,
    });

    animationsInit = true;
  }

  // ── Public API ──
  return {
    initHomeParticles,
    initHomeAnimations,
    resetHome,
  };
})();
