class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isOnline = navigator.onLine;
        this.installButton = null;
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupNetworkListeners();
        this.setupUrlActions();
        this.createInstallUI();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                this.showUpdateAvailable();
                            }
                        }
                    });
                });

                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });

                console.log('[PWA] Service Worker registered successfully');
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.hideInstallButton();
            this.showInstallSuccess();
            this.deferredPrompt = null;
        });
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNetworkStatus('Connexion rétablie', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNetworkStatus('Mode hors ligne', 'warning');
        });
    }

    setupUrlActions() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');

        switch (action) {
            case 'start':
                this.startBreathingSession();
                break;
            case 'stats':
                this.showStats();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    }

    createInstallUI() {
        if (this.isInstallable()) {
            this.installButton = document.createElement('button');
            this.installButton.innerHTML = `
                <i class="fas fa-download"></i>
                <span>Installer l'app</span>
            `;
            this.installButton.className = 'install-button';
            this.installButton.style.display = 'none';
            this.installButton.addEventListener('click', () => this.promptInstall());

            const header = document.querySelector('header .header-content');
            if (header) {
                header.appendChild(this.installButton);
            }
        }
    }

    isInstallable() {
        return 'standalone' in window.navigator || 
               window.matchMedia('(display-mode: standalone)').matches ||
               this.deferredPrompt !== null;
    }

    showInstallButton() {
        if (this.installButton && !this.isStandalone()) {
            this.installButton.style.display = 'flex';
        }
    }

    hideInstallButton() {
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }
    }

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    async promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('[PWA] User accepted the install prompt');
            } else {
                console.log('[PWA] User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            this.hideInstallButton();
        }
    }

    showInstallSuccess() {
        this.showNotification(
            'Application installée!', 
            'BreathApp est maintenant disponible sur votre écran d\'accueil',
            'success'
        );
    }

    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <i class="fas fa-sync-alt"></i>
                <span>Nouvelle version disponible</span>
                <button class="update-btn">Mettre à jour</button>
                <button class="update-dismiss">Plus tard</button>
            </div>
        `;

        updateBanner.querySelector('.update-btn').addEventListener('click', () => {
            window.location.reload();
        });

        updateBanner.querySelector('.update-dismiss').addEventListener('click', () => {
            document.body.removeChild(updateBanner);
        });

        document.body.appendChild(updateBanner);
    }

    showNetworkStatus(message, type) {
        const statusBar = document.getElementById('network-status') || this.createNetworkStatusBar();
        statusBar.textContent = message;
        statusBar.className = `network-status ${type}`;
        statusBar.style.display = 'block';

        setTimeout(() => {
            statusBar.style.display = 'none';
        }, 3000);
    }

    createNetworkStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.id = 'network-status';
        statusBar.className = 'network-status';
        document.body.appendChild(statusBar);
        return statusBar;
    }

    showNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `pwa-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <h4>${title}</h4>
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

    handleServiceWorkerMessage(data) {
        switch (data.action) {
            case 'start-breathing':
                this.startBreathingSession();
                break;
            case 'show-stats':
                this.showStats();
                break;
            default:
                console.log('[PWA] Unknown service worker message:', data);
        }
    }

    startBreathingSession() {
        const startBtn = document.getElementById('start-btn');
        if (startBtn && typeof window.startBreathing === 'function') {
            window.startBreathing();
        }
    }

    showStats() {
        const progressBtn = document.getElementById('view-progress');
        if (progressBtn) {
            progressBtn.click();
        }
    }

    showSettings() {
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.click();
        }
    }

    async shareSession(sessionData) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Ma séance BreathApp',
                    text: `J'ai terminé une séance de ${Math.round(sessionData.duration/60)} minutes avec ${Math.round(sessionData.accuracy)}% de précision!`,
                    url: window.location.origin
                });
            } catch (error) {
                console.log('[PWA] Sharing failed:', error);
                this.fallbackShare(sessionData);
            }
        } else {
            this.fallbackShare(sessionData);
        }
    }

    fallbackShare(sessionData) {
        const shareText = `J'ai terminé une séance BreathApp de ${Math.round(sessionData.duration/60)} minutes avec ${Math.round(sessionData.accuracy)}% de précision! ${window.location.origin}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showNotification('Copié!', 'Le texte a été copié dans le presse-papiers', 'success');
            });
        }
    }

    enableFullscreen() {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    async addToHomeScreen() {
        if (this.deferredPrompt) {
            return this.promptInstall();
        }

        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') {
                this.showNotification(
                    'Autorisations accordées', 
                    'L\'application peut maintenant utiliser les capteurs de mouvement',
                    'success'
                );
            }
        }
    }

    getDeviceInfo() {
        return {
            isStandalone: this.isStandalone(),
            isOnline: this.isOnline,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }
}

const pwaManager = new PWAManager();

window.addEventListener('load', () => {
    console.log('[PWA] Application loaded in', pwaManager.isStandalone() ? 'standalone' : 'browser', 'mode');
});

export default pwaManager;