/* =========================================================
   GYM STORE (MULTI-TENANT STORAGE & REPOSITORY LAYER)
   Provides localStorage persistence, registry management,
   CRUD operations, and URL slug resolution.
   ========================================================= */

(function(window) {
  'use strict';

  const REGISTRY_KEY = 'gym_multiverse_registry';
  const ACTIVE_GYM_KEY = 'gym_active_id';
  const DATA_PREFIX = 'gym_data_';

  // Fallback default demo data
  const DEFAULT_DATA = window.DEFAULT_GYM_DATA || {
    id: 'titan-forge',
    isDemo: true,
    basicInfo: {
      name: 'TITAN FORGE GYM',
      shortName: 'TITAN FORGE',
      phone: '+91 98765 43210',
      whatsapp: '+91 98765 43210'
    }
  };

  const GymStore = {
    /**
     * Initializes registry if empty
     */
    init() {
      const registry = this.getRegistry();
      if (!registry || registry.length === 0) {
        const initialList = [{
          id: 'titan-forge',
          name: DEFAULT_DATA.basicInfo?.name || 'TITAN FORGE GYM',
          isDemo: true,
          updatedAt: Date.now()
        }];
        this.saveRegistry(initialList);
        
        // Ensure default gym data is also saved if not present
        if (!localStorage.getItem(DATA_PREFIX + 'titan-forge')) {
          localStorage.setItem(DATA_PREFIX + 'titan-forge', JSON.stringify(DEFAULT_DATA));
        }
      }
      this.syncRemoteRegistry();
    },

    /**
     * Synchronizes registry with static gyms/index.json
     */
    async syncRemoteRegistry() {
      try {
        const res = await fetch('/gyms/index.json?v=' + Date.now());
        if (res.ok) {
          const remoteList = await res.json();
          if (Array.isArray(remoteList)) {
            const local = this.getRegistry();
            const localMap = new Map(local.map(g => [g.id, g]));
            let changed = false;
            remoteList.forEach(rg => {
              if (!localMap.has(rg.id)) {
                local.push({
                  id: rg.id,
                  name: rg.name,
                  isDemo: Boolean(rg.isDemo),
                  updatedAt: Date.now()
                });
                changed = true;
              }
            });
            if (changed) {
              this.saveRegistry(local);
              window.dispatchEvent(new CustomEvent('gymRegistryUpdated', { detail: local }));
            }
          }
        }
      } catch (e) {
        // Offline or local static mode
      }
    },

    /**
     * Returns list of all registered gyms [{ id, name, isDemo, updatedAt }]
     */
    getRegistry() {
      try {
        const raw = localStorage.getItem(REGISTRY_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Failed to read gym registry:', e);
        return [];
      }
    },

    /**
     * Saves registry list
     */
    saveRegistry(list) {
      try {
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to save gym registry:', e);
      }
    },

    /**
     * Resolves the active gym ID from URL or storage
     */
    getActiveGymId() {
      // 1. Check URL path: /gym/:slug
      const path = window.location.pathname;
      const match = path.match(/\/gym\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }

      // 2. Check query parameter: ?gym=:slug
      const params = new URLSearchParams(window.location.search);
      const queryGym = params.get('gym');
      if (queryGym) {
        return queryGym.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      }

      // 3. Check hash parameter: #...&gym=:slug
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashGym = hashParams.get('gym');
        if (hashGym) {
          return hashGym.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        }
      }

      // 3. Fallback to active gym stored in localStorage or default 'titan-forge'
      const storedActive = localStorage.getItem(ACTIVE_GYM_KEY);
      if (storedActive && this.getGym(storedActive)) {
        return storedActive;
      }

      return 'titan-forge';
    },

    /**
     * Sets active gym ID
     */
    setActiveGymId(id) {
      localStorage.setItem(ACTIVE_GYM_KEY, id);
    },

    /**
     * Retrieves full gym configuration by ID
     */
    getGym(id) {
      if (!id) id = 'titan-forge';
      try {
        const raw = localStorage.getItem(DATA_PREFIX + id);
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse gym data for id:', id, e);
      }

      // Fallback: if requesting default or missing, return deep clone of DEFAULT_DATA
      if (id === 'titan-forge' || !id) {
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
      }

      return null;
    },

    /**
     * Asynchronously loads gym config:
     * 1. Checks localStorage (for local drafts / admin edits)
     * 2. If not found, fetches /gyms/${id}.json from server
     * 3. Falls back to default
     */
    async loadGym(id) {
      if (!id) id = 'titan-forge';

      // 0. Check URL hash fragment (#demo=... or #raw=...) for instant client demo links
      const hashGym = await this.decodeGymFromHash();
      if (hashGym) {
        if (hashGym.id) {
          try {
            localStorage.setItem(DATA_PREFIX + hashGym.id, JSON.stringify(hashGym));
          } catch (e) {}
        }
        return hashGym;
      }

      // 1. Check local storage
      const local = this.getGym(id);
      if (local && (local.updatedAt || local.id !== 'titan-forge')) {
        return local;
      }

      // 2. Fetch from static JSON file
      try {
        const res = await fetch('/gyms/' + encodeURIComponent(id) + '.json?v=' + Date.now());
        if (res.ok) {
          const remoteData = await res.json();
          try {
            localStorage.setItem(DATA_PREFIX + id, JSON.stringify(remoteData));
          } catch (e) {}
          return remoteData;
        }
      } catch (err) {
        console.warn('Could not fetch remote gym JSON for:', id, err);
      }

      // 3. Fallback to local or default
      return local || JSON.parse(JSON.stringify(DEFAULT_DATA));
    },

    /**
     * Triggers one-click browser download of gym JSON file
     */
    downloadGymFile(id) {
      const gym = this.getGym(id) || DEFAULT_DATA;
      const jsonStr = JSON.stringify(gym, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (gym.id || 'gym') + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    /**
     * Deep merge helper to overlay customized delta on default template
     */
    deepMerge(target, source) {
      const output = Object.assign({}, target);
      if (this.isObject(target) && this.isObject(source)) {
        Object.keys(source).forEach(key => {
          if (this.isObject(source[key])) {
            if (!(key in target)) Object.assign(output, { [key]: source[key] });
            else output[key] = this.deepMerge(target[key], source[key]);
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      return output;
    },

    isObject(item) {
      return item && typeof item === 'object' && !Array.isArray(item);
    },

    /**
     * Encodes a gym configuration into a shareable live demo URL.
     * Uses native browser CompressionStream (or fallback) + Base64url in URL hash fragment.
     * Works 100% serverless, zero database, instant demo link for clients!
     */
    async getShareableUrl(gymOrId) {
      let gym = null;
      if (typeof gymOrId === 'object' && gymOrId !== null) {
        gym = gymOrId;
      } else {
        gym = this.getGym(gymOrId) || DEFAULT_DATA;
      }
      const base = window.location.origin;
      const slug = gym.id || 'titan-forge';

      // 1. Calculate diff against default demo data to keep payload ultra-compact
      const defaultRef = window.DEFAULT_GYM_DATA || DEFAULT_DATA;
      const diff = { id: slug };
      for (const k of Object.keys(gym)) {
        if (JSON.stringify(gym[k]) !== JSON.stringify(defaultRef[k])) {
          diff[k] = gym[k];
        }
      }

      try {
        const jsonStr = JSON.stringify(diff);
        if (typeof CompressionStream !== 'undefined') {
          const cs = new CompressionStream('deflate-raw');
          const writer = cs.writable.getWriter();
          writer.write(new TextEncoder().encode(jsonStr));
          writer.close();

          const compressed = await new Response(cs.readable).arrayBuffer();
          const bytes = new Uint8Array(compressed);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          return `${base}/#demo=${b64}&gym=${slug}`;
        } else {
          // Fallback if CompressionStream is unsupported
          const b64 = btoa(encodeURIComponent(jsonStr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          return `${base}/#raw=${b64}&gym=${slug}`;
        }
      } catch (err) {
        console.warn('Failed to encode shareable URL:', err);
        return `${base}/?gym=${slug}`;
      }
    },

    /**
     * Shortens a URL using TinyURL's public API. Falls back to original URL if rate-limited or offline.
     */
    async shortenUrl(longUrl) {
      if (!longUrl) return '';
      try {
        const endpoint = 'https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl);
        const res = await fetch(endpoint);
        if (res.ok) {
          const short = await res.text();
          if (short && short.startsWith('http')) {
            return short.trim();
          }
        }
      } catch (e) {
        console.warn('TinyURL shortening failed, using original URL:', e);
      }
      return longUrl;
    },

    /**
     * Decodes gym configuration from URL hash fragment if present (#demo=... or #raw=...)
     */
    async decodeGymFromHash() {
      if (typeof window === 'undefined' || !window.location.hash) return null;
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const demoToken = params.get('demo');
      const rawToken = params.get('raw');

      try {
        if (demoToken) {
          let base64 = demoToken.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
          const binStr = atob(base64);
          const u8 = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) u8[i] = binStr.charCodeAt(i);

          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const dWriter = ds.writable.getWriter();
            dWriter.write(u8);
            dWriter.close();

            const decompressed = await new Response(ds.readable).text();
            const delta = JSON.parse(decompressed);
            const baseTemplate = JSON.parse(JSON.stringify(window.DEFAULT_GYM_DATA || DEFAULT_DATA));
            const merged = this.deepMerge(baseTemplate, delta);

            // If custom address or city exists in delta, prevent inheriting Mumbai maps defaults
            if (delta.basicInfo && (delta.basicInfo.address || delta.basicInfo.city)) {
              const q = [delta.basicInfo.name || merged.basicInfo?.name, delta.basicInfo.address, delta.basicInfo.city].filter(Boolean).join(', ');
              if (!delta.basicInfo.googleMapsUrl) {
                merged.basicInfo.googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(q)}`;
              }
              if (!delta.basicInfo.googleMapsEmbedUrl) {
                merged.basicInfo.googleMapsEmbedUrl = `https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1s${encodeURIComponent(q)}`;
              }
            }

            return merged;
          }
        } else if (rawToken) {
          let base64 = rawToken.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
          const jsonStr = decodeURIComponent(atob(base64));
          const delta = JSON.parse(jsonStr);
          const baseTemplate = JSON.parse(JSON.stringify(window.DEFAULT_GYM_DATA || DEFAULT_DATA));
          const merged = this.deepMerge(baseTemplate, delta);

          // If custom address or city exists in delta, prevent inheriting Mumbai maps defaults
          if (delta.basicInfo && (delta.basicInfo.address || delta.basicInfo.city)) {
            const q = [delta.basicInfo.name || merged.basicInfo?.name, delta.basicInfo.address, delta.basicInfo.city].filter(Boolean).join(', ');
            if (!delta.basicInfo.googleMapsUrl) {
              merged.basicInfo.googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(q)}`;
            }
            if (!delta.basicInfo.googleMapsEmbedUrl) {
              merged.basicInfo.googleMapsEmbedUrl = `https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1s${encodeURIComponent(q)}`;
            }
          }

          return merged;
        }
      } catch (e) {
        console.warn('Failed to decode gym config from hash:', e);
      }
      return null;
    },

    /**
     * Saves or updates a gym configuration
     */
    saveGym(gymConfig) {
      if (!gymConfig || !gymConfig.id) {
        throw new Error('Invalid gym configuration: missing gym ID.');
      }

      const id = gymConfig.id.toLowerCase().trim();
      gymConfig.id = id;
      gymConfig.updatedAt = Date.now();

      // Save payload
      try {
        localStorage.setItem(DATA_PREFIX + id, JSON.stringify(gymConfig));
      } catch (e) {
        console.error('Failed to save gym data to localStorage:', e);
        throw e;
      }

      // Update registry
      let registry = this.getRegistry();
      const existingIdx = registry.findIndex(g => g.id === id);
      const entry = {
        id: id,
        name: gymConfig.basicInfo?.name || 'Untitled Gym',
        isDemo: Boolean(gymConfig.isDemo),
        updatedAt: gymConfig.updatedAt
      };

      if (existingIdx >= 0) {
        registry[existingIdx] = entry;
      } else {
        registry.push(entry);
      }
      this.saveRegistry(registry);

      // Dispatch event for any active listeners in same window
      window.dispatchEvent(new CustomEvent('gymConfigChanged', { detail: gymConfig }));
      return gymConfig;
    },

    /**
     * Creates a new gym based on template defaults
     */
    createGym(name, slug) {
      const cleanName = (name || 'New Gym').trim();
      let cleanSlug = (slug || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim();
      if (!cleanSlug) cleanSlug = 'gym-' + Math.floor(1000 + Math.random() * 9000);

      // Ensure uniqueness of slug
      const registry = this.getRegistry();
      let finalSlug = cleanSlug;
      let counter = 1;
      while (registry.some(g => g.id === finalSlug)) {
        finalSlug = `${cleanSlug}-${counter++}`;
      }

      // Deep clone default template as baseline
      const newGym = JSON.parse(JSON.stringify(DEFAULT_DATA));
      newGym.id = finalSlug;
      newGym.isDemo = false;
      newGym.basicInfo.name = cleanName.toUpperCase();
      newGym.basicInfo.shortName = cleanName;
      newGym.basicInfo.address = '';
      newGym.basicInfo.city = '';
      newGym.basicInfo.state = '';
      newGym.basicInfo.googleMapsUrl = '';
      newGym.basicInfo.googleMapsEmbedUrl = '';
      newGym.branding.logoText = cleanName.toUpperCase();
      newGym.branding.logoImage = '';
      newGym.createdAt = Date.now();
      newGym.updatedAt = Date.now();

      this.saveGym(newGym);
      this.setActiveGymId(finalSlug);
      return newGym;
    },

    /**
     * Duplicates an existing gym
     */
    duplicateGym(sourceId, newName) {
      const source = this.getGym(sourceId) || DEFAULT_DATA;
      const clone = JSON.parse(JSON.stringify(source));
      
      const cleanName = (newName || `${source.basicInfo?.name || 'Gym'} (Copy)`).trim();
      let cleanSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!cleanSlug) cleanSlug = 'gym-copy-' + Date.now();

      const registry = this.getRegistry();
      let finalSlug = cleanSlug;
      let counter = 1;
      while (registry.some(g => g.id === finalSlug)) {
        finalSlug = `${cleanSlug}-${counter++}`;
      }

      clone.id = finalSlug;
      clone.isDemo = false;
      clone.basicInfo.name = cleanName.toUpperCase();
      clone.basicInfo.shortName = cleanName;
      clone.branding.logoText = cleanName.toUpperCase();
      clone.createdAt = Date.now();
      clone.updatedAt = Date.now();

      this.saveGym(clone);
      return clone;
    },

    /**
     * Deletes a gym by ID
     */
    deleteGym(id) {
      if (!id) return false;
      if (id === 'titan-forge') {
        // Rather than completely removing demo, we re-initialize it to pristine
        this.resetToDemo();
        return true;
      }

      try {
        localStorage.removeItem(DATA_PREFIX + id);
        let registry = this.getRegistry();
        registry = registry.filter(g => g.id !== id);
        this.saveRegistry(registry);

        if (this.getActiveGymId() === id) {
          this.setActiveGymId('titan-forge');
        }
        return true;
      } catch (e) {
        console.error('Failed to delete gym:', id, e);
        return false;
      }
    },

    /**
     * Resets Titan Forge Gym demo data back to pristine state
     */
    resetToDemo() {
      const pristine = JSON.parse(JSON.stringify(DEFAULT_DATA));
      pristine.id = 'titan-forge';
      pristine.isDemo = true;
      pristine.updatedAt = Date.now();
      
      localStorage.setItem(DATA_PREFIX + 'titan-forge', JSON.stringify(pristine));
      
      let registry = this.getRegistry();
      const idx = registry.findIndex(g => g.id === 'titan-forge');
      const entry = {
        id: 'titan-forge',
        name: pristine.basicInfo.name,
        isDemo: true,
        updatedAt: pristine.updatedAt
      };
      if (idx >= 0) registry[idx] = entry;
      else registry.unshift(entry);
      this.saveRegistry(registry);

      window.dispatchEvent(new CustomEvent('gymConfigChanged', { detail: pristine }));
      return pristine;
    },

    /**
     * Exports a gym config as a JSON string
     */
    exportGymJson(id) {
      const gym = this.getGym(id);
      return JSON.stringify(gym, null, 2);
    },

    /**
     * Imports a gym from a JSON string
     */
    importGymJson(jsonString) {
      try {
        const gym = JSON.parse(jsonString);
        if (!gym.basicInfo || !gym.basicInfo.name) {
          throw new Error('Invalid gym JSON format: missing basicInfo.name.');
        }
        if (!gym.id) {
          gym.id = gym.basicInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        return this.saveGym(gym);
      } catch (e) {
        console.error('Import gym error:', e);
        throw e;
      }
    },

    /**
     * Helper to build clean WhatsApp click-to-chat URL
     */
    buildWhatsAppUrl(phone, gymName, customPrompt) {
      if (!phone) return '#';
      const cleanPhone = String(phone).replace(/[^0-9]/g, '');
      const textTemplate = customPrompt || "Hi, I'm interested in joining {GYM_NAME}. Please share your membership plans and free trial details.";
      const filledText = textTemplate.replace(/{GYM_NAME}/g, gymName || 'the gym');
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(filledText)}`;
    },

    /**
     * Helper to build clean telephone tel: link
     */
    buildPhoneUrl(phone) {
      if (!phone) return '#';
      const clean = String(phone).replace(/[^0-9+]/g, '');
      return `tel:${clean}`;
    }
  };

  // Run initialization if in browser environment
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    GymStore.init();
  }

  window.GymStore = GymStore;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GymStore;
  }
})(typeof window !== 'undefined' ? window : global);
