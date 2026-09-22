/* =========================================================
   TITAN FORGE GYM - ADMIN CONTROLLER (js/admin.js)
   Real-time multi-gym management, live postMessage sync,
   form binding, and dynamic component repeaters.
   ========================================================= */

(function(window) {
  'use strict';

  let activeGymId = 'titan-forge';
  let editingConfig = null;
  let syncDebounceTimer = null;

  // Helper to get nested object property
  function getNested(obj, path) {
    return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
  }

  // Helper to set nested object property
  function setNested(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    let target = obj;
    for (const part of parts) {
      if (!target[part] || typeof target[part] !== 'object') {
        target[part] = {};
      }
      target = target[part];
    }
    target[last] = value;
  }

  const AdminApp = {
    init() {
      // 1. Initialize active gym from GymStore
      if (window.GymStore) {
        window.GymStore.init();
        activeGymId = window.GymStore.getActiveGymId();
        editingConfig = window.GymStore.getGym(activeGymId) || window.DEFAULT_GYM_DATA;
      } else {
        editingConfig = window.DEFAULT_GYM_DATA;
      }

      // 2. Setup Gym Selector & Badges
      this.populateGymSelector();

      // 3. Populate Form Inputs
      this.populateForm();

      // 4. Bind Input Event Listeners for Real-Time Sync
      this.bindInputs();

      // 5. Setup Tabs
      this.setupTabs();

      // 6. Setup Viewport Switcher
      this.setupViewportSwitcher();

      // 7. Setup Action Buttons (Save, Create, Clone, Delete, Revert)
      this.setupActions();

      // 8. Setup Dynamic Repeaters (Stats, Programs, Plans, Trainers, Testimonials)
      this.renderRepeaters();

      // 9. Initial Sync with Live Preview Iframe
      this.syncPreview(true);

      // 10. Setup Mobile Toggles
      this.setupMobileToggles();
    },

    /**
     * Populates active gym dropdown selector
     */
    populateGymSelector() {
      const select = document.getElementById('admin-gym-select');
      const demoBadge = document.getElementById('admin-demo-badge');
      const publicLink = document.getElementById('link-view-public');
      if (!select || !window.GymStore) return;

      const registry = window.GymStore.getRegistry();
      select.innerHTML = '';

      registry.forEach(gym => {
        const opt = document.createElement('option');
        opt.value = gym.id;
        opt.textContent = gym.name + (gym.isDemo ? ' (Demo)' : '');
        if (gym.id === activeGymId) opt.selected = true;
        select.appendChild(opt);
      });

      if (demoBadge) {
        if (editingConfig && editingConfig.isDemo) demoBadge.classList.remove('hidden');
        else demoBadge.classList.add('hidden');
      }

      if (publicLink) {
        publicLink.href = '/gym/' + encodeURIComponent(activeGymId);
      }

      select.onchange = (e) => {
        this.switchGym(e.target.value);
      };
    },

    /**
     * Switch currently editing gym
     */
    switchGym(newId) {
      if (!window.GymStore) return;
      activeGymId = newId;
      window.GymStore.setActiveGymId(newId);
      editingConfig = window.GymStore.getGym(newId) || window.DEFAULT_GYM_DATA;

      this.populateGymSelector();
      this.populateForm();
      this.renderRepeaters();
      this.syncPreview(true);
      this.showToast('Switched to: ' + (editingConfig.basicInfo?.name || newId));
    },

    /**
     * Populates all inputs with data-bind attributes
     */
    populateForm() {
      if (!editingConfig) return;

      document.querySelectorAll('[data-bind]').forEach(input => {
        const path = input.getAttribute('data-bind');
        const val = getNested(editingConfig, path);
        if (val !== undefined && val !== null) {
          if (input.type === 'checkbox') {
            input.checked = Boolean(val);
          } else {
            input.value = val;
          }
        }
      });

      // Special field: Trust Badges list
      const badgesInput = document.getElementById('input-hero-badges');
      if (badgesInput && editingConfig.hero && Array.isArray(editingConfig.hero.trustBadges)) {
        badgesInput.value = editingConfig.hero.trustBadges.join(', ');
      }

      // Color labels
      const primaryHex = editingConfig.branding?.primaryColor || '#CCFF00';
      const secondaryHex = editingConfig.branding?.secondaryColor || '#FF3344';
      const pLabel = document.getElementById('label-primary-color');
      const sLabel = document.getElementById('label-secondary-color');
      if (pLabel) pLabel.textContent = primaryHex;
      if (sLabel) sLabel.textContent = secondaryHex;

      // Color pickers & text inputs
      const pPicker = document.getElementById('picker-brand-primary');
      const pInput = document.getElementById('input-brand-primary');
      if (pPicker) pPicker.value = primaryHex;
      if (pInput) pInput.value = primaryHex;

      const sPicker = document.getElementById('picker-brand-secondary');
      const sInput = document.getElementById('input-brand-secondary');
      if (sPicker) sPicker.value = secondaryHex;
      if (sInput) sInput.value = secondaryHex;
    },

    /**
     * Binds input events for live instant synchronization
     */
    bindInputs() {
      document.querySelectorAll('[data-bind]').forEach(input => {
        const handler = (e) => {
          const path = input.getAttribute('data-bind');
          const val = input.type === 'checkbox' ? input.checked : input.value;
          setNested(editingConfig, path, val);

          // Update color picker reflection
          if (path === 'branding.primaryColor') {
            const pLabel = document.getElementById('label-primary-color');
            const pPicker = document.getElementById('picker-brand-primary');
            const pInput = document.getElementById('input-brand-primary');
            if (pLabel) pLabel.textContent = val;
            if (pPicker) pPicker.value = val;
            if (pInput) pInput.value = val;
          }
          if (path === 'branding.secondaryColor') {
            const sLabel = document.getElementById('label-secondary-color');
            const sPicker = document.getElementById('picker-brand-secondary');
            const sInput = document.getElementById('input-brand-secondary');
            if (sLabel) sLabel.textContent = val;
            if (sPicker) sPicker.value = val;
            if (sInput) sInput.value = val;
          }

          // Auto-generate Google Maps link if not manually overridden
          if (path === 'basicInfo.address' || path === 'basicInfo.city' || path === 'basicInfo.state' || path === 'basicInfo.name') {
            const addr = [editingConfig.basicInfo?.name, editingConfig.basicInfo?.address, editingConfig.basicInfo?.city, editingConfig.basicInfo?.state].filter(Boolean).join(', ');
            if (addr && (!editingConfig.basicInfo?.googleMapsUrl || editingConfig.basicInfo.googleMapsUrl.includes('Linking+Road') || editingConfig.basicInfo.googleMapsUrl.includes('Linking Road'))) {
              editingConfig.basicInfo.googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
            }
          }

          this.syncPreview();
        };

        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
      });

      // Trust Badges listener
      const badgesInput = document.getElementById('input-hero-badges');
      if (badgesInput) {
        badgesInput.addEventListener('input', () => {
          const items = badgesInput.value.split(',').map(s => s.trim()).filter(Boolean);
          if (!editingConfig.hero) editingConfig.hero = {};
          editingConfig.hero.trustBadges = items;
          this.syncPreview();
        });
      }

      // Color Presets buttons
      document.querySelectorAll('.preset-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color');
          const isPrimary = btn.closest('#tab-pane-branding')?.querySelector('#picker-brand-primary')?.contains(btn) ||
            btn.parentElement.parentElement.innerText.includes('Primary');
          
          if (isPrimary) {
            setNested(editingConfig, 'branding.primaryColor', color);
            const pInput = document.getElementById('input-brand-primary');
            const pPicker = document.getElementById('picker-brand-primary');
            const pLabel = document.getElementById('label-primary-color');
            if (pInput) pInput.value = color;
            if (pPicker) pPicker.value = color;
            if (pLabel) pLabel.textContent = color;
          } else {
            setNested(editingConfig, 'branding.secondaryColor', color);
            const sInput = document.getElementById('input-brand-secondary');
            const sPicker = document.getElementById('picker-brand-secondary');
            const sLabel = document.getElementById('label-secondary-color');
            if (sInput) sInput.value = color;
            if (sPicker) sPicker.value = color;
            if (sLabel) sLabel.textContent = color;
          }
          this.syncPreview();
        });
      });
    },

    /**
     * Broadcasts real-time state to preview iframe via postMessage
     */
    syncPreview(forceReload) {
      const frame = document.getElementById('admin-preview-frame');
      const timeIndicator = document.getElementById('preview-sync-time');

      if (forceReload && frame) {
        frame.src = '/?preview=1&gym=' + encodeURIComponent(activeGymId) + '&t=' + Date.now();
        if (timeIndicator) timeIndicator.textContent = 'Preview loaded: ' + new Date().toLocaleTimeString();
        return;
      }

      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        if (frame && frame.contentWindow) {
          frame.contentWindow.postMessage({
            type: 'GYM_CONFIG_UPDATE',
            config: editingConfig
          }, '*');
          if (timeIndicator) timeIndicator.textContent = 'Live synced: ' + new Date().toLocaleTimeString();
        }
      }, 30);
    },

    /**
     * Setup Tab navigation in Left panel
     */
    setupTabs() {
      const tabs = document.querySelectorAll('.admin-tab-btn');
      const panes = document.querySelectorAll('.admin-tab-pane');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetTab = tab.getAttribute('data-tab');
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          panes.forEach(p => p.classList.add('hidden'));
          const targetPane = document.getElementById('tab-pane-' + targetTab);
          if (targetPane) targetPane.classList.remove('hidden');

          if (window.lucide) lucide.createIcons();
        });
      });
    },

    /**
     * Setup Device Viewport buttons in preview frame
     */
    setupViewportSwitcher() {
      const btnDesktop = document.getElementById('btn-view-desktop');
      const btnTablet = document.getElementById('btn-view-tablet');
      const btnMobile = document.getElementById('btn-view-mobile');
      const frame = document.getElementById('admin-preview-frame');
      const btnReload = document.getElementById('btn-reload-preview');

      const setView = (type) => {
        [btnDesktop, btnTablet, btnMobile].forEach(b => {
          b.classList.remove('bg-zinc-800', 'text-white');
          b.classList.add('text-zinc-400');
        });

        frame.className = 'border-0 bg-[#070708] shadow-2xl transition-all duration-300 ' +
          (type === 'desktop' ? 'preview-desktop' : type === 'tablet' ? 'preview-tablet' : 'preview-mobile');

        if (type === 'desktop') btnDesktop.classList.add('bg-zinc-800', 'text-white');
        if (type === 'tablet') btnTablet.classList.add('bg-zinc-800', 'text-white');
        if (type === 'mobile') btnMobile.classList.add('bg-zinc-800', 'text-white');
      };

      if (btnDesktop) btnDesktop.onclick = () => setView('desktop');
      if (btnTablet) btnTablet.onclick = () => setView('tablet');
      if (btnMobile) btnMobile.onclick = () => setView('mobile');

      if (btnReload) {
        btnReload.onclick = () => this.syncPreview(true);
      }
    },

    /**
     * Setup mobile toggles (Edit Controls vs Live Preview)
     */
    setupMobileToggles() {
      const editBtn = document.getElementById('mobile-tab-edit');
      const prevBtn = document.getElementById('mobile-tab-preview');
      const editorPanel = document.getElementById('admin-editor-panel');
      const previewPanel = document.getElementById('admin-preview-panel');

      if (editBtn && prevBtn && editorPanel && previewPanel) {
        editBtn.onclick = () => {
          editBtn.className = 'px-3 py-1 rounded-lg bg-[#CCFF00] text-black font-bold';
          prevBtn.className = 'px-3 py-1 rounded-lg bg-zinc-900 text-zinc-300 font-bold border border-zinc-800';
          editorPanel.classList.remove('hidden');
          previewPanel.classList.add('hidden');
        };
        prevBtn.onclick = () => {
          prevBtn.className = 'px-3 py-1 rounded-lg bg-[#CCFF00] text-black font-bold';
          editBtn.className = 'px-3 py-1 rounded-lg bg-zinc-900 text-zinc-300 font-bold border border-zinc-800';
          editorPanel.classList.add('hidden');
          previewPanel.classList.remove('hidden');
          previewPanel.classList.add('flex');
          this.syncPreview();
        };
      }
    },

    /**
     * Setup top action buttons and modals
     */
    setupActions() {
      // Save Changes
      const saveBtn = document.getElementById('btn-save-gym');
      if (saveBtn) {
        saveBtn.onclick = () => {
          try {
            if (!editingConfig.basicInfo?.name || editingConfig.basicInfo.name.trim() === '') {
              alert('Validation Error: Gym Name is required.');
              return;
            }
            window.GymStore.saveGym(editingConfig);
            this.populateGymSelector();
            this.showToast('✅ Saved changes for: ' + editingConfig.basicInfo.name);
          } catch (e) {
            alert('Failed to save gym: ' + e.message);
          }
        };
      }

      // Download / Export Gym JSON
      const downloadBtn = document.getElementById('btn-download-json');
      if (downloadBtn) {
        downloadBtn.onclick = () => {
          try {
            window.GymStore.downloadGymFile(activeGymId);
            this.showToast('📥 Downloaded ' + activeGymId + '.json! Commit this file to git/gyms/ to make it live.');
          } catch (e) {
            alert('Failed to download gym JSON: ' + e.message);
          }
        };
      }

      // Share Demo Link Modal & Action
      const shareBtn = document.getElementById('btn-share-link');
      const shareModal = document.getElementById('modal-share-link');
      const shareInput = document.getElementById('share-link-input');
      const copyShareBtn = document.getElementById('btn-copy-share-link');
      const cleanUrlText = document.getElementById('share-clean-url');
      const sharePreviewLink = document.getElementById('share-open-preview');

      if (shareBtn && shareModal) {
        shareBtn.onclick = async () => {
          try {
            // First save any current in-memory edits so link includes latest data
            window.GymStore.saveGym(editingConfig);
            
            const shareableUrl = await window.GymStore.getShareableUrl(activeGymId);
            if (shareInput) shareInput.value = shareableUrl;
            if (cleanUrlText) cleanUrlText.textContent = `/gym/${activeGymId}`;
            if (sharePreviewLink) sharePreviewLink.href = shareableUrl;
            shareModal.classList.remove('hidden');
          } catch (err) {
            alert('Failed to generate demo URL: ' + err.message);
          }
        };
      }

      if (copyShareBtn && shareInput) {
        copyShareBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(shareInput.value);
            this.showToast('📋 Copied Live Demo URL to clipboard!');
            copyShareBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i><span>Copied!</span>';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
              copyShareBtn.innerHTML = '<i data-lucide="copy" class="w-4 h-4"></i><span>Copy</span>';
              if (window.lucide) lucide.createIcons();
            }, 2500);
          } catch (err) {
            shareInput.select();
            document.execCommand('copy');
            this.showToast('📋 Copied Live Demo URL!');
          }
        };
      }

      // Revert Changes
      const revertBtn = document.getElementById('btn-reset-changes');
      if (revertBtn) {
        revertBtn.onclick = () => {
          if (confirm('Revert all unsaved changes for this gym?')) {
            editingConfig = window.GymStore.getGym(activeGymId) || window.DEFAULT_GYM_DATA;
            this.populateForm();
            this.renderRepeaters();
            this.syncPreview();
            this.showToast('Reverted to last saved state.');
          }
        };
      }

      // Create New Gym Modal
      const createBtn = document.getElementById('btn-create-gym');
      const createModal = document.getElementById('modal-create-gym');
      const confirmCreate = document.getElementById('modal-confirm-create');
      const newNameInput = document.getElementById('modal-new-name');
      const newSlugInput = document.getElementById('modal-new-slug');

      if (createBtn && createModal) {
        createBtn.onclick = () => {
          if (newNameInput) newNameInput.value = '';
          if (newSlugInput) newSlugInput.value = '';
          createModal.classList.remove('hidden');
        };

        if (newNameInput && newSlugInput) {
          newNameInput.oninput = () => {
            newSlugInput.value = newNameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          };
        }

        if (confirmCreate) {
          confirmCreate.onclick = () => {
            const name = newNameInput.value.trim();
            const slug = newSlugInput.value.trim();
            if (!name) {
              alert('Please enter a gym name.');
              return;
            }
            const newGym = window.GymStore.createGym(name, slug);
            createModal.classList.add('hidden');
            this.switchGym(newGym.id);
            this.showToast('🎉 Created new gym: ' + name);
          };
        }
      }

      // Duplicate Gym Modal
      const dupBtn = document.getElementById('btn-duplicate-gym');
      const dupModal = document.getElementById('modal-duplicate-gym');
      const confirmDup = document.getElementById('modal-confirm-dup');
      const dupNameInput = document.getElementById('modal-dup-name');

      if (dupBtn && dupModal) {
        dupBtn.onclick = () => {
          if (dupNameInput) dupNameInput.value = (editingConfig.basicInfo?.name || 'Gym') + ' (Copy)';
          dupModal.classList.remove('hidden');
        };

        if (confirmDup) {
          confirmDup.onclick = () => {
            const name = dupNameInput.value.trim();
            if (!name) return;
            const cloned = window.GymStore.duplicateGym(activeGymId, name);
            dupModal.classList.add('hidden');
            this.switchGym(cloned.id);
            this.showToast('📋 Duplicated gym: ' + name);
          };
        }
      }

      // Delete Gym Action
      const delBtn = document.getElementById('btn-delete-gym');
      if (delBtn) {
        delBtn.onclick = () => {
          const isDemo = editingConfig.isDemo || activeGymId === 'titan-forge';
          const msg = isDemo ?
            'Reset demo gym "TITAN FORGE GYM" back to default pristine demo state?' :
            'Are you sure you want to permanently delete gym: ' + (editingConfig.basicInfo?.name || activeGymId) + '?';

          if (confirm(msg)) {
            window.GymStore.deleteGym(activeGymId);
            this.switchGym('titan-forge');
            this.showToast(isDemo ? 'Demo gym reset to defaults.' : 'Gym deleted successfully.');
          }
        };
      }

      // Modal close buttons
      document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('.admin-modal-overlay').forEach(m => m.classList.add('hidden'));
        };
      });
    },

    /**
     * Render dynamic repeaters (Stats, Programs, Plans, Trainers, Testimonials)
     */
    renderRepeaters() {
      this.renderStatsList();
      this.renderProgramsList();
      this.renderPlansList();
      this.renderTrainersList();
      this.renderTestimonialsList();
      if (window.lucide) lucide.createIcons();
    },

    /**
     * 1. Dynamic Stats Repeater
     */
    renderStatsList() {
      const container = document.getElementById('stats-list-container');
      const addBtn = document.getElementById('btn-add-stat');
      if (!container) return;

      if (!Array.isArray(editingConfig.stats)) editingConfig.stats = [];

      container.innerHTML = editingConfig.stats.map((s, i) => `
        <div class="admin-card p-3.5 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono font-bold text-[#CCFF00]">STAT 0${i + 1}</span>
            <button type="button" class="btn-del-stat text-zinc-500 hover:text-red-400 p-1" data-idx="${i}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="admin-label">Target Number</label>
              <input type="number" class="admin-input font-mono stat-target" data-idx="${i}" value="${s.target}" />
            </div>
            <div>
              <label class="admin-label">Suffix (e.g. +, SQ FT, /7)</label>
              <input type="text" class="admin-input font-mono stat-suffix" data-idx="${i}" value="${s.suffix || ''}" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="admin-label">Primary Label</label>
              <input type="text" class="admin-input stat-label font-bold" data-idx="${i}" value="${s.label || ''}" />
            </div>
            <div>
              <label class="admin-label">Sublabel / Tagline</label>
              <input type="text" class="admin-input stat-sublabel" data-idx="${i}" value="${s.sublabel || ''}" />
            </div>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.stat-target').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.stats[idx].target = parseInt(e.target.value) || 0;
          editingConfig.stats[idx].value = editingConfig.stats[idx].target + (editingConfig.stats[idx].suffix || '');
          this.syncPreview();
        };
      });

      container.querySelectorAll('.stat-suffix').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.stats[idx].suffix = e.target.value;
          editingConfig.stats[idx].value = editingConfig.stats[idx].target + e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.stat-label').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.stats[idx].label = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.stat-sublabel').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.stats[idx].sublabel = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.btn-del-stat').forEach(el => {
        el.onclick = () => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.stats.splice(idx, 1);
          this.renderStatsList();
          this.syncPreview();
        };
      });

      if (addBtn) {
        addBtn.onclick = () => {
          editingConfig.stats.push({
            value: '100+',
            target: 100,
            suffix: '+',
            label: 'New Metric',
            sublabel: 'Excellence Guaranteed'
          });
          this.renderStatsList();
          this.syncPreview();
        };
      }
    },

    /**
     * 2. Dynamic Programs Repeater
     */
    renderProgramsList() {
      const container = document.getElementById('programs-list-container');
      const addBtn = document.getElementById('btn-add-program');
      if (!container) return;

      if (!Array.isArray(editingConfig.programs)) editingConfig.programs = [];

      container.innerHTML = editingConfig.programs.map((p, i) => `
        <div class="admin-card p-4 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span class="text-xs font-mono font-bold text-[#CCFF00]">DISCIPLINE 0${i + 1}</span>
            <button type="button" class="btn-del-program text-zinc-500 hover:text-red-400 p-1" data-idx="${i}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div>
            <label class="admin-label">Program Name</label>
            <input type="text" class="admin-input prog-name font-bold" data-idx="${i}" value="${p.name || ''}" placeholder="e.g. OLYMPIC WEIGHTLIFTING" />
          </div>
          <div>
            <label class="admin-label">Short Description</label>
            <textarea rows="2" class="admin-input prog-desc" data-idx="${i}" placeholder="Description of this training zone...">${p.shortDesc || ''}</textarea>
          </div>
          <div>
            <label class="admin-label">Background Image URL</label>
            <input type="text" class="admin-input prog-image" data-idx="${i}" value="${p.image || ''}" placeholder="https://..." />
          </div>
          <div>
            <label class="admin-label">Tags / Highlights (comma separated)</label>
            <input type="text" class="admin-input prog-tags font-mono text-xs" data-idx="${i}" value="${(p.tags || []).join(', ')}" placeholder="Eleiko Spec, Chalk Allowed" />
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.prog-name').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.programs[idx].name = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.prog-desc').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.programs[idx].shortDesc = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.prog-image').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.programs[idx].image = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.prog-tags').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.programs[idx].tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
          this.syncPreview();
        };
      });

      container.querySelectorAll('.btn-del-program').forEach(el => {
        el.onclick = () => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.programs.splice(idx, 1);
          this.renderProgramsList();
          this.syncPreview();
        };
      });

      if (addBtn) {
        addBtn.onclick = () => {
          editingConfig.programs.push({
            id: 'prog-' + Date.now(),
            number: String(editingConfig.programs.length + 1).padStart(2, '0'),
            name: 'NEW TRAINING DISCIPLINE',
            shortDesc: 'State of the art training program customized for optimal physical development.',
            image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop',
            tags: ['Certified Coaches', '24/7 Access']
          });
          this.renderProgramsList();
          this.syncPreview();
        };
      }
    },

    /**
     * 3. Dynamic Membership Plans Repeater
     */
    renderPlansList() {
      const container = document.getElementById('plans-list-container');
      const addBtn = document.getElementById('btn-add-plan');
      if (!container) return;

      if (!Array.isArray(editingConfig.membershipPlans)) editingConfig.membershipPlans = [];

      container.innerHTML = editingConfig.membershipPlans.map((plan, i) => `
        <div class="admin-card p-4 space-y-3 ${plan.popular ? 'border-[#CCFF00]' : ''}">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-white uppercase">${plan.name || 'Plan ' + (i + 1)}</span>
              ${plan.popular ? '<span class="px-1.5 py-0.5 rounded bg-[#CCFF00] text-black text-[9px] font-bold">POPULAR</span>' : ''}
            </div>
            <button type="button" class="btn-del-plan text-zinc-500 hover:text-red-400 p-1" data-idx="${i}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="admin-label">Plan Name</label>
              <input type="text" class="admin-input plan-name font-bold" data-idx="${i}" value="${plan.name || ''}" placeholder="FORGE PRO" />
            </div>
            <div>
              <label class="admin-label">Tagline</label>
              <input type="text" class="admin-input plan-tagline" data-idx="${i}" value="${plan.tagline || ''}" placeholder="Complete Athletic Conditioning" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="admin-label">Price (₹)</label>
              <input type="text" class="admin-input plan-price font-bold text-[#CCFF00]" data-idx="${i}" value="${plan.price || ''}" placeholder="4,999" />
            </div>
            <div>
              <label class="admin-label">Billing Period</label>
              <input type="text" class="admin-input plan-period" data-idx="${i}" value="${plan.period || 'per month'}" placeholder="per month" />
            </div>
            <div>
              <label class="admin-label">Badge</label>
              <input type="text" class="admin-input plan-badge font-mono text-xs" data-idx="${i}" value="${plan.badge || ''}" placeholder="MOST POPULAR" />
            </div>
          </div>

          <div class="flex items-center gap-2 p-2 bg-zinc-950 rounded-lg border border-zinc-800">
            <input type="checkbox" id="plan-pop-${i}" class="plan-popular rounded text-[#CCFF00]" data-idx="${i}" ${plan.popular ? 'checked' : ''} />
            <label for="plan-pop-${i}" class="text-xs text-zinc-300 font-bold cursor-pointer">Highlight this Tier (Glow & Most Popular Badge)</label>
          </div>

          <div>
            <label class="admin-label">Features Included (one per line)</label>
            <textarea rows="4" class="admin-input plan-features font-mono text-xs" data-idx="${i}">${(plan.features || []).join('\n')}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="admin-label">CTA Button Text</label>
              <input type="text" class="admin-input plan-cta-text" data-idx="${i}" value="${plan.ctaText || 'Claim Pass'}" />
            </div>
            <div>
              <label class="admin-label">CTA Link</label>
              <input type="text" class="admin-input plan-cta-link font-mono text-xs" data-idx="${i}" value="${plan.ctaLink || '#lead-capture'}" />
            </div>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.plan-name').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].name = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-tagline').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].tagline = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-price').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].price = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-period').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].period = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-badge').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].badge = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-popular').forEach(el => {
        el.onchange = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans.forEach((p, pIdx) => {
            p.popular = (pIdx === idx && e.target.checked);
          });
          this.renderPlansList();
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-features').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].features = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-cta-text').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].ctaText = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.plan-cta-link').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans[idx].ctaLink = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.btn-del-plan').forEach(el => {
        el.onclick = () => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.membershipPlans.splice(idx, 1);
          this.renderPlansList();
          this.syncPreview();
        };
      });

      if (addBtn) {
        addBtn.onclick = () => {
          editingConfig.membershipPlans.push({
            id: 'plan-' + Date.now(),
            name: 'NEW TIER',
            tagline: 'Custom Strength Membership',
            price: '3,499',
            period: 'per month',
            popular: false,
            badge: 'FLEXIBLE',
            features: [
              'Full 24/7 Access to Facility',
              'Free Weights & Machines',
              'Locker & Showers'
            ],
            ctaText: 'Claim Pass',
            ctaLink: '#lead-capture'
          });
          this.renderPlansList();
          this.syncPreview();
        };
      }
    },

    /**
     * 4. Dynamic Trainers Repeater
     */
    renderTrainersList() {
      const container = document.getElementById('trainers-list-container');
      const addBtn = document.getElementById('btn-add-trainer');
      if (!container) return;

      if (!Array.isArray(editingConfig.trainers)) editingConfig.trainers = [];

      container.innerHTML = editingConfig.trainers.map((tr, i) => `
        <div class="admin-card p-4 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span class="text-xs font-mono font-bold text-[#CCFF00]">TRAINER 0${i + 1}</span>
            <button type="button" class="btn-del-trainer text-zinc-500 hover:text-red-400 p-1" data-idx="${i}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="admin-label">Coach Name</label>
              <input type="text" class="admin-input tr-name font-bold" data-idx="${i}" value="${tr.name || ''}" placeholder="Vikram Rathore" />
            </div>
            <div>
              <label class="admin-label">Title / Role</label>
              <input type="text" class="admin-input tr-role" data-idx="${i}" value="${tr.role || ''}" placeholder="HEAD STRENGTH COACH" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="admin-label">Specialization</label>
              <input type="text" class="admin-input tr-spec" data-idx="${i}" value="${tr.specialization || ''}" placeholder="Olympic Weightlifting" />
            </div>
            <div>
              <label class="admin-label">Experience</label>
              <input type="text" class="admin-input tr-exp" data-idx="${i}" value="${tr.experience || ''}" placeholder="10+ Years Experience" />
            </div>
          </div>

          <div>
            <label class="admin-label">Certifications / Awards</label>
            <input type="text" class="admin-input tr-awards" data-idx="${i}" value="${tr.awards || ''}" placeholder="CSCS / USAW Certified" />
          </div>

          <div>
            <label class="admin-label">Short Bio</label>
            <textarea rows="2" class="admin-input tr-bio" data-idx="${i}">${tr.bio || ''}</textarea>
          </div>

          <div>
            <label class="admin-label">Photo URL</label>
            <input type="text" class="admin-input tr-image" data-idx="${i}" value="${tr.image || ''}" placeholder="assets/images/... or https://..." />
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.tr-name').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers[idx].name = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.tr-role').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers[idx].role = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.tr-spec').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers[idx].specialization = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.tr-exp').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers[idx].experience = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.tr-awards').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers[idx].awards = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.tr-bio').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers[idx].bio = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.tr-image').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers[idx].image = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.btn-del-trainer').forEach(el => {
        el.onclick = () => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.trainers.splice(idx, 1);
          this.renderTrainersList();
          this.syncPreview();
        };
      });

      if (addBtn) {
        addBtn.onclick = () => {
          editingConfig.trainers.push({
            id: 'tr-' + Date.now(),
            name: 'New Coach',
            role: 'Strength & Conditioning Specialist',
            specialization: 'Hypertrophy & Mobility',
            experience: '5+ Years Coaching',
            awards: 'Certified Personal Trainer',
            bio: 'Dedicated to helping members exceed their athletic benchmarks with scientific protocols.',
            image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop'
          });
          this.renderTrainersList();
          this.syncPreview();
        };
      }
    },

    /**
     * 5. Dynamic Testimonials Repeater
     */
    renderTestimonialsList() {
      const container = document.getElementById('testimonials-list-container');
      const addBtn = document.getElementById('btn-add-testimonial');
      if (!container) return;

      if (!Array.isArray(editingConfig.testimonials)) editingConfig.testimonials = [];

      container.innerHTML = editingConfig.testimonials.map((test, i) => `
        <div class="admin-card p-4 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span class="text-xs font-mono font-bold text-[#CCFF00]">PROOF 0${i + 1}</span>
            <button type="button" class="btn-del-test text-zinc-500 hover:text-red-400 p-1" data-idx="${i}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="admin-label">Member Name</label>
              <input type="text" class="admin-input test-name font-bold" data-idx="${i}" value="${test.name || ''}" placeholder="Priya Sharma" />
            </div>
            <div>
              <label class="admin-label">Role / Occupation</label>
              <input type="text" class="admin-input test-role" data-idx="${i}" value="${test.role || ''}" placeholder="Corporate Executive" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="admin-label">Transformation Metric Pill</label>
              <input type="text" class="admin-input test-result font-bold text-[#CCFF00]" data-idx="${i}" value="${test.result || ''}" placeholder="-14kg Fat Loss" />
            </div>
            <div>
              <label class="admin-label">Star Rating (1 - 5)</label>
              <input type="number" min="1" max="5" class="admin-input test-rating" data-idx="${i}" value="${test.rating || 5}" />
            </div>
          </div>

          <div>
            <label class="admin-label">Testimonial Quote</label>
            <textarea rows="2" class="admin-input test-text" data-idx="${i}">${test.text || ''}</textarea>
          </div>

          <div>
            <label class="admin-label">Photo URL</label>
            <input type="text" class="admin-input test-photo" data-idx="${i}" value="${test.photo || ''}" placeholder="assets/images/... or https://..." />
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.test-name').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.testimonials[idx].name = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.test-role').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.testimonials[idx].role = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.test-result').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.testimonials[idx].result = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.test-rating').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.testimonials[idx].rating = parseInt(e.target.value) || 5;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.test-text').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.testimonials[idx].text = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.test-photo').forEach(el => {
        el.oninput = (e) => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.testimonials[idx].photo = e.target.value;
          this.syncPreview();
        };
      });

      container.querySelectorAll('.btn-del-test').forEach(el => {
        el.onclick = () => {
          const idx = parseInt(el.getAttribute('data-idx'));
          editingConfig.testimonials.splice(idx, 1);
          this.renderTestimonialsList();
          this.syncPreview();
        };
      });

      if (addBtn) {
        addBtn.onclick = () => {
          editingConfig.testimonials.push({
            id: 'test-' + Date.now(),
            name: 'New Athlete',
            role: 'Dedicated Member',
            result: 'Peak Recomposition',
            rating: 5,
            text: 'Transformative coaching and world-class equipment that push you past your limits every session.',
            photo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop'
          });
          this.renderTestimonialsList();
          this.syncPreview();
        };
      }
    },

    /**
     * Show toast banner
     */
    showToast(msg) {
      const toast = document.getElementById('admin-toast');
      const msgEl = document.getElementById('toast-message');
      if (!toast || !msgEl) return;

      msgEl.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  };

  // Launch admin app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminApp.init());
  } else {
    AdminApp.init();
  }

  window.AdminApp = AdminApp;
})(window);
