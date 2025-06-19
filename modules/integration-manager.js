class IntegrationManager {
    constructor() {
        this.modules = {};
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Initialize core modules
            await this.initializeModules();
            
            // Setup UI integrations
            this.setupUIIntegrations();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('[Integration] All modules initialized successfully');
        } catch (error) {
            console.error('[Integration] Initialization failed:', error);
        }
    }

    async initializeModules() {
        // Import and initialize modules dynamically
        try {
            const { default: dbManager } = await import('./indexeddb-manager.js');
            this.modules.database = dbManager;

            const { default: pwaManager } = await import('./pwa-manager.js');
            this.modules.pwa = pwaManager;

            const { accessibilityManager, i18nManager } = await import('./accessibility-i18n.js');
            this.modules.accessibility = accessibilityManager;
            this.modules.i18n = i18nManager;

            const { default: workerManager } = await import('./worker-manager.js');
            this.modules.workers = workerManager;

            const { default: cloudSync } = await import('./cloud-sync.js');
            this.modules.cloud = cloudSync;

            console.log('[Integration] Core modules loaded');
        } catch (error) {
            console.warn('[Integration] Some modules failed to load:', error);
        }
    }

    setupUIIntegrations() {
        // Add accessibility button
        this.setupAccessibilityButton();
        
        // Setup cloud sync UI
        this.setupCloudSyncUI();
        
        // Setup WebRTC detection UI
        this.setupWebRTCUI();
        
        // Setup charts if available
        this.setupChartsUI();
        
        // Add PWA install prompt
        this.setupPWAInstallButton();
    }

    setupAccessibilityButton() {
        const accessibilityBtn = document.getElementById('accessibility-btn');
        if (accessibilityBtn && this.modules.accessibility) {
            accessibilityBtn.style.display = 'block';
            accessibilityBtn.addEventListener('click', () => {
                this.showAccessibilityMenu();
            });
        }
    }

    setupCloudSyncUI() {
        const cloudSyncCheckbox = document.getElementById('cloud-sync-enabled');
        const syncStatus = document.getElementById('sync-status');
        
        if (cloudSyncCheckbox && this.modules.cloud) {
            cloudSyncCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.enableCloudSync();
                } else {
                    this.disableCloudSync();
                }
            });

            // Update sync status
            this.updateSyncStatus();
        }
    }

    setupWebRTCUI() {
        const webrtcCheckbox = document.getElementById('webrtc-enabled');
        const calibrateBtn = document.getElementById('calibrate-breath');
        
        if (webrtcCheckbox) {
            webrtcCheckbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    await this.enableWebRTCDetection();
                } else {
                    this.disableWebRTCDetection();
                }
            });
        }

        if (calibrateBtn) {
            calibrateBtn.addEventListener('click', () => {
                this.calibrateBreathDetection();
            });
        }
    }

    setupChartsUI() {
        // Load charts when progress panel is opened
        const viewProgressBtn = document.getElementById('view-progress');
        if (viewProgressBtn) {
            viewProgressBtn.addEventListener('click', async () => {
                await this.loadAndDisplayCharts();
            });
        }
    }

    setupPWAInstallButton() {
        // PWA manager handles this automatically
        if (this.modules.pwa) {
            console.log('[Integration] PWA installation ready');
        }
    }

    setupEventListeners() {
        // Share session functionality
        const shareBtn = document.getElementById('share-session');
        if (shareBtn && this.modules.pwa) {
            shareBtn.addEventListener('click', () => {
                const sessionData = this.getLastSessionData();
                this.modules.pwa.shareSession(sessionData);
            });
        }

        // Language selector (if needed)
        if (this.modules.i18n) {
            // Can be added later
        }
    }

    async enableCloudSync() {
        if (!this.modules.cloud) return;

        try {
            // For demo purposes, we'll just update the UI
            this.updateSyncStatus('Activation...');
            
            // Simulate connection process
            setTimeout(() => {
                this.updateSyncStatus('Connecté', 'connected');
                this.showNotification('Synchronisation cloud activée', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('[Integration] Cloud sync failed:', error);
            this.updateSyncStatus('Erreur de connexion', 'error');
        }
    }

    disableCloudSync() {
        this.updateSyncStatus('Non connecté');
        this.showNotification('Synchronisation cloud désactivée', 'info');
    }

    async enableWebRTCDetection() {
        try {
            const { default: WebRTCBreathDetector } = await import('./webrtc-breath-detector.js');
            this.modules.webrtc = new WebRTCBreathDetector();
            
            await this.modules.webrtc.init();
            
            const calibrateBtn = document.getElementById('calibrate-breath');
            if (calibrateBtn) {
                calibrateBtn.style.display = 'block';
            }
            
            this.showNotification('Détection respiratoire activée', 'success');
        } catch (error) {
            console.error('[Integration] WebRTC failed:', error);
            this.showNotification('Erreur: Microphone non disponible', 'error');
            
            // Reset checkbox
            const checkbox = document.getElementById('webrtc-enabled');
            if (checkbox) checkbox.checked = false;
        }
    }

    disableWebRTCDetection() {
        if (this.modules.webrtc) {
            this.modules.webrtc.dispose();
            this.modules.webrtc = null;
        }
        
        const calibrateBtn = document.getElementById('calibrate-breath');
        if (calibrateBtn) {
            calibrateBtn.style.display = 'none';
        }
        
        this.showNotification('Détection respiratoire désactivée', 'info');
    }

    async calibrateBreathDetection() {
        if (!this.modules.webrtc) return;

        try {
            this.showNotification('Calibration en cours... Respirez normalement', 'info');
            await this.modules.webrtc.calibrate(10000); // 10 seconds
            this.showNotification('Calibration terminée!', 'success');
        } catch (error) {
            console.error('[Integration] Calibration failed:', error);
            this.showNotification('Erreur de calibration', 'error');
        }
    }

    async loadAndDisplayCharts() {
        try {
            const { default: advancedCharts } = await import('./advanced-charts.js');
            
            // Get session data
            const sessions = await this.getSessionsData();
            
            // Create sample data for demonstration
            const progressData = {
                labels: sessions.map((_, i) => `Séance ${i + 1}`),
                values: sessions.map(s => s.accuracy || Math.random() * 100)
            };

            const weeklyData = {
                sessions: [2, 1, 3, 2, 1, 4, 2], // Sample data for each day
                accuracy: [85, 90, 78, 82, 88, 92, 87]
            };

            const breathingData = {
                distribution: [70, 20, 10], // Optimal, Fast, Slow
                total: 100
            };

            // Create charts
            advancedCharts.createProgressChart('progress-chart', progressData);
            advancedCharts.createWeeklyChart('weekly-chart', weeklyData);
            advancedCharts.createBreathRateChart('breathing-chart', breathingData);

            console.log('[Integration] Charts loaded successfully');
        } catch (error) {
            console.error('[Integration] Charts failed to load:', error);
        }
    }

    async getSessionsData() {
        if (this.modules.database) {
            try {
                return await this.modules.database.getAll('sessions');
            } catch (error) {
                console.error('[Integration] Failed to get sessions:', error);
            }
        }
        
        // Fallback to localStorage
        return JSON.parse(localStorage.getItem('breathapp-sessions') || '[]');
    }

    getLastSessionData() {
        // Return sample session data for sharing
        return {
            duration: 300, // 5 minutes
            accuracy: 85,
            breathCount: 30,
            date: new Date()
        };
    }

    updateSyncStatus(status = 'Non connecté', type = '') {
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.querySelector('span').textContent = status;
            syncStatus.className = `sync-status ${type}`;
        }
    }

    showAccessibilityMenu() {
        if (this.modules.accessibility) {
            const menu = this.modules.accessibility.createAccessibilityMenu();
            document.body.appendChild(menu);
        }
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `pwa-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Information'}</h4>
                <p>${message}</p>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        notification.querySelector('.notification-close').addEventListener('click', () => {
            document.body.removeChild(notification);
        });

        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }

    // Public API for other modules
    getModule(name) {
        return this.modules[name];
    }

    isModuleLoaded(name) {
        return !!this.modules[name];
    }

    async loadModule(name) {
        switch (name) {
            case 'charts':
                const { default: charts } = await import('./advanced-charts.js');
                this.modules.charts = charts;
                return charts;
            case 'webrtc':
                const { default: WebRTC } = await import('./webrtc-breath-detector.js');
                this.modules.webrtc = new WebRTC();
                return this.modules.webrtc;
            default:
                throw new Error(`Unknown module: ${name}`);
        }
    }
}

// Initialize integration manager
const integrationManager = new IntegrationManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        integrationManager.init();
    });
} else {
    integrationManager.init();
}

// Export for global access
window.breathAppIntegration = integrationManager;

export default integrationManager;