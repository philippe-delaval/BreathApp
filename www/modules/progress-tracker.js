// Module de suivi de progression - BreathApp
// Stockage et analyse des données de session

class ProgressTracker {
    constructor() {
        this.storageKey = 'breathapp-progress';
        this.sessionsKey = 'breathapp-sessions';
        this.maxStoredSessions = 100; // Limiter le stockage
        this.sessions = this.loadSessions();
        this.currentSession = null;
    }

    // Charger les sessions depuis localStorage
    loadSessions() {
        try {
            const saved = localStorage.getItem(this.sessionsKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Erreur lors du chargement des sessions:', error);
            return [];
        }
    }

    // Sauvegarder les sessions dans localStorage
    saveSessions() {
        try {
            // Garder seulement les sessions les plus récentes
            const recentSessions = this.sessions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, this.maxStoredSessions);
            
            localStorage.setItem(this.sessionsKey, JSON.stringify(recentSessions));
            this.sessions = recentSessions;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des sessions:', error);
        }
    }

    // Démarrer une nouvelle session
    startSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            date: new Date().toISOString(),
            startTime: Date.now(),
            duration: 0,
            completed: false,
            breathCount: 0,
            accuracy: 0,
            averageRpm: 0,
            type: 'standard' // standard, custom, etc.
        };
        
        console.log('Nouvelle session démarrée:', this.currentSession.id);
        return this.currentSession;
    }

    // Terminer la session courante
    endSession(breathData = {}) {
        if (!this.currentSession) {
            console.warn('Aucune session active à terminer');
            return null;
        }

        this.currentSession.duration = Date.now() - this.currentSession.startTime;
        this.currentSession.completed = this.currentSession.duration >= 280000; // ~5 minutes
        this.currentSession.breathCount = breathData.totalBreaths || 0;
        this.currentSession.accuracy = breathData.accuracy || 0;
        this.currentSession.averageRpm = breathData.averageRpm || 0;
        this.currentSession.endTime = Date.now();

        // Ajouter la session à l'historique
        this.sessions.push({ ...this.currentSession });
        this.saveSessions();

        const completedSession = this.currentSession;
        this.currentSession = null;
        
        console.log('Session terminée:', completedSession);
        return completedSession;
    }

    // Générer un ID unique pour la session
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Obtenir toutes les sessions
    getAllSessions() {
        return this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Obtenir les sessions d'aujourd'hui
    getTodaySessions() {
        const today = new Date().toDateString();
        return this.sessions.filter(session => 
            new Date(session.date).toDateString() === today
        );
    }

    // Obtenir les sessions de cette semaine
    getWeekSessions() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        return this.sessions.filter(session => 
            new Date(session.date) >= weekAgo
        );
    }

    // Obtenir les sessions du mois
    getMonthSessions() {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        
        return this.sessions.filter(session => 
            new Date(session.date) >= monthAgo
        );
    }

    // Calculer les statistiques
    getStatistics(period = 'week') {
        let sessions;
        
        switch (period) {
            case 'today':
                sessions = this.getTodaySessions();
                break;
            case 'week':
                sessions = this.getWeekSessions();
                break;
            case 'month':
                sessions = getMonthSessions();
                break;
            default:
                sessions = this.sessions;
        }

        const completedSessions = sessions.filter(s => s.completed);
        const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
        const averageAccuracy = sessions.length > 0 ? 
            sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length : 0;

        return {
            totalSessions: sessions.length,
            completedSessions: completedSessions.length,
            completionRate: sessions.length > 0 ? 
                Math.round((completedSessions.length / sessions.length) * 100) : 0,
            totalDuration: Math.round(totalDuration / 1000), // en secondes
            averageDuration: sessions.length > 0 ? 
                Math.round((totalDuration / sessions.length) / 1000) : 0,
            averageAccuracy: Math.round(averageAccuracy),
            streak: this.calculateStreak(),
            bestStreak: this.calculateBestStreak()
        };
    }

    // Calculer la série actuelle
    calculateStreak() {
        if (this.sessions.length === 0) return 0;

        const sortedSessions = this.sessions
            .filter(s => s.completed)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const session of sortedSessions) {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === streak) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (daysDiff > streak) {
                break;
            }
        }

        return streak;
    }

    // Calculer la meilleure série
    calculateBestStreak() {
        if (this.sessions.length === 0) return 0;

        const completedSessions = this.sessions
            .filter(s => s.completed)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        let bestStreak = 0;
        let currentStreak = 0;
        let lastDate = null;

        for (const session of completedSessions) {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);

            if (lastDate) {
                const daysDiff = Math.floor((sessionDate - lastDate) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                    currentStreak++;
                } else if (daysDiff > 1) {
                    bestStreak = Math.max(bestStreak, currentStreak);
                    currentStreak = 1;
                }
            } else {
                currentStreak = 1;
            }

            lastDate = sessionDate;
        }

        return Math.max(bestStreak, currentStreak);
    }

    // Obtenir un résumé rapide
    getQuickSummary() {
        const todayStats = this.getStatistics('today');
        const weekStats = this.getStatistics('week');
        
        return {
            today: {
                sessions: todayStats.totalSessions,
                completed: todayStats.completedSessions
            },
            week: {
                sessions: weekStats.totalSessions,
                completed: weekStats.completedSessions,
                streak: weekStats.streak
            },
            lastSession: this.sessions.length > 0 ? 
                this.sessions[this.sessions.length - 1] : null
        };
    }

    // Exporter les données (pour sauvegarde)
    exportData() {
        return {
            sessions: this.sessions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Importer des données
    importData(data) {
        try {
            if (data.sessions && Array.isArray(data.sessions)) {
                this.sessions = data.sessions;
                this.saveSessions();
                return true;
            }
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error);
        }
        return false;
    }

    // Supprimer les anciennes données
    cleanup(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const initialCount = this.sessions.length;
        this.sessions = this.sessions.filter(session => 
            new Date(session.date) >= cutoffDate
        );
        
        this.saveSessions();
        console.log(`Nettoyage: ${initialCount - this.sessions.length} sessions supprimées`);
    }
}

// Instance globale du tracker
const progressTracker = new ProgressTracker();

// Export pour utilisation dans d'autres modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProgressTracker, progressTracker };
}