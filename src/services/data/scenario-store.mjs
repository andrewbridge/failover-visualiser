import { idbGet, idbPut } from '../../utilities/idb.mjs';

const STORE = 'scenarios';
const KEY = 'simulator';

function serializeScenarios(scenarios, scenarioConfigs) {
    return scenarios.map(s => ({
        name: s.name,
        stateOverrides: { ...s.stateOverrides },
        routeMode: s.routeMode,
        configId: scenarioConfigs[s.id] || 'default',
    }));
}

/**
 * Persist the current simulator state to IndexedDB.
 */
export async function saveSimulatorState(scenarios, scenarioConfigs) {
    await idbPut(STORE, {
        id: KEY,
        scenarios: serializeScenarios(scenarios, scenarioConfigs),
    });
}

/**
 * Load the saved simulator state from IndexedDB.
 * Returns an array of plain scenario objects, or null if nothing is saved.
 */
export async function loadSimulatorState() {
    const record = await idbGet(STORE, KEY);
    return record?.scenarios ?? null;
}

/**
 * Trigger a browser download of all current scenarios as a JSON file.
 */
export function exportScenariosAsJson(scenarios, scenarioConfigs, configList) {
    const payload = {
        version: 1,
        scenarios: serializeScenarios(scenarios, scenarioConfigs).map(s => ({
            ...s,
            configName: configList.find(c => c.id === s.configId)?.name ?? 'Default',
        })),
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenarios.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Parse an imported JSON string into an array of plain scenario objects.
 * Accepts either { version, scenarios: [...] } or a bare array.
 * Throws on invalid format.
 */
export function importScenariosFromJson(jsonString) {
    let parsed;
    try {
        parsed = JSON.parse(jsonString);
    } catch {
        throw new Error('Invalid JSON');
    }
    const scenarios = Array.isArray(parsed) ? parsed : parsed?.scenarios;
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
        throw new Error('JSON does not contain a valid scenarios array');
    }
    return scenarios;
}
