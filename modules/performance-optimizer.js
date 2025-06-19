class PerformanceOptimizer {
    constructor() {
        this.observers = new Map();
        this.loadedModules = new Set();
        this.criticalResources = new Set();
        this.lazyLoadQueue = [];
        this.performanceMetrics = {
            loadTimes: {},
            renderTimes: {},
            memoryUsage: [],
            fps: []
        };
        this.init();
    }

    init() {
        this.setupPerformanceObserver();
        this.setupIntersectionObserver();
        this.preloadCriticalResources();
        this.optimizeImages();
        this.setupCodeSplitting();
    }

    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            const perfObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.processPerformanceEntry(entry);
                }
            });

            perfObserver.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
            this.observers.set('performance', perfObserver);
        }
    }

    processPerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.performanceMetrics.loadTimes = {
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                    loadComplete: entry.loadEventEnd - entry.loadEventStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
                    firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
                };
                break;
            case 'largest-contentful-paint':
                this.performanceMetrics.largestContentfulPaint = entry.startTime;
                break;
            case 'resource':
                if (entry.name.includes('modules/') || entry.name.includes('.js')) {
                    this.performanceMetrics.loadTimes[entry.name] = entry.responseEnd - entry.startTime;
                }
                break;
        }

        this.reportPerformanceMetrics();
    }

    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            const intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyContent(entry.target);
                    }
                });
            }, {
                rootMargin: '50px'
            });

            this.observers.set('intersection', intersectionObserver);
        }
    }

    async loadModule(modulePath, condition = () => true) {
        if (this.loadedModules.has(modulePath)) {
            return true;
        }

        if (!condition()) {
            console.log(`[Performance] Module ${modulePath} loading skipped due to condition`);
            return false;
        }

        try {
            const startTime = performance.now();
            
            const module = await import(modulePath);
            
            const loadTime = performance.now() - startTime;
            this.performanceMetrics.loadTimes[modulePath] = loadTime;
            this.loadedModules.add(modulePath);
            
            console.log(`[Performance] Module ${modulePath} loaded in ${loadTime.toFixed(2)}ms`);
            return module;
        } catch (error) {
            console.error(`[Performance] Failed to load module ${modulePath}:`, error);
            return false;
        }
    }

    async loadModuleOnDemand(modulePath, trigger) {
        return new Promise((resolve, reject) => {
            const handleTrigger = async () => {
                try {
                    const module = await this.loadModule(modulePath);
                    resolve(module);
                } catch (error) {
                    reject(error);
                }
            };

            if (typeof trigger === 'string') {
                document.addEventListener(trigger, handleTrigger, { once: true });
            } else if (trigger instanceof Element) {
                trigger.addEventListener('click', handleTrigger, { once: true });
            } else if (typeof trigger === 'function') {
                trigger(handleTrigger);
            }
        });
    }

    setupCodeSplitting() {
        // Simplified code splitting - let integration manager handle module loading
        console.log('[Performance] Code splitting setup completed');
    }

    shouldLoadCharts() {
        return document.querySelector('[data-chart]') !== null ||
               document.getElementById('progress-panel') !== null;
    }

    shouldLoadWebRTC() {
        return 'mediaDevices' in navigator &&
               navigator.mediaDevices.getUserMedia &&
               localStorage.getItem('breathapp-webrtc-enabled') === 'true';
    }

    shouldLoadCloudSync() {
        return navigator.onLine &&
               localStorage.getItem('breathapp-cloud-enabled') === 'true';
    }

    shouldLoadAnalytics() {
        const sessions = JSON.parse(localStorage.getItem('breathapp-sessions') || '[]');
        return sessions.length > 5;
    }

    scheduleConditionalLoad(modulePath, condition) {
        if (condition()) {
            this.loadModule(modulePath);
        } else {
            setTimeout(() => this.scheduleConditionalLoad(modulePath, condition), 5000);
        }
    }

    preloadCriticalResources() {
        const criticalResources = [
            { href: './style.css', as: 'style' },
            { href: './styles/extensions.css', as: 'style' },
            { href: './src/img/logo.svg', as: 'image' }
        ];

        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            Object.assign(link, resource);
            document.head.appendChild(link);
            this.criticalResources.add(resource.href);
        });
        
        // Load font after page load to avoid preload warning
        window.addEventListener('load', () => {
            const fontLink = document.createElement('link');
            fontLink.rel = 'preload';
            fontLink.href = './src/fonts/Audrey-Normal.otf';
            fontLink.as = 'font';
            fontLink.type = 'font/otf';
            fontLink.crossOrigin = 'anonymous';
            document.head.appendChild(fontLink);
        });
    }

    optimizeImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            this.observers.get('intersection')?.observe(img);
        });
    }

    loadLazyContent(element) {
        if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
        }

        if (element.dataset.module) {
            this.loadModule(element.dataset.module);
        }

        this.observers.get('intersection')?.unobserve(element);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    optimizeAnimations() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            document.documentElement.style.setProperty('--animation-duration', '0.01s');
            document.documentElement.style.setProperty('--transition-duration', '0.01s');
        }

        const animatedElements = document.querySelectorAll('[data-animate]');
        animatedElements.forEach(element => {
            element.style.willChange = 'transform, opacity';
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        element.style.willChange = 'auto';
                    }
                });
            });
            
            observer.observe(element);
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

            if (this.performanceMetrics.memoryUsage.length > 100) {
                this.performanceMetrics.memoryUsage.shift();
            }

            const usagePercent = (memoryInfo.used / memoryInfo.limit) * 100;
            if (usagePercent > 90) {
                console.warn('[Performance] High memory usage detected:', usagePercent.toFixed(2) + '%');
                this.triggerGarbageCollection();
            }
        }
    }

    monitorFPS() {
        let lastTime = performance.now();
        let frames = 0;

        const countFrames = (currentTime) => {
            frames++;
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.performanceMetrics.fps.push({
                    fps,
                    timestamp: currentTime
                });

                if (this.performanceMetrics.fps.length > 60) {
                    this.performanceMetrics.fps.shift();
                }

                if (fps < 30) {
                    console.warn('[Performance] Low FPS detected:', fps);
                }

                frames = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(countFrames);
        };

        requestAnimationFrame(countFrames);
    }

    triggerGarbageCollection() {
        if (window.gc) {
            window.gc();
        } else {
            this.cleanupUnusedResources();
        }
    }

    cleanupUnusedResources() {
        this.loadedModules.forEach(modulePath => {
            if (!this.isModuleStillNeeded(modulePath)) {
                delete window[modulePath];
                this.loadedModules.delete(modulePath);
            }
        });

        const unusedImages = document.querySelectorAll('img[data-cleanup="true"]');
        unusedImages.forEach(img => {
            if (!this.isElementVisible(img)) {
                img.src = '';
                img.removeAttribute('src');
            }
        });
    }

    isModuleStillNeeded(modulePath) {
        const moduleConditions = {
            'advanced-charts': () => document.querySelector('[data-chart]') !== null,
            'webrtc-breath-detector': () => localStorage.getItem('breathapp-webrtc-enabled') === 'true',
            'cloud-sync': () => localStorage.getItem('breathapp-cloud-enabled') === 'true'
        };

        const moduleName = modulePath.split('/').pop().replace('.js', '');
        const condition = moduleConditions[moduleName];
        
        return condition ? condition() : true;
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    compressData(data) {
        if (typeof CompressionStream !== 'undefined') {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            writer.write(new TextEncoder().encode(JSON.stringify(data)));
            writer.close();
            return stream.readable;
        } else {
            return JSON.stringify(data);
        }
    }

    async decompressData(compressedData) {
        if (typeof DecompressionStream !== 'undefined' && compressedData instanceof ReadableStream) {
            const stream = new DecompressionStream('gzip');
            const reader = compressedData.pipeThrough(stream).getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            
            const concatenated = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of chunks) {
                concatenated.set(chunk, offset);
                offset += chunk.length;
            }
            
            return JSON.parse(new TextDecoder().decode(concatenated));
        } else {
            return JSON.parse(compressedData);
        }
    }

    reportPerformanceMetrics() {
        const report = {
            timestamp: Date.now(),
            loadTimes: this.performanceMetrics.loadTimes,
            memoryUsage: this.performanceMetrics.memoryUsage.slice(-5),
            fps: this.performanceMetrics.fps.slice(-10),
            criticalMetrics: {
                fcp: this.performanceMetrics.loadTimes.firstContentfulPaint,
                lcp: this.performanceMetrics.largestContentfulPaint,
                domContentLoaded: this.performanceMetrics.loadTimes.domContentLoaded
            }
        };

        if (report.criticalMetrics.lcp > 2500) {
            console.warn('[Performance] Large Contentful Paint is slow:', report.criticalMetrics.lcp + 'ms');
        }

        if (report.criticalMetrics.fcp > 1800) {
            console.warn('[Performance] First Contentful Paint is slow:', report.criticalMetrics.fcp + 'ms');
        }

        return report;
    }

    getPerformanceScore() {
        const metrics = this.performanceMetrics;
        let score = 100;

        if (metrics.loadTimes.firstContentfulPaint > 1800) score -= 20;
        if (metrics.largestContentfulPaint > 2500) score -= 20;
        if (metrics.loadTimes.domContentLoaded > 1500) score -= 15;

        const avgFPS = metrics.fps.length > 0 
            ? metrics.fps.reduce((sum, f) => sum + f.fps, 0) / metrics.fps.length 
            : 60;
        if (avgFPS < 30) score -= 25;
        else if (avgFPS < 45) score -= 10;

        if (metrics.memoryUsage.length > 0) {
            const latestMemory = metrics.memoryUsage[metrics.memoryUsage.length - 1];
            const memoryPercent = (latestMemory.used / latestMemory.limit) * 100;
            if (memoryPercent > 80) score -= 15;
            else if (memoryPercent > 60) score -= 5;
        }

        return Math.max(0, score);
    }

    enablePerformanceMode() {
        document.documentElement.style.setProperty('--animation-duration', '0.2s');
        document.documentElement.style.setProperty('--transition-duration', '0.15s');
        
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });

        const reducedMotionCSS = `
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = reducedMotionCSS;
        document.head.appendChild(style);
    }

    startPerformanceMonitoring() {
        this.monitorFPS();
        
        setInterval(() => {
            this.monitorMemoryUsage();
        }, 5000);

        setInterval(() => {
            this.cleanupUnusedResources();
        }, 30000);
    }

    dispose() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
        this.loadedModules.clear();
        this.criticalResources.clear();
        this.performanceMetrics = {
            loadTimes: {},
            renderTimes: {},
            memoryUsage: [],
            fps: []
        };
    }
}

const performanceOptimizer = new PerformanceOptimizer();
performanceOptimizer.startPerformanceMonitoring();

export default performanceOptimizer;