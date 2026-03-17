const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;
const NODE_BORDER_RADIUS = 8;
const NODE_BORDER_WIDTH = 3;
const BADGE_HEIGHT = 18;
const BADGE_Y_OFFSET = 42;

export { NODE_WIDTH, NODE_HEIGHT };

export default {
    name: 'NodeBox',
    props: {
        nodeId: String,
        config: Object,
        state: String,
        stateDefinition: Object,
        flowStatus: String,
    },
    emits: ['pick-state'],
    computed: {
        strokeColour() {
            return this.stateDefinition ? this.stateDefinition.colour : '#667382';
        },
        fillColour() {
            if (this.flowStatus === 'flowing') return '#ffffff';
            if (this.flowStatus === 'blocked') return '#fef2f2';
            return '#f9fafb';
        },
        opacity() {
            return this.flowStatus === 'inactive' ? 0.5 : 1;
        },
        stateLabel() {
            return this.stateDefinition ? this.stateDefinition.label : this.state;
        },
        badgeWidth() {
            return Math.max(this.stateLabel.length * 7 + 16, 50);
        },
    },
    methods: {
        onClick(e) {
            e.stopPropagation();
            this.$emit('pick-state', { elementId: this.nodeId, elementType: 'node', mouseEvent: e });
        },
    },
    template: `<g :transform="'translate(' + config.x + ',' + config.y + ')'"
                  :opacity="opacity"
                  style="cursor: pointer"
                  @click="onClick">
        <rect
            :width="${NODE_WIDTH}"
            :height="${NODE_HEIGHT}"
            rx="${NODE_BORDER_RADIUS}"
            ry="${NODE_BORDER_RADIUS}"
            :fill="fillColour"
            :stroke="strokeColour"
            stroke-width="${NODE_BORDER_WIDTH}"
        />
        <text
            x="${NODE_WIDTH / 2}"
            y="24"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="13"
            font-weight="600"
            fill="#1e293b"
            font-family="system-ui, -apple-system, sans-serif"
        >{{ config.label }}</text>
        <rect
            :x="(${NODE_WIDTH} - badgeWidth) / 2"
            y="${BADGE_Y_OFFSET}"
            :width="badgeWidth"
            height="${BADGE_HEIGHT}"
            rx="9"
            ry="9"
            :fill="strokeColour"
        />
        <text
            x="${NODE_WIDTH / 2}"
            :y="${BADGE_Y_OFFSET + BADGE_HEIGHT / 2}"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="10"
            font-weight="500"
            fill="#ffffff"
            font-family="system-ui, -apple-system, sans-serif"
        >{{ stateLabel }}</text>
    </g>`,
};
