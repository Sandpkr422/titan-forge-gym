/* =========================================================
   TEMPLATE RENDERER (DYNAMIC HYDRATION & LIVE PREVIEW ENGINE)
   Binds centralized gymConfig to the existing DOM structure,
   preserves all animations and visual design, and listens
   for real-time postMessage sync from the Admin Dashboard.
   ========================================================= */

(function(window) {
  'use strict';

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(204, 255, 0, ${alpha})`;
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const TemplateRenderer = {
    currentConfig: null,
    studioMapInstance: null,
    studioMapMarker: null,
    lastGeocodedQuery: '',

    /**
     * Initializes template hydration on page load
     */
    async init() {
      const activeId = window.GymStore ? window.GymStore.getActiveGymId() : 'titan-forge';
      let config = null;
      if (window.GymStore && typeof window.GymStore.loadGym === 'function') {
        config = await window.GymStore.loadGym(activeId);
      } else if (window.GymStore) {
        config = window.GymStore.getGym(activeId);
      }
      if (!config) config = window.DEFAULT_GYM_DATA;

      this.currentConfig = config;
      window.CURRENT_GYM_CONFIG = config;

      this.renderGym(config);

      // Listen for postMessage from admin iframe
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'GYM_CONFIG_UPDATE') {
          this.currentConfig = event.data.config;
          window.CURRENT_GYM_CONFIG = event.data.config;
          this.renderGym(event.data.config);
        }
      });

      // Listen for local custom storage events
      window.addEventListener('gymConfigChanged', (e) => {
        if (e.detail && e.detail.id === this.currentConfig?.id) {
          this.currentConfig = e.detail;
          window.CURRENT_GYM_CONFIG = e.detail;
          this.renderGym(e.detail);
        }
      });
    },

    /**
     * Full DOM hydration from gym configuration
     */
    renderGym(config) {
      if (!config) return;

      // 1. Page Head, Title & Meta
      this.renderHead(config);

      // 2. Dynamic Theme Colors & CSS Variables
      this.renderBranding(config);

      // 3. Navigation & Header
      this.renderHeader(config);

      // 4. Hero Section
      this.renderHero(config);

      // 5. Statistics Counters
      this.renderStats(config);

      // 6. Programs / Disciplines Bento Grid
      this.renderPrograms(config);

      // 7. Tour Video
      this.renderTourVideo(config);

      // 8. Pricing / Membership Tiers
      this.renderPricing(config);

      // 9. Transformations & Testimonials
      this.renderTestimonials(config);

      // 10. Trainers & Coaches
      this.renderTrainers(config);

      // 11. Lead Capture, VIP Pass & Footer
      this.renderContactFooter(config);

      // Refresh Lucide icons for dynamically added elements
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    },

    renderHead(config) {
      const name = config.basicInfo?.name || 'TITAN FORGE GYM';
      const tagline = config.basicInfo?.tagline || 'Elite High-Performance Athletic Club';
      document.title = `${name} // ${tagline}`;

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && config.basicInfo?.description) {
        metaDesc.setAttribute('content', config.basicInfo.description);
      }

      if (config.branding?.favicon) {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = config.branding.favicon;
      }
    },

    renderBranding(config) {
      const root = document.documentElement;
      const primary = config.branding?.primaryColor || '#CCFF00';
      const secondary = config.branding?.secondaryColor || '#FF3344';

      root.style.setProperty('--neon-volt', primary);
      root.style.setProperty('--neon-volt-glow', hexToRgba(primary, 0.45));
      root.style.setProperty('--neon-volt-soft', hexToRgba(primary, 0.12));

      root.style.setProperty('--electric-crimson', secondary);
      root.style.setProperty('--crimson-glow', hexToRgba(secondary, 0.45));
      root.style.setProperty('--crimson-soft', hexToRgba(secondary, 0.12));

      // Inject custom dynamic style overrides for brand accent if needed
      let dynamicStyleTag = document.getElementById('dynamic-brand-styles');
      if (!dynamicStyleTag) {
        dynamicStyleTag = document.createElement('style');
        dynamicStyleTag.id = 'dynamic-brand-styles';
        document.head.appendChild(dynamicStyleTag);
      }
      dynamicStyleTag.innerHTML = `
        .text-glow-volt {
          text-shadow: 0 0 16px ${hexToRgba(primary, 0.65)}, 0 0 35px ${hexToRgba(primary, 0.35)};
        }
        .box-glow-volt {
          box-shadow: 0 0 30px ${hexToRgba(primary, 0.35)}, inset 0 0 15px ${hexToRgba(primary, 0.1)};
        }
        ::selection {
          background: ${primary} !important;
          color: #000000 !important;
        }
      `;
    },

    renderHeader(config) {
      const basic = config.basicInfo || {};
      const branding = config.branding || {};

      // Logo rendering: custom image logo or text logo
      const logoContainers = document.querySelectorAll('[data-brand-logo]');
      logoContainers.forEach(container => {
        if (branding.logoImage) {
          container.innerHTML = `<img src="${branding.logoImage}" alt="${basic.name}" class="h-9 sm:h-10 w-auto object-contain" />`;
        } else {
          const mainText = branding.logoText || basic.shortName || 'TITAN FORGE';
          const subText = branding.logoSubtext || 'GYM';
          container.innerHTML = `
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center text-black font-black text-sm shadow-[0_0_15px_rgba(204,255,0,0.4)]" style="background-color: ${branding.primaryColor || '#CCFF00'}">
                <i data-lucide="dumbbell" class="w-4 h-4"></i>
              </div>
              <div class="flex flex-col text-left">
                <span class="font-display font-extrabold text-sm sm:text-base uppercase tracking-tight text-white leading-none">
                  ${mainText}
                </span>
                <span class="font-mono text-[9px] uppercase tracking-[0.25em] text-[#CCFF00] font-bold leading-tight" style="color: ${branding.primaryColor || '#CCFF00'}">
                  ${subText}
                </span>
              </div>
            </div>
          `;
        }
      });

      // Address micro bar in header
      const headerAddressEl = document.getElementById('header-address-text');
      if (headerAddressEl) {
        headerAddressEl.textContent = basic.city ? `${basic.city}` : (basic.address || 'Linking Rd, Bandra West');
      }

      const headerHoursEl = document.getElementById('header-hours-text');
      if (headerHoursEl) {
        headerHoursEl.textContent = basic.openHours || 'Open 24/7/365';
      }

      // Mobile drawer city title
      const mobileDrawerCityEl = document.getElementById('mobile-drawer-city-title');
      if (mobileDrawerCityEl) {
        mobileDrawerCityEl.textContent = `${(basic.city || basic.name || 'FACILITY').toUpperCase()} NAVIGATION`;
      }

      // Hero tour city badge
      const heroTourCityBadge = document.getElementById('hero-tour-city-badge');
      if (heroTourCityBadge) {
        heroTourCityBadge.textContent = (basic.city || 'TOUR').toUpperCase();
      }

      // WhatsApp buttons in header
      const waUrl = window.GymStore ? window.GymStore.buildWhatsAppUrl(basic.whatsapp, basic.name, config.contact?.whatsappPrompt) : '#';
      document.querySelectorAll('[data-whatsapp-cta]').forEach(btn => {
        btn.setAttribute('href', waUrl);
      });

      // Phone call buttons
      const phoneUrl = window.GymStore ? window.GymStore.buildPhoneUrl(basic.phone) : '#';
      document.querySelectorAll('[data-phone-cta]').forEach(btn => {
        btn.setAttribute('href', phoneUrl);
      });
    },

    renderHero(config) {
      const hero = config.hero || {};
      const basic = config.basicInfo || {};

      // Badge
      const badgeEl = document.getElementById('hero-cyber-badge');
      if (badgeEl) {
        badgeEl.textContent = hero.badge || basic.tagline || 'PERFORMANCE TEMPLE | OLYMPIC RATED';
      }

      // Heading line 1 & 2
      const headingEl = document.getElementById('hero-heading-content');
      if (headingEl) {
        headingEl.innerHTML = `
          ${hero.headingLine1 || 'TRANSFORM YOUR REALITY.'}<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-[#CCFF00]" style="--tw-gradient-to: ${config.branding?.primaryColor || '#CCFF00'}">
            ${hero.headingLine2 || 'UNLEASH THE BEAST.'}
          </span>
        `;
      }

      // Subheading
      const subheadEl = document.getElementById('hero-subheading');
      if (subheadEl) {
        subheadEl.textContent = hero.subheading || basic.description || '';
      }

      // Primary CTA
      const primaryCta = document.getElementById('hero-primary-cta');
      if (primaryCta) {
        primaryCta.innerHTML = `<i data-lucide="zap" class="w-4 h-4 fill-current"></i> ${hero.primaryCtaText || 'Start Your Free Trial'}`;
        primaryCta.setAttribute('href', hero.primaryCtaLink || '#lead-capture');
      }

      // Secondary CTA
      const secondaryCta = document.getElementById('hero-secondary-cta-text');
      if (secondaryCta) {
        secondaryCta.textContent = hero.secondaryCtaText || 'Watch Facility Tour';
      }

      // Hero background image
      const heroImg = document.getElementById('hero-bg-image');
      if (heroImg && hero.heroImage) {
        heroImg.src = hero.heroImage;
      }

      // Trust Badges
      const trustContainer = document.getElementById('hero-trust-badges');
      if (trustContainer && Array.isArray(hero.trustBadges)) {
        trustContainer.innerHTML = hero.trustBadges.map(b => `
          <span class="flex items-center gap-1.5">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-[#CCFF00]" style="color: ${config.branding?.primaryColor || '#CCFF00'}"></i> ${b}
          </span>
        `).join('');
      }
    },

    renderStats(config) {
      const statsContainer = document.getElementById('hero-stats-row-container');
      if (!statsContainer || !Array.isArray(config.stats)) return;

      statsContainer.innerHTML = config.stats.map((s, idx) => `
        <div class="flex flex-col items-center justify-center px-3 ${idx > 0 ? 'pt-3 md:pt-0' : 'pt-2 md:pt-0'}">
          <span class="stat-counter font-display font-black text-2xl sm:text-3xl tracking-tight text-[#CCFF00]" 
                style="color: ${idx === 0 ? (config.branding?.primaryColor || '#CCFF00') : '#FFFFFF'}" 
                data-target="${s.target}" 
                data-suffix="${s.suffix || ''}">
            ${s.value || (s.target + (s.suffix || ''))}
          </span>
          <span class="text-[11px] uppercase font-bold tracking-wider text-zinc-300 mt-1">${s.label}</span>
          <span class="text-[10px] text-zinc-500 font-mono mt-0.5">${s.sublabel || ''}</span>
        </div>
      `).join('');
    },

    renderPrograms(config) {
      const container = document.getElementById('programs-cards-container');
      if (!container || !Array.isArray(config.programs)) return;

      container.innerHTML = config.programs.map((prog, i) => {
        const colSpan = (i === 0 || i === 1) ? 'md:col-span-6' : 'md:col-span-4';
        const minHeight = (i === 0 || i === 1) ? 'min-h-[290px]' : 'min-h-[260px]';
        const num = prog.number || String(i + 1).padStart(2, '0');
        const tags = Array.isArray(prog.tags) ? prog.tags : [];

        return `
          <div class="${colSpan} interactive-card glass-card rounded-2xl p-6 sm:p-7 border border-zinc-800/80 relative overflow-hidden group">
            <div class="absolute inset-0 z-0">
              <img 
                src="${prog.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop'}" 
                alt="${prog.name}" 
                class="w-full h-full object-cover filter brightness-[0.22] group-hover:scale-105 transition-transform duration-700"
                onerror="this.src='https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop'"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/80 to-transparent"></div>
            </div>

            <div class="relative z-10 h-full flex flex-col justify-between ${minHeight}">
              <div class="flex items-start justify-between">
                <span class="px-2.5 py-1 bg-[#CCFF00]/15 text-[#CCFF00] border border-[#CCFF00]/30 rounded font-mono text-[10px] font-bold uppercase tracking-wider" style="color: ${config.branding?.primaryColor || '#CCFF00'}; border-color: ${hexToRgba(config.branding?.primaryColor || '#CCFF00', 0.3)}">
                  Discipline ${num}
                </span>
                <div class="w-8 h-8 rounded-full bg-black/60 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
                  <i data-lucide="zap" class="w-4 h-4 text-[#CCFF00]" style="color: ${config.branding?.primaryColor || '#CCFF00'}"></i>
                </div>
              </div>

              <div class="mt-6">
                <h3 class="font-display font-bold text-base sm:text-lg uppercase tracking-wide text-white group-hover:text-[#CCFF00] transition-colors">
                  ${prog.name}
                </h3>
                <p class="text-zinc-300 text-xs mt-2 leading-relaxed">
                  ${prog.shortDesc}
                </p>
                <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                  ${tags.map(t => `<span class="px-2 py-0.5 bg-black/80 border border-zinc-800 rounded text-zinc-300">${t}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderTourVideo(config) {
      const tour = config.tourVideo || {};
      const basic = config.basicInfo || {};
      const poster = tour.posterUrl || 'assets/images/tour_indian_female_workout.jpg';
      const videoSrc = tour.videoUrl || 'assets/videos/female_gym_workout.mp4';
      const cdnSrc = tour.videoCdnUrl || 'https://assets.mixkit.co/videos/52106/52106-720.mp4';

      // Tour section heading subtitle
      const tourSubtitle = document.getElementById('tour-section-subtitle');
      if (tourSubtitle) {
        tourSubtitle.textContent = `// ${(basic.city || basic.name || 'FLAGSHIP').toUpperCase()} FACILITY`;
      }

      // Modal tour title
      const modalTourTitle = document.getElementById('modal-tour-title');
      if (modalTourTitle) {
        modalTourTitle.textContent = `${basic.name || 'GYM'} // ${(basic.city || 'FACILITY').toUpperCase()} TOUR`;
      }

      const pageVideo = document.getElementById('page-tour-video');
      if (pageVideo) {
        pageVideo.poster = poster;
        const sources = pageVideo.querySelectorAll('source');
        if (sources.length > 0) sources[0].src = videoSrc;
        if (sources.length > 1) sources[1].src = cdnSrc;
      }

      const modalVideo = document.getElementById('tour-video');
      if (modalVideo) {
        modalVideo.poster = poster;
        const sources = modalVideo.querySelectorAll('source');
        if (sources.length > 0) sources[0].src = videoSrc;
        if (sources.length > 1) sources[1].src = cdnSrc;
      }
    },

    renderPricing(config) {
      const container = document.getElementById('pricing-cards-container');
      if (!container || !Array.isArray(config.membershipPlans)) return;

      container.innerHTML = config.membershipPlans.map((plan) => {
        const isPopular = Boolean(plan.popular);
        const features = Array.isArray(plan.features) ? plan.features : [];

        return `
          <div class="interactive-card glass-card rounded-2xl p-6 sm:p-7 border relative flex flex-col justify-between group ${isPopular ? 'border-[#CCFF00] shadow-[0_0_35px_rgba(204,255,0,0.18)]' : 'border-zinc-800/80 hover:border-zinc-700'}">
            ${isPopular ? `
              <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#CCFF00] text-black font-mono font-black text-[10px] uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(204,255,0,0.5)] flex items-center gap-1" style="background-color: ${config.branding?.primaryColor || '#CCFF00'}">
                <i data-lucide="flame" class="w-3 h-3 fill-current"></i> ${plan.badge || 'MOST POPULAR'}
              </div>
            ` : `
              ${plan.badge ? `<div class="inline-block px-2.5 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-mono rounded w-fit mb-3">${plan.badge}</div>` : ''}
            `}

            <div>
              <div class="flex items-baseline justify-between mb-2">
                <h3 class="font-display font-extrabold text-lg sm:text-xl uppercase tracking-tight text-white ${isPopular ? 'text-[#CCFF00]' : ''}">
                  ${plan.name}
                </h3>
              </div>
              <p class="text-zinc-400 text-xs mb-5">${plan.tagline || ''}</p>

              <div class="flex items-baseline gap-1 mb-6 pb-6 border-b border-zinc-800/80">
                <span class="text-xs text-zinc-400 font-mono">₹</span>
                <span class="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">${plan.price}</span>
                <span class="text-zinc-500 font-mono text-[11px]">/${plan.period || 'month'}</span>
              </div>

              <ul class="space-y-3 mb-8">
                ${features.map(f => `
                  <li class="flex items-start gap-2.5 text-xs text-zinc-300">
                    <i data-lucide="check" class="w-4 h-4 text-[#CCFF00] shrink-0 mt-0.5" style="color: ${config.branding?.primaryColor || '#CCFF00'}"></i>
                    <span>${f}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

            <a href="${plan.ctaLink || '#lead-capture'}" class="btn-shine w-full py-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-center transition-all ${isPopular ? 'bg-[#CCFF00] text-black hover:bg-[#b5e600] shadow-[0_0_20px_rgba(204,255,0,0.3)]' : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'}" style="${isPopular ? `background-color: ${config.branding?.primaryColor || '#CCFF00'}; color: #000;` : ''}">
              ${plan.ctaText || 'Select Tier'}
            </a>
          </div>
        `;
      }).join('');
    },

    renderTestimonials(config) {
      const container = document.getElementById('testimonials-cards-container');
      if (!container || !Array.isArray(config.testimonials)) return;

      container.innerHTML = config.testimonials.map(t => `
        <div class="interactive-card glass-card rounded-2xl p-6 border border-zinc-800/80 flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <img 
                src="${t.photo || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop'}" 
                alt="${t.name}" 
                class="w-12 h-12 rounded-full object-cover border border-zinc-700"
                onerror="this.src='https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop'"
              />
              <div>
                <h4 class="font-display font-bold text-sm text-white">${t.name}</h4>
                <p class="text-[11px] text-zinc-400">${t.role || 'Member'}</p>
                ${t.result ? `<span class="inline-block mt-0.5 px-2 py-0.5 bg-[#CCFF00]/10 text-[#CCFF00] rounded font-mono text-[9px] font-bold" style="color: ${config.branding?.primaryColor || '#CCFF00'}">${t.result}</span>` : ''}
              </div>
            </div>
            <p class="text-xs text-zinc-300 italic leading-relaxed">
              "${t.text}"
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500 text-[11px] font-mono">
            <span>Verified Athlete</span>
            <div class="flex text-amber-400">
              ${Array(t.rating || 5).fill('<i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>').join('')}
            </div>
          </div>
        </div>
      `).join('');
    },

    renderTrainers(config) {
      const container = document.getElementById('trainers-cards-container');
      if (!container || !Array.isArray(config.trainers)) return;

      container.innerHTML = config.trainers.map(tr => `
        <div class="interactive-card glass-card rounded-2xl overflow-hidden border border-zinc-800/80 group">
          <div class="relative aspect-[3/4] overflow-hidden">
            <img 
              src="${tr.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop'}" 
              alt="${tr.name}" 
              class="w-full h-full object-cover filter brightness-[0.88] group-hover:scale-105 transition-transform duration-700"
              onerror="this.src='https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop'"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/50 to-transparent"></div>
            ${tr.experience ? `
              <span class="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-zinc-700 text-[#CCFF00] font-mono text-[10px] font-bold" style="color: ${config.branding?.primaryColor || '#CCFF00'}">
                ${tr.experience}
              </span>
            ` : ''}
          </div>

          <div class="p-5 relative z-10 -mt-10 bg-gradient-to-t from-[#0E0E12] to-transparent">
            <span class="text-[10px] font-mono uppercase tracking-wider text-[#CCFF00] font-bold block mb-1" style="color: ${config.branding?.primaryColor || '#CCFF00'}">
              ${tr.role || 'Elite Coach'}
            </span>
            <h3 class="font-display font-extrabold text-base text-white uppercase tracking-tight mb-2">
              ${tr.name}
            </h3>
            <p class="text-xs text-zinc-400 mb-3 line-clamp-2">
              ${tr.bio || tr.specialization || ''}
            </p>
            ${tr.awards ? `
              <div class="pt-3 border-t border-zinc-800 flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                <i data-lucide="award" class="w-3.5 h-3.5 text-[#CCFF00]" style="color: ${config.branding?.primaryColor || '#CCFF00'}"></i>
                <span>${tr.awards}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('');
    },

    renderContactFooter(config) {
      const basic = config.basicInfo || {};
      const contact = config.contact || {};
      const socials = config.socialLinks || {};
      const branding = config.branding || {};
      const primaryColor = branding.primaryColor || '#CCFF00';

      // 1. Gym name in footer & contact
      const footerGymNames = document.querySelectorAll('[data-gym-name]');
      footerGymNames.forEach(el => {
        el.textContent = basic.name || 'TITAN FORGE GYM';
      });

      // 2. Footer Brand Logo: custom image or dynamic theme mark + name
      const footerLogoEl = document.getElementById('footer-brand-logo');
      if (footerLogoEl) {
        if (branding.logoImage) {
          footerLogoEl.innerHTML = `<img src="${branding.logoImage}" alt="${basic.name || 'Gym'}" class="h-9 sm:h-10 w-auto max-w-[180px] object-contain" />`;
        } else {
          const mainText = branding.logoText || basic.shortName || basic.name || 'TITAN FORGE';
          const subText = branding.logoSubtext || 'GYM';
          footerLogoEl.innerHTML = `
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-black font-black text-sm shadow-[0_0_15px_rgba(204,255,0,0.4)] shrink-0" style="background-color: ${primaryColor}">
                <i data-lucide="dumbbell" class="w-4 h-4"></i>
              </div>
              <div class="flex flex-col text-left">
                <span class="font-display font-bold text-lg sm:text-xl uppercase tracking-wider text-white leading-none">
                  ${mainText}
                </span>
                <span class="font-mono text-[9px] uppercase tracking-[0.25em] font-bold leading-tight mt-0.5" style="color: ${primaryColor}">
                  ${subText}
                </span>
              </div>
            </div>
          `;
        }
      }

      // Footer Tagline
      const footerTaglineEl = document.getElementById('footer-tagline');
      if (footerTaglineEl) {
        footerTaglineEl.textContent = basic.tagline || 'THE SANCTUARY OF UNCOMPROMISING RESULTS';
      }

      // Modal Brand Logo in VIP reservation modal
      const modalLogoEl = document.getElementById('modal-brand-logo');
      if (modalLogoEl) {
        if (branding.logoImage) {
          modalLogoEl.innerHTML = `<img src="${branding.logoImage}" alt="${basic.name || 'Gym'}" class="w-full h-full object-contain" />`;
          modalLogoEl.style.borderColor = hexToRgba(primaryColor, 0.4);
          modalLogoEl.style.backgroundColor = 'transparent';
        } else {
          modalLogoEl.innerHTML = `<i data-lucide="dumbbell" class="w-6 h-6 text-black"></i>`;
          modalLogoEl.style.backgroundColor = primaryColor;
          modalLogoEl.style.borderColor = primaryColor;
        }
      }

      // Contact headline
      const headlineEl = document.getElementById('contact-headline');
      if (headlineEl && contact.headline) headlineEl.textContent = contact.headline;

      const subheadEl = document.getElementById('contact-subheadline');
      if (subheadEl && contact.subheadline) subheadEl.textContent = contact.subheadline;

      // Full address
      const fullAddress = [basic.address, basic.city, basic.state].filter(Boolean).join(', ');
      const addressEl = document.getElementById('contact-full-address');
      if (addressEl) addressEl.textContent = fullAddress || (basic.address || 'Studio Location');

      // Studio Location Map Pin Badge
      const mapBadge = document.getElementById('contact-map-badge');
      if (mapBadge) {
        const pinLocation = basic.city ? (basic.city + (basic.state ? ', ' + basic.state : '')) : (basic.address || 'Studio Location');
        mapBadge.textContent = '📍 ' + pinLocation;
        mapBadge.style.color = primaryColor;
        mapBadge.style.borderColor = hexToRgba(primaryColor, 0.4);
      }

      // Operating hours
      const hoursEl = document.getElementById('contact-hours');
      if (hoursEl) hoursEl.textContent = basic.openHours || 'Open 24/7/365';

      // Phone
      const phoneEl = document.getElementById('contact-phone');
      if (phoneEl) phoneEl.textContent = basic.phone || '';

      // Email
      const emailEl = document.getElementById('contact-email');
      if (emailEl) emailEl.textContent = basic.email || '';

      // Map search query
      const mapQuery = fullAddress || [basic.address, basic.city].filter(Boolean).join(', ') || basic.name || 'Gym';

      // Google Maps Direct Link
      const mapsLink = document.getElementById('google-maps-btn');
      if (mapsLink) {
        if (basic.googleMapsUrl && !basic.googleMapsUrl.includes('Linking+Road') && !basic.googleMapsUrl.includes('Linking Road')) {
          mapsLink.href = basic.googleMapsUrl;
        } else if (mapQuery) {
          mapsLink.href = `https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`;
        } else {
          mapsLink.href = 'https://maps.google.com';
        }
      }

      // 3. Studio Location Interactive Dark Map
      this.renderStudioMap(config);

      // Social Links (hide if empty)
      const socialMap = [
        { id: 'social-instagram', url: socials.instagram },
        { id: 'social-whatsapp', url: socials.whatsapp || (window.GymStore ? window.GymStore.buildWhatsAppUrl(basic.whatsapp, basic.name) : '') },
        { id: 'social-youtube', url: socials.youtube },
        { id: 'social-facebook', url: socials.facebook }
      ];

      socialMap.forEach(item => {
        const link = document.getElementById(item.id);
        if (link) {
          if (item.url && item.url.trim() !== '') {
            link.href = item.url;
            link.classList.remove('hidden');
          } else {
            link.classList.add('hidden');
          }
        }
      });
    },

    /**
     * Renders high-performance dark interactive map with glowing neon pin
     */
    renderStudioMap(config) {
      const basic = config.basicInfo || {};
      const branding = config.branding || {};
      const primaryColor = branding.primaryColor || '#CCFF00';
      const mapContainer = document.getElementById('studio-leaflet-map');
      const mapsIframe = document.getElementById('google-maps-iframe');
      if (!mapContainer) return;

      // Check if user explicitly provided a custom Google Maps Embed URL that is not the default Mumbai PB
      const customEmbed = basic.googleMapsEmbedUrl && 
        !basic.googleMapsEmbedUrl.includes('19.07281358213038') && 
        !basic.googleMapsEmbedUrl.includes('19.065');

      if (customEmbed && mapsIframe) {
        mapsIframe.src = basic.googleMapsEmbedUrl;
        mapsIframe.classList.remove('hidden');
        mapContainer.classList.add('hidden');
        return;
      }

      // Default: show Leaflet interactive dark map
      if (mapsIframe) mapsIframe.classList.add('hidden');
      mapContainer.classList.remove('hidden');

      const addressParts = [basic.address, basic.city, basic.state].filter(Boolean);
      const fullAddress = addressParts.join(', ');
      const query = fullAddress || basic.city || basic.name || 'Mumbai';

      // Smart coordinates estimation based on Indian cities & regions
      let lat = 19.0728;
      let lon = 72.8335;
      const qLower = query.toLowerCase();
      if (qLower.includes('bihar')) {
        lat = 25.1938; lon = 85.5208;
      } else if (qLower.includes('bangalore') || qLower.includes('bengaluru')) {
        lat = 12.9716; lon = 77.5946;
      } else if (qLower.includes('delhi') || qLower.includes('ncr')) {
        lat = 28.6139; lon = 77.2090;
      } else if (qLower.includes('pune')) {
        lat = 18.5204; lon = 73.8567;
      } else if (qLower.includes('kolkata')) {
        lat = 22.5726; lon = 88.3639;
      } else if (qLower.includes('hyderabad')) {
        lat = 17.3850; lon = 78.4867;
      } else if (qLower.includes('chennai')) {
        lat = 13.0827; lon = 80.2707;
      } else if (qLower.includes('ahmedabad')) {
        lat = 23.0225; lon = 72.5714;
      } else if (qLower.includes('chandigarh')) {
        lat = 30.7333; lon = 76.7794;
      } else if (qLower.includes('jaipur')) {
        lat = 26.9124; lon = 75.7873;
      }

      const createNeonIcon = (color) => {
        if (typeof L === 'undefined') return null;
        return L.divIcon({
          className: 'custom-neon-pin',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.38; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <span style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2.5px solid #000; box-shadow: 0 0 14px ${color};"></span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      };

      const initOrUpdateMap = () => {
        if (typeof L === 'undefined') return;

        if (!this.studioMapInstance) {
          try {
            this.studioMapInstance = L.map('studio-leaflet-map', {
              center: [lat, lon],
              zoom: 14,
              zoomControl: false,
              attributionControl: false,
              scrollWheelZoom: false
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
              maxZoom: 19,
              subdomains: 'abcd'
            }).addTo(this.studioMapInstance);

            this.studioMapInstance.on('click', () => {
              const mapsLink = document.getElementById('google-maps-btn');
              if (mapsLink && mapsLink.href) window.open(mapsLink.href, '_blank');
            });
          } catch (e) {
            console.warn('Leaflet init warning:', e);
            return;
          }
        }

        const icon = createNeonIcon(primaryColor);
        if (icon) {
          if (this.studioMapMarker) {
            this.studioMapMarker.setIcon(icon);
            this.studioMapMarker.setLatLng([lat, lon]);
          } else {
            this.studioMapMarker = L.marker([lat, lon], { icon }).addTo(this.studioMapInstance);
          }
        }

        setTimeout(() => {
          if (this.studioMapInstance) this.studioMapInstance.invalidateSize();
        }, 150);

        // Fetch exact coordinates via Nominatim if query changed
        if (this.lastGeocodedQuery !== query && query) {
          this.lastGeocodedQuery = query;
          const searchTerms = [query, [basic.city, basic.state].filter(Boolean).join(', '), basic.city].filter(Boolean);
          
          const tryGeocode = (termIndex) => {
            if (termIndex >= searchTerms.length) return;
            const term = searchTerms[termIndex];
            fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(term))
              .then(r => r.json())
              .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                  const gLat = parseFloat(data[0].lat);
                  const gLon = parseFloat(data[0].lon);
                  if (!isNaN(gLat) && !isNaN(gLon) && this.studioMapInstance) {
                    this.studioMapInstance.setView([gLat, gLon], 15);
                    if (this.studioMapMarker) this.studioMapMarker.setLatLng([gLat, gLon]);
                  }
                } else {
                  tryGeocode(termIndex + 1);
                }
              })
              .catch(() => {});
          };

          tryGeocode(0);
        }
      };

      if (typeof L !== 'undefined') {
        initOrUpdateMap();
      } else {
        setTimeout(initOrUpdateMap, 300);
      }
    }
  };

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TemplateRenderer.init());
  } else {
    TemplateRenderer.init();
  }

  window.TemplateRenderer = TemplateRenderer;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateRenderer;
  }
})(typeof window !== 'undefined' ? window : global);
