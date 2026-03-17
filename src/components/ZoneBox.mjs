import { NODE_WIDTH, NODE_HEIGHT } from "./NodeBox.mjs";

const ZONE_PADDING = 30;
const ZONE_LABEL_HEIGHT = 24;
const ZONE_BORDER_RADIUS = 12;
const BADGE_HEIGHT = 18;

const ZONE_STYLES = {
    "on-prem": { fill: "#f4f6fa", stroke: "#667382", strokeDasharray: "none", strokeWidth: 1 },
    "region":  { fill: "#e8f4fd", stroke: "#4299e1", strokeDasharray: "8 4",  strokeWidth: 2 },
    "az":      { fill: "#dbeafe", stroke: "#60a5fa", strokeDasharray: "4 3",  strokeWidth: 1.5 },
    "generic": { fill: "#f9fafb", stroke: "#9ca3af", strokeDasharray: "6 3",  strokeWidth: 1 },
};

/**
 * Collect all descendant node IDs from a zone (including nested zones).
 */
function collectDescendantNodes(zone) {
    const nodes = [...zone.children];
    if (zone.zones) {
        for (const subZone of Object.values(zone.zones)) {
            nodes.push(...collectDescendantNodes(subZone));
        }
    }
    return nodes;
}

export { ZONE_PADDING, ZONE_LABEL_HEIGHT, collectDescendantNodes };

export default {
    name: 'ZoneBox',
    props: {
        zoneId: String,
        config: Object,
        allNodes: Object,
        state: String,
        stateDefinition: Object,
        depth: { type: Number, default: 0 },
        scenario: Object,
        topology: Object,
        flowResult: Object,
    },
    emits: ['pick-state'],
    computed: {
        descendantNodeIds() {
            return collectDescendantNodes(this.config);
        },
        nestingDepth() {
            return this.maxNestingDepth(this.config);
        },
        bounds() {
            const nodeIds = this.descendantNodeIds;
            if (nodeIds.length === 0) return { x: 0, y: 0, width: 200, height: 100 };
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const id of nodeIds) {
                const node = this.allNodes[id];
                if (!node) continue;
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x + NODE_WIDTH);
                maxY = Math.max(maxY, node.y + NODE_HEIGHT);
            }
            // Add extra padding per nesting depth so parent zones visibly wrap children
            const depth = this.nestingDepth;
            const pad = ZONE_PADDING + (depth * (ZONE_PADDING + ZONE_LABEL_HEIGHT));
            const padTop = ZONE_PADDING + ZONE_LABEL_HEIGHT + (depth * (ZONE_PADDING + ZONE_LABEL_HEIGHT));
            return {
                x: minX - pad,
                y: minY - padTop,
                width: (maxX - minX) + pad * 2,
                height: (maxY - minY) + pad + padTop,
            };
        },
        style() {
            return ZONE_STYLES[this.config.type] || ZONE_STYLES["generic"];
        },
        fillColour() {
            if (this.stateDefinition && this.stateDefinition.flow === "block") return "#fef2f2";
            return this.style.fill;
        },
        strokeColour() {
            if (this.stateDefinition && this.stateDefinition.flow === "block") return "#d63939";
            if (this.stateDefinition && this.stateDefinition.colour === "#f76707") return "#f76707";
            return this.style.stroke;
        },
        stateLabel() {
            return this.stateDefinition ? this.stateDefinition.label : this.state;
        },
        badgeWidth() {
            return Math.max(this.stateLabel.length * 6.5 + 12, 40);
        },
        nestedZones() {
            return this.config.zones || {};
        },
    },
    methods: {
        maxNestingDepth(zone) {
            if (!zone.zones || Object.keys(zone.zones).length === 0) return 0;
            let max = 0;
            for (const child of Object.values(zone.zones)) {
                max = Math.max(max, 1 + this.maxNestingDepth(child));
            }
            return max;
        },
        onLabelClick(e) {
            e.stopPropagation();
            this.$emit('pick-state', { elementId: this.zoneId, elementType: 'zone', mouseEvent: e });
        },
        onChildPickState(payload) {
            this.$emit('pick-state', payload);
        },
        getZoneState(zoneId) {
            return this.scenario.getState(zoneId);
        },
        getZoneStateDef(zoneId) {
            const state = this.getZoneState(zoneId);
            return this.topology.stateDefinitions[state];
        },
    },
    template: `<g>
        <rect
            :x="bounds.x"
            :y="bounds.y"
            :width="bounds.width"
            :height="bounds.height"
            :rx="${ZONE_BORDER_RADIUS}"
            :ry="${ZONE_BORDER_RADIUS}"
            :fill="fillColour"
            :stroke="strokeColour"
            :stroke-width="style.strokeWidth"
            :stroke-dasharray="style.strokeDasharray"
        />
        <rect
            :x="bounds.x"
            :y="bounds.y"
            :width="bounds.width"
            height="${ZONE_LABEL_HEIGHT}"
            :rx="${ZONE_BORDER_RADIUS}"
            :ry="${ZONE_BORDER_RADIUS}"
            fill="transparent"
            style="cursor: pointer"
            @click="onLabelClick"
        />
        <text
            :x="bounds.x + 10"
            :y="bounds.y + 16"
            font-size="11"
            font-weight="500"
            :fill="strokeColour"
            font-family="system-ui, -apple-system, sans-serif"
            style="cursor: pointer; pointer-events: none"
        >{{ config.label }}</text>
        <g v-if="stateDefinition && stateDefinition.flow !== 'pass' || stateDefinition && stateDefinition.colour === '#f76707'">
            <rect
                :x="bounds.x + bounds.width - badgeWidth - 8"
                :y="bounds.y + 5"
                :width="badgeWidth"
                height="${BADGE_HEIGHT}"
                rx="9"
                :fill="stateDefinition.colour"
            />
            <text
                :x="bounds.x + bounds.width - badgeWidth / 2 - 8"
                :y="bounds.y + 5 + ${BADGE_HEIGHT / 2}"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="10"
                font-weight="500"
                fill="#ffffff"
                font-family="system-ui, -apple-system, sans-serif"
            >{{ stateLabel }}</text>
        </g>
        <ZoneBox
            v-for="(subZone, subId) in nestedZones"
            :key="subId"
            :zone-id="subId"
            :config="subZone"
            :all-nodes="allNodes"
            :state="getZoneState(subId)"
            :state-definition="getZoneStateDef(subId)"
            :depth="depth + 1"
            :scenario="scenario"
            :topology="topology"
            :flow-result="flowResult"
            @pick-state="onChildPickState"
        />
    </g>`,
};
