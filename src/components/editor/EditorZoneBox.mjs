import { NODE_WIDTH, NODE_HEIGHT } from "../NodeBox.mjs";
import { ZONE_PADDING, ZONE_LABEL_HEIGHT, collectDescendantNodes } from "../ZoneBox.mjs";

const ZONE_BORDER_RADIUS = 12;

const ZONE_STYLES = {
    "on-prem": { fill: "#f4f6fa", stroke: "#667382", strokeDasharray: "none", strokeWidth: 1 },
    "region":  { fill: "#e8f4fd", stroke: "#4299e1", strokeDasharray: "8 4",  strokeWidth: 2 },
    "az":      { fill: "#dbeafe", stroke: "#60a5fa", strokeDasharray: "4 3",  strokeWidth: 1.5 },
    "generic": { fill: "#f9fafb", stroke: "#9ca3af", strokeDasharray: "6 3",  strokeWidth: 1 },
};

export default {
    name: 'EditorZoneBox',
    props: {
        zoneId: String,
        config: Object,
        allNodes: Object,
        selected: Boolean,
        selectedElementId: String,
    },
    emits: ['select'],
    computed: {
        descendantNodeIds() {
            return collectDescendantNodes(this.config);
        },
        nestingDepth() {
            return this.maxNestingDepth(this.config);
        },
        bounds() {
            const nodeIds = this.descendantNodeIds;
            // Collect actual positions from nodes that exist
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let found = 0;
            for (const id of nodeIds) {
                const node = this.allNodes[id];
                if (!node) continue;
                found++;
                minX = Math.min(minX, node.x);
                minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x + NODE_WIDTH);
                maxY = Math.max(maxY, node.y + NODE_HEIGHT);
            }
            if (found === 0) {
                // Empty zone — position relative to existing nodes so it stays visible
                const allNodeValues = Object.values(this.allNodes);
                let cx = 100, cy = 100;
                if (allNodeValues.length > 0) {
                    cx = allNodeValues.reduce((s, n) => s + n.x, 0) / allNodeValues.length;
                    cy = allNodeValues.reduce((s, n) => s + n.y, 0) / allNodeValues.length;
                }
                return { x: cx - 100, y: cy - 50, width: 200, height: 100 };
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
        strokeColour() {
            return this.selected ? '#4299e1' : this.style.stroke;
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
            this.$emit('select', this.zoneId);
        },
        onChildSelect(id) {
            this.$emit('select', id);
        },
    },
    template: `<g>
        <rect
            :x="bounds.x"
            :y="bounds.y"
            :width="bounds.width"
            :height="bounds.height"
            rx="${ZONE_BORDER_RADIUS}"
            ry="${ZONE_BORDER_RADIUS}"
            :fill="style.fill"
            :stroke="strokeColour"
            :stroke-width="selected ? 2.5 : style.strokeWidth"
            :stroke-dasharray="style.strokeDasharray"
        />
        <rect
            :x="bounds.x"
            :y="bounds.y"
            :width="bounds.width"
            height="${ZONE_LABEL_HEIGHT}"
            rx="${ZONE_BORDER_RADIUS}"
            ry="${ZONE_BORDER_RADIUS}"
            fill="transparent"
            style="cursor: pointer"
            @mousedown="onLabelClick"
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
        <EditorZoneBox
            v-for="(subZone, subId) in nestedZones"
            :key="subId"
            :zone-id="subId"
            :config="subZone"
            :all-nodes="allNodes"
            :selected="selectedElementId === subId"
            :selected-element-id="selectedElementId"
            @select="onChildSelect"
        />
    </g>`,
};
