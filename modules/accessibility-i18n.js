class AccessibilityManager {
    constructor() {
        this.currentTheme = 'auto';
        this.fontSize = 'normal';
        this.reducedMotion = false;
        this.highContrast = false;
        this.screenReader = false;
        this.keyboardNavigation = true;
        this.init();
    }

    init() {
        this.detectScreenReader();
        this.setupKeyboardNavigation();
        this.setupThemeDetection();
        this.setupMotionDetection();
        this.setupContrastDetection();
        this.setupFocusManagement();
        this.addARIALabels();
        this.loadSettings();
    }

    detectScreenReader() {
        this.screenReader = !!(
            navigator.userAgent.includes('NVDA') ||
            navigator.userAgent.includes('JAWS') ||
            navigator.userAgent.includes('VoiceOver') ||
            window.speechSynthesis ||
            document.querySelector('[aria-live]')
        );

        if (this.screenReader) {
            document.body.classList.add('screen-reader-active');
            this.announcePageLoad();
        }
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        document.addEventListener('focusin', (e) => {
            this.handleFocusIn(e);
        });

        document.addEventListener('focusout', (e) => {
            this.handleFocusOut(e);
        });

        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.textContent = 'Aller au contenu principal';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            z-index: 1000;
            border-radius: 4px;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });

        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    handleKeyboardNavigation(e) {
        const focusableElements = this.getFocusableElements();
        const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);

        switch (e.key) {
            case 'Tab':
                if (e.shiftKey && currentIndex === 0) {
                    e.preventDefault();
                    focusableElements[focusableElements.length - 1].focus();
                } else if (!e.shiftKey && currentIndex === focusableElements.length - 1) {
                    e.preventDefault();
                    focusableElements[0].focus();
                }
                break;

            case 'Escape':
                this.closeModals();
                break;

            case 'Enter':
            case ' ':
                if (document.activeElement.hasAttribute('data-keyboard-action')) {
                    e.preventDefault();
                    document.activeElement.click();
                }
                break;

            case 'ArrowUp':
            case 'ArrowDown':
                if (document.activeElement.getAttribute('role') === 'menuitem') {
                    e.preventDefault();
                    this.navigateMenu(e.key === 'ArrowUp' ? -1 : 1);
                }
                break;
        }
    }

    getFocusableElements() {
        return document.querySelectorAll(
            'a[href], button:not([disabled]), textarea:not([disabled]), ' +
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
            '[tabindex]:not([tabindex="-1"])'
        );
    }

    handleFocusIn(e) {
        e.target.classList.add('focused');
        
        if (this.screenReader) {
            this.announceElement(e.target);
        }
    }

    handleFocusOut(e) {
        e.target.classList.remove('focused');
    }

    closeModals() {
        const openModals = document.querySelectorAll('[role="dialog"]:not([hidden])');
        openModals.forEach(modal => {
            const closeBtn = modal.querySelector('[data-dismiss]');
            if (closeBtn) closeBtn.click();
        });
    }

    navigateMenu(direction) {
        const menuItems = document.querySelectorAll('[role="menuitem"]');
        const currentIndex = Array.from(menuItems).indexOf(document.activeElement);
        const nextIndex = (currentIndex + direction + menuItems.length) % menuItems.length;
        menuItems[nextIndex].focus();
    }

    setupThemeDetection() {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)');

        const updateTheme = () => {
            if (this.currentTheme === 'auto') {
                if (darkModeQuery.matches) {
                    this.applyTheme('dark');
                } else {
                    this.applyTheme('light');
                }
            }
        };

        darkModeQuery.addEventListener('change', updateTheme);
        lightModeQuery.addEventListener('change', updateTheme);
        updateTheme();
    }

    setupMotionDetection() {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const updateMotion = () => {
            this.reducedMotion = motionQuery.matches;
            this.applyMotionPreferences();
        };

        motionQuery.addEventListener('change', updateMotion);
        updateMotion();
    }

    setupContrastDetection() {
        const contrastQuery = window.matchMedia('(prefers-contrast: high)');
        
        const updateContrast = () => {
            this.highContrast = contrastQuery.matches;
            this.applyContrastPreferences();
        };

        contrastQuery.addEventListener('change', updateContrast);
        updateContrast();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--primary-color', '#D4B26A');
            document.documentElement.style.setProperty('--dark-color', '#F2F2F2');
            document.documentElement.style.setProperty('--light-color', '#0D0D0D');
            document.documentElement.style.setProperty('--bg-color', 'rgba(212, 178, 106, 0.1)');
        } else {
            document.documentElement.style.setProperty('--primary-color', '#A68A56');
            document.documentElement.style.setProperty('--dark-color', '#0D0D0D');
            document.documentElement.style.setProperty('--light-color', '#F2F2F2');
            document.documentElement.style.setProperty('--bg-color', 'rgba(140, 117, 73, 0.1)');
        }
    }

    applyMotionPreferences() {
        if (this.reducedMotion) {
            document.documentElement.style.setProperty('--animation-duration', '0.01s');
            document.documentElement.style.setProperty('--transition-duration', '0.01s');
            document.body.classList.add('reduced-motion');
        } else {
            document.documentElement.style.removeProperty('--animation-duration');
            document.documentElement.style.removeProperty('--transition-duration');
            document.body.classList.remove('reduced-motion');
        }
    }

    applyContrastPreferences() {
        if (this.highContrast) {
            document.body.classList.add('high-contrast');
            document.documentElement.style.setProperty('--primary-color', '#000000');
            document.documentElement.style.setProperty('--dark-color', '#000000');
            document.documentElement.style.setProperty('--light-color', '#FFFFFF');
        } else {
            document.body.classList.remove('high-contrast');
        }
    }

    setupFocusManagement() {
        const style = document.createElement('style');
        style.textContent = `
            .focused, :focus {
                outline: 3px solid var(--primary-color) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
            }
            
            .skip-link:focus {
                position: absolute !important;
                top: 6px !important;
            }
            
            .screen-reader-active .sr-only {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                padding: 0 !important;
                margin: -1px !important;
                overflow: hidden !important;
                clip: rect(0, 0, 0, 0) !important;
                white-space: nowrap !important;
                border: 0 !important;
            }
            
            .high-contrast * {
                border-color: #000000 !important;
                color: #000000 !important;
                background-color: #FFFFFF !important;
            }
            
            .high-contrast button, .high-contrast .primary-btn {
                background-color: #000000 !important;
                color: #FFFFFF !important;
                border: 2px solid #000000 !important;
            }
        `;
        document.head.appendChild(style);
    }

    addARIALabels() {
        const elements = [
            { selector: '#start-btn', label: 'Démarrer ou arrêter la séance de respiration', role: 'button' },
            { selector: '#settings-btn', label: 'Ouvrir les paramètres', role: 'button' },
            { selector: '#circle', label: 'Cercle de respiration', role: 'img' },
            { selector: '#instruction', label: 'Instructions de respiration', role: 'status', live: 'polite' },
            { selector: '#breath-counter', label: 'Compteur de respirations', role: 'status', live: 'polite' },
            { selector: '#progress-circle', label: 'Progression de la séance', role: 'progressbar' },
            { selector: '#settings-panel', label: 'Panneau de paramètres', role: 'dialog' },
            { selector: '#progress-panel', label: 'Panneau de progression', role: 'dialog' }
        ];

        elements.forEach(({ selector, label, role, live }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.setAttribute('aria-label', label);
                if (role) element.setAttribute('role', role);
                if (live) element.setAttribute('aria-live', live);
                
                if (role === 'button' && !element.hasAttribute('tabindex')) {
                    element.setAttribute('tabindex', '0');
                    element.setAttribute('data-keyboard-action', 'true');
                }
            }
        });

        this.addLandmarks();
        this.addHeadings();
    }

    addLandmarks() {
        const header = document.querySelector('header');
        if (header) header.setAttribute('role', 'banner');

        const main = document.querySelector('main');
        if (main) {
            main.setAttribute('role', 'main');
            main.setAttribute('id', 'main');
        }

        const footer = document.querySelector('footer');
        if (footer) footer.setAttribute('role', 'contentinfo');

        const nav = document.querySelector('nav');
        if (nav) nav.setAttribute('role', 'navigation');
    }

    addHeadings() {
        const title = document.querySelector('.brand-name');
        if (title && !title.closest('h1')) {
            title.setAttribute('role', 'heading');
            title.setAttribute('aria-level', '1');
        }

        const settingsSections = document.querySelectorAll('.settings-section h4');
        settingsSections.forEach(heading => {
            heading.setAttribute('role', 'heading');
            heading.setAttribute('aria-level', '2');
        });
    }

    announcePageLoad() {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'BreathApp chargée. Application de cohérence cardiaque prête à utiliser.';
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 3000);
    }

    announceElement(element) {
        const announcement = element.getAttribute('aria-label') || 
                           element.textContent || 
                           element.getAttribute('title') || 
                           'Élément focalisé';

        this.announce(announcement);
    }

    announce(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 2000);
    }

    setFontSize(size) {
        this.fontSize = size;
        const multipliers = {
            'small': 0.875,
            'normal': 1,
            'large': 1.125,
            'x-large': 1.25
        };

        const multiplier = multipliers[size] || 1;
        document.documentElement.style.setProperty('--font-size-multiplier', multiplier);
        this.saveSettings();
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme(theme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);
        this.saveSettings();
    }

    toggleReducedMotion() {
        this.reducedMotion = !this.reducedMotion;
        this.applyMotionPreferences();
        this.saveSettings();
    }

    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        this.applyContrastPreferences();
        this.saveSettings();
    }

    saveSettings() {
        const settings = {
            theme: this.currentTheme,
            fontSize: this.fontSize,
            reducedMotion: this.reducedMotion,
            highContrast: this.highContrast
        };
        localStorage.setItem('breathapp-accessibility', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('breathapp-accessibility') || '{}');
            this.currentTheme = settings.theme || 'auto';
            this.fontSize = settings.fontSize || 'normal';
            this.reducedMotion = settings.reducedMotion || false;
            this.highContrast = settings.highContrast || false;

            this.setFontSize(this.fontSize);
            this.setTheme(this.currentTheme);
            this.applyMotionPreferences();
            this.applyContrastPreferences();
        } catch (error) {
            console.error('[Accessibility] Failed to load settings:', error);
        }
    }

    createAccessibilityMenu() {
        const menu = document.createElement('div');
        menu.className = 'accessibility-menu';
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-label', 'Options d\'accessibilité');
        menu.innerHTML = `
            <div class="accessibility-header">
                <h3>Accessibilité</h3>
                <button class="close-accessibility" aria-label="Fermer le menu d'accessibilité">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="accessibility-options">
                <div class="option-group">
                    <label>Taille du texte</label>
                    <select id="font-size-select" aria-label="Taille du texte">
                        <option value="small">Petit</option>
                        <option value="normal">Normal</option>
                        <option value="large">Grand</option>
                        <option value="x-large">Très grand</option>
                    </select>
                </div>
                <div class="option-group">
                    <label>Thème</label>
                    <select id="theme-select" aria-label="Thème d'affichage">
                        <option value="auto">Automatique</option>
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                    </select>
                </div>
                <div class="option-group">
                    <label>
                        <input type="checkbox" id="reduced-motion" aria-label="Réduire les animations">
                        Réduire les animations
                    </label>
                </div>
                <div class="option-group">
                    <label>
                        <input type="checkbox" id="high-contrast" aria-label="Contraste élevé">
                        Contraste élevé
                    </label>
                </div>
            </div>
        `;

        this.setupAccessibilityMenuEvents(menu);
        return menu;
    }

    setupAccessibilityMenuEvents(menu) {
        const fontSizeSelect = menu.querySelector('#font-size-select');
        const themeSelect = menu.querySelector('#theme-select');
        const reducedMotionCheck = menu.querySelector('#reduced-motion');
        const highContrastCheck = menu.querySelector('#high-contrast');
        const closeBtn = menu.querySelector('.close-accessibility');

        fontSizeSelect.value = this.fontSize;
        themeSelect.value = this.currentTheme;
        reducedMotionCheck.checked = this.reducedMotion;
        highContrastCheck.checked = this.highContrast;

        fontSizeSelect.addEventListener('change', (e) => {
            this.setFontSize(e.target.value);
        });

        themeSelect.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        reducedMotionCheck.addEventListener('change', () => {
            this.toggleReducedMotion();
        });

        highContrastCheck.addEventListener('change', () => {
            this.toggleHighContrast();
        });

        closeBtn.addEventListener('click', () => {
            document.body.removeChild(menu);
        });
    }
}

class InternationalizationManager {
    constructor() {
        this.currentLang = 'fr';
        this.supportedLangs = ['fr', 'en', 'es', 'de', 'it'];
        this.translations = {};
        this.dateTimeFormats = {};
        this.numberFormats = {};
        this.init();
    }

    init() {
        this.detectLanguage();
        this.loadTranslations();
        this.setupDateTimeFormats();
        this.setupNumberFormats();
    }

    detectLanguage() {
        const urlLang = new URLSearchParams(window.location.search).get('lang');
        const storedLang = localStorage.getItem('breathapp-language');
        const browserLang = navigator.language.split('-')[0];

        this.currentLang = urlLang || storedLang || browserLang;

        if (!this.supportedLangs.includes(this.currentLang)) {
            this.currentLang = 'fr';
        }

        document.documentElement.setAttribute('lang', this.currentLang);
    }

    async loadTranslations() {
        const translations = {
            fr: {
                'app.title': 'Breath.App',
                'app.subtitle': 'Cohérence Cardiaque',
                'session.start': 'Commencer',
                'session.stop': 'Arrêter',
                'session.instruction.inhale': 'Inspirer',
                'session.instruction.exhale': 'Expirer',
                'session.instruction.finished': 'Terminé',
                'session.click_to_start': 'Click to Start',
                'session.today_sessions': 'séances aujourd\'hui',
                'session.complete': 'Séance terminée !',
                'session.continue': 'Continuer',
                'settings.title': 'Paramètres',
                'settings.reminders': 'Rappels',
                'settings.audio': 'Audio',
                'settings.progress': 'Progression',
                'settings.close': 'Fermer',
                'audio.enabled': 'Guidage sonore',
                'audio.volume': 'Volume',
                'audio.rhythm': 'Rythme',
                'audio.rhythm.standard': 'Standard (5s/5s)',
                'audio.rhythm.slow': 'Lent (6s/6s)',
                'audio.rhythm.fast': 'Rapide (4s/4s)',
                'progress.view_history': 'Voir l\'historique',
                'progress.today': 'Aujourd\'hui',
                'progress.week': 'Semaine',
                'progress.month': 'Mois',
                'footer.text': 'Pratiquez la cohérence cardiaque 5minutes 3 fois par jour pour réduire le stress, l\'anxiété et améliorer votre bien-être.'
            },
            en: {
                'app.title': 'Breath.App',
                'app.subtitle': 'Cardiac Coherence',
                'session.start': 'Start',
                'session.stop': 'Stop',
                'session.instruction.inhale': 'Breathe In',
                'session.instruction.exhale': 'Breathe Out',
                'session.instruction.finished': 'Finished',
                'session.click_to_start': 'Click to Start',
                'session.today_sessions': 'sessions today',
                'session.complete': 'Session Complete!',
                'session.continue': 'Continue',
                'settings.title': 'Settings',
                'settings.reminders': 'Reminders',
                'settings.audio': 'Audio',
                'settings.progress': 'Progress',
                'settings.close': 'Close',
                'audio.enabled': 'Audio Guide',
                'audio.volume': 'Volume',
                'audio.rhythm': 'Rhythm',
                'audio.rhythm.standard': 'Standard (5s/5s)',
                'audio.rhythm.slow': 'Slow (6s/6s)',
                'audio.rhythm.fast': 'Fast (4s/4s)',
                'progress.view_history': 'View History',
                'progress.today': 'Today',
                'progress.week': 'Week',
                'progress.month': 'Month',
                'footer.text': 'Practice cardiac coherence 5 minutes 3 times a day to reduce stress, anxiety and improve your well-being.'
            },
            es: {
                'app.title': 'Breath.App',
                'app.subtitle': 'Coherencia Cardíaca',
                'session.start': 'Empezar',
                'session.stop': 'Parar',
                'session.instruction.inhale': 'Inspirar',
                'session.instruction.exhale': 'Espirar',
                'session.instruction.finished': 'Terminado',
                'session.click_to_start': 'Clic para empezar',
                'session.today_sessions': 'sesiones hoy',
                'session.complete': '¡Sesión completada!',
                'session.continue': 'Continuar',
                'settings.title': 'Configuración',
                'settings.reminders': 'Recordatorios',
                'settings.audio': 'Audio',
                'settings.progress': 'Progreso',
                'settings.close': 'Cerrar',
                'audio.enabled': 'Guía de audio',
                'audio.volume': 'Volumen',
                'audio.rhythm': 'Ritmo',
                'audio.rhythm.standard': 'Estándar (5s/5s)',
                'audio.rhythm.slow': 'Lento (6s/6s)',
                'audio.rhythm.fast': 'Rápido (4s/4s)',
                'progress.view_history': 'Ver historial',
                'progress.today': 'Hoy',
                'progress.week': 'Semana',
                'progress.month': 'Mes',
                'footer.text': 'Practica la coherencia cardíaca 5 minutos 3 veces al día para reducir el estrés, la ansiedad y mejorar tu bienestar.'
            }
        };

        this.translations = translations[this.currentLang] || translations.fr;
    }

    setupDateTimeFormats() {
        this.dateTimeFormats = {
            short: new Intl.DateTimeFormat(this.currentLang, {
                day: 'numeric',
                month: 'short'
            }),
            medium: new Intl.DateTimeFormat(this.currentLang, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }),
            long: new Intl.DateTimeFormat(this.currentLang, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
            time: new Intl.DateTimeFormat(this.currentLang, {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    }

    setupNumberFormats() {
        this.numberFormats = {
            integer: new Intl.NumberFormat(this.currentLang),
            decimal: new Intl.NumberFormat(this.currentLang, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }),
            percent: new Intl.NumberFormat(this.currentLang, {
                style: 'percent',
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
            }),
            duration: new Intl.NumberFormat(this.currentLang, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            })
        };
    }

    t(key, params = {}) {
        let translation = this.translations[key] || key;
        
        Object.keys(params).forEach(param => {
            translation = translation.replace(new RegExp(`{${param}}`, 'g'), params[param]);
        });

        return translation;
    }

    formatDate(date, format = 'medium') {
        const formatter = this.dateTimeFormats[format];
        return formatter ? formatter.format(date) : date.toString();
    }

    formatNumber(number, format = 'integer') {
        const formatter = this.numberFormats[format];
        return formatter ? formatter.format(number) : number.toString();
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (this.currentLang === 'en') {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${minutes}min ${remainingSeconds}s`;
        }
    }

    async setLanguage(lang) {
        if (!this.supportedLangs.includes(lang)) {
            console.warn(`[i18n] Language ${lang} not supported`);
            return false;
        }

        this.currentLang = lang;
        document.documentElement.setAttribute('lang', lang);
        localStorage.setItem('breathapp-language', lang);
        
        await this.loadTranslations();
        this.setupDateTimeFormats();
        this.setupNumberFormats();
        this.updatePageTexts();
        
        return true;
    }

    updatePageTexts() {
        const elementsToTranslate = [
            { selector: '.brand-name', key: 'app.title' },
            { selector: '#session-title', key: 'session.click_to_start' },
            { selector: 'footer p', key: 'footer.text' }
        ];

        elementsToTranslate.forEach(({ selector, key }) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = this.t(key);
            }
        });

        const dynamicElements = document.querySelectorAll('[data-i18n]');
        dynamicElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });
    }

    createLanguageSelector() {
        const selector = document.createElement('select');
        selector.className = 'language-selector';
        selector.setAttribute('aria-label', 'Choisir la langue');

        const languages = {
            fr: 'Français',
            en: 'English',
            es: 'Español',
            de: 'Deutsch',
            it: 'Italiano'
        };

        Object.entries(languages).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            option.selected = code === this.currentLang;
            selector.appendChild(option);
        });

        selector.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        return selector;
    }

    getSupportedLanguages() {
        return this.supportedLangs;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }
}

const accessibilityManager = new AccessibilityManager();
const i18nManager = new InternationalizationManager();

window.addEventListener('load', () => {
    i18nManager.updatePageTexts();
});

export { accessibilityManager, i18nManager };