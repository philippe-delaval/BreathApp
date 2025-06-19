class CloudSync {
    constructor() {
        this.apiUrl = 'https://api.breathapp.example.com';
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.syncInProgress = false;
        this.userId = null;
        this.deviceId = this.generateDeviceId();
        this.encryptionKey = null;
        this.lastSync = null;
        this.init();
    }

    init() {
        this.setupNetworkListeners();
        this.loadSyncQueue();
        this.generateEncryptionKey();
        
        if (this.isOnline) {
            this.startPeriodicSync();
        }
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('[CloudSync] Network restored, starting sync...');
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('[CloudSync] Network lost, queuing operations...');
        });
    }

    generateDeviceId() {
        let deviceId = localStorage.getItem('breathapp-device-id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('breathapp-device-id', deviceId);
        }
        return deviceId;
    }

    async generateEncryptionKey() {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            try {
                const keyData = localStorage.getItem('breathapp-encryption-key');
                if (keyData) {
                    const keyBuffer = new Uint8Array(JSON.parse(keyData));
                    this.encryptionKey = await crypto.subtle.importKey(
                        'raw',
                        keyBuffer,
                        { name: 'AES-GCM' },
                        false,
                        ['encrypt', 'decrypt']
                    );
                } else {
                    this.encryptionKey = await crypto.subtle.generateKey(
                        { name: 'AES-GCM', length: 256 },
                        true,
                        ['encrypt', 'decrypt']
                    );
                    
                    const keyBuffer = await crypto.subtle.exportKey('raw', this.encryptionKey);
                    localStorage.setItem('breathapp-encryption-key', JSON.stringify(Array.from(new Uint8Array(keyBuffer))));
                }
                console.log('[CloudSync] Encryption key ready');
            } catch (error) {
                console.error('[CloudSync] Failed to generate encryption key:', error);
                this.encryptionKey = null;
            }
        }
    }

    async encryptData(data) {
        if (!this.encryptionKey) return JSON.stringify(data);

        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                this.encryptionKey,
                dataBuffer
            );
            
            return JSON.stringify({
                encrypted: Array.from(new Uint8Array(encryptedBuffer)),
                iv: Array.from(iv)
            });
        } catch (error) {
            console.error('[CloudSync] Encryption failed:', error);
            return JSON.stringify(data);
        }
    }

    async decryptData(encryptedData) {
        if (!this.encryptionKey) return JSON.parse(encryptedData);

        try {
            const { encrypted, iv } = JSON.parse(encryptedData);
            
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                this.encryptionKey,
                new Uint8Array(encrypted)
            );
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedBuffer));
        } catch (error) {
            console.error('[CloudSync] Decryption failed:', error);
            return JSON.parse(encryptedData);
        }
    }

    async authenticate(email, password) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, deviceId: this.deviceId })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.json();
            this.userId = data.userId;
            localStorage.setItem('breathapp-user-id', this.userId);
            localStorage.setItem('breathapp-auth-token', data.token);
            
            console.log('[CloudSync] Authentication successful');
            return true;
        } catch (error) {
            console.error('[CloudSync] Authentication failed:', error);
            return false;
        }
    }

    async register(email, password, name) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name, deviceId: this.deviceId })
            });

            if (!response.ok) {
                throw new Error(`Registration failed: ${response.status}`);
            }

            const data = await response.json();
            this.userId = data.userId;
            localStorage.setItem('breathapp-user-id', this.userId);
            localStorage.setItem('breathapp-auth-token', data.token);
            
            console.log('[CloudSync] Registration successful');
            return true;
        } catch (error) {
            console.error('[CloudSync] Registration failed:', error);
            return false;
        }
    }

    getAuthToken() {
        return localStorage.getItem('breathapp-auth-token');
    }

    isAuthenticated() {
        return this.getAuthToken() !== null && this.userId !== null;
    }

    async syncSessions(sessions) {
        if (!this.isAuthenticated()) {
            console.log('[CloudSync] Not authenticated, skipping sync');
            return false;
        }

        try {
            const encryptedSessions = await this.encryptData(sessions);
            
            if (this.isOnline) {
                return await this.uploadSessions(encryptedSessions);
            } else {
                this.queueOperation('sync_sessions', { sessions: encryptedSessions });
                return true;
            }
        } catch (error) {
            console.error('[CloudSync] Session sync failed:', error);
            return false;
        }
    }

    async uploadSessions(encryptedSessions) {
        try {
            const response = await fetch(`${this.apiUrl}/sessions/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    sessions: encryptedSessions,
                    deviceId: this.deviceId,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('[CloudSync] Sessions uploaded successfully');
            return result;
        } catch (error) {
            console.error('[CloudSync] Upload failed:', error);
            throw error;
        }
    }

    async downloadSessions() {
        if (!this.isAuthenticated() || !this.isOnline) {
            return null;
        }

        try {
            const response = await fetch(`${this.apiUrl}/sessions/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const encryptedData = await response.json();
            const sessions = await this.decryptData(encryptedData.sessions);
            
            console.log('[CloudSync] Sessions downloaded successfully');
            return sessions;
        } catch (error) {
            console.error('[CloudSync] Download failed:', error);
            return null;
        }
    }

    async mergeSessions(localSessions, cloudSessions) {
        if (!cloudSessions || cloudSessions.length === 0) {
            return localSessions;
        }

        const mergedSessions = [...localSessions];
        const localIds = new Set(localSessions.map(s => s.id || s.timestamp));

        cloudSessions.forEach(cloudSession => {
            const id = cloudSession.id || cloudSession.timestamp;
            if (!localIds.has(id)) {
                mergedSessions.push(cloudSession);
            }
        });

        mergedSessions.sort((a, b) => (a.timestamp || a.date) - (b.timestamp || b.date));
        
        console.log(`[CloudSync] Merged ${cloudSessions.length} cloud sessions with ${localSessions.length} local sessions`);
        return mergedSessions;
    }

    queueOperation(type, data) {
        const operation = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type,
            data,
            timestamp: Date.now(),
            retries: 0
        };

        this.syncQueue.push(operation);
        this.saveSyncQueue();
        console.log(`[CloudSync] Queued operation: ${type}`);
    }

    async processSyncQueue() {
        if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        this.syncInProgress = true;
        console.log(`[CloudSync] Processing ${this.syncQueue.length} queued operations`);

        const operations = [...this.syncQueue];
        this.syncQueue = [];

        for (const operation of operations) {
            try {
                await this.executeOperation(operation);
                console.log(`[CloudSync] Operation ${operation.type} completed`);
            } catch (error) {
                console.error(`[CloudSync] Operation ${operation.type} failed:`, error);
                
                operation.retries++;
                if (operation.retries < 3) {
                    this.syncQueue.push(operation);
                    console.log(`[CloudSync] Requeued operation ${operation.type} (retry ${operation.retries})`);
                }
            }
        }

        this.saveSyncQueue();
        this.syncInProgress = false;
    }

    async executeOperation(operation) {
        switch (operation.type) {
            case 'sync_sessions':
                return await this.uploadSessions(operation.data.sessions);
            case 'sync_settings':
                return await this.uploadSettings(operation.data.settings);
            case 'sync_reminders':
                return await this.uploadReminders(operation.data.reminders);
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }

    loadSyncQueue() {
        try {
            const queueData = localStorage.getItem('breathapp-sync-queue');
            this.syncQueue = queueData ? JSON.parse(queueData) : [];
        } catch (error) {
            console.error('[CloudSync] Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    saveSyncQueue() {
        try {
            localStorage.setItem('breathapp-sync-queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('[CloudSync] Failed to save sync queue:', error);
        }
    }

    startPeriodicSync() {
        setInterval(() => {
            if (this.isOnline && this.isAuthenticated()) {
                this.processSyncQueue();
                this.performFullSync();
            }
        }, 5 * 60 * 1000);
    }

    async performFullSync() {
        if (!this.isAuthenticated() || !this.isOnline) return;

        try {
            console.log('[CloudSync] Starting full sync...');
            
            const localData = await this.getAllLocalData();
            const cloudData = await this.downloadAllData();
            
            const mergedData = await this.mergeAllData(localData, cloudData);
            
            await this.saveAllLocalData(mergedData);
            await this.uploadAllData(mergedData);
            
            this.lastSync = Date.now();
            localStorage.setItem('breathapp-last-sync', this.lastSync.toString());
            
            console.log('[CloudSync] Full sync completed');
        } catch (error) {
            console.error('[CloudSync] Full sync failed:', error);
        }
    }

    async getAllLocalData() {
        try {
            const dbManager = await import('./indexeddb-manager.js');
            const sessions = await dbManager.default.getAll('sessions');
            const reminders = await dbManager.default.getAll('reminders');
            const settings = await dbManager.default.getAll('settings');
            
            return { sessions, reminders, settings };
        } catch (error) {
            console.error('[CloudSync] Failed to get local data:', error);
            return { sessions: [], reminders: [], settings: [] };
        }
    }

    async downloadAllData() {
        try {
            const response = await fetch(`${this.apiUrl}/data/download`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const encryptedData = await response.json();
            return await this.decryptData(encryptedData.data);
        } catch (error) {
            console.error('[CloudSync] Failed to download cloud data:', error);
            return { sessions: [], reminders: [], settings: [] };
        }
    }

    async mergeAllData(localData, cloudData) {
        return {
            sessions: await this.mergeSessions(localData.sessions, cloudData.sessions),
            reminders: this.mergeReminders(localData.reminders, cloudData.reminders),
            settings: this.mergeSettings(localData.settings, cloudData.settings)
        };
    }

    mergeReminders(localReminders, cloudReminders) {
        if (!cloudReminders || cloudReminders.length === 0) return localReminders;

        const merged = [...localReminders];
        const localIds = new Set(localReminders.map(r => r.id));

        cloudReminders.forEach(reminder => {
            if (!localIds.has(reminder.id)) {
                merged.push(reminder);
            }
        });

        return merged;
    }

    mergeSettings(localSettings, cloudSettings) {
        if (!cloudSettings || cloudSettings.length === 0) return localSettings;

        const merged = [...localSettings];
        const localKeys = new Set(localSettings.map(s => s.key));

        cloudSettings.forEach(setting => {
            if (!localKeys.has(setting.key)) {
                merged.push(setting);
            }
        });

        return merged;
    }

    async saveAllLocalData(data) {
        try {
            const dbManager = await import('./indexeddb-manager.js');
            
            await dbManager.default.clear('sessions');
            for (const session of data.sessions) {
                await dbManager.default.add('sessions', session);
            }

            await dbManager.default.clear('reminders');
            for (const reminder of data.reminders) {
                await dbManager.default.put('reminders', reminder);
            }

            await dbManager.default.clear('settings');
            for (const setting of data.settings) {
                await dbManager.default.put('settings', setting);
            }

            console.log('[CloudSync] Local data updated');
        } catch (error) {
            console.error('[CloudSync] Failed to save local data:', error);
        }
    }

    async uploadAllData(data) {
        try {
            const encryptedData = await this.encryptData(data);
            
            const response = await fetch(`${this.apiUrl}/data/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    data: encryptedData,
                    deviceId: this.deviceId,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            console.log('[CloudSync] All data uploaded successfully');
        } catch (error) {
            console.error('[CloudSync] Failed to upload all data:', error);
            throw error;
        }
    }

    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            isAuthenticated: this.isAuthenticated(),
            syncInProgress: this.syncInProgress,
            queueSize: this.syncQueue.length,
            lastSync: this.lastSync,
            deviceId: this.deviceId
        };
    }

    async logout() {
        this.userId = null;
        localStorage.removeItem('breathapp-user-id');
        localStorage.removeItem('breathapp-auth-token');
        this.syncQueue = [];
        this.saveSyncQueue();
        console.log('[CloudSync] Logged out');
    }

    dispose() {
        this.syncQueue = [];
        this.encryptionKey = null;
        console.log('[CloudSync] Disposed');
    }
}

const cloudSync = new CloudSync();

export default cloudSync;