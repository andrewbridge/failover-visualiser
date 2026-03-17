import { createConfig } from "./config-store.mjs";
import { validateTopology } from "./topology-validator.mjs";

/**
 * Export a topology config as a downloadable JSON file.
 */
export function exportConfigAsJson(config) {
    const payload = {
        name: config.name,
        topology: config.topology,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (config.name || 'topology').replace(/[^a-z0-9_-]/gi, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Import a topology config from a JSON string.
 * Returns the new config ID, or throws on validation error.
 */
export async function importConfigFromJson(jsonString) {
    let parsed;
    try {
        parsed = JSON.parse(jsonString);
    } catch {
        throw new Error('Invalid JSON');
    }

    // Accept either { name, topology: {...} } or a raw topology object
    let name, topology;
    if (parsed.topology && typeof parsed.topology === 'object') {
        name = parsed.name || 'Imported Config';
        topology = parsed.topology;
    } else if (parsed.nodes && parsed.edges) {
        name = 'Imported Config';
        topology = parsed;
    } else {
        throw new Error('JSON does not contain a valid topology (expected nodes and edges)');
    }

    const { errors } = validateTopology(topology);
    if (errors.length > 0) {
        throw new Error('Validation errors:\n' + errors.join('\n'));
    }

    return createConfig(name, topology);
}
