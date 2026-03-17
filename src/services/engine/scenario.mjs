import { reactive } from "../../deps/vue.mjs";

let nextId = 1;

/**
 * Flatten zones into a flat map of zoneId -> zone config.
 */
function flattenZones(zones) {
    const flat = {};
    for (const [zoneId, zone] of Object.entries(zones)) {
        flat[zoneId] = zone;
        if (zone.zones) {
            Object.assign(flat, flattenZones(zone.zones));
        }
    }
    return flat;
}

/**
 * Find the element config and its states array from topology.
 * Searches nodes, edges, then zones.
 */
function findElement(topology, id) {
    if (topology.nodes[id]) return topology.nodes[id];
    if (topology.edges[id]) return topology.edges[id];
    const zones = flattenZones(topology.zones);
    if (zones[id]) return zones[id];
    return null;
}

/**
 * Normalize topology argument — accept either an object or a getter function.
 */
function resolveTopology(topologyOrGetter) {
    return typeof topologyOrGetter === 'function' ? topologyOrGetter() : topologyOrGetter;
}

/**
 * Create a reactive scenario object.
 *
 * @param {Object|Function} topologyOrGetter - The topology config, or a getter function returning one
 * @param {string} name - Human-readable scenario name
 * @param {Object} [initialOverrides={}] - Optional starting state overrides
 * @returns {Object} Reactive scenario object
 */
export function createScenario(topologyOrGetter, name, initialOverrides = {}, initialRouteMode = 'first-viable') {
    const getTopo = () => resolveTopology(topologyOrGetter);

    return reactive({
        id: nextId++,
        name,
        stateOverrides: { ...initialOverrides },
        routeMode: initialRouteMode,

        getState(id) {
            if (this.stateOverrides[id]) return this.stateOverrides[id];
            const element = findElement(getTopo(), id);
            return element ? element.default : null;
        },

        setState(id, stateName) {
            const element = findElement(getTopo(), id);
            if (!element) return;
            if (stateName === element.default) {
                delete this.stateOverrides[id];
            } else {
                this.stateOverrides[id] = stateName;
            }
        },

        cycleState(id) {
            const element = findElement(getTopo(), id);
            if (!element) return;
            const current = this.getState(id);
            const idx = element.states.indexOf(current);
            const next = element.states[(idx + 1) % element.states.length];
            this.setState(id, next);
        },

        reset() {
            for (const key of Object.keys(this.stateOverrides)) {
                delete this.stateOverrides[key];
            }
        },

        clone(newName) {
            return createScenario(topologyOrGetter, newName, { ...this.stateOverrides }, this.routeMode);
        },
    });
}
