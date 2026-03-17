import { computeEdgePath, computeEdgeLabelPos } from "../utilities/layout.mjs";
import { css } from "../deps/goober.mjs";

const EDGE_STROKE_WIDTH = 3;
const EDGE_HIT_AREA_WIDTH = 15;

const edgeFlowingClass = css`
    stroke-dasharray: 10 5;
    animation: flowAnimation 0.5s linear infinite;
    @keyframes flowAnimation {
        to { stroke-dashoffset: -15; }
    }
`;

export default {
    name: 'EdgePath',
    props: {
        edgeId: String,
        config: Object,
        fromNode: Object,
        toNode: Object,
        state: String,
        stateDefinition: Object,
        flowStatus: String,
    },
    emits: ['pick-state'],
    computed: {
        pathD() {
            return computeEdgePath(this.fromNode, this.toNode, this.config.fromPoint, this.config.toPoint);
        },
        strokeColour() {
            if (this.flowStatus === 'flowing') {
                return this.stateDefinition ? this.stateDefinition.colour : '#2fb344';
            }
            if (this.flowStatus === 'blocked') return '#d63939';
            return '#d1d5db';
        },
        opacity() {
            return this.flowStatus === 'inactive' ? 0.4 : 1;
        },
        cssClass() {
            return this.flowStatus === 'flowing' ? edgeFlowingClass : '';
        },
        labelPos() {
            return computeEdgeLabelPos(this.fromNode, this.toNode, this.config.fromPoint, this.config.toPoint, this.config.labelPosition);
        },
        stateLabel() {
            return this.stateDefinition ? this.stateDefinition.label : this.state;
        },
        showBadge() {
            return this.stateDefinition && this.stateDefinition.flow === 'block' || this.stateDefinition && this.stateDefinition.colour === '#f76707';
        },
        badgeWidth() {
            return Math.max(this.stateLabel.length * 6.5 + 12, 40);
        },
    },
    methods: {
        onClick(e) {
            e.stopPropagation();
            this.$emit('pick-state', { elementId: this.edgeId, elementType: 'edge', mouseEvent: e });
        },
    },
    template: `<g :opacity="opacity" style="cursor: pointer" @click="onClick">
        <path
            :d="pathD"
            fill="none"
            :stroke="strokeColour"
            stroke-width="${EDGE_STROKE_WIDTH}"
            stroke-linecap="round"
            :class="cssClass"
        />
        <path
            :d="pathD"
            fill="none"
            stroke="transparent"
            stroke-width="${EDGE_HIT_AREA_WIDTH}"
            stroke-linecap="round"
        />
        <text
            v-if="config.label"
            :x="labelPos.x"
            :y="labelPos.y - 10"
            text-anchor="middle"
            font-size="10"
            fill="#667382"
            font-family="system-ui, -apple-system, sans-serif"
            style="pointer-events: none"
        >{{ config.label }}</text>
        <g v-if="showBadge">
            <rect
                :x="labelPos.x - badgeWidth / 2"
                :y="labelPos.y - 10"
                :width="badgeWidth"
                height="20"
                rx="10"
                :fill="stateDefinition.colour"
            />
            <text
                :x="labelPos.x"
                :y="labelPos.y"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="10"
                font-weight="500"
                fill="#ffffff"
                font-family="system-ui, -apple-system, sans-serif"
            >{{ stateLabel }}</text>
        </g>
    </g>`,
};
