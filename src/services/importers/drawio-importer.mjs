import { getUid } from "../../utilities/strings.mjs";

/**
 * Parse a Draw.io XML file into a topology object.
 *
 * Extracts:
 *   - <mxCell vertex="1"> → nodes with positions from <mxGeometry>
 *   - <mxCell edge="1"> → edges with source/target refs
 *
 * @param {string} xmlString - Draw.io XML content
 * @returns {{ topology: Object, stats: { nodes: number, edges: number } }}
 */
export function parseDrawio(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML: ' + parseError.textContent.slice(0, 200));
    }

    const cells = doc.querySelectorAll('mxCell');
    const cellMap = new Map(); // cell ID -> { label, x, y, width, height, isVertex, isEdge, source, target }

    for (const cell of cells) {
        const id = cell.getAttribute('id');
        const value = cell.getAttribute('value') || '';
        const isVertex = cell.getAttribute('vertex') === '1';
        const isEdge = cell.getAttribute('edge') === '1';
        const source = cell.getAttribute('source');
        const target = cell.getAttribute('target');

        const geo = cell.querySelector('mxGeometry');
        let x = 0, y = 0, width = 140, height = 60;
        if (geo) {
            x = parseFloat(geo.getAttribute('x')) || 0;
            y = parseFloat(geo.getAttribute('y')) || 0;
            width = parseFloat(geo.getAttribute('width')) || 140;
            height = parseFloat(geo.getAttribute('height')) || 60;
        }

        cellMap.set(id, {
            label: stripHtml(value),
            x, y, width, height,
            isVertex, isEdge,
            source, target,
        });
    }

    // Map cell IDs to topology node IDs
    const cellToNodeId = new Map();
    const nodes = {};
    const vertexCells = [...cellMap.entries()].filter(([, c]) => c.isVertex && c.label);

    for (const [cellId, cell] of vertexCells) {
        const nodeId = slugify(cell.label) || ('node-' + getUid());
        // Avoid duplicate IDs
        let finalId = nodeId;
        let counter = 1;
        while (nodes[finalId]) {
            finalId = nodeId + '-' + counter++;
        }
        cellToNodeId.set(cellId, finalId);
        nodes[finalId] = {
            label: cell.label,
            x: Math.round(cell.x / 10) * 10,
            y: Math.round(cell.y / 10) * 10,
            states: ['healthy', 'offline'],
            default: 'healthy',
        };
    }

    // Build edges
    const edges = {};
    const edgeCells = [...cellMap.entries()].filter(([, c]) => c.isEdge);

    for (const [cellId, cell] of edgeCells) {
        const from = cellToNodeId.get(cell.source);
        const to = cellToNodeId.get(cell.target);
        if (!from || !to) continue;

        const edgeId = `${from}-${to}`;
        edges[edgeId] = {
            from, to,
            states: ['healthy', 'down'],
            default: 'healthy',
        };
    }

    const nodeIds = Object.keys(nodes);
    const topology = {
        source: nodeIds[0] || '',
        destination: nodeIds[nodeIds.length - 1] || '',
        stateDefinitions: {
            healthy: { label: 'Healthy', flow: 'pass', colour: '#2fb344' },
            offline: { label: 'Offline', flow: 'block', colour: '#d63939' },
            down: { label: 'Down', flow: 'block', colour: '#d63939' },
        },
        nodes,
        edges,
        routes: [],
        zones: {},
    };

    return {
        topology,
        stats: { nodes: nodeIds.length, edges: Object.keys(edges).length },
    };
}

/**
 * Strip HTML tags from a Draw.io label.
 */
function stripHtml(html) {
    if (!html) return '';
    // Draw.io often wraps labels in HTML
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').trim();
}

/**
 * Create a URL-friendly slug from a label.
 */
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
}
