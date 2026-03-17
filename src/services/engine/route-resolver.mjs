/**
 * Build a lookup map from "fromId->toId" to edgeId.
 */
function buildEdgeLookup(edges) {
    const lookup = new Map();
    for (const [edgeId, edge] of Object.entries(edges)) {
        lookup.set(`${edge.from}->${edge.to}`, edgeId);
    }
    return lookup;
}

/**
 * Build a map from nodeId to an array of ancestor zone IDs (innermost first).
 */
function buildNodeZoneAncestry(zones, parentChain = []) {
    const ancestry = new Map();
    for (const [zoneId, zone] of Object.entries(zones)) {
        const currentChain = [zoneId, ...parentChain];
        for (const childId of zone.children) {
            ancestry.set(childId, currentChain);
        }
        if (zone.zones) {
            const nested = buildNodeZoneAncestry(zone.zones, currentChain);
            for (const [nodeId, chain] of nested) {
                ancestry.set(nodeId, chain);
            }
        }
    }
    return ancestry;
}

/**
 * Flatten zone tree to a map of zoneId -> zone config (including nested).
 */
function flattenZones(zones) {
    const flat = new Map();
    for (const [zoneId, zone] of Object.entries(zones)) {
        flat.set(zoneId, zone);
        if (zone.zones) {
            const nested = flattenZones(zone.zones);
            for (const [id, z] of nested) {
                flat.set(id, z);
            }
        }
    }
    return flat;
}

/**
 * Get the effective state for an element given overrides and topology config.
 */
function getEffectiveState(id, stateOverrides, topology, flatZoneMap) {
    if (stateOverrides[id]) return stateOverrides[id];
    if (topology.nodes[id]) return topology.nodes[id].default;
    if (topology.edges[id]) return topology.edges[id].default;
    const zone = flatZoneMap.get(id);
    if (zone) return zone.default;
    return null;
}

/**
 * Check if a node is blocked by any of its ancestor zones.
 */
function isNodeBlockedByZone(nodeId, nodeZoneAncestry, stateOverrides, topology, flatZoneMap) {
    const ancestors = nodeZoneAncestry.get(nodeId);
    if (!ancestors) return false;
    for (const zoneId of ancestors) {
        const stateName = getEffectiveState(zoneId, stateOverrides, topology, flatZoneMap);
        const stateDef = topology.stateDefinitions[stateName];
        if (stateDef && stateDef.flow === "block") return true;
    }
    return false;
}

/**
 * Resolve flow state for the given topology and overrides.
 *
 * @param {Object} topology - The full topology config
 * @param {Object} stateOverrides - Map of node/edge/zone ID to current state name
 * @returns {{
 *   activeRoute: Object|null,
 *   overallStatus: "online"|"degraded"|"offline",
 *   flowSegments: Map<string, "flowing"|"inactive"|"blocked">,
 *   activeRouteLabel: string|null
 * }}
 */
export function resolveFlow(topology, stateOverrides, options = {}) {
    const { routeMode = 'first-viable' } = options;
    const edgeLookup = buildEdgeLookup(topology.edges);
    const nodeZoneAncestry = buildNodeZoneAncestry(topology.zones);
    const flatZoneMap = flattenZones(topology.zones);

    const sortedRoutes = [...topology.routes].sort((a, b) => a.priority - b.priority);

    let activeRoute = null;
    let activeRouteIsDegraded = false;
    const routeResults = [];

    for (const route of sortedRoutes) {
        let routeBlocked = false;
        let routeInactive = false;
        let routeDegraded = false;
        const routeNodes = [];
        const routeEdges = [];

        for (const nodeId of route.path) {
            routeNodes.push(nodeId);

            if (isNodeBlockedByZone(nodeId, nodeZoneAncestry, stateOverrides, topology, flatZoneMap)) {
                routeBlocked = true;
                continue;
            }

            const stateName = getEffectiveState(nodeId, stateOverrides, topology, {});
            const stateDef = topology.stateDefinitions[stateName];
            if (stateDef) {
                if (stateDef.flow === "block") {
                    routeBlocked = true;
                } else if (stateDef.flow === "inactive") {
                    routeInactive = true;
                } else if (stateDef.colour === "#f76707") {
                    routeDegraded = true;
                }
            }
        }

        for (let i = 0; i < route.path.length - 1; i++) {
            const fromId = route.path[i];
            const toId = route.path[i + 1];
            const edgeId = edgeLookup.get(`${fromId}->${toId}`);
            if (!edgeId) {
                routeBlocked = true;
                continue;
            }
            routeEdges.push(edgeId);

            const stateName = getEffectiveState(edgeId, stateOverrides, topology, flatZoneMap);
            const stateDef = topology.stateDefinitions[stateName];
            if (stateDef) {
                if (stateDef.flow === "block") {
                    routeBlocked = true;
                } else if (stateDef.flow === "inactive") {
                    routeInactive = true;
                } else if (stateDef.colour === "#f76707") {
                    routeDegraded = true;
                }
            }
        }

        routeResults.push({ route, routeBlocked, routeInactive, routeDegraded, routeNodes, routeEdges });

        if (!routeBlocked && !routeInactive && !activeRoute) {
            activeRoute = route;
            activeRouteIsDegraded = routeDegraded;
        }
    }

    // Build flowSegments
    const flowSegments = new Map();

    // Default everything to inactive
    for (const nodeId of Object.keys(topology.nodes)) {
        flowSegments.set(nodeId, "inactive");
    }
    for (const edgeId of Object.keys(topology.edges)) {
        flowSegments.set(edgeId, "inactive");
    }

    // Mark blocked routes — only mark elements that are themselves the source of blocking.
    // Healthy nodes that feed into a blocked node remain "inactive", not "blocked".
    // routeInactive routes leave all segments at their default "inactive".
    for (const { routeBlocked, route } of routeResults) {
        if (!routeBlocked) continue;

        // Identify which nodes in this route are actually blocked
        const blockedNodeIds = new Set();
        for (const nodeId of route.path) {
            const blockedByZone = isNodeBlockedByZone(nodeId, nodeZoneAncestry, stateOverrides, topology, flatZoneMap);
            const stateName = getEffectiveState(nodeId, stateOverrides, topology, {});
            const stateDef = topology.stateDefinitions[stateName];
            if (blockedByZone || (stateDef && stateDef.flow === "block")) {
                blockedNodeIds.add(nodeId);
            }
        }

        // Mark blocked nodes
        for (const nodeId of blockedNodeIds) {
            if (flowSegments.get(nodeId) !== "flowing") {
                flowSegments.set(nodeId, "blocked");
            }
        }

        // Mark edges: blocked only if their source node is blocked, or the edge itself is blocked
        for (let i = 0; i < route.path.length - 1; i++) {
            const fromId = route.path[i];
            const toId = route.path[i + 1];
            const edgeId = edgeLookup.get(`${fromId}->${toId}`);
            if (!edgeId) continue;

            const stateName = getEffectiveState(edgeId, stateOverrides, topology, flatZoneMap);
            const stateDef = topology.stateDefinitions[stateName];
            if (blockedNodeIds.has(fromId) || (stateDef && stateDef.flow === "block")) {
                if (flowSegments.get(edgeId) !== "flowing") {
                    flowSegments.set(edgeId, "blocked");
                }
            }
        }
    }

    // Mark flowing routes (overrides blocked)
    if (routeMode === 'all-viable') {
        for (const { routeBlocked, routeInactive, routeNodes, routeEdges } of routeResults) {
            if (!routeBlocked && !routeInactive) {
                for (const id of [...routeNodes, ...routeEdges]) {
                    flowSegments.set(id, "flowing");
                }
            }
        }
    } else if (activeRoute) {
        const activeResult = routeResults.find(r => r.route === activeRoute);
        for (const id of [...activeResult.routeNodes, ...activeResult.routeEdges]) {
            flowSegments.set(id, "flowing");
        }
    }

    // Determine overall status
    let overallStatus = "offline";
    if (activeRoute) {
        overallStatus = activeRouteIsDegraded ? "degraded" : "online";
    }

    return {
        activeRoute,
        overallStatus,
        flowSegments,
        activeRouteLabel: activeRoute ? activeRoute.label : null,
    };
}
