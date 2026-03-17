import { POINT_NAMES } from "../../utilities/layout.mjs";

const VALID_POINTS = new Set(POINT_NAMES);
const VALID_POSITIONING = new Set(['auto', 'custom']);

/**
 * Validate a topology config and return errors and warnings.
 * @param {Object} topology
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateTopology(topology) {
    const errors = [];
    const warnings = [];

    if (!topology) {
        errors.push('Topology is empty');
        return { errors, warnings };
    }

    const nodeIds = new Set(Object.keys(topology.nodes || {}));
    const edgeIds = new Set(Object.keys(topology.edges || {}));
    const stateKeys = new Set(Object.keys(topology.stateDefinitions || {}));

    // Flatten zone IDs
    const zoneIds = new Set();
    const flattenZoneIds = (zones) => {
        for (const [id, zone] of Object.entries(zones || {})) {
            zoneIds.add(id);
            if (zone.zones) flattenZoneIds(zone.zones);
        }
    };
    flattenZoneIds(topology.zones);

    // Check source/destination
    if (topology.source && !nodeIds.has(topology.source)) {
        errors.push(`Source node "${topology.source}" does not exist`);
    }
    if (topology.destination && !nodeIds.has(topology.destination)) {
        errors.push(`Destination node "${topology.destination}" does not exist`);
    }
    if (!topology.source) warnings.push('No source node defined');
    if (!topology.destination) warnings.push('No destination node defined');

    // Check edges reference valid nodes
    for (const [edgeId, edge] of Object.entries(topology.edges || {})) {
        if (!nodeIds.has(edge.from)) {
            errors.push(`Edge "${edgeId}" references unknown from-node "${edge.from}"`);
        }
        if (!nodeIds.has(edge.to)) {
            errors.push(`Edge "${edgeId}" references unknown to-node "${edge.to}"`);
        }
    }

    // Check connection points and one-edge-per-point constraint
    const pointUsage = new Map(); // "nodeId:pointName" -> edgeId
    for (const [edgeId, edge] of Object.entries(topology.edges || {})) {
        if (edge.fromPoint && !VALID_POINTS.has(edge.fromPoint)) {
            errors.push(`Edge "${edgeId}" has invalid fromPoint "${edge.fromPoint}"`);
        }
        if (edge.toPoint && !VALID_POINTS.has(edge.toPoint)) {
            errors.push(`Edge "${edgeId}" has invalid toPoint "${edge.toPoint}"`);
        }
        const fromKey = `${edge.from}:${edge.fromPoint || 'right'}`;
        const toKey = `${edge.to}:${edge.toPoint || 'left'}`;
        if (pointUsage.has(fromKey)) {
            warnings.push(`Connection point "${edge.fromPoint || 'right'}" on node "${edge.from}" is used by multiple edges: "${pointUsage.get(fromKey)}" and "${edgeId}"`);
        }
        pointUsage.set(fromKey, edgeId);
        if (pointUsage.has(toKey)) {
            warnings.push(`Connection point "${edge.toPoint || 'left'}" on node "${edge.to}" is used by multiple edges: "${pointUsage.get(toKey)}" and "${edgeId}"`);
        }
        pointUsage.set(toKey, edgeId);
    }

    // Check node positioning field
    for (const [id, node] of Object.entries(topology.nodes || {})) {
        if (node.positioning && !VALID_POSITIONING.has(node.positioning)) {
            errors.push(`Node "${id}" has invalid positioning "${node.positioning}"`);
        }
    }

    // Check state references
    const checkStates = (elementId, element) => {
        for (const s of (element.states || [])) {
            if (!stateKeys.has(s)) {
                errors.push(`Element "${elementId}" references unknown state "${s}"`);
            }
        }
        if (element.default && !stateKeys.has(element.default)) {
            errors.push(`Element "${elementId}" has unknown default state "${element.default}"`);
        }
    };

    for (const [id, node] of Object.entries(topology.nodes || {})) checkStates(id, node);
    for (const [id, edge] of Object.entries(topology.edges || {})) checkStates(id, edge);

    const checkZoneStates = (zones) => {
        for (const [id, zone] of Object.entries(zones || {})) {
            checkStates(id, zone);
            // Check zone children
            for (const childId of (zone.children || [])) {
                if (!nodeIds.has(childId)) {
                    errors.push(`Zone "${id}" references unknown child node "${childId}"`);
                }
            }
            if (zone.zones) checkZoneStates(zone.zones);
        }
    };
    checkZoneStates(topology.zones);

    // Check routes
    // Build edge lookup for route validation
    const edgeLookup = new Map();
    for (const [edgeId, edge] of Object.entries(topology.edges || {})) {
        edgeLookup.set(`${edge.from}->${edge.to}`, edgeId);
    }

    for (const route of (topology.routes || [])) {
        for (const nodeId of (route.path || [])) {
            if (!nodeIds.has(nodeId)) {
                errors.push(`Route "${route.label}" references unknown node "${nodeId}"`);
            }
        }
        // Check consecutive node pairs have edges
        const path = route.path || [];
        for (let i = 0; i < path.length - 1; i++) {
            const key = `${path[i]}->${path[i + 1]}`;
            if (!edgeLookup.has(key)) {
                warnings.push(`Route "${route.label}" has no edge between "${path[i]}" and "${path[i + 1]}"`);
            }
        }
    }

    // Check for ID collisions
    const allIds = [...nodeIds, ...edgeIds, ...zoneIds];
    const seen = new Set();
    for (const id of allIds) {
        if (seen.has(id)) {
            errors.push(`Duplicate ID "${id}" found across nodes, edges, and zones`);
        }
        seen.add(id);
    }

    // Check node assignment to zones (no node in multiple zones)
    const nodeZoneAssignments = new Map();
    const checkZoneChildren = (zones) => {
        for (const [zoneId, zone] of Object.entries(zones || {})) {
            for (const childId of (zone.children || [])) {
                if (nodeZoneAssignments.has(childId)) {
                    warnings.push(`Node "${childId}" is in multiple zones: "${nodeZoneAssignments.get(childId)}" and "${zoneId}"`);
                }
                nodeZoneAssignments.set(childId, zoneId);
            }
            if (zone.zones) checkZoneChildren(zone.zones);
        }
    };
    checkZoneChildren(topology.zones);

    return { errors, warnings };
}
