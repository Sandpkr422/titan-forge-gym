// TITAN FORGE GYM - Ultra-Modern Interactive Controller v2.0

document.addEventListener('DOMContentLoaded', () => {
  initAudioEngine();
  initForgeParticles();
  initDynamicCounters();
  initBmiCalculator();
  initPricingToggle();
  initCardMouseGlow();
  initModals();
  initLeadForm();
  initMobileNav();
  initScheduleViewer();
  initBeforeAfterSlider();
  initLiveFloorPulse();
  initEquipmentViewer();
  initTourVideoPlayer();
});

/* =========================================================
   1. SYNTHESIZED WEB AUDIO API SOUND ENGINE
   ========================================================= */
let audioCtx = null;
let soundEnabled = true;

function initAudioEngine() {
  const sfxToggleBtn = document.getElementById('sfx-toggle');
  
  function ensureAudioCtx() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  if (sfxToggleBtn) {
    sfxToggleBtn.addEventListener('click', () => {
      ensureAudioCtx();
      soundEnabled = !soundEnabled;
      sfxToggleBtn.classList.toggle('sound-muted', !soundEnabled);
      showToast(soundEnabled ? '⚡ Audio Feedback: Active' : '🔇 Audio Feedback: Muted');
      if (soundEnabled) playAnvilClang();
    });
  }

  // Global sound trigger on buttons and tabs
  document.querySelectorAll('button, a[href^="#"], .sound-trigger, input[type=range]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (soundEnabled) playSubtleHover();
    });
    el.addEventListener('click', () => {
      ensureAudioCtx();
      if (soundEnabled) playClickSound();
    });
  });
}

function playSubtleHover() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, audioCtx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.015, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  } catch (e) {}
}

function playClickSound() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.07);
  } catch (e) {}
}

function playHeavyThud() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, audioCtx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
  } catch (e) {}
}

function playAnvilClang() {
  if (!soundEnabled || !audioCtx) return;
  try {
    // Metallic chime + sub bass impact
    const osc = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.2);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc2.start();
    osc.stop(audioCtx.currentTime + 0.35);
    osc2.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
}

function playSuccessFanfare() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const freqs = [350, 440, 587, 740, 880];
    freqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (idx * 0.07));

      gain.gain.setValueAtTime(0.06, audioCtx.currentTime + (idx * 0.07));
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (idx * 0.07) + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + (idx * 0.07));
      osc.stop(audioCtx.currentTime + (idx * 0.07) + 0.26);
    });
  } catch (e) {}
}

/* =========================================================
   2. FORGE PARTICLES & RISING SPARKS CANVAS
   ========================================================= */
function initForgeParticles() {
  const canvas = document.getElementById('forge-sparks-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  let isMobile = window.innerWidth < 768;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    isMobile = window.innerWidth < 768;
  });

  const particleCount = isMobile ? 18 : 45;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: height + Math.random() * 100,
      size: Math.random() * 2.5 + 0.8,
      speedY: Math.random() * 1.8 + 0.8,
      speedX: (Math.random() - 0.5) * 0.9,
      alpha: Math.random() * 0.8 + 0.2,
      decay: Math.random() * 0.006 + 0.002,
      color: Math.random() > 0.4 ? '#CCFF00' : (Math.random() > 0.5 ? '#FF3344' : '#FFAA00')
    });
  }

  function animateParticles() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.y -= p.speedY;
      p.x += p.speedX;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y < -10) {
        p.x = Math.random() * width;
        p.y = height + 10;
        p.alpha = Math.random() * 0.8 + 0.2;
        p.speedY = Math.random() * 1.8 + 0.8;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (!isMobile) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    requestAnimationFrame(animateParticles);
  }

  animateParticles();
}

/* =========================================================
   3. DYNAMIC STAT COUNTER ANIMATIONS
   ========================================================= */
function initDynamicCounters() {
  const statElements = document.querySelectorAll('.stat-counter');
  let hasAnimated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;
        statElements.forEach(statEl => {
          const target = parseInt(statEl.getAttribute('data-target'), 10);
          const suffix = statEl.getAttribute('data-suffix') || '';
          const duration = 1800;
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(easeOut * target);

            statEl.textContent = currentVal.toLocaleString() + suffix;

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              statEl.textContent = target.toLocaleString() + suffix;
            }
          }
          requestAnimationFrame(updateCounter);
        });
      }
    });
  }, { threshold: 0.25 });

  const statsSection = document.getElementById('hero-stats-row');
  if (statsSection) {
    observer.observe(statsSection);
  }
}

/* =========================================================
   4. INTERACTIVE BMI & CALORIE CALCULATOR
   ========================================================= */
function initBmiCalculator() {
  const heightSlider = document.getElementById('calc-height');
  if (!heightSlider) return;
  const heightVal = document.getElementById('calc-height-val');
  const weightSlider = document.getElementById('calc-weight');
  const weightVal = document.getElementById('calc-weight-val');
  const ageSlider = document.getElementById('calc-age');
  const ageVal = document.getElementById('calc-age-val');
  const genderRadios = document.querySelectorAll('input[name="calc-gender"]');
  const goalButtons = document.querySelectorAll('.goal-btn');

  // Outputs
  const bmiDisplay = document.getElementById('calc-bmi-result');
  const bmiCategory = document.getElementById('calc-bmi-badge');
  const tdeeDisplay = document.getElementById('calc-tdee-result');
  const targetCalDisplay = document.getElementById('calc-target-cal');
  const proteinDisplay = document.getElementById('calc-protein');
  const carbsDisplay = document.getElementById('calc-carbs');
  const fatsDisplay = document.getElementById('calc-fats');
  const programRecommendation = document.getElementById('calc-program-rec');
  const gaugeFill = document.getElementById('bmi-gauge-fill');

  let activeGoal = 'fat-loss';

  function calculate() {
    if (!heightSlider || !weightSlider) return;

    const heightCm = parseFloat(heightSlider.value);
    const weightKg = parseFloat(weightSlider.value);
    const age = parseInt(ageSlider ? ageSlider.value : 26, 10);
    
    let gender = 'male';
    genderRadios.forEach(r => { if (r.checked) gender = r.value; });

    // Labels
    if (heightVal) heightVal.textContent = `${heightCm} cm`;
    if (weightVal) weightVal.textContent = `${weightKg} kg`;
    if (ageVal) ageVal.textContent = `${age} yrs`;

    // 1. BMI
    const heightM = heightCm / 100;
    const bmi = (weightKg / (heightM * heightM)).toFixed(1);
    if (bmiDisplay) bmiDisplay.textContent = bmi;

    // 2. BMI Badge & Gauge
    let category = 'Normal Weight';
    let badgeClass = 'text-volt bg-volt/10 border-volt/30';
    let gaugePercent = 48;

    if (bmi < 18.5) {
      category = 'Underweight';
      badgeClass = 'text-sky-400 bg-sky-400/10 border-sky-400/30';
      gaugePercent = 20;
    } else if (bmi >= 18.5 && bmi < 25) {
      category = 'Athletic / Optimal';
      badgeClass = 'text-[#CCFF00] bg-[#CCFF00]/15 border-[#CCFF00]/40';
      gaugePercent = 50;
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Heavy Athletic / Overweight';
      badgeClass = 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      gaugePercent = 75;
    } else {
      category = 'High Mass / Obese';
      badgeClass = 'text-[#FF3344] bg-[#FF3344]/15 border-[#FF3344]/40';
      gaugePercent = 95;
    }

    if (bmiCategory) {
      bmiCategory.textContent = category;
      bmiCategory.className = `px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider ${badgeClass}`;
    }
    if (gaugeFill) {
      gaugeFill.style.width = `${gaugePercent}%`;
    }

    // 3. BMR (Mifflin-St Jeor)
    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    bmr += (gender === 'male' ? 5 : -161);

    const tdee = Math.round(bmr * 1.55);
    if (tdeeDisplay) tdeeDisplay.textContent = `${tdee.toLocaleString()} kcal`;

    // 4. Target Calories & Macro Distribution
    let targetCalories = tdee;
    let proteinGrams = Math.round(weightKg * 2.2);
    let recommendedDiscipline = 'Cross-Training & HIIT';
    let disciplineDesc = 'High-octane metabolic conditioning to rapidly torch fat while forging cardiovascular endurance.';

    if (activeGoal === 'fat-loss') {
      targetCalories = Math.round(tdee - 500);
      recommendedDiscipline = 'Cross-Training & Combat Conditioning';
      disciplineDesc = '500 kcal deficit with high-protein intake to preserve dense lean muscle while stripping body fat.';
    } else if (activeGoal === 'muscle-gain') {
      targetCalories = Math.round(tdee + 400);
      proteinGrams = Math.round(weightKg * 2.4);
      recommendedDiscipline = 'Hypertrophy & Heavy Iron Strength';
      disciplineDesc = 'Surplus caloric fuel paired with progressive overload on Olympic bars and calibrated plate racks.';
    } else {
      targetCalories = tdee;
      recommendedDiscipline = 'Functional Mobility & Combat Athletics';
      disciplineDesc = 'Isocaloric nutrient timing with explosive power work and cryotherapy recovery.';
    }

    const proteinCal = proteinGrams * 4;
    const fatGrams = Math.round((targetCalories * 0.25) / 9);
    const fatCal = fatGrams * 9;
    const carbsGrams = Math.max(50, Math.round((targetCalories - proteinCal - fatCal) / 4));

    if (targetCalDisplay) targetCalDisplay.textContent = `${targetCalories.toLocaleString()} kcal`;
    if (proteinDisplay) proteinDisplay.textContent = `${proteinGrams}g`;
    if (carbsDisplay) carbsDisplay.textContent = `${carbsGrams}g`;
    if (fatsDisplay) fatsDisplay.textContent = `${fatGrams}g`;

    if (programRecommendation) {
      programRecommendation.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="p-3 bg-[#CCFF00]/10 border border-[#CCFF00]/30 rounded-lg text-[#CCFF00] font-black text-xl shrink-0">
            ⚡
          </div>
          <div>
            <h5 class="text-white font-bold text-lg font-display uppercase tracking-wide">${recommendedDiscipline}</h5>
            <p class="text-zinc-400 text-sm mt-1">${disciplineDesc}</p>
            <a href="#lead-capture" class="inline-flex items-center gap-2 text-[#CCFF00] hover:text-white text-xs font-bold uppercase tracking-wider mt-3 group transition-colors">
              Claim Free Trial For This Program 
              <span class="group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </div>
      `;
    }
  }

  // Listeners
  [heightSlider, weightSlider, ageSlider].forEach(slider => {
    if (slider) {
      slider.addEventListener('input', calculate);
    }
  });

  genderRadios.forEach(radio => {
    radio.addEventListener('change', calculate);
  });

  goalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      goalButtons.forEach(b => {
        b.classList.remove('active', 'border-[#CCFF00]', 'text-[#CCFF00]', 'bg-[#CCFF00]/10');
        b.classList.add('border-zinc-800', 'text-zinc-400');
      });
      btn.classList.add('active', 'border-[#CCFF00]', 'text-[#CCFF00]', 'bg-[#CCFF00]/10');
      btn.classList.remove('border-zinc-800', 'text-zinc-400');
      activeGoal = btn.getAttribute('data-goal');
      calculate();
      if (soundEnabled) playClickSound();
    });
  });

  calculate();
}

/* =========================================================
   5. MEMBERSHIP PRICING TIER TOGGLE
   ========================================================= */
function initPricingToggle() {
  const billingMonthly = document.getElementById('billing-monthly');
  const billingAnnual = document.getElementById('billing-annual');
  const priceElements = document.querySelectorAll('.tier-price');

  const priceData = {
    monthly: {
      starter: { amount: '₹1,999', period: '/month', badge: 'Standard Entry' },
      pro: { amount: '₹4,999', period: '/quarter', badge: 'MOST POPULAR' },
      elite: { amount: '₹14,999', period: '/year', badge: 'VIP ALL-ACCESS' }
    },
    annual: {
      starter: { amount: '₹18,990', period: '/year (₹1,582/mo)', badge: 'Save 20%' },
      pro: { amount: '₹15,990', period: '/year (₹1,332/mo)', badge: 'MOST POPULAR (SAVE 25%)' },
      elite: { amount: '₹12,499', period: '/year Special', badge: 'BEST VALUE (VIP FOUNDER)' }
    }
  };

  function updatePricing(planType) {
    priceElements.forEach(el => {
      const tier = el.getAttribute('data-tier');
      if (priceData[planType] && priceData[planType][tier]) {
        const item = priceData[planType][tier];
        el.innerHTML = `<span class="text-3xl lg:text-4xl font-extrabold text-white font-display">${item.amount}</span><span class="text-zinc-400 text-xs font-normal ml-1">${item.period}</span>`;
      }
    });
  }

  if (billingMonthly && billingAnnual) {
    billingMonthly.addEventListener('click', () => {
      billingMonthly.classList.add('bg-[#CCFF00]', 'text-black', 'shadow-lg');
      billingMonthly.classList.remove('text-zinc-400');
      billingAnnual.classList.remove('bg-[#CCFF00]', 'text-black', 'shadow-lg');
      billingAnnual.classList.add('text-zinc-400');
      updatePricing('monthly');
      if (soundEnabled) playClickSound();
    });

    billingAnnual.addEventListener('click', () => {
      billingAnnual.classList.add('bg-[#CCFF00]', 'text-black', 'shadow-lg');
      billingAnnual.classList.remove('text-zinc-400');
      billingMonthly.classList.remove('bg-[#CCFF00]', 'text-black', 'shadow-lg');
      billingMonthly.classList.add('text-zinc-400');
      updatePricing('annual');
      if (soundEnabled) playClickSound();
    });
  }

  document.querySelectorAll('.join-tier-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tierName = btn.getAttribute('data-tier-name');
      const passGoalInput = document.getElementById('pass-goal');
      if (passGoalInput) {
        passGoalInput.value = `Membership Interest: ${tierName}`;
      }
      openModal('lead-modal');
      if (soundEnabled) playHeavyThud();
    });
  });
}

/* =========================================================
   6. MOUSE GLOW & 3D TILT MICRO-INTERACTIONS
   ========================================================= */
function initCardMouseGlow() {
  const cards = document.querySelectorAll('.interactive-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3.5;
      const rotateY = ((x - centerX) / centerX) * 3.5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

/* =========================================================
   7. BEFORE / AFTER TRANSFORMATION COMPARISON SLIDER
   ========================================================= */
function initBeforeAfterSlider() {
  const container = document.getElementById('ba-slider-container');
  const afterImage = document.getElementById('ba-after-layer');
  const handle = document.getElementById('ba-drag-handle');
  const beforeImg = document.getElementById('ba-before-img');
  const afterImg = document.getElementById('ba-after-img');
  if (!container || !afterImage || !handle) return;

  let isDragging = false;
  let autoSwipeActive = false;
  let autoSwipeReqId = null;

  // Ensure after image matches container's exact width for seamless pixel alignment
  function syncImageWidth() {
    if (afterImg && container) {
      afterImg.style.width = `${container.offsetWidth}px`;
    }
  }

  // Initial sizing and resize listener
  syncImageWidth();
  window.addEventListener('resize', syncImageWidth);

  function setSliderPercent(percent) {
    const clamped = Math.min(100, Math.max(0, percent));
    afterImage.style.width = `${clamped}%`;
    handle.style.left = `${clamped}%`;
  }

  function updateSlider(xPos) {
    const rect = container.getBoundingClientRect();
    let offsetX = xPos - rect.left;
    if (offsetX < 0) offsetX = 0;
    if (offsetX > rect.width) offsetX = rect.width;

    const percent = (offsetX / rect.width) * 100;
    setSliderPercent(percent);
  }

  // 7A. Auto-Sweep / Live Transition Functions
  function startAutoSwipe() {
    if (autoSwipeActive) return;
    autoSwipeActive = true;
    const indicator = document.getElementById('ba-swipe-indicator');
    const label = document.getElementById('ba-swipe-label');
    if (indicator) indicator.className = 'w-2 h-2 rounded-full bg-[#CCFF00] animate-ping';
    if (label) label.textContent = 'Live Transition (Click to Pause)';

    let startTime = null;
    function step(timestamp) {
      if (!autoSwipeActive) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // Smooth sine oscillation between 18% and 82%
      const sweepPercent = 50 + Math.sin(elapsed / 900) * 32;
      setSliderPercent(sweepPercent);
      autoSwipeReqId = requestAnimationFrame(step);
    }
    autoSwipeReqId = requestAnimationFrame(step);
  }

  // Stop auto-sweep on user manual interaction
  function stopAutoSwipe() {
    if (autoSwipeActive) {
      autoSwipeActive = false;
      if (autoSwipeReqId) cancelAnimationFrame(autoSwipeReqId);
      const indicator = document.getElementById('ba-swipe-indicator');
      const label = document.getElementById('ba-swipe-label');
      if (indicator) indicator.className = 'w-2 h-2 rounded-full bg-[#CCFF00]';
      if (label) label.textContent = 'Start Live Transition';
    }
  }

  container.addEventListener('mousedown', (e) => {
    stopAutoSwipe();
    isDragging = true;
    updateSlider(e.clientX);
    if (typeof soundEnabled !== 'undefined' && soundEnabled && typeof playClickSound === 'function') {
      playClickSound();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch Support (Ensuring vertical page scrolling is smooth on mobile)
  let touchStartX = 0;
  let touchStartY = 0;

  handle.addEventListener('touchstart', (e) => {
    stopAutoSwipe();
    isDragging = true;
    updateSlider(e.touches[0].clientX);
    e.stopPropagation();
  }, { passive: true });

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging && e.touches.length === 1) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > dy && dx > 8) {
        stopAutoSwipe();
        isDragging = true;
      }
    }
    if (isDragging && e.touches.length === 1) {
      updateSlider(e.touches[0].clientX);
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Toggle button listener
  const autoSwipeBtn = document.getElementById('ba-auto-swipe-btn');
  if (autoSwipeBtn) {
    autoSwipeBtn.addEventListener('click', () => {
      if (autoSwipeActive) {
        stopAutoSwipe();
      } else {
        startAutoSwipe();
      }
    });
  }

  // 7B. Multiple Indian Client Transformation Case Studies (Priya first, then Aman)
  const caseProfiles = {
    priya: {
      beforeSrc: 'assets/female-transformation-before.jpg',
      afterSrc: 'assets/female-transformation-after.jpg',
      beforeAlt: 'Priya Nair Day 1 Baseline (Titan Forge Mumbai)',
      afterAlt: 'Priya Nair Week 12 Transformed Athletic Conditioning',
      beforeBadge: 'DAY 1 // 27.0% BODY FAT',
      afterBadge: 'WEEK 12 // 16.0% BF (TONED CORE)',
      statBf: '27.0% → 16.0% (-11.0%)',
      statMuscle: 'Toned Abs & Athletic Deltoids',
      statStrength: '5K Run: 31m → 22m 40s'
    },
    aman: {
      beforeSrc: 'assets/indian-transformation-before.jpg',
      afterSrc: 'assets/indian-transformation-after.jpg',
      beforeAlt: 'Aman Singhania Day 1 Baseline (Titan Forge Mumbai)',
      afterAlt: 'Aman Singhania Week 12 Transformed Peak Recomp',
      beforeBadge: 'DAY 1 // 24.5% BODY FAT',
      afterBadge: 'WEEK 12 // 9.8% BF (+7.2KG LEAN)',
      statBf: '24.5% → 9.8% (-14.7%)',
      statMuscle: '+7.2 kg Accrued',
      statStrength: 'Deadlift: 100 → 185 kg'
    }
  };

  const caseButtons = document.querySelectorAll('.ba-case-btn');
  caseButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const caseKey = btn.getAttribute('data-case');
      const profile = caseProfiles[caseKey];
      if (!profile) return;

      caseButtons.forEach((b) => {
        b.classList.remove('active', 'bg-[#CCFF00]', 'text-black', 'shadow');
        b.classList.add('text-zinc-400');
      });
      btn.classList.add('active', 'bg-[#CCFF00]', 'text-black', 'shadow');
      btn.classList.remove('text-zinc-400');

      if (beforeImg) {
        beforeImg.src = profile.beforeSrc;
        beforeImg.alt = profile.beforeAlt;
      }
      if (afterImg) {
        afterImg.src = profile.afterSrc;
        afterImg.alt = profile.afterAlt;
        syncImageWidth();
      }

      const beforeBadge = document.getElementById('ba-before-badge');
      const afterBadge = document.getElementById('ba-after-badge');
      if (beforeBadge) {
        const textSpan = beforeBadge.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = profile.beforeBadge;
      }
      if (afterBadge) {
        const textSpan = afterBadge.querySelector('span:last-child');
        if (textSpan) textSpan.textContent = profile.afterBadge;
      }

      const statBf = document.getElementById('ba-stat-bf');
      const statMuscle = document.getElementById('ba-stat-muscle');
      const statStrength = document.getElementById('ba-stat-strength');
      if (statBf) statBf.textContent = profile.statBf;
      if (statMuscle) statMuscle.textContent = profile.statMuscle;
      if (statStrength) statStrength.textContent = profile.statStrength;

      // Keep auto-sweep alive or restart
      if (!autoSwipeActive) {
        setSliderPercent(50);
      }
    });
  });

  // Always start live transition sweep automatically when page loads
  setTimeout(() => {
    startAutoSwipe();
  }, 400);
}

/* =========================================================
   8. LIVE GYM FLOOR PULSE SIMULATOR
   ========================================================= */
function initLiveFloorPulse() {
  const occupancyEl = document.getElementById('live-occupancy-num');
  const tempEl = document.getElementById('live-temp-num');
  if (!occupancyEl) return;

  setInterval(() => {
    const base = 71;
    const variation = Math.floor(Math.sin(Date.now() / 15000) * 8);
    const current = Math.min(94, Math.max(58, base + variation));
    occupancyEl.textContent = `${current}%`;

    if (tempEl) {
      tempEl.textContent = `${(19.2 + Math.random() * 0.4).toFixed(1)}°C`;
    }
  }, 4000);
}

/* =========================================================
   9. EQUIPMENT ARSENAL VIEWER (RICH HARDWARE SHOWCASE WITH IMAGES)
   ========================================================= */
const equipmentList = [
  { 
    name: 'Eleiko IPF Competition Barbells & Calibrated Cast Iron Discs', 
    spec: 'Competition Olympic Spec • 0.25% Calibrated Tolerance', 
    zone: 'Heavy Iron Dungeon', 
    tag: 'BARBELLS & RIGS',
    image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=900&auto=format&fit=crop',
    icon: 'dumbbell' 
  },
  { 
    name: 'Arsenal Strength Plate-Loaded Incline & Biomechanical Hack Squat', 
    spec: 'Linear Biomechanical Bearings • Converging Diverging Plane', 
    zone: 'Hypertrophy Sector', 
    tag: 'HYPERTROPHY RIGS',
    image: 'https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?q=80&w=900&auto=format&fit=crop',
    icon: 'zap' 
  },
  { 
    name: 'Woodway Curve Kinetic Treadmills & Concept2 SkiErgs', 
    spec: 'Zero-Motor Self-Powered Dynamic • High Velocity Sprint Track', 
    zone: 'HIIT Turf Track', 
    tag: 'CONDITIONING',
    image: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=900&auto=format&fit=crop',
    icon: 'flame' 
  },
  { 
    name: 'CryoBuilt Arctic Sub-Zero Immersion Pod & Cold Plunges', 
    spec: 'Whole-Body Electric Cryo (-110°C) • Infrared Sauna', 
    zone: 'Recovery Suite', 
    tag: 'CRYO & RECOVERY',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=900&auto=format&fit=crop',
    icon: 'sparkles' 
  }
];

function initEquipmentViewer() {
  const equipContainer = document.getElementById('equipment-grid-container');
  if (!equipContainer) return;

  equipContainer.innerHTML = equipmentList.map(item => `
    <div class="interactive-card glass-panel rounded-2xl overflow-hidden border border-zinc-800 hover:border-[#CCFF00]/50 transition-all flex flex-col justify-between group">
      <!-- Hardware Photo Cover -->
      <div class="h-44 sm:h-48 relative overflow-hidden bg-zinc-950">
        <img 
          src="${item.image}" 
          alt="${item.name}" 
          loading="lazy"
          class="w-full h-full object-cover filter brightness-[0.75] contrast-[1.15] group-hover:scale-105 group-hover:brightness-90 transition-all duration-500"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0E0E14] via-[#0E0E14]/30 to-transparent"></div>
        
        <!-- Hardware Zone Badge -->
        <span class="absolute top-3 left-3 px-2.5 py-0.5 rounded bg-black/85 backdrop-blur-md border border-[#CCFF00]/40 text-[#CCFF00] font-mono text-[9px] font-bold uppercase tracking-wider">
          ${item.tag}
        </span>

        <!-- Icon Corner -->
        <div class="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-zinc-700 flex items-center justify-center text-white group-hover:text-[#CCFF00] transition-colors">
          <i data-lucide="${item.icon}" class="w-3.5 h-3.5"></i>
        </div>
      </div>

      <!-- Card Info -->
      <div class="p-5 flex flex-col justify-between flex-1">
        <div>
          <span class="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-1">${item.zone}</span>
          <h5 class="text-white font-display font-bold text-sm sm:text-base uppercase tracking-wide group-hover:text-[#CCFF00] transition-colors leading-snug">
            ${item.name}
          </h5>
          <p class="text-zinc-400 text-xs mt-2 font-mono leading-relaxed">
            ${item.spec}
          </p>
        </div>

        <div class="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
          <span class="text-zinc-500 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"></span>
            Calibrated 2026
          </span>
          <span class="text-zinc-300 font-bold group-hover:text-[#CCFF00] transition-colors flex items-center gap-1">
            Inspect Hardware <span>→</span>
          </span>
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* =========================================================
   10. MODAL WINDOWS
   ========================================================= */
function initModals() {
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = btn.getAttribute('data-open-modal');
      openModal(modalId);
      if (soundEnabled) playHeavyThud();
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal);
      if (soundEnabled) playClickSound();
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m));
    }
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (modalId === 'tour-modal') {
      const video = document.getElementById('tour-video');
      const bigPlayBtn = document.getElementById('tour-big-play');
      const playIcon = document.getElementById('tour-play-icon');

      if (video) {
        video.muted = true;
        video.playsInline = true;
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            if (bigPlayBtn) bigPlayBtn.classList.add('opacity-0', 'pointer-events-none');
            if (playIcon) playIcon.setAttribute('data-lucide', 'pause');
            if (window.lucide) lucide.createIcons();
          }).catch(err => {
            console.log('Mobile video autoplay deferred:', err);
            if (bigPlayBtn) bigPlayBtn.classList.remove('opacity-0', 'pointer-events-none');
            if (playIcon) playIcon.setAttribute('data-lucide', 'play');
            if (window.lucide) lucide.createIcons();
          });
        }
      }
    }
  }
}

function closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
  const video = modal.querySelector('video');
  if (video) {
    video.pause();
  }
  const bigPlayBtn = modal.querySelector('#tour-big-play');
  if (bigPlayBtn) {
    bigPlayBtn.classList.remove('opacity-0', 'pointer-events-none');
  }
}

/* =========================================================
   10B. REALISTIC FACILITY TOUR VIDEO CONTROLLER (INDIAN CONTEXT)
   ========================================================= */
function initTourVideoPlayer() {
  const video = document.getElementById('tour-video');
  const bigPlayBtn = document.getElementById('tour-big-play');
  const playToggle = document.getElementById('tour-play-toggle');
  const playIcon = document.getElementById('tour-play-icon');
  const progressBar = document.getElementById('tour-progress-bar');
  const progressFill = document.getElementById('tour-progress-fill');
  const muteToggle = document.getElementById('tour-mute-toggle');
  const muteIcon = document.getElementById('tour-mute-icon');
  const fullscreenBtn = document.getElementById('tour-fullscreen-btn');

  if (!video) return;

  function updatePlayState(playing) {
    if (playIcon) {
      playIcon.setAttribute('data-lucide', playing ? 'pause' : 'play');
    }
    if (bigPlayBtn) {
      if (playing) {
        bigPlayBtn.classList.add('opacity-0', 'pointer-events-none');
      } else {
        bigPlayBtn.classList.remove('opacity-0', 'pointer-events-none');
      }
    }
    if (window.lucide) lucide.createIcons();
  }

  video.addEventListener('play', () => updatePlayState(true));
  video.addEventListener('pause', () => updatePlayState(false));

  video.addEventListener('click', () => {
    if (video.paused) {
      video.muted = true;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      if (progressFill) progressFill.style.width = `${pct}%`;
    }
  });

  if (bigPlayBtn) {
    bigPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = true;
      video.play().then(() => updatePlayState(true)).catch(() => {});
      if (typeof playClickSound === 'function' && soundEnabled) playClickSound();
    });
  }

  if (playToggle) {
    playToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.paused) {
        video.muted = true;
        video.play().then(() => updatePlayState(true)).catch(() => {});
      } else {
        video.pause();
        updatePlayState(false);
      }
      if (typeof playClickSound === 'function' && soundEnabled) playClickSound();
    });
  }

  if (muteToggle) {
    muteToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      if (muteIcon) {
        muteIcon.setAttribute('data-lucide', video.muted ? 'volume-x' : 'volume-2');
      }
      if (window.lucide) lucide.createIcons();
      if (typeof playClickSound === 'function' && soundEnabled) playClickSound();
    });
  }

  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      if (!video.duration) return;
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      video.currentTime = ratio * video.duration;
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      const container = document.getElementById('tour-video-container') || video.parentElement;
      if (container) {
        if (!document.fullscreenElement) {
          if (container.requestFullscreen) container.requestFullscreen();
          else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
      }
    });
  }

  // Also initialize on-page video player
  initOnPageTourPlayer();
}

function initOnPageTourPlayer() {
  const pageVideo = document.getElementById('page-tour-video');
  const pagePlayToggle = document.getElementById('page-tour-play-toggle');
  const pagePlayIcon = document.getElementById('page-tour-play-icon');
  const pageProgressBar = document.getElementById('page-tour-progress-bar');
  const pageProgressFill = document.getElementById('page-tour-progress-fill');
  const pageMuteToggle = document.getElementById('page-tour-mute-toggle');
  const pageMuteIcon = document.getElementById('page-tour-mute-icon');

  if (!pageVideo) return;

  pageVideo.muted = true;
  pageVideo.play().catch(() => {});

  pageVideo.addEventListener('timeupdate', () => {
    if (pageVideo.duration) {
      const pct = (pageVideo.currentTime / pageVideo.duration) * 100;
      if (pageProgressFill) pageProgressFill.style.width = `${pct}%`;
    }
  });

  pageVideo.addEventListener('play', () => {
    if (pagePlayIcon) pagePlayIcon.setAttribute('data-lucide', 'pause');
    if (window.lucide) lucide.createIcons();
  });

  pageVideo.addEventListener('pause', () => {
    if (pagePlayIcon) pagePlayIcon.setAttribute('data-lucide', 'play');
    if (window.lucide) lucide.createIcons();
  });

  if (pagePlayToggle) {
    pagePlayToggle.addEventListener('click', () => {
      if (pageVideo.paused) {
        pageVideo.play().catch(() => {});
      } else {
        pageVideo.pause();
      }
      if (typeof playClickSound === 'function' && soundEnabled) playClickSound();
    });
  }

  if (pageMuteToggle) {
    pageMuteToggle.addEventListener('click', () => {
      pageVideo.muted = !pageVideo.muted;
      if (pageMuteIcon) {
        pageMuteIcon.setAttribute('data-lucide', pageVideo.muted ? 'volume-x' : 'volume-2');
      }
      if (window.lucide) lucide.createIcons();
      if (typeof playClickSound === 'function' && soundEnabled) playClickSound();
    });
  }

  if (pageProgressBar) {
    pageProgressBar.addEventListener('click', (e) => {
      if (!pageVideo.duration) return;
      const rect = pageProgressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      pageVideo.currentTime = ratio * pageVideo.duration;
    });
  }
}
}

/* =========================================================
   11. LEAD CAPTURE & DIGITAL VIP PASS TICKET GENERATOR
   ========================================================= */
function initLeadForm() {
  const leadForm = document.getElementById('free-pass-form');
  const modalLeadForm = document.getElementById('modal-free-pass-form');

  function handleFormSubmit(e, form) {
    e.preventDefault();
    const nameInput = form.querySelector('input[name="name"]');
    const phoneInput = form.querySelector('input[name="phone"]');
    const timeSlot = form.querySelector('select[name="slot"]');
    const goalInput = form.querySelector('input[name="goal"]') || form.querySelector('select[name="goal"]');

    const name = nameInput ? nameInput.value.trim() : 'Athlete';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const slot = timeSlot ? timeSlot.value : 'Evening (6 PM - 9 PM)';
    const goal = goalInput ? goalInput.value : 'Hypertrophy & Strength';

    if (!phone || phone.length < 9) {
      showToast('⚠️ Please enter a valid 10-digit WhatsApp number');
      if (soundEnabled) playClickSound();
      return;
    }

    playAnvilClang();
    setTimeout(playSuccessFanfare, 200);

    const randomSerial = 'TF-2026-' + Math.floor(1000 + Math.random() * 9000);
    const gymWhatsAppNumber = '919876543210';
    const message = encodeURIComponent(
      `🔥 *TITAN FORGE GYM - VIP 1-DAY PASS RESERVATION*\n\n` +
      `🎫 *Pass ID:* ${randomSerial}\n` +
      `👤 *Athlete:* ${name}\n` +
      `📞 *Phone:* ${phone}\n` +
      `⏰ *Preferred Slot:* ${slot}\n` +
      `🎯 *Focus Discipline:* ${goal}\n\n` +
      `_I am claiming my free VIP 1-Day Trial Pass at Titan Forge Gym. Please confirm my guest slot!_`
    );
    const whatsappUrl = `https://wa.me/${gymWhatsAppNumber}?text=${message}`;

    // Render Digital Ticket Pass
    form.innerHTML = `
      <div class="p-6 bg-[#0E0E14] border-2 border-[#CCFF00] rounded-2xl relative overflow-hidden shadow-[0_0_35px_rgba(204,255,0,0.25)]">
        <div class="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div class="flex items-center gap-2">
            <span class="text-[#CCFF00] font-black text-xl">⚡</span>
            <span class="font-display font-black text-lg text-white">TITAN FORGE // VIP PASS</span>
          </div>
          <span class="px-2.5 py-1 bg-[#CCFF00]/15 text-[#CCFF00] text-[10px] font-mono font-bold rounded">VALID 24H</span>
        </div>

        <div class="py-5 grid grid-cols-2 gap-4 text-left">
          <div>
            <span class="text-[10px] font-mono text-zinc-500 uppercase block">ATHLETE NAME</span>
            <span class="font-display font-extrabold text-lg text-white block">${name}</span>
          </div>
          <div>
            <span class="text-[10px] font-mono text-zinc-500 uppercase block">PASS SERIAL</span>
            <span class="font-mono font-bold text-sm text-[#CCFF00] block">${randomSerial}</span>
          </div>
          <div>
            <span class="text-[10px] font-mono text-zinc-500 uppercase block">TIME WINDOW</span>
            <span class="text-xs font-semibold text-zinc-300 block">${slot}</span>
          </div>
          <div>
            <span class="text-[10px] font-mono text-zinc-500 uppercase block">STATUS</span>
            <span class="text-xs font-bold text-emerald-400 block">● READY TO SCAN</span>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row gap-3">
          <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn-shine flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
            Send Pass to WhatsApp
          </a>
          <button type="button" onclick="window.print()" class="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-colors border border-zinc-700">
            Print Ticket
          </button>
        </div>
      </div>
    `;

    showToast(`🔥 Pass Generated: ${randomSerial}`);
  }

  if (leadForm) {
    leadForm.addEventListener('submit', (e) => handleFormSubmit(e, leadForm));
  }
  if (modalLeadForm) {
    modalLeadForm.addEventListener('submit', (e) => handleFormSubmit(e, modalLeadForm));
  }
}

/* =========================================================
   12. MOBILE NAVIGATION & DRAWER
   ========================================================= */
function initMobileNav() {
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawerBtn = document.getElementById('close-mobile-drawer');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  function setDrawerOpen(isOpen) {
    if (!mobileDrawer) return;
    if (isOpen) {
      mobileDrawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      if (mobileToggle) {
        mobileToggle.innerHTML = '<i data-lucide="x" class="w-5 h-5"></i>';
        if (window.lucide) lucide.createIcons();
      }
    } else {
      mobileDrawer.classList.add('hidden');
      document.body.style.overflow = '';
      if (mobileToggle) {
        mobileToggle.innerHTML = '<i data-lucide="menu" class="w-5 h-5"></i>';
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = mobileDrawer.classList.contains('hidden');
      setDrawerOpen(isHidden);
      if (soundEnabled) playClickSound();
    });

    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setDrawerOpen(false);
        if (soundEnabled) playClickSound();
      });
    }

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const modalTarget = link.getAttribute('data-open-modal');
        setDrawerOpen(false);
        if (modalTarget) {
          e.preventDefault();
          setTimeout(() => {
            openModal(modalTarget);
          }, 100);
        }
      });
    });
  }
}

/* =========================================================
   13. INTERACTIVE SCHEDULE VIEWER
   ========================================================= */
const scheduleData = {
  all: [
    { time: '06:00 AM - 07:15 AM', name: 'Dawn Hypertrophy Squad', coach: 'Coach Vikramaditya (Head of Strength)', room: 'Heavy Iron Zone', spots: '3 slots left', type: 'strength' },
    { time: '07:30 AM - 08:30 AM', name: 'Metabolic Inferno HIIT', coach: 'Coach Ananya (Combat & Conditioning)', room: 'Turf Arena', spots: '5 slots left', type: 'hiit' },
    { time: '09:00 AM - 10:15 AM', name: 'Pro Boxing & Heavy Bag Striking', coach: 'Coach Ananya (National Champ)', room: 'Combat Octagon', spots: '2 slots left', type: 'combat' },
    { time: '05:00 PM - 06:15 PM', name: 'Deadlift & Squat Mechanics Lab', coach: 'Coach Vikramaditya', room: 'Power Racks', spots: '4 slots left', type: 'strength' },
    { time: '06:30 PM - 07:30 PM', name: 'Titan Savage Conditioning', coach: 'Coach Ananya Deshmukh', room: 'Turf Arena', spots: 'FULL (Waitlist)', type: 'hiit' },
    { time: '08:00 PM - 09:00 PM', name: 'Myofascial Release & Cryo Reset', coach: 'Dr. Rhea Sen (Sports Biomechanics)', room: 'Recovery Spa', spots: '6 slots left', type: 'mobility' }
  ]
};

function initScheduleViewer() {
  const scheduleContainer = document.getElementById('schedule-list-container');
  const filterButtons = document.querySelectorAll('.schedule-filter-btn');

  function renderSchedule(filter) {
    if (!scheduleContainer) return;

    const filtered = filter === 'all' 
      ? scheduleData.all 
      : scheduleData.all.filter(item => item.type === filter);

    scheduleContainer.innerHTML = filtered.map(item => `
      <div class="glass-panel p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-800/80 hover:border-[#CCFF00]/40 transition-all group">
        <div class="flex items-center gap-4">
          <div class="px-3 py-2 bg-black border border-zinc-800 rounded-lg text-xs font-mono text-[#CCFF00] shrink-0">
            ${item.time}
          </div>
          <div>
            <h5 class="text-white font-bold font-display uppercase tracking-wide group-hover:text-[#CCFF00] transition-colors">
              ${item.name}
            </h5>
            <p class="text-zinc-400 text-xs mt-0.5">
              ${item.coach} • <span class="text-zinc-300 font-medium">${item.room}</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span class="text-xs px-2.5 py-1 rounded font-semibold ${item.spots.includes('FULL') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#CCFF00]/10 text-[#CCFF00] border border-[#CCFF00]/20'}">
            ${item.spots}
          </span>
          <button data-open-modal="lead-modal" class="px-4 py-2 bg-zinc-800 hover:bg-[#CCFF00] hover:text-black text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">
            Book Spot
          </button>
        </div>
      </div>
    `).join('');

    scheduleContainer.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        openModal('lead-modal');
        if (soundEnabled) playHeavyThud();
      });
    });
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('bg-[#CCFF00]', 'text-black');
        b.classList.add('bg-zinc-900', 'text-zinc-400');
      });
      btn.classList.add('bg-[#CCFF00]', 'text-black');
      btn.classList.remove('bg-zinc-900', 'text-zinc-400');
      const filter = btn.getAttribute('data-filter');
      renderSchedule(filter);
      if (soundEnabled) playClickSound();
    });
  });

  renderSchedule('all');
}

/* =========================================================
   14. TOAST NOTIFICATION UTILITY
   ========================================================= */
function showToast(message) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto glass-panel px-5 py-3 rounded-xl border border-[#CCFF00]/40 text-white text-sm font-semibold shadow-2xl flex items-center gap-3 transform translate-y-4 opacity-0 transition-all duration-300';
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
