class SimplePerformanceOptimizer {
    constructor() {
        this.performanceMetrics = {
            loadTimes: {},
            memoryUsage: [],
            fps: []
        };
        this.init();
    }

    init() {
        this.setupPerformanceObserver();
        this.preloadCriticalResources();
        this.startPerformanceMonitoring();
        console.log('[Performance] Simple optimizer initialized');
    }

    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            try {
                const perfObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.processPerformanceEntry(entry);
                    }
                });

                perfObserver.observe({ entryTypes: ['navigation', 'paint'] });
            } catch (error) {
                console.warn('[Performance] Observer setup failed:', error);
            }
        }
    }

    processPerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.performanceMetrics.loadTimes = {
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                    loadComplete: entry.loadEventEnd - entry.loadEventStart
                };
                break;
            case 'paint':
                if (entry.name === 'first-contentful-paint') {
                    this.performanceMetrics.firstContentfulPaint = entry.startTime;
                }
                break;
        }
    }

    preloadCriticalResources() {
        // Simple preloading without warnings
        const criticalResources = [
            './style.css',
            './styles/extensions.css',
            './src/img/logo.svg'
        ];

        criticalResources.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = href;
            document.head.appendChild(link);
        });
    }

    monitorMemoryUsage() {
        if ('memory' in performance) {
            const memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };

            this.performanceMetrics.memoryUsage.push(memoryInfo);

            // Keep only last 50 entries
            if (this.performanceMetrics.memoryUsage.length > 50) {
                this.performanceMetrics.memoryUsage.shift();
            }

            const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
            if (usagePercent > 90) {
                console.warn('[Performance] High memory usage:', usagePercent.toFixed(2) + '%');
            }
        }
    }

    getPerformanceScore() {
        const metrics = this.performanceMetrics;
        let score = 100;

        if (metrics.firstContentfulPaint > 1800) score -= 20;
        if (metrics.loadTimes.domContentLoaded > 1500) score -= 15;

        const avgMemory = this.getAverageMemoryUsage();
        if (avgMemory > 80) score -= 15;

        return Math.max(0, score);
    }

    getAverageMemoryUsage() {
        if (this.performanceMetrics.memoryUsage.length === 0) return 0;
        
        const total = this.performanceMetrics.memoryUsage.reduce((sum, m) => {
            return sum + (m.used / m.limit) * 100;
        }, 0);
        
        return total / this.performanceMetrics.memoryUsage.length;
    }

    reportPerformanceMetrics() {
        return {
            timestamp: Date.now(),
            loadTimes: this.performanceMetrics.loadTimes,
            memoryUsage: this.performanceMetrics.memoryUsage.slice(-5),
            score: this.getPerformanceScore(),
            criticalMetrics: {
                fcp: this.performanceMetrics.firstContentfulPaint,
                domContentLoaded: this.performanceMetrics.loadTimes.domContentLoaded
            }
        };
    }

    startPerformanceMonitoring() {
        // Monitor memory every 10 seconds
        setInterval(() => {
            this.monitorMemoryUsage();
        }, 10000);

        // Log performance report every 30 seconds
        setInterval(() => {
            const report = this.reportPerformanceMetrics();
            console.log('[Performance] Score:', report.score);
        }, 30000);
    }

    optimizeForReducedMotion() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.style.setProperty('--animation-duration', '0.01s');
            document.documentElement.style.setProperty('--transition-duration', '0.01s');
            console.log('[Performance] Reduced motion applied');
        }
    }

    enablePerformanceMode() {
        this.optimizeForReducedMotion();
        
        // Reduce animation times
        document.documentElement.style.setProperty('--animation-duration', '0.2s');
        document.documentElement.style.setProperty('--transition-duration', '0.15s');
        
        console.log('[Performance] Performance mode enabled');
    }
}

const performanceOptimizer = new SimplePerformanceOptimizer();

// Apply reduced motion if preferred
window.addEventListener('load', () => {
    performanceOptimizer.optimizeForReducedMotion();
});

export default performanceOptimizer;