class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.workerCallbacks = new Map();
        this.init();
    }

    init() {
        this.setupAnalyticsWorker();
    }

    setupAnalyticsWorker() {
        if (typeof Worker !== 'undefined') {
            try {
                const analyticsWorker = new Worker('/workers/analytics-worker.js');
                
                analyticsWorker.onmessage = (event) => {
                    this.handleWorkerMessage('analytics', event.data);
                };

                analyticsWorker.onerror = (error) => {
                    console.error('[WorkerManager] Analytics worker error:', error);
                };

                this.workers.set('analytics', analyticsWorker);
                console.log('[WorkerManager] Analytics worker initialized');
            } catch (error) {
                console.error('[WorkerManager] Failed to create analytics worker:', error);
            }
        } else {
            console.warn('[WorkerManager] Web Workers not supported');
        }
    }

    handleWorkerMessage(workerType, data) {
        const callbackKey = `${workerType}_${data.type}`;
        const callbacks = this.workerCallbacks.get(callbackKey) || [];
        
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('[WorkerManager] Callback error:', error);
            }
        });

        this.workerCallbacks.delete(callbackKey);
    }

    postToWorker(workerType, message, callback = null) {
        const worker = this.workers.get(workerType);
        
        if (!worker) {
            console.error(`[WorkerManager] Worker ${workerType} not found`);
            if (callback) callback({ type: 'ERROR', error: 'Worker not available' });
            return;
        }

        if (callback) {
            const callbackKey = `${workerType}_${message.type.replace('_', '_').replace(/^(.+)$/, '$1').replace(/_$/, '')}_RESULT` || `${workerType}_RESULT`;
            const callbacks = this.workerCallbacks.get(callbackKey) || [];
            callbacks.push(callback);
            this.workerCallbacks.set(callbackKey, callbacks);
        }

        worker.postMessage(message);
    }

    analyzeSessions(sessions, callback) {
        this.postToWorker('analytics', {
            type: 'ANALYZE_SESSIONS',
            data: sessions
        }, (result) => {
            if (result.type === 'SESSIONS_ANALYZED') {
                callback(null, result.data);
            } else if (result.type === 'ERROR') {
                callback(new Error(result.error));
            }
        });
    }

    calculateTrends(sessions, callback) {
        this.postToWorker('analytics', {
            type: 'CALCULATE_TRENDS',
            data: sessions
        }, (result) => {
            if (result.type === 'TRENDS_CALCULATED') {
                callback(null, result.data);
            } else if (result.type === 'ERROR') {
                callback(new Error(result.error));
            }
        });
    }

    generateInsights(sessions, callback) {
        this.postToWorker('analytics', {
            type: 'GENERATE_INSIGHTS',
            data: sessions
        }, (result) => {
            if (result.type === 'INSIGHTS_GENERATED') {
                callback(null, result.data);
            } else if (result.type === 'ERROR') {
                callback(new Error(result.error));
            }
        });
    }

    processBreathingData(breathingData, callback) {
        this.postToWorker('analytics', {
            type: 'PROCESS_BREATHING_DATA',
            data: breathingData
        }, (result) => {
            if (result.type === 'BREATHING_PROCESSED') {
                callback(null, result.data);
            } else if (result.type === 'ERROR') {
                callback(new Error(result.error));
            }
        });
    }

    calculateStatistics(data, callback) {
        this.postToWorker('analytics', {
            type: 'CALCULATE_STATISTICS',
            data: data
        }, (result) => {
            if (result.type === 'STATISTICS_CALCULATED') {
                callback(null, result.data);
            } else if (result.type === 'ERROR') {
                callback(new Error(result.error));
            }
        });
    }

    runAnalyticsBatch(sessions, callback) {
        const results = {};
        let completedTasks = 0;
        const totalTasks = 3;

        const handleTaskComplete = (taskName, error, data) => {
            if (error) {
                callback(error);
                return;
            }

            results[taskName] = data;
            completedTasks++;

            if (completedTasks === totalTasks) {
                callback(null, results);
            }
        };

        this.analyzeSessions(sessions, (error, data) => {
            handleTaskComplete('analysis', error, data);
        });

        this.calculateTrends(sessions, (error, data) => {
            handleTaskComplete('trends', error, data);
        });

        this.generateInsights(sessions, (error, data) => {
            handleTaskComplete('insights', error, data);
        });
    }

    fallbackAnalysis(sessions) {
        console.log('[WorkerManager] Using fallback analysis (main thread)');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const analysis = {
                    totalSessions: sessions.length,
                    totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
                    averageDuration: sessions.length > 0 
                        ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length 
                        : 0,
                    averageAccuracy: sessions.length > 0
                        ? sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length
                        : 0,
                    streak: this.calculateSimpleStreak(sessions),
                    weeklyPatterns: {},
                    monthlyPatterns: {}
                };

                resolve(analysis);
            }, 100);
        });
    }

    calculateSimpleStreak(sessions) {
        if (sessions.length === 0) return 0;

        const dates = [...new Set(sessions.map(s => 
            new Date(s.date).toDateString()
        ))].sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

        if (dates[0] === today || dates[0] === yesterday) {
            let currentDate = dates[0] === today ? today : yesterday;
            
            for (let i = 0; i < dates.length; i++) {
                if (dates[i] === currentDate) {
                    streak++;
                    const prevDate = new Date(currentDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    currentDate = prevDate.toDateString();
                } else {
                    break;
                }
            }
        }

        return streak;
    }

    terminate(workerType) {
        const worker = this.workers.get(workerType);
        if (worker) {
            worker.terminate();
            this.workers.delete(workerType);
            console.log(`[WorkerManager] ${workerType} worker terminated`);
        }
    }

    terminateAll() {
        this.workers.forEach((worker, type) => {
            worker.terminate();
            console.log(`[WorkerManager] ${type} worker terminated`);
        });
        this.workers.clear();
        this.workerCallbacks.clear();
    }

    isWorkerSupported() {
        return typeof Worker !== 'undefined';
    }

    getWorkerStatus() {
        const status = {};
        this.workers.forEach((worker, type) => {
            status[type] = {
                available: true,
                callbacks: this.workerCallbacks.size
            };
        });
        return status;
    }
}

const workerManager = new WorkerManager();

window.addEventListener('beforeunload', () => {
    workerManager.terminateAll();
});

export default workerManager;