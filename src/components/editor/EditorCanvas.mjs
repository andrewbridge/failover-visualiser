import { NODE_WIDTH, NODE_HEIGHT } from "../NodeBox.mjs";
import { ZONE_PADDING, ZONE_LABEL_HEIGHT } from "../ZoneBox.mjs";
import { computeAutoLayout, getOccupiedPoints, getConnectionPos } from "../../utilities/layout.mjs";
import EditorNodeBox from "./EditorNodeBox.mjs";
import EditorEdgePath from "./EditorEdgePath.mjs";
import EditorZoneBox from "./EditorZoneBox.mjs";
import { css } from "../../deps/goober.mjs";

const SVG_PADDING = 40;

const styles = {
    container: css`
        flex: 1;
        overflow: hidden;
        position: relative;
        background: #f8fafc;
        background-image: radial-gradient(circle, #d1d5db 1px, transparent 1px);
        background-size: 20px 20px;
    `,
};

export default {
    name: 'EditorCanvas',
    components: { EditorNodeBox, EditorEdgePath, EditorZoneBox },
    props: {
        topology: Object,
        mode: String,
        selectedId: String,
        selectedType: String,
        edgeSource: Object, // { nodeId, pointName } | null
    },
    emits: ['select', 'deselect', 'edge-source', 'edge-target', 'move-node'],
    data() {
        return {
            pendingEdgeMouse: null,
        };
    },
    computed: {
        layoutPositions() {
            return computeAutoLayout(this.topology);
        },
        nodesWithLayout() {
            const layout = this.layoutPositions;
            const result = {};
            for (const [id, node] of Object.entries(this.topology.nodes)) {
                if (node.positioning === 'custom') {
                    result[id] = node;
                } else {
                    result[id] = { ...node, x: layout[id]?.x ?? node.x ?? 0, y: layout[id]?.y ?? node.y ?? 0 };
                }
            }
            return result;
        },
        viewBox() {
            const nodes = Object.values(this.nodesWithLayout);
            if (nodes.length === 0) return "-100 -100 800 600";
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const n of nodes) {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + NODE_WIDTH);
                maxY = Math.max(maxY, n.y + NODE_HEIGHT);
            }
            const pad = SVG_PADDING + ZONE_PADDING + ZONE_LABEL_HEIGHT;
            const w = Math.max(maxX - minX + pad * 2, 600);
            const h = Math.max(maxY - minY + pad * 2, 400);
            return (minX - pad) + " " + (minY - pad) + " " + w + " " + h;
        },
        cursor() {
            if (this.mode === 'add-edge') return 'crosshair';
            return 'default';
        },
        pendingEdgePath() {
            if (!this.edgeSource || !this.pendingEdgeMouse) return '';
            const fromNode = this.nodesWithLayout[this.edgeSource.nodeId];
            if (!fromNode) return '';
            const start = getConnectionPos(fromNode, this.edgeSource.pointName);
            return "M " + start.x + " " + start.y + " L " + this.pendingEdgeMouse.x + " " + this.pendingEdgeMouse.y;
        },
    },
    methods: {
        toSvgCoords(e) {
            const svg = this.$refs.svg;
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            return pt.matrixTransform(svg.getScreenCTM().inverse());
        },
        onCanvasClick(e) {
            if (e.target !== this.$refs.svg && e.target !== this.$refs.bg) return;
            this.$emit('deselect');
        },
        onCanvasMouseMove(e) {
            if (this.edgeSource) {
                this.pendingEdgeMouse = this.toSvgCoords(e);
            }
        },
        getNodeOccupiedPoints(nodeId) {
            return getOccupiedPoints(nodeId, this.topology.edges);
        },
        onNodeSelect(nodeId) {
            // In add-edge mode, plain node clicks are ignored — only connection point clicks count
            if (this.mode === 'add-edge') return;
            this.$emit('select', { id: nodeId, type: 'node' });
        },
        onNodePointSelect({ nodeId, pointName }) {
            if (this.mode !== 'add-edge') return;
            if (!this.edgeSource) {
                this.$emit('edge-source', { nodeId, pointName });
            } else {
                this.$emit('edge-target', { nodeId, pointName });
                this.pendingEdgeMouse = null;
            }
        },
        onEdgeSelect(edgeId) {
            if (this.mode !== 'select') return;
            this.$emit('select', { id: edgeId, type: 'edge' });
        },
        onZoneSelect(zoneId) {
            if (this.mode !== 'select') return;
            this.$emit('select', { id: zoneId, type: 'zone' });
        },
        onNodeMove({ nodeId, x, y }) {
            this.$emit('move-node', { nodeId, x, y });
        },
    },
    template: `<div class="${styles.container}">
        <svg ref="svg" :viewBox="viewBox" xmlns="http://www.w3.org/2000/svg"
             width="100%" height="100%"
             :style="{ cursor: cursor, display: 'block', minHeight: '400px' }"
             @mousedown="onCanvasClick"
             @mousemove="onCanvasMouseMove">
            <rect ref="bg" x="-10000" y="-10000" width="20000" height="20000" fill="transparent" />
            <EditorZoneBox
                v-for="(zone, zoneId) in topology.zones"
                :key="zoneId"
                :zone-id="zoneId"
                :config="zone"
                :all-nodes="nodesWithLayout"
                :selected="selectedId === zoneId && selectedType === 'zone'"
                :selected-element-id="selectedId"
                @select="onZoneSelect"
            />
            <EditorEdgePath
                v-for="(edge, edgeId) in topology.edges"
                :key="edgeId"
                :edge-id="edgeId"
                :config="edge"
                :from-node="nodesWithLayout[edge.from]"
                :to-node="nodesWithLayout[edge.to]"
                :selected="selectedId === edgeId && selectedType === 'edge'"
                @select="onEdgeSelect"
            />
            <EditorNodeBox
                v-for="(node, nodeId) in nodesWithLayout"
                :key="nodeId"
                :node-id="nodeId"
                :config="node"
                :selected="selectedId === nodeId && selectedType === 'node'"
                :show-connection-points="mode === 'add-edge'"
                :occupied-points="getNodeOccupiedPoints(nodeId)"
                @select="onNodeSelect"
                @select-point="onNodePointSelect"
                @move="onNodeMove"
            />
            <path v-if="pendingEdgePath"
                  :d="pendingEdgePath"
                  fill="none" stroke="#4299e1" stroke-width="2"
                  stroke-dasharray="6 3"
                  style="pointer-events: none" />
        </svg>
    </div>`,
};
