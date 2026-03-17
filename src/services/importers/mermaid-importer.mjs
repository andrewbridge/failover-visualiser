import { NODE_WIDTH, NODE_HEIGHT } from "../../components/NodeBox.mjs";
import { getUid } from "../../utilities/strings.mjs";

const H_GAP = NODE_WIDTH + 60;
const V_GAP = NODE_HEIGHT + 40;

/**
 * Parse a subset of Mermaid graph syntax into a topology object.
 *
 * Supported:
 *   graph LR / graph TD
 *   NodeId[Label]
 *   NodeId(Label)
 *   NodeId --> NodeId2
 *   NodeId -->|text| NodeId2
 *   subgraph Label ... end  (mapped to zones)
 *
 * @param {string} input - Mermaid source
 * @returns {{ topology: Object, stats: { nodes: number, edges: number, zones: number } }}
 */
export function parseMermaid(input) {
    const lines = input.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

    let direction = 'LR'; // default left-to-right
    const nodeLabels = new Map(); // id -> label
    const edgePairs = []; // [{ from, to }]
    const zoneStack = []; // stack of { id, label, children }
    const zones = []; // flat list of { id, label, children, parent }

    for (const line of lines) {
        // Graph direction
        const dirMatch = line.match(/^graph\s+(LR|TD|TB|RL|BT)/i);
        if (dirMatch) {
            direction = dirMatch[1].toUpperCase();
            continue;
        }

        // Subgraph start
        const subMatch = line.match(/^subgraph\s+(.+)/i);
        if (subMatch) {
            const label = subMatch[1].replace(/^["']|["']$/g, '').trim();
            const id = 'zone-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
            const zone = { id, label, children: [], parent: zoneStack.length > 0 ? zoneStack[zoneStack.length - 1].id : null };
            zoneStack.push(zone);
            zones.push(zone);
            continue;
        }

        // Subgraph end
        if (line.match(/^end$/i)) {
            zoneStack.pop();
            continue;
        }

        // Parse edges and node definitions from a line
        // Split on semicolons for multiple statements per line
        const statements = line.split(';').map(s => s.trim()).filter(Boolean);
        for (const stmt of statements) {
            parseStatement(stmt, nodeLabels, edgePairs, zoneStack);
        }
    }

    // Build node map with positions
    const nodeIds = [...nodeLabels.keys()];
    const positions = layoutNodes(nodeIds, edgePairs, direction);

    const nodes = {};
    for (const id of nodeIds) {
        const pos = positions.get(id) || { x: 0, y: 0 };
        nodes[id] = {
            label: nodeLabels.get(id) || id,
            x: pos.x,
            y: pos.y,
            states: ['healthy', 'offline'],
            default: 'healthy',
        };
    }

    // Build edges
    const edges = {};
    for (const { from, to } of edgePairs) {
        const id = `${from}-${to}`;
        edges[id] = {
            from, to,
            states: ['healthy', 'down'],
            default: 'healthy',
        };
    }

    // Build zones (nested structure)
    const topLevelZones = {};
    const zoneMap = new Map();
    for (const z of zones) {
        const zoneObj = {
            label: z.label,
            type: 'generic',
            states: ['available', 'outage'],
            default: 'available',
            children: z.children,
            zones: {},
        };
        zoneMap.set(z.id, { obj: zoneObj, parent: z.parent });
    }
    // Build nested structure
    for (const [id, { obj, parent }] of zoneMap) {
        if (parent && zoneMap.has(parent)) {
            zoneMap.get(parent).obj.zones[id] = obj;
        } else {
            topLevelZones[id] = obj;
        }
    }

    // Assign nodes to zones based on subgraph containment
    // Nodes that were defined inside a subgraph block are children
    for (const z of zones) {
        const zoneObj = zoneMap.get(z.id).obj;
        // Filter to only nodes that actually exist
        zoneObj.children = z.children.filter(id => nodes[id]);
    }

    const topology = {
        source: nodeIds[0] || '',
        destination: nodeIds[nodeIds.length - 1] || '',
        stateDefinitions: {
            healthy: { label: 'Healthy', flow: 'pass', colour: '#2fb344' },
            offline: { label: 'Offline', flow: 'block', colour: '#d63939' },
            down: { label: 'Down', flow: 'block', colour: '#d63939' },
            available: { label: 'Available', flow: 'pass', colour: '#2fb344' },
            outage: { label: 'Outage', flow: 'block', colour: '#d63939' },
        },
        nodes,
        edges,
        routes: [],
        zones: topLevelZones,
    };

    return {
        topology,
        stats: { nodes: nodeIds.length, edges: edgePairs.length, zones: zones.length },
    };
}

/**
 * Parse a single statement for nodes and edges.
 */
function parseStatement(stmt, nodeLabels, edgePairs, zoneStack) {
    // Edge patterns: A --> B, A -->|label| B, A --- B, A ==> B
    const edgeRegex = /(\w[\w-]*)\s*(?:\[([^\]]*)\]|\(([^)]*)\))?\s*(?:-->|---|--->|==>)\s*(?:\|[^|]*\|)?\s*(\w[\w-]*)\s*(?:\[([^\]]*)\]|\(([^)]*)\))?/;
    const edgeMatch = stmt.match(edgeRegex);
    if (edgeMatch) {
        const fromId = edgeMatch[1];
        const fromLabel = edgeMatch[2] || edgeMatch[3];
        const toId = edgeMatch[4];
        const toLabel = edgeMatch[5] || edgeMatch[6];

        if (fromLabel && !nodeLabels.has(fromId)) nodeLabels.set(fromId, fromLabel);
        if (!nodeLabels.has(fromId)) nodeLabels.set(fromId, fromId);
        if (toLabel && !nodeLabels.has(toId)) nodeLabels.set(toId, toLabel);
        if (!nodeLabels.has(toId)) nodeLabels.set(toId, toId);

        edgePairs.push({ from: fromId, to: toId });

        // Track zone membership
        if (zoneStack.length > 0) {
            const currentZone = zoneStack[zoneStack.length - 1];
            if (!currentZone.children.includes(fromId)) currentZone.children.push(fromId);
            if (!currentZone.children.includes(toId)) currentZone.children.push(toId);
        }
        return;
    }

    // Standalone node definition: A[Label] or A(Label)
    const nodeRegex = /^(\w[\w-]*)\s*(?:\[([^\]]*)\]|\(([^)]*)\))\s*$/;
    const nodeMatch = stmt.match(nodeRegex);
    if (nodeMatch) {
        const id = nodeMatch[1];
        const label = nodeMatch[2] || nodeMatch[3];
        if (!nodeLabels.has(id)) nodeLabels.set(id, label || id);

        if (zoneStack.length > 0) {
            const currentZone = zoneStack[zoneStack.length - 1];
            if (!currentZone.children.includes(id)) currentZone.children.push(id);
        }
    }
}

/**
 * Simple layered layout: topological sort, assign to layers, space within layers.
 */
function layoutNodes(nodeIds, edgePairs, direction) {
    const positions = new Map();
    if (nodeIds.length === 0) return positions;

    // Build adjacency list
    const successors = new Map();
    const predecessors = new Map();
    for (const id of nodeIds) {
        successors.set(id, []);
        predecessors.set(id, []);
    }
    for (const { from, to } of edgePairs) {
        if (successors.has(from) && predecessors.has(to)) {
            successors.get(from).push(to);
            predecessors.get(to).push(from);
        }
    }

    // Assign layers via longest path from roots
    const layers = new Map();
    const visited = new Set();

    function assignLayer(id, depth) {
        if (layers.has(id)) {
            layers.set(id, Math.max(layers.get(id), depth));
        } else {
            layers.set(id, depth);
        }
        if (visited.has(id)) return;
        visited.add(id);
        for (const next of successors.get(id) || []) {
            assignLayer(next, depth + 1);
        }
    }

    // Start from nodes with no predecessors (roots)
    const roots = nodeIds.filter(id => (predecessors.get(id) || []).length === 0);
    if (roots.length === 0) roots.push(nodeIds[0]); // fallback
    for (const root of roots) {
        assignLayer(root, 0);
    }
    // Assign any unvisited nodes
    for (const id of nodeIds) {
        if (!layers.has(id)) layers.set(id, 0);
    }

    // Group by layer
    const layerGroups = new Map();
    for (const [id, layer] of layers) {
        if (!layerGroups.has(layer)) layerGroups.set(layer, []);
        layerGroups.get(layer).push(id);
    }

    const isHorizontal = direction === 'LR' || direction === 'RL';
    const baseX = 50;
    const baseY = 50;

    for (const [layer, ids] of layerGroups) {
        for (let i = 0; i < ids.length; i++) {
            if (isHorizontal) {
                positions.set(ids[i], { x: baseX + layer * H_GAP, y: baseY + i * V_GAP });
            } else {
                positions.set(ids[i], { x: baseX + i * H_GAP, y: baseY + layer * V_GAP });
            }
        }
    }

    return positions;
}
