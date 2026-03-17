import { computeEdgePath, computeEdgeLabelPos } from "../../utilities/layout.mjs";

const EDGE_STROKE_WIDTH = 3;
const EDGE_HIT_AREA_WIDTH = 15;

export default {
    name: 'EditorEdgePath',
    props: {
        edgeId: String,
        config: Object,
        fromNode: Object,
        toNode: Object,
        selected: Boolean,
    },
    emits: ['select'],
    computed: {
        pathD() {
            return computeEdgePath(this.fromNode, this.toNode, this.config.fromPoint, this.config.toPoint);
        },
        labelPos() {
            return computeEdgeLabelPos(this.fromNode, this.toNode, this.config.fromPoint, this.config.toPoint, this.config.labelPosition);
        },
        strokeColour() {
            return this.selected ? '#4299e1' : '#9ca3af';
        },
    },
    methods: {
        onClick(e) {
            e.stopPropagation();
            this.$emit('select', this.edgeId);
        },
    },
    template: `<g style="cursor: pointer" @mousedown="onClick">
        <path
            :d="pathD"
            fill="none"
            :stroke="strokeColour"
            stroke-width="${EDGE_STROKE_WIDTH}"
            stroke-linecap="round"
        />
        <path
            :d="pathD"
            fill="none"
            stroke="transparent"
            stroke-width="${EDGE_HIT_AREA_WIDTH}"
            stroke-linecap="round"
        />
        <text
            :x="labelPos.x"
            :y="labelPos.y - 10"
            text-anchor="middle"
            font-size="10"
            fill="#667382"
            font-family="system-ui, -apple-system, sans-serif"
            style="pointer-events: none"
        >{{ config.label || edgeId }}</text>
    </g>`,
};
