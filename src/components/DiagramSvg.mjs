import { NODE_WIDTH, NODE_HEIGHT } from "./NodeBox.mjs";
import { ZONE_PADDING, ZONE_LABEL_HEIGHT, collectDescendantNodes } from "./ZoneBox.mjs";
import { computeAutoLayout } from "../utilities/layout.mjs";
import NodeBox from "./NodeBox.mjs";
import EdgePath from "./EdgePath.mjs";
import ZoneBox from "./ZoneBox.mjs";
import StatePicker from "./StatePicker.mjs";
import { css } from "../deps/goober.mjs";

const SVG_PADDING = 40;

const styles = {
    container: css`
        width: 100%;
        overflow: hidden;
    `,
};

export default {
    name: 'DiagramSvg',
    components: { NodeBox, EdgePath, ZoneBox, StatePicker },
    props: {
        topology: Object,
        scenario: Object,
        flowResult: Object,
    },
    data() {
        return {
            picker: null,
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
            if (nodes.length === 0) return "0 0 400 300";
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const n of nodes) {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + NODE_WIDTH);
                maxY = Math.max(maxY, n.y + NODE_HEIGHT);
            }
            const pad = SVG_PADDING + ZONE_PADDING + ZONE_LABEL_HEIGHT;
            return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
        },
        nodeEntries() {
            return Object.entries(this.nodesWithLayout);
        },
        edgeEntries() {
            return Object.entries(this.topology.edges);
        },
        zoneEntries() {
            return Object.entries(this.topology.zones);
        },
    },
    methods: {
        getNodeState(nodeId) {
            return this.scenario.getState(nodeId);
        },
        getStateDef(stateName) {
            return this.topology.stateDefinitions[stateName];
        },
        getFlowStatus(id) {
            return this.flowResult.flowSegments.get(id) || 'inactive';
        },
        onPickState(payload) {
            const { elementId, elementType, mouseEvent } = payload;
            let element;
            if (elementType === 'node') element = this.topology.nodes[elementId];
            else if (elementType === 'edge') element = this.topology.edges[elementId];
            else {
                // zone — need to find in nested zones
                element = this.findZone(elementId);
            }
            if (!element) return;

            const currentState = this.scenario.getState(elementId);
            const availableStates = element.states.map(key => ({
                key,
                label: this.topology.stateDefinitions[key]?.label || key,
                colour: this.topology.stateDefinitions[key]?.colour || '#667382',
                flow: this.topology.stateDefinitions[key]?.flow || 'pass',
                isActive: key === currentState,
            }));

            this.picker = {
                elementId,
                elementType,
                availableStates,
                position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
            };
        },
        findZone(zoneId, zones = this.topology.zones) {
            for (const [id, zone] of Object.entries(zones)) {
                if (id === zoneId) return zone;
                if (zone.zones) {
                    const found = this.findZone(zoneId, zone.zones);
                    if (found) return found;
                }
            }
            return null;
        },
        onSelectState({ elementId, stateName }) {
            this.scenario.setState(elementId, stateName);
            this.picker = null;
        },
        closePicker() {
            this.picker = null;
        },
        getZoneState(zoneId) {
            return this.scenario.getState(zoneId);
        },
        getZoneStateDef(zoneId) {
            const state = this.getZoneState(zoneId);
            return this.getStateDef(state);
        },
    },
    template: `<div class="${styles.container}">
        <svg :viewBox="viewBox" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"
             style="display: block; min-height: 300px;">
            <defs>
                <style>
                    @keyframes flowAnimation {
                        to { stroke-dashoffset: -20; }
                    }
                    .edge-flowing {
                        stroke-dasharray: 10 5;
                        animation: flowAnimation 0.5s linear infinite;
                    }
                </style>
            </defs>
            <ZoneBox
                v-for="(zone, zoneId) in topology.zones"
                :key="zoneId"
                :zone-id="zoneId"
                :config="zone"
                :all-nodes="nodesWithLayout"
                :state="getZoneState(zoneId)"
                :state-definition="getZoneStateDef(zoneId)"
                :depth="0"
                :scenario="scenario"
                :topology="topology"
                :flow-result="flowResult"
                @pick-state="onPickState"
            />
            <EdgePath
                v-for="(edge, edgeId) in topology.edges"
                :key="edgeId"
                :edge-id="edgeId"
                :config="edge"
                :from-node="nodesWithLayout[edge.from]"
                :to-node="nodesWithLayout[edge.to]"
                :state="getNodeState(edgeId)"
                :state-definition="getStateDef(getNodeState(edgeId))"
                :flow-status="getFlowStatus(edgeId)"
                @pick-state="onPickState"
            />
            <NodeBox
                v-for="(node, nodeId) in nodesWithLayout"
                :key="nodeId"
                :node-id="nodeId"
                :config="node"
                :state="getNodeState(nodeId)"
                :state-definition="getStateDef(getNodeState(nodeId))"
                :flow-status="getFlowStatus(nodeId)"
                @pick-state="onPickState"
                data-node
            />
        </svg>
        <StatePicker
            v-if="picker"
            :element-id="picker.elementId"
            :element-type="picker.elementType"
            :available-states="picker.availableStates"
            :position="picker.position"
            @select-state="onSelectState"
            @close="closePicker"
        />
    </div>`,
};
