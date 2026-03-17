import { NODE_WIDTH, NODE_HEIGHT } from "../NodeBox.mjs";
import { CONNECTION_POINTS } from "../../utilities/layout.mjs";

const NODE_BORDER_RADIUS = 8;

export default {
    name: 'EditorNodeBox',
    props: {
        nodeId: String,
        config: Object,
        selected: Boolean,
        showConnectionPoints: Boolean,
        occupiedPoints: Set,
    },
    emits: ['select', 'move', 'select-point'],
    data() {
        return {
            dragging: false,
            dragStartX: 0,
            dragStartY: 0,
            origX: 0,
            origY: 0,
        };
    },
    computed: {
        isCustomPositioning() {
            return this.config.positioning === 'custom';
        },
        connectionPointList() {
            return Object.entries(CONNECTION_POINTS).map(([name, pos]) => ({
                name,
                x: pos.x,
                y: pos.y,
                occupied: this.occupiedPoints ? this.occupiedPoints.has(name) : false,
            }));
        },
    },
    methods: {
        onMouseDown(e) {
            if (e.button !== 0) return;
            e.stopPropagation();
            this.$emit('select', this.nodeId);
            if (!this.isCustomPositioning) return;
            this.dragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.origX = this.config.x;
            this.origY = this.config.y;
            window.addEventListener('mousemove', this.onMouseMove);
            window.addEventListener('mouseup', this.onMouseUp);
        },
        onMouseMove(e) {
            if (!this.dragging) return;
            const svg = this.$el.ownerSVGElement;
            const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
            const dx = (e.clientX - this.dragStartX) / scale;
            const dy = (e.clientY - this.dragStartY) / scale;
            const newX = Math.round((this.origX + dx) / 10) * 10;
            const newY = Math.round((this.origY + dy) / 10) * 10;
            this.$emit('move', { nodeId: this.nodeId, x: newX, y: newY });
        },
        onMouseUp() {
            this.dragging = false;
            window.removeEventListener('mousemove', this.onMouseMove);
            window.removeEventListener('mouseup', this.onMouseUp);
        },
        onPointClick(pointName, e) {
            e.stopPropagation();
            this.$emit('select-point', { nodeId: this.nodeId, pointName });
        },
    },
    beforeUnmount() {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
    },
    template: `<g :transform="'translate(' + config.x + ',' + config.y + ')'"
                  :style="{ cursor: isCustomPositioning ? 'grab' : 'pointer' }"
                  @mousedown="onMouseDown">
        <rect
            v-if="selected"
            x="-4" y="-4"
            width="${NODE_WIDTH + 8}" height="${NODE_HEIGHT + 8}"
            rx="${NODE_BORDER_RADIUS + 2}"
            fill="none"
            stroke="#4299e1"
            stroke-width="2"
            stroke-dasharray="6 3"
        />
        <rect
            width="${NODE_WIDTH}" height="${NODE_HEIGHT}"
            rx="${NODE_BORDER_RADIUS}"
            fill="#ffffff"
            stroke="#667382"
            stroke-width="2"
        />
        <text
            x="${NODE_WIDTH / 2}" y="${NODE_HEIGHT / 2}"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="13"
            font-weight="600"
            fill="#1e293b"
            font-family="system-ui, -apple-system, sans-serif"
            style="pointer-events: none"
        >{{ config.label }}</text>
        <template v-if="showConnectionPoints">
            <circle v-for="pt in connectionPointList" :key="pt.name"
                :cx="pt.x" :cy="pt.y" r="5"
                :fill="pt.occupied ? '#e2e8f0' : '#ffffff'"
                :stroke="pt.occupied ? '#cbd5e1' : '#4299e1'"
                stroke-width="2"
                :style="{ cursor: pt.occupied ? 'not-allowed' : 'crosshair', pointerEvents: pt.occupied ? 'none' : 'auto' }"
                @mousedown.stop="onPointClick(pt.name, $event)"
            />
        </template>
    </g>`,
};
