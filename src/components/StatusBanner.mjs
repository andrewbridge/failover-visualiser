export default {
    name: 'StatusBanner',
    props: {
        status: String,
        activeRouteLabel: String,
    },
    computed: {
        badgeClass() {
            if (this.status === 'online') return 'badge bg-green';
            if (this.status === 'degraded') return 'badge bg-orange';
            return 'badge bg-red';
        },
        label() {
            if (this.status === 'online') return `Online via ${this.activeRouteLabel}`;
            if (this.status === 'degraded') return `Degraded via ${this.activeRouteLabel}`;
            return 'Offline \u2014 No viable route';
        },
    },
    template: `<span :class="badgeClass">{{ label }}</span>`,
};
