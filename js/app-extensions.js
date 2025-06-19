// Extensions principales - BreathApp
// Intégration harmonieuse des nouvelles fonctionnalités

class BreathAppExtensions {
    constructor() {
        this.isInitialized = false;
        this.currentSession = null;
        this.originalStartBreathing = null;
        this.originalStopBreathing = null;
        this.init();
    }

    // Initialiser toutes les extensions
    async init() {
        if (this.isInitialized) return;

        try {
            // Attendre que tous les modules soient chargés
            await this.waitForModules();
            
            // Initialiser les modules
            await this.initializeModules();
            
            // Configurer l'interface utilisateur
            this.setupUI();
            
            // Intégrer avec l'application existante
            this.integrateWithExistingApp();
            
            // Charger les données initiales
            this.loadInitialData();
            
            this.isInitialized = true;
            console.log('BreathApp Extensions initialisées');
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des extensions:', error);
        }
    }

    // Attendre que tous les modules soient disponibles
    async waitForModules() {
        const checkModules = () => {
            return typeof reminderManager !== 'undefined' &&
                   typeof breathCounter !== 'undefined' &&
                   typeof progressTracker !== 'undefined' &&
                   typeof audioGuide !== 'undefined';
        };

        if (checkModules()) return;

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (checkModules()) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    // Initialiser tous les modules
    async initializeModules() {
        // Initialiser le système de rappels
        await reminderManager.initialize();
        
        // Initialiser le guide audio
        await audioGuide.resumeAudioContext();
        
        console.log('Modules initialisés');
    }

    // Configurer l'interface utilisateur
    setupUI() {
        // Bouton paramètres
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // Fermer les panneaux
        const closeSettings = document.getElementById('close-settings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.hideSettings());
        }

        const closeProgress = document.getElementById('close-progress');
        if (closeProgress) {
            closeProgress.addEventListener('click', () => this.hideProgress());
        }

        // Bouton voir progression
        const viewProgress = document.getElementById('view-progress');
        if (viewProgress) {
            viewProgress.addEventListener('click', () => this.showProgress());
        }

        // Overlay de fin de session
        const closeSessionComplete = document.getElementById('close-session-complete');
        if (closeSessionComplete) {
            closeSessionComplete.addEventListener('click', () => this.hideSessionComplete());
        }

        // Onglets de progression
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.target.dataset.period;
                this.updateProgressTab(period);
            });
        });

        // Paramètres audio
        this.setupAudioSettings();
        
        // Paramètres des rappels
        this.setupReminderSettings();
    }

    // Configurer les paramètres audio
    setupAudioSettings() {
        const audioEnabled = document.getElementById('audio-enabled');
        const audioVolume = document.getElementById('audio-volume');
        const audioRhythm = document.getElementById('audio-rhythm');

        if (audioEnabled) {
            audioEnabled.checked = audioGuide.isAudioEnabled();
            audioEnabled.addEventListener('change', () => {
                audioGuide.toggleAudio();
            });
        }

        if (audioVolume) {
            audioVolume.value = audioGuide.getVolume() * 100;
            audioVolume.addEventListener('input', (e) => {
                audioGuide.setVolume(e.target.value / 100);
            });
        }

        if (audioRhythm) {
            audioRhythm.value = audioGuide.getCurrentRhythm().name;
            audioRhythm.addEventListener('change', (e) => {
                audioGuide.setRhythm(e.target.value);
            });
        }
    }

    // Configurer les paramètres de rappels
    setupReminderSettings() {
        const remindersConfig = document.getElementById('reminders-config');
        if (!remindersConfig) return;

        const reminders = reminderManager.getReminders();
        remindersConfig.innerHTML = reminders.map(reminder => `
            <div class="reminder-item">
                <div>
                    <div class="reminder-time">${reminder.time}</div>
                    <div class="reminder-label">${reminder.label}</div>
                </div>
                <input type="checkbox" class="reminder-toggle" 
                       data-id="${reminder.id}" 
                       ${reminder.active ? 'checked' : ''}>
            </div>
        `).join('');

        // Événements pour les toggles
        const toggles = remindersConfig.querySelectorAll('.reminder-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                reminderManager.toggleReminder(id);
            });
        });
    }

    // Intégrer avec l'application existante
    integrateWithExistingApp() {
        // Sauvegarder les fonctions originales
        this.originalStartBreathing = window.startBreathing;
        this.originalStopBreathing = window.stopBreathing;

        // Remplacer par nos versions étendues
        window.startBreathing = () => this.startBreathingExtended();
        window.stopBreathing = () => this.stopBreathingExtended();

        // Étendre les fonctions de respiration
        this.extendBreathingFunctions();
    }

    // Étendre les fonctions de respiration
    extendBreathingFunctions() {
        const originalBreatheIn = window.breatheIn;
        const originalBreatheOut = window.breatheOut;

        if (originalBreatheIn) {
            window.breatheIn = () => {
                originalBreatheIn();
                
                // Ajouter le comptage et l'audio
                breathCounter.incrementBreath();
                if (audioGuide.isAudioEnabled()) {
                    audioGuide.playBreatheIn();
                }
            };
        }

        if (originalBreatheOut) {
            window.breatheOut = () => {
                originalBreatheOut();
                
                // Ajouter l'audio
                if (audioGuide.isAudioEnabled()) {
                    audioGuide.playBreatheOut();
                }
            };
        }
    }

    // Version étendue de startBreathing
    startBreathingExtended() {
        // Démarrer la session de progression
        this.currentSession = progressTracker.startSession();
        
        // Démarrer le compteur
        breathCounter.startSession();
        
        // Réactiver le contexte audio si nécessaire
        audioGuide.resumeAudioContext();
        
        // Appeler la fonction originale
        if (this.originalStartBreathing) {
            this.originalStartBreathing();
        }
        
        // Mettre à jour l'interface
        this.updateSessionInfo();
    }

    // Version étendue de stopBreathing
    stopBreathingExtended() {
        // Appeler la fonction originale
        if (this.originalStopBreathing) {
            this.originalStopBreathing();
        }
        
        // Arrêter le compteur et obtenir les données
        const breathData = breathCounter.stopSession();
        
        // Terminer la session de progression
        const sessionData = progressTracker.endSession(breathData);
        
        // Son de fin si activé
        if (audioGuide.isAudioEnabled()) {
            audioGuide.playSessionComplete();
        }
        
        // Afficher les résultats si la session était complète
        if (sessionData && sessionData.completed) {
            this.showSessionResults(sessionData, breathData);
        }
        
        // Réinitialiser
        this.currentSession = null;
        breathCounter.reset();
        
        // Mettre à jour l'interface
        this.updateSessionInfo();
    }

    // Charger les données initiales
    loadInitialData() {
        this.updateSessionInfo();
        this.updateProgressSummary();
    }

    // Mettre à jour les informations de session
    updateSessionInfo() {
        const sessionInfo = document.getElementById('session-info');
        const todaySessionsElement = document.getElementById('today-sessions');
        
        if (sessionInfo && todaySessionsElement) {
            const todaySessions = progressTracker.getTodaySessions();
            const completedToday = todaySessions.filter(s => s.completed).length;
            
            todaySessionsElement.textContent = completedToday;
            sessionInfo.style.display = completedToday > 0 ? 'block' : 'none';
        }
    }

    // Afficher les paramètres
    showSettings() {
        const panel = document.getElementById('settings-panel');
        if (panel) {
            // Actualiser les données avant d'afficher
            this.setupReminderSettings();
            this.updateProgressSummary();
            panel.style.display = 'flex';
        }
    }

    // Masquer les paramètres
    hideSettings() {
        const panel = document.getElementById('settings-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // Afficher la progression
    showProgress() {
        const panel = document.getElementById('progress-panel');
        if (panel) {
            panel.style.display = 'flex';
            this.updateProgressTab('today');
        }
    }

    // Masquer la progression
    hideProgress() {
        const panel = document.getElementById('progress-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    // Mettre à jour l'onglet de progression
    updateProgressTab(period) {
        // Mettre à jour les onglets actifs
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });

        // Obtenir les statistiques
        const stats = progressTracker.getStatistics(period);
        const sessions = this.getSessionsByPeriod(period);

        // Mettre à jour le contenu
        const content = document.getElementById('progress-content');
        if (content) {
            content.innerHTML = this.generateProgressContent(stats, sessions, period);
        }
    }

    // Obtenir les sessions par période
    getSessionsByPeriod(period) {
        switch (period) {
            case 'today':
                return progressTracker.getTodaySessions();
            case 'week':
                return progressTracker.getWeekSessions();
            case 'month':
                return progressTracker.getMonthSessions();
            default:
                return progressTracker.getAllSessions();
        }
    }

    // Générer le contenu de progression
    generateProgressContent(stats, sessions, period) {
        const periodLabel = {
            today: "aujourd'hui",
            week: "cette semaine",
            month: "ce mois"
        }[period];

        return `
            <div class="progress-summary">
                <div class="progress-stat">
                    <span class="progress-stat-value">${stats.totalSessions}</span>
                    <span class="progress-stat-label">Séances</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-value">${stats.completedSessions}</span>
                    <span class="progress-stat-label">Complètes</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-value">${stats.completionRate}%</span>
                    <span class="progress-stat-label">Taux</span>
                </div>
                <div class="progress-stat">
                    <span class="progress-stat-value">${Math.round(stats.totalDuration / 60)}min</span>
                    <span class="progress-stat-label">Durée</span>
                </div>
            </div>
            
            ${sessions.length > 0 ? `
                <h4>Historique ${periodLabel}</h4>
                <div class="sessions-list">
                    ${sessions.slice(0, 10).map(session => `
                        <div class="session-item ${session.completed ? 'completed' : 'incomplete'}">
                            <div class="session-date">
                                ${new Date(session.date).toLocaleDateString('fr-FR')} 
                                ${new Date(session.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}
                            </div>
                            <div class="session-details">
                                ${Math.round(session.duration / 1000)}s
                                ${session.completed ? '✓' : '⚠️'}
                                ${session.accuracy > 0 ? `${session.accuracy}%` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `<p>Aucune séance ${periodLabel}</p>`}
        `;
    }

    // Mettre à jour le résumé de progression
    updateProgressSummary() {
        const summary = document.getElementById('progress-summary');
        if (!summary) return;

        const weekStats = progressTracker.getStatistics('week');
        const quickSummary = progressTracker.getQuickSummary();

        summary.innerHTML = `
            <div class="progress-stat">
                <span class="progress-stat-value">${quickSummary.today.completed}</span>
                <span class="progress-stat-label">Aujourd'hui</span>
            </div>
            <div class="progress-stat">
                <span class="progress-stat-value">${quickSummary.week.completed}</span>
                <span class="progress-stat-label">Cette semaine</span>
            </div>
            <div class="progress-stat">
                <span class="progress-stat-value">${weekStats.streak}</span>
                <span class="progress-stat-label">Série actuelle</span>
            </div>
            <div class="progress-stat">
                <span class="progress-stat-value">${weekStats.bestStreak}</span>
                <span class="progress-stat-label">Meilleure série</span>
            </div>
        `;
    }

    // Afficher les résultats de session
    showSessionResults(sessionData, breathData) {
        const overlay = document.getElementById('session-complete');
        const results = document.getElementById('session-results');
        
        if (overlay && results) {
            results.innerHTML = `
                <div class="result-item">
                    <span class="result-value">${Math.round(sessionData.duration / 1000)}s</span>
                    <span class="result-label">Durée</span>
                </div>
                <div class="result-item">
                    <span class="result-value">${breathData.totalBreaths || 0}</span>
                    <span class="result-label">Respirations</span>
                </div>
                <div class="result-item">
                    <span class="result-value">${breathData.accuracy || 0}%</span>
                    <span class="result-label">Précision</span>
                </div>
                <div class="result-item">
                    <span class="result-value">${breathData.averageRpm || 0}</span>
                    <span class="result-label">RPM moyen</span>
                </div>
            `;
            
            overlay.style.display = 'flex';
        }
    }

    // Masquer les résultats de session
    hideSessionComplete() {
        const overlay = document.getElementById('session-complete');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Nettoyer les ressources
    cleanup() {
        if (audioGuide) {
            audioGuide.cleanup();
        }
    }
}

// Initialisation automatique quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    window.breathAppExtensions = new BreathAppExtensions();
});

// Nettoyer lors de la fermeture
window.addEventListener('beforeunload', () => {
    if (window.breathAppExtensions) {
        window.breathAppExtensions.cleanup();
    }
});

// Gérer la fermeture des panneaux avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const settingsPanel = document.getElementById('settings-panel');
        const progressPanel = document.getElementById('progress-panel');
        const sessionComplete = document.getElementById('session-complete');
        
        if (settingsPanel && settingsPanel.style.display === 'flex') {
            window.breathAppExtensions?.hideSettings();
        } else if (progressPanel && progressPanel.style.display === 'flex') {
            window.breathAppExtensions?.hideProgress();
        } else if (sessionComplete && sessionComplete.style.display === 'flex') {
            window.breathAppExtensions?.hideSessionComplete();
        }
    }
});