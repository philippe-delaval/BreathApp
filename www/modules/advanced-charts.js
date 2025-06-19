import 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';

class AdvancedCharts {
    constructor() {
        this.charts = new Map();
        this.defaultColors = {
            primary: '#A68A56',
            secondary: '#8C7549',
            accent: '#F2F2F2',
            dark: '#0D0D0D',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        };
        this.init();
    }

    init() {
        Chart.defaults.font.family = 'Audrey, Arial, sans-serif';
        Chart.defaults.color = this.defaultColors.dark;
        Chart.defaults.backgroundColor = this.defaultColors.primary;
        Chart.defaults.borderColor = this.defaultColors.secondary;
    }

    createProgressChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`[Charts] Canvas ${canvasId} not found`);
            return null;
        }

        const defaultOptions = {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Progression',
                    data: data.values || [],
                    borderColor: this.defaultColors.primary,
                    backgroundColor: this.defaultColors.primary + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.defaultColors.primary,
                    pointBorderColor: this.defaultColors.accent,
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: this.defaultColors.dark,
                        titleColor: this.defaultColors.accent,
                        bodyColor: this.defaultColors.accent,
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (tooltipItems) => {
                                return `Séance ${tooltipItems[0].label}`;
                            },
                            label: (context) => {
                                return `Précision: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Séances',
                            color: this.defaultColors.dark
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: this.defaultColors.dark
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Précision (%)',
                            color: this.defaultColors.dark
                        },
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: this.defaultColors.secondary + '30'
                        },
                        ticks: {
                            color: this.defaultColors.dark,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        };

        const mergedOptions = this.mergeOptions(defaultOptions, options);
        const chart = new Chart(ctx, mergedOptions);
        this.charts.set(canvasId, chart);
        return chart;
    }

    createWeeklyChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        
        const defaultOptions = {
            type: 'bar',
            data: {
                labels: weekDays,
                datasets: [{
                    label: 'Séances par jour',
                    data: data.sessions || [],
                    backgroundColor: this.defaultColors.primary + '80',
                    borderColor: this.defaultColors.primary,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }, {
                    label: 'Précision moyenne',
                    data: data.accuracy || [],
                    type: 'line',
                    borderColor: this.defaultColors.success,
                    backgroundColor: this.defaultColors.success + '20',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: this.defaultColors.success,
                    pointBorderColor: this.defaultColors.accent,
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            color: this.defaultColors.dark
                        }
                    },
                    tooltip: {
                        backgroundColor: this.defaultColors.dark,
                        titleColor: this.defaultColors.accent,
                        bodyColor: this.defaultColors.accent,
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: this.defaultColors.dark
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Nombre de séances',
                            color: this.defaultColors.dark
                        },
                        beginAtZero: true,
                        grid: {
                            color: this.defaultColors.secondary + '30'
                        },
                        ticks: {
                            color: this.defaultColors.dark,
                            stepSize: 1
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Précision (%)',
                            color: this.defaultColors.dark
                        },
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: this.defaultColors.dark,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                }
            }
        };

        const mergedOptions = this.mergeOptions(defaultOptions, options);
        const chart = new Chart(ctx, mergedOptions);
        this.charts.set(canvasId, chart);
        return chart;
    }

    createBreathRateChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultOptions = {
            type: 'doughnut',
            data: {
                labels: ['Optimal (6 RPM)', 'Rapide (>6 RPM)', 'Lent (<6 RPM)'],
                datasets: [{
                    data: data.distribution || [0, 0, 0],
                    backgroundColor: [
                        this.defaultColors.success,
                        this.defaultColors.warning,
                        this.defaultColors.info
                    ],
                    borderColor: this.defaultColors.accent,
                    borderWidth: 3,
                    hoverBorderWidth: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: this.defaultColors.dark
                        }
                    },
                    tooltip: {
                        backgroundColor: this.defaultColors.dark,
                        titleColor: this.defaultColors.accent,
                        bodyColor: this.defaultColors.accent,
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const percentage = ((context.parsed / data.total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} séances (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1500
                }
            }
        };

        const mergedOptions = this.mergeOptions(defaultOptions, options);
        const chart = new Chart(ctx, mergedOptions);
        this.charts.set(canvasId, chart);
        return chart;
    }

    createTrendChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultOptions = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Tendance de précision',
                    data: data.accuracyTrend || [],
                    borderColor: this.defaultColors.primary,
                    backgroundColor: this.defaultColors.primary + '20',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }, {
                    label: 'Moyenne mobile',
                    data: data.movingAverage || [],
                    borderColor: this.defaultColors.success,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            color: this.defaultColors.dark
                        }
                    },
                    tooltip: {
                        backgroundColor: this.defaultColors.dark,
                        titleColor: this.defaultColors.accent,
                        bodyColor: this.defaultColors.accent,
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM DD'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: this.defaultColors.dark
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: this.defaultColors.dark
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Précision (%)',
                            color: this.defaultColors.dark
                        },
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: this.defaultColors.secondary + '30'
                        },
                        ticks: {
                            color: this.defaultColors.dark,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        };

        const mergedOptions = this.mergeOptions(defaultOptions, options);
        const chart = new Chart(ctx, mergedOptions);
        this.charts.set(canvasId, chart);
        return chart;
    }

    createHeatmapChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const hours = Array.from({length: 24}, (_, i) => `${i}h`);
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        const heatmapData = [];
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const value = data.matrix ? data.matrix[day][hour] : 0;
                heatmapData.push({
                    x: hour,
                    y: day,
                    v: value
                });
            }
        }

        const defaultOptions = {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Activité',
                    data: heatmapData,
                    backgroundColor: (context) => {
                        const value = context.parsed.v;
                        const alpha = Math.min(1, value / 5);
                        return this.defaultColors.primary + Math.round(alpha * 255).toString(16).padStart(2, '0');
                    },
                    borderColor: this.defaultColors.secondary,
                    borderWidth: 1,
                    pointRadius: (context) => {
                        const value = context.parsed.v;
                        return Math.max(3, Math.min(15, value * 3));
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: this.defaultColors.dark,
                        titleColor: this.defaultColors.accent,
                        bodyColor: this.defaultColors.accent,
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            title: () => '',
                            label: (context) => {
                                const day = days[context.parsed.y];
                                const hour = hours[context.parsed.x];
                                const sessions = context.parsed.v;
                                return `${day} ${hour}: ${sessions} séance${sessions > 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: 0,
                        max: 23,
                        title: {
                            display: true,
                            text: 'Heure de la journée',
                            color: this.defaultColors.dark
                        },
                        ticks: {
                            stepSize: 2,
                            color: this.defaultColors.dark,
                            callback: function(value) {
                                return value + 'h';
                            }
                        },
                        grid: {
                            color: this.defaultColors.secondary + '30'
                        }
                    },
                    y: {
                        type: 'linear',
                        min: 0,
                        max: 6,
                        title: {
                            display: true,
                            text: 'Jour de la semaine',
                            color: this.defaultColors.dark
                        },
                        ticks: {
                            stepSize: 1,
                            color: this.defaultColors.dark,
                            callback: function(value) {
                                return days[value] || '';
                            }
                        },
                        grid: {
                            color: this.defaultColors.secondary + '30'
                        }
                    }
                }
            }
        };

        const mergedOptions = this.mergeOptions(defaultOptions, options);
        const chart = new Chart(ctx, mergedOptions);
        this.charts.set(canvasId, chart);
        return chart;
    }

    createStreakChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const defaultOptions = {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Séries (jours)',
                    data: data.streaks || [],
                    backgroundColor: (context) => {
                        const value = context.parsed.y;
                        if (value >= 7) return this.defaultColors.success;
                        if (value >= 3) return this.defaultColors.warning;
                        return this.defaultColors.info;
                    },
                    borderColor: this.defaultColors.accent,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: this.defaultColors.dark,
                        titleColor: this.defaultColors.accent,
                        bodyColor: this.defaultColors.accent,
                        borderColor: this.defaultColors.primary,
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const days = context.parsed.y;
                                return `Série de ${days} jour${days > 1 ? 's' : ''}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Périodes',
                            color: this.defaultColors.dark
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: this.defaultColors.dark
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Durée (jours)',
                            color: this.defaultColors.dark
                        },
                        beginAtZero: true,
                        grid: {
                            color: this.defaultColors.secondary + '30'
                        },
                        ticks: {
                            color: this.defaultColors.dark,
                            stepSize: 1
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutBounce'
                }
            }
        };

        const mergedOptions = this.mergeOptions(defaultOptions, options);
        const chart = new Chart(ctx, mergedOptions);
        this.charts.set(canvasId, chart);
        return chart;
    }

    updateChart(canvasId, newData) {
        const chart = this.charts.get(canvasId);
        if (!chart) {
            console.error(`[Charts] Chart ${canvasId} not found`);
            return false;
        }

        if (newData.labels) {
            chart.data.labels = newData.labels;
        }

        if (newData.datasets) {
            chart.data.datasets = newData.datasets;
        } else if (newData.data) {
            chart.data.datasets[0].data = newData.data;
        }

        chart.update('active');
        return true;
    }

    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
            return true;
        }
        return false;
    }

    destroyAllCharts() {
        this.charts.forEach((chart, canvasId) => {
            chart.destroy();
        });
        this.charts.clear();
    }

    mergeOptions(defaultOptions, customOptions) {
        return {
            ...defaultOptions,
            ...customOptions,
            data: {
                ...defaultOptions.data,
                ...customOptions.data
            },
            options: {
                ...defaultOptions.options,
                ...customOptions.options
            }
        };
    }

    getChart(canvasId) {
        return this.charts.get(canvasId);
    }

    getAllCharts() {
        return Array.from(this.charts.entries());
    }

    exportChart(canvasId, format = 'png') {
        const chart = this.charts.get(canvasId);
        if (!chart) return null;

        return chart.toBase64Image(format);
    }

    resizeChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.resize();
        }
    }

    setTheme(theme) {
        if (theme === 'dark') {
            this.defaultColors = {
                ...this.defaultColors,
                primary: '#D4B26A',
                secondary: '#B8945C',
                accent: '#0D0D0D',
                dark: '#F2F2F2'
            };
        } else {
            this.defaultColors = {
                primary: '#A68A56',
                secondary: '#8C7549',
                accent: '#F2F2F2',
                dark: '#0D0D0D',
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545',
                info: '#17a2b8'
            };
        }

        Chart.defaults.color = this.defaultColors.dark;
        Chart.defaults.backgroundColor = this.defaultColors.primary;
        Chart.defaults.borderColor = this.defaultColors.secondary;

        this.charts.forEach(chart => chart.update());
    }
}

const advancedCharts = new AdvancedCharts();

export default advancedCharts;