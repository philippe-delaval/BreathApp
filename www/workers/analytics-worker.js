class AnalyticsWorker {
    constructor() {
        this.patterns = [];
        this.trends = {};
        this.insights = [];
    }

    processMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'ANALYZE_SESSIONS':
                this.analyzeSessions(data);
                break;
            case 'CALCULATE_TRENDS':
                this.calculateTrends(data);
                break;
            case 'GENERATE_INSIGHTS':
                this.generateInsights(data);
                break;
            case 'PROCESS_BREATHING_DATA':
                this.processBreathingData(data);
                break;
            case 'CALCULATE_STATISTICS':
                this.calculateStatistics(data);
                break;
            default:
                this.postMessage({ type: 'ERROR', error: 'Unknown message type' });
        }
    }

    analyzeSessions(sessions) {
        try {
            const analysis = {
                totalSessions: sessions.length,
                totalDuration: 0,
                averageDuration: 0,
                accuracyTrend: [],
                weeklyPatterns: {},
                monthlyPatterns: {},
                bestStreaks: [],
                consistencyScore: 0
            };

            if (sessions.length === 0) {
                this.postMessage({ type: 'SESSIONS_ANALYZED', data: analysis });
                return;
            }

            sessions.forEach(session => {
                analysis.totalDuration += session.duration || 0;
                
                const date = new Date(session.date);
                const weekday = date.getDay();
                const month = date.getMonth();
                const hour = date.getHours();

                if (!analysis.weeklyPatterns[weekday]) {
                    analysis.weeklyPatterns[weekday] = { count: 0, totalAccuracy: 0 };
                }
                analysis.weeklyPatterns[weekday].count++;
                analysis.weeklyPatterns[weekday].totalAccuracy += session.accuracy || 0;

                if (!analysis.monthlyPatterns[month]) {
                    analysis.monthlyPatterns[month] = { count: 0, sessions: [] };
                }
                analysis.monthlyPatterns[month].count++;
                analysis.monthlyPatterns[month].sessions.push(session);

                analysis.accuracyTrend.push({
                    date: session.date,
                    accuracy: session.accuracy || 0,
                    duration: session.duration || 0
                });
            });

            analysis.averageDuration = analysis.totalDuration / sessions.length;
            analysis.consistencyScore = this.calculateConsistencyScore(sessions);
            analysis.bestStreaks = this.findBestStreaks(sessions);

            this.postMessage({ type: 'SESSIONS_ANALYZED', data: analysis });
        } catch (error) {
            this.postMessage({ type: 'ERROR', error: error.message });
        }
    }

    calculateTrends(sessions) {
        try {
            const trends = {
                accuracy: this.calculateAccuracyTrend(sessions),
                frequency: this.calculateFrequencyTrend(sessions),
                duration: this.calculateDurationTrend(sessions),
                timeOfDay: this.calculateTimeOfDayTrend(sessions),
                weekly: this.calculateWeeklyTrend(sessions)
            };

            this.postMessage({ type: 'TRENDS_CALCULATED', data: trends });
        } catch (error) {
            this.postMessage({ type: 'ERROR', error: error.message });
        }
    }

    calculateAccuracyTrend(sessions) {
        const sortedSessions = sessions.sort((a, b) => a.date - b.date);
        const windowSize = Math.min(7, Math.ceil(sessions.length / 10));
        const trend = [];

        for (let i = windowSize - 1; i < sortedSessions.length; i++) {
            const window = sortedSessions.slice(i - windowSize + 1, i + 1);
            const avgAccuracy = window.reduce((sum, s) => sum + (s.accuracy || 0), 0) / window.length;
            
            trend.push({
                date: sortedSessions[i].date,
                value: avgAccuracy,
                sessions: window.length
            });
        }

        return {
            data: trend,
            slope: this.calculateSlope(trend),
            improvement: trend.length > 1 ? trend[trend.length - 1].value - trend[0].value : 0
        };
    }

    calculateFrequencyTrend(sessions) {
        const dailyCount = {};
        sessions.forEach(session => {
            const date = new Date(session.date).toDateString();
            dailyCount[date] = (dailyCount[date] || 0) + 1;
        });

        const frequencies = Object.values(dailyCount);
        return {
            average: frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length,
            max: Math.max(...frequencies),
            min: Math.min(...frequencies),
            trend: this.calculateMovingAverage(frequencies, 7)
        };
    }

    calculateDurationTrend(sessions) {
        const durations = sessions.map(s => s.duration || 0);
        return {
            average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            max: Math.max(...durations),
            min: Math.min(...durations),
            trend: this.calculateMovingAverage(durations, 7)
        };
    }

    calculateTimeOfDayTrend(sessions) {
        const hourlyCount = Array(24).fill(0);
        const hourlyAccuracy = Array(24).fill(0);

        sessions.forEach(session => {
            const hour = new Date(session.date).getHours();
            hourlyCount[hour]++;
            hourlyAccuracy[hour] += session.accuracy || 0;
        });

        return hourlyCount.map((count, hour) => ({
            hour,
            count,
            averageAccuracy: count > 0 ? hourlyAccuracy[hour] / count : 0
        }));
    }

    calculateWeeklyTrend(sessions) {
        const weeklyData = Array(7).fill(null).map(() => ({
            count: 0,
            totalDuration: 0,
            totalAccuracy: 0
        }));

        sessions.forEach(session => {
            const weekday = new Date(session.date).getDay();
            weeklyData[weekday].count++;
            weeklyData[weekday].totalDuration += session.duration || 0;
            weeklyData[weekday].totalAccuracy += session.accuracy || 0;
        });

        return weeklyData.map((data, day) => ({
            day,
            count: data.count,
            averageDuration: data.count > 0 ? data.totalDuration / data.count : 0,
            averageAccuracy: data.count > 0 ? data.totalAccuracy / data.count : 0
        }));
    }

    generateInsights(sessions) {
        try {
            const insights = [];

            if (sessions.length < 5) {
                insights.push({
                    type: 'encouragement',
                    title: 'Continuez sur cette lancée!',
                    message: 'Vous avez fait vos premiers pas. La régularité est la clé du succès.',
                    priority: 'high'
                });
            }

            const recentSessions = sessions.filter(s => 
                Date.now() - s.date < 7 * 24 * 60 * 60 * 1000
            );

            if (recentSessions.length === 0 && sessions.length > 0) {
                insights.push({
                    type: 'reminder',
                    title: 'Il est temps de reprendre',
                    message: 'Vous n\'avez pas pratiqué cette semaine. Une séance courte peut faire la différence.',
                    priority: 'high'
                });
            }

            const accuracyTrend = this.calculateAccuracyTrend(sessions);
            if (accuracyTrend.improvement > 10) {
                insights.push({
                    type: 'achievement',
                    title: 'Amélioration remarquable!',
                    message: `Votre précision s'est améliorée de ${Math.round(accuracyTrend.improvement)}% récemment.`,
                    priority: 'medium'
                });
            }

            const consistency = this.calculateConsistencyScore(sessions);
            if (consistency > 0.8) {
                insights.push({
                    type: 'achievement',
                    title: 'Régularité exceptionnelle',
                    message: 'Votre constance dans la pratique est remarquable. Continuez ainsi!',
                    priority: 'medium'
                });
            }

            const bestTime = this.findBestTimeOfDay(sessions);
            if (bestTime.accuracy > 85) {
                insights.push({
                    type: 'tip',
                    title: 'Votre moment optimal',
                    message: `Vous êtes plus performant vers ${bestTime.hour}h avec ${Math.round(bestTime.accuracy)}% de précision.`,
                    priority: 'low'
                });
            }

            this.postMessage({ type: 'INSIGHTS_GENERATED', data: insights });
        } catch (error) {
            this.postMessage({ type: 'ERROR', error: error.message });
        }
    }

    processBreathingData(breathingData) {
        try {
            const analysis = {
                averageRate: 0,
                variability: 0,
                rhythm: 'irregular',
                quality: 0,
                recommendations: []
            };

            if (breathingData.length === 0) {
                this.postMessage({ type: 'BREATHING_PROCESSED', data: analysis });
                return;
            }

            const intervals = [];
            for (let i = 1; i < breathingData.length; i++) {
                intervals.push(breathingData[i].timestamp - breathingData[i-1].timestamp);
            }

            analysis.averageRate = 60000 / (intervals.reduce((sum, i) => sum + i, 0) / intervals.length);
            analysis.variability = this.calculateVariability(intervals);
            analysis.rhythm = this.classifyRhythm(intervals);
            analysis.quality = this.calculateBreathingQuality(intervals);

            if (analysis.averageRate < 5) {
                analysis.recommendations.push('Essayez de ralentir votre rythme respiratoire');
            }
            if (analysis.variability > 0.3) {
                analysis.recommendations.push('Concentrez-vous sur la régularité');
            }

            this.postMessage({ type: 'BREATHING_PROCESSED', data: analysis });
        } catch (error) {
            this.postMessage({ type: 'ERROR', error: error.message });
        }
    }

    calculateStatistics(data) {
        try {
            const stats = {
                mean: this.calculateMean(data),
                median: this.calculateMedian(data),
                standardDeviation: this.calculateStandardDeviation(data),
                percentiles: this.calculatePercentiles(data),
                correlation: this.calculateCorrelation(data)
            };

            this.postMessage({ type: 'STATISTICS_CALCULATED', data: stats });
        } catch (error) {
            this.postMessage({ type: 'ERROR', error: error.message });
        }
    }

    calculateConsistencyScore(sessions) {
        if (sessions.length < 2) return 0;

        const dates = sessions.map(s => new Date(s.date).toDateString());
        const uniqueDates = [...new Set(dates)];
        const daysSinceFirst = (Date.now() - sessions[0].date) / (24 * 60 * 60 * 1000);
        
        return Math.min(1, uniqueDates.length / Math.max(1, daysSinceFirst));
    }

    findBestStreaks(sessions) {
        const dates = sessions.map(s => new Date(s.date).toDateString()).sort();
        const streaks = [];
        let currentStreak = 1;

        for (let i = 1; i < dates.length; i++) {
            const prevDate = new Date(dates[i-1]);
            const currDate = new Date(dates[i]);
            const diffDays = (currDate - prevDate) / (24 * 60 * 60 * 1000);

            if (diffDays === 1) {
                currentStreak++;
            } else {
                if (currentStreak > 1) {
                    streaks.push({
                        length: currentStreak,
                        endDate: dates[i-1]
                    });
                }
                currentStreak = 1;
            }
        }

        return streaks.sort((a, b) => b.length - a.length).slice(0, 5);
    }

    findBestTimeOfDay(sessions) {
        const hourlyStats = {};

        sessions.forEach(session => {
            const hour = new Date(session.date).getHours();
            if (!hourlyStats[hour]) {
                hourlyStats[hour] = { count: 0, totalAccuracy: 0 };
            }
            hourlyStats[hour].count++;
            hourlyStats[hour].totalAccuracy += session.accuracy || 0;
        });

        let bestHour = { hour: 12, accuracy: 0 };
        for (const [hour, stats] of Object.entries(hourlyStats)) {
            const avgAccuracy = stats.totalAccuracy / stats.count;
            if (avgAccuracy > bestHour.accuracy && stats.count >= 3) {
                bestHour = { hour: parseInt(hour), accuracy: avgAccuracy };
            }
        }

        return bestHour;
    }

    calculateSlope(data) {
        if (data.length < 2) return 0;

        const n = data.length;
        const sumX = data.reduce((sum, _, i) => sum + i, 0);
        const sumY = data.reduce((sum, d) => sum + d.value, 0);
        const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
        const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    calculateMovingAverage(data, window) {
        const result = [];
        for (let i = window - 1; i < data.length; i++) {
            const slice = data.slice(i - window + 1, i + 1);
            const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
            result.push(avg);
        }
        return result;
    }

    calculateVariability(intervals) {
        const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
        const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
        return Math.sqrt(variance) / mean;
    }

    classifyRhythm(intervals) {
        const variability = this.calculateVariability(intervals);
        if (variability < 0.1) return 'très régulier';
        if (variability < 0.2) return 'régulier';
        if (variability < 0.3) return 'modérément irrégulier';
        return 'irrégulier';
    }

    calculateBreathingQuality(intervals) {
        const targetInterval = 10000;
        const deviations = intervals.map(i => Math.abs(i - targetInterval) / targetInterval);
        const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
        return Math.max(0, (1 - avgDeviation) * 100);
    }

    calculateMean(data) {
        return data.reduce((sum, val) => sum + val, 0) / data.length;
    }

    calculateMedian(data) {
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    calculateStandardDeviation(data) {
        const mean = this.calculateMean(data);
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
        return Math.sqrt(variance);
    }

    calculatePercentiles(data) {
        const sorted = [...data].sort((a, b) => a - b);
        return {
            p25: this.getPercentile(sorted, 0.25),
            p50: this.getPercentile(sorted, 0.50),
            p75: this.getPercentile(sorted, 0.75),
            p90: this.getPercentile(sorted, 0.90),
            p95: this.getPercentile(sorted, 0.95)
        };
    }

    getPercentile(sortedData, percentile) {
        const index = percentile * (sortedData.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;

        return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
    }

    calculateCorrelation(data) {
        if (!Array.isArray(data) || data.length < 2) return 0;
        
        const x = data.map((_, i) => i);
        const y = data;
        
        const n = data.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    postMessage(message) {
        self.postMessage(message);
    }
}

const analyticsWorker = new AnalyticsWorker();

self.addEventListener('message', (event) => {
    analyticsWorker.processMessage(event);
});