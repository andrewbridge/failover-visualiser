import { NODE_WIDTH, NODE_HEIGHT } from "../components/NodeBox.mjs";
import { ZONE_PADDING, ZONE_LABEL_HEIGHT, collectDescendantNodes } from "../components/ZoneBox.mjs";

// --- Connection point geometry ---

export const CONNECTION_POINTS = {
    'top-left':     { x: 0,              y: 0 },
    'top':          { x: NODE_WIDTH / 2, y: 0 },
    'top-right':    { x: NODE_WIDTH,     y: 0 },
    'left':         { x: 0,              y: NODE_HEIGHT / 2 },
    'right':        { x: NODE_WIDTH,     y: NODE_HEIGHT / 2 },
    'bottom-left':  { x: 0,              y: NODE_HEIGHT },
    'bottom':       { x: NODE_WIDTH / 2, y: NODE_HEIGHT },
    'bottom-right': { x: NODE_WIDTH,     y: NODE_HEIGHT },
};

export const POINT_NAMES = Object.keys(CONNECTION_POINTS);

// Direction vectors for bezier control point offsets
const POINT_DIRECTIONS = {
    'top-left':     { dx: -1, dy: -1 },
    'top':          { dx: 0,  dy: -1 },
    'top-right':    { dx: 1,  dy: -1 },
    'left':         { dx: -1, dy: 0 },
    'right':        { dx: 1,  dy: 0 },
    'bottom-left':  { dx: -1, dy: 1 },
    'bottom':       { dx: 0,  dy: 1 },
    'bottom-right': { dx: 1,  dy: 1 },
};

const CONTROL_OFFSET = 60;

/**
 * Get the absolute SVG position of a connection point on a node.
 */
export function getConnectionPos(node, pointName) {
    const offset = CONNECTION_POINTS[pointName] || CONNECTION_POINTS['right'];
    return { x: node.x + offset.x, y: node.y + offset.y };
}

/**
 * Compute an SVG path `d` string for an edge between two nodes using their connection points.
 */
export function computeEdgePath(fromNode, toNode, fromPoint, toPoint) {
    if (!fromNode || !toNode) return '';
    fromPoint = fromPoint || 'right';
    toPoint = toPoint || 'left';

    const start = getConnectionPos(fromNode, fromPoint);
    const end = getConnectionPos(toNode, toPoint);
    const fromDir = POINT_DIRECTIONS[fromPoint] || { dx: 1, dy: 0 };
    const toDir = POINT_DIRECTIONS[toPoint] || { dx: -1, dy: 0 };

    const cp1x = start.x + fromDir.dx * CONTROL_OFFSET;
    const cp1y = start.y + fromDir.dy * CONTROL_OFFSET;
    const cp2x = end.x + toDir.dx * CONTROL_OFFSET;
    const cp2y = end.y + toDir.dy * CONTROL_OFFSET;

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

/**
 * Compute the label position for an edge.
 * @param {number} [t=0.5] Position along the curve (0 = start, 1 = end).
 */
export function computeEdgeLabelPos(fromNode, toNode, fromPoint, toPoint, t) {
    if (!fromNode || !toNode) return { x: 0, y: 0 };
    if (t == null) t = 0.5;
    fromPoint = fromPoint || 'right';
    toPoint = toPoint || 'left';

    const start = getConnectionPos(fromNode, fromPoint);
    const end = getConnectionPos(toNode, toPoint);
    const fromDir = POINT_DIRECTIONS[fromPoint] || { dx: 1, dy: 0 };
    const toDir = POINT_DIRECTIONS[toPoint] || { dx: -1, dy: 0 };

    // Cubic bezier at parameter t: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
    const p0x = start.x, p0y = start.y;
    const p1x = start.x + fromDir.dx * CONTROL_OFFSET;
    const p1y = start.y + fromDir.dy * CONTROL_OFFSET;
    const p2x = end.x + toDir.dx * CONTROL_OFFSET;
    const p2y = end.y + toDir.dy * CONTROL_OFFSET;
    const p3x = end.x, p3y = end.y;

    const u = 1 - t;
    const x = u*u*u*p0x + 3*u*u*t*p1x + 3*u*t*t*p2x + t*t*t*p3x;
    const y = u*u*u*p0y + 3*u*u*t*p1y + 3*u*t*t*p2y + t*t*t*p3y;

    return { x, y };
}

/**
 * Get the set of connection point names already occupied by edges on a given node.
 */
export function getOccupiedPoints(nodeId, edges) {
    const occupied = new Set();
    for (const edge of Object.values(edges)) {
        if (edge.from === nodeId) occupied.add(edge.fromPoint || 'right');
        if (edge.to === nodeId) occupied.add(edge.toPoint || 'left');
    }
    return occupied;
}

// --- Auto-layout ---

// Direction offsets used by the layout engine — maps a fromPoint to the relative
// grid position of the target node.
const DIRECTION_OFFSETS = {
    'right':        { dx: 1,  dy: 0 },
    'left':         { dx: -1, dy: 0 },
    'top':          { dx: 0,  dy: -1 },
    'bottom':       { dx: 0,  dy: 1 },
    'top-right':    { dx: 1,  dy: -1 },
    'top-left':     { dx: -1, dy: -1 },
    'bottom-right': { dx: 1,  dy: 1 },
    'bottom-left':  { dx: -1, dy: 1 },
};

const GRID_GAP_X = 220; // NODE_WIDTH (140) + 80
const GRID_GAP_Y = 120; // NODE_HEIGHT (60) + 60

/**
 * Compute auto-layout positions for all nodes in a topology.
 * Returns { [nodeId]: { x, y } }.
 * Nodes with positioning === 'custom' keep their stored x/y.
 */
export function computeAutoLayout(topology) {
    const positions = {};
    const nodes = topology.nodes || {};
    const edges = topology.edges || {};

    const allIds = Object.keys(nodes);
    if (allIds.length === 0) return positions;

    const autoNodeIds = allIds.filter(id => nodes[id].positioning !== 'custom');
    const customNodeIds = allIds.filter(id => nodes[id].positioning === 'custom');

    // Custom nodes keep their stored x/y
    for (const id of customNodeIds) {
        positions[id] = { x: nodes[id].x, y: nodes[id].y };
    }

    if (autoNodeIds.length === 0) return positions;

    // Build adjacency: for each edge, the fromPoint tells us the direction to place the target
    const adjacency = new Map();
    for (const edge of Object.values(edges)) {
        const fromPoint = edge.fromPoint || 'right';
        const offset = DIRECTION_OFFSETS[fromPoint] || { dx: 1, dy: 0 };

        if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
        adjacency.get(edge.from).push({
            targetId: edge.to,
            dx: offset.dx * GRID_GAP_X,
            dy: offset.dy * GRID_GAP_Y,
        });

        // Reverse direction: source is in the opposite direction of fromPoint
        if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
        adjacency.get(edge.to).push({
            targetId: edge.from,
            dx: -offset.dx * GRID_GAP_X,
            dy: -offset.dy * GRID_GAP_Y,
        });
    }

    // BFS from root (topology source, or first auto node)
    const root = (topology.source && autoNodeIds.includes(topology.source))
        ? topology.source
        : autoNodeIds[0];

    const placed = new Set();
    const queue = [root];

    // If root already has a custom position (shouldn't, but safety), use it; otherwise start at (100, 100)
    positions[root] = positions[root] || { x: 100, y: 100 };
    placed.add(root);

    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = adjacency.get(current) || [];
        for (const { targetId, dx, dy } of neighbors) {
            if (placed.has(targetId)) continue;
            if (nodes[targetId]?.positioning === 'custom') continue;

            positions[targetId] = {
                x: Math.round((positions[current].x + dx) / 10) * 10,
                y: Math.round((positions[current].y + dy) / 10) * 10,
            };
            placed.add(targetId);
            queue.push(targetId);
        }
    }

    // Centering pass: when a node has neighbors pulling in opposing directions
    // on an axis, center the node between them on that axis.
    for (const nodeId of autoNodeIds) {
        if (!placed.has(nodeId)) continue;
        const neighbors = adjacency.get(nodeId) || [];
        const placedNeighbors = neighbors.filter(n => positions[n.targetId]);
        if (placedNeighbors.length < 2) continue;

        // Check which directions neighbors pull on each axis
        const dxs = placedNeighbors.map(n => n.dx);
        const dys = placedNeighbors.map(n => n.dy);
        const hasLeft = dxs.some(d => d < 0);
        const hasRight = dxs.some(d => d > 0);
        const hasUp = dys.some(d => d < 0);
        const hasDown = dys.some(d => d > 0);

        const suggestions = placedNeighbors.map(({ targetId, dx, dy }) => ({
            x: positions[targetId].x - dx,
            y: positions[targetId].y - dy,
        }));

        let newX = positions[nodeId].x;
        let newY = positions[nodeId].y;

        // Only center on an axis if neighbors pull in both directions
        if (hasLeft && hasRight) {
            newX = suggestions.reduce((s, p) => s + p.x, 0) / suggestions.length;
        }
        if (hasUp && hasDown) {
            newY = suggestions.reduce((s, p) => s + p.y, 0) / suggestions.length;
        }

        positions[nodeId] = {
            x: Math.round(newX / 10) * 10,
            y: Math.round(newY / 10) * 10,
        };
    }

    // Place disconnected auto-nodes in a row
    let nextX = 100;
    let maxY = 100;
    for (const pos of Object.values(positions)) {
        if (pos.y + NODE_HEIGHT > maxY) maxY = pos.y + NODE_HEIGHT;
    }
    const disconnectedY = Math.round((maxY + GRID_GAP_Y) / 10) * 10;

    for (const id of autoNodeIds) {
        if (!placed.has(id)) {
            positions[id] = { x: nextX, y: disconnectedY };
            nextX += GRID_GAP_X;
            placed.add(id);
        }
    }

    // Separate sibling zones so their bounds don't overlap
    separateSiblingZones(positions, topology, autoNodeIds);

    // Collision resolution — nudge overlapping auto-positioned nodes
    resolveCollisions(positions, autoNodeIds);

    // Zone-aware post-processing: push non-member nodes out of zone bounds
    avoidZones(positions, topology, autoNodeIds);

    // Re-resolve collisions after zone avoidance
    resolveCollisions(positions, autoNodeIds);

    return positions;
}

function separateSiblingZones(positions, topology, autoNodeIds) {
    const autoSet = new Set(autoNodeIds);
    const MARGIN = 20;
    const MAX_PASSES = 5;

    function maxNestingDepth(zone) {
        if (!zone.zones || Object.keys(zone.zones).length === 0) return 0;
        let max = 0;
        for (const child of Object.values(zone.zones)) {
            max = Math.max(max, 1 + maxNestingDepth(child));
        }
        return max;
    }

    function computeBounds(zone) {
        const descendants = collectDescendantNodes(zone);
        if (descendants.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const nid of descendants) {
            const pos = positions[nid];
            if (!pos) continue;
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + NODE_WIDTH);
            maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
        }
        if (minX === Infinity) return null;

        const depth = maxNestingDepth(zone);
        const pad = ZONE_PADDING + (depth * (ZONE_PADDING + ZONE_LABEL_HEIGHT));
        const padTop = ZONE_PADDING + ZONE_LABEL_HEIGHT + (depth * (ZONE_PADDING + ZONE_LABEL_HEIGHT));

        return {
            x: minX - pad,
            y: minY - padTop,
            right: maxX + pad,
            bottom: maxY + pad,
            descendants,
        };
    }

    function processSiblings(zonesObj) {
        const siblings = Object.entries(zonesObj || {});

        // Recurse into children first (bottom-up)
        for (const [, zone] of siblings) {
            if (zone.zones) processSiblings(zone.zones);
        }

        if (siblings.length < 2) return;

        for (let pass = 0; pass < MAX_PASSES; pass++) {
            let anyMoved = false;

            // Compute bounds for each sibling
            const siblingBounds = [];
            for (const [zoneId, zone] of siblings) {
                const bounds = computeBounds(zone);
                if (bounds) siblingBounds.push({ zoneId, zone, bounds });
            }

            // Check each pair of siblings for overlap
            for (let i = 0; i < siblingBounds.length; i++) {
                for (let j = i + 1; j < siblingBounds.length; j++) {
                    const a = siblingBounds[i].bounds;
                    const b = siblingBounds[j].bounds;

                    const overlapX = (Math.min(a.right, b.right) - Math.max(a.x, b.x)) + MARGIN;
                    const overlapY = (Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)) + MARGIN;

                    if (overlapX > 0 && overlapY > 0) {
                        // Push apart along the axis with less overlap
                        if (overlapX < overlapY) {
                            const shift = Math.ceil(overlapX / 2 / 10) * 10;
                            const goLeft = a.x <= b.x;
                            const moveA = goLeft ? -shift : shift;
                            const moveB = goLeft ? shift : -shift;
                            for (const nid of a.descendants) {
                                if (positions[nid] && autoSet.has(nid)) positions[nid].x += moveA;
                            }
                            for (const nid of b.descendants) {
                                if (positions[nid] && autoSet.has(nid)) positions[nid].x += moveB;
                            }
                        } else {
                            const shift = Math.ceil(overlapY / 2 / 10) * 10;
                            const goUp = a.y <= b.y;
                            const moveA = goUp ? -shift : shift;
                            const moveB = goUp ? shift : -shift;
                            for (const nid of a.descendants) {
                                if (positions[nid] && autoSet.has(nid)) positions[nid].y += moveA;
                            }
                            for (const nid of b.descendants) {
                                if (positions[nid] && autoSet.has(nid)) positions[nid].y += moveB;
                            }
                        }
                        anyMoved = true;
                    }
                }
            }

            if (!anyMoved) break;
        }
    }

    processSiblings(topology.zones);
}

function avoidZones(positions, topology, autoNodeIds) {
    const zones = topology.zones || {};

    // Build zone membership: zoneId -> Set<nodeId> (all descendants)
    const zoneDescendants = new Map();
    const nodeMembership = new Map(); // nodeId -> Set<zoneId>

    function walkZones(zonesObj) {
        for (const [zoneId, zone] of Object.entries(zonesObj)) {
            const descendants = collectDescendantNodes(zone);
            zoneDescendants.set(zoneId, new Set(descendants));
            for (const nid of descendants) {
                if (!nodeMembership.has(nid)) nodeMembership.set(nid, new Set());
                nodeMembership.get(nid).add(zoneId);
            }
            if (zone.zones) walkZones(zone.zones);
        }
    }
    walkZones(zones);

    // Compute zone bounds matching ZoneBox.bounds logic
    function maxNestingDepth(zone) {
        if (!zone.zones || Object.keys(zone.zones).length === 0) return 0;
        let max = 0;
        for (const child of Object.values(zone.zones)) {
            max = Math.max(max, 1 + maxNestingDepth(child));
        }
        return max;
    }

    function computeZoneBounds(zoneId, zone) {
        const memberSet = zoneDescendants.get(zoneId);
        if (!memberSet || memberSet.size === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const nid of memberSet) {
            const pos = positions[nid];
            if (!pos) continue;
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + NODE_WIDTH);
            maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
        }
        if (minX === Infinity) return null;

        const depth = maxNestingDepth(zone);
        const pad = ZONE_PADDING + (depth * (ZONE_PADDING + ZONE_LABEL_HEIGHT));
        const padTop = ZONE_PADDING + ZONE_LABEL_HEIGHT + (depth * (ZONE_PADDING + ZONE_LABEL_HEIGHT));

        return {
            x: minX - pad,
            y: minY - padTop,
            right: maxX + pad,
            bottom: maxY + pad,
        };
    }

    const MARGIN = 20;
    const MAX_PASSES = 10;

    // Find the zone config by ID (recursive)
    function findZoneConfig(zoneId, zonesObj = zones) {
        for (const [id, zone] of Object.entries(zonesObj)) {
            if (id === zoneId) return zone;
            if (zone.zones) {
                const found = findZoneConfig(zoneId, zone.zones);
                if (found) return found;
            }
        }
        return null;
    }

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        let anyMoved = false;

        for (const [zoneId, memberSet] of zoneDescendants) {
            const zoneConfig = findZoneConfig(zoneId);
            if (!zoneConfig) continue;
            const bounds = computeZoneBounds(zoneId, zoneConfig);
            if (!bounds) continue;

            for (const nodeId of autoNodeIds) {
                if (memberSet.has(nodeId)) continue;
                // Also skip if node belongs to a parent/child zone of this one
                const nodeZones = nodeMembership.get(nodeId);
                if (nodeZones && nodeZones.has(zoneId)) continue;

                const pos = positions[nodeId];
                if (!pos) continue;

                // Check if node rect overlaps zone bounds (with margin)
                const nodeRight = pos.x + NODE_WIDTH;
                const nodeBottom = pos.y + NODE_HEIGHT;
                const zx = bounds.x - MARGIN;
                const zy = bounds.y - MARGIN;
                const zr = bounds.right + MARGIN;
                const zb = bounds.bottom + MARGIN;

                if (pos.x < zr && nodeRight > zx && pos.y < zb && nodeBottom > zy) {
                    // Find the shortest push direction
                    const pushLeft = zx - nodeRight;   // negative = move left by this
                    const pushRight = zr - pos.x;      // positive = move right by this
                    const pushUp = zy - nodeBottom;     // negative = move up by this
                    const pushDown = zb - pos.y;        // positive = move down by this

                    const options = [
                        { axis: 'x', dist: Math.abs(pushLeft), shift: pushLeft },
                        { axis: 'x', dist: Math.abs(pushRight), shift: pushRight },
                        { axis: 'y', dist: Math.abs(pushUp), shift: pushUp },
                        { axis: 'y', dist: Math.abs(pushDown), shift: pushDown },
                    ];
                    options.sort((a, b) => a.dist - b.dist);
                    const best = options[0];

                    if (best.axis === 'x') {
                        pos.x = Math.round((pos.x + best.shift) / 10) * 10;
                    } else {
                        pos.y = Math.round((pos.y + best.shift) / 10) * 10;
                    }
                    anyMoved = true;
                }
            }
        }

        if (!anyMoved) break;
    }
}

function resolveCollisions(positions, autoNodeIds) {
    const MARGIN_X = NODE_WIDTH + 20;
    const MARGIN_Y = NODE_HEIGHT + 20;
    const MAX_ITERATIONS = 50;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        let moved = false;
        for (let i = 0; i < autoNodeIds.length; i++) {
            for (let j = i + 1; j < autoNodeIds.length; j++) {
                const a = positions[autoNodeIds[i]];
                const b = positions[autoNodeIds[j]];
                if (!a || !b) continue;

                const overlapX = MARGIN_X - Math.abs(a.x - b.x);
                const overlapY = MARGIN_Y - Math.abs(a.y - b.y);

                if (overlapX > 0 && overlapY > 0) {
                    // Push apart along the axis with less overlap
                    if (overlapX < overlapY) {
                        const shift = Math.ceil(overlapX / 2 / 10) * 10;
                        if (a.x <= b.x) { a.x -= shift; b.x += shift; }
                        else { b.x -= shift; a.x += shift; }
                    } else {
                        const shift = Math.ceil(overlapY / 2 / 10) * 10;
                        if (a.y <= b.y) { a.y -= shift; b.y += shift; }
                        else { b.y -= shift; a.y += shift; }
                    }
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }
}
