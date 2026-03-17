import { ref } from "../../deps/vue.mjs";
import { persistRef } from "../../deps/vue.mjs";
import { idbGet, idbPut, idbDelete, idbGetAll } from "../../utilities/idb.mjs";
import { getUid } from "../../utilities/strings.mjs";
import defaultTopology from "../../config/topology.mjs";

const STORE = 'configs';
const DEFAULT_ID = 'default';

/** @type {import("../../deps/vue.mjs").Ref<Array<{id: string, name: string, updatedAt: number}>>} */
export const configList = ref([]);

/** @type {import("../../deps/vue.mjs").Ref<string|null>} */
export const activeConfigId = ref(DEFAULT_ID);
persistRef(activeConfigId, 'failover-vis-active-config', true);

function getDefaultConfig() {
    return {
        id: DEFAULT_ID,
        name: 'Default — Broadcast Chain',
        updatedAt: 0,
        topology: defaultTopology,
    };
}

export async function loadConfigList() {
    const saved = await idbGetAll(STORE);
    const defaultEntry = getDefaultConfig();
    const entries = [
        { id: defaultEntry.id, name: defaultEntry.name, updatedAt: defaultEntry.updatedAt },
        ...saved.map(c => ({ id: c.id, name: c.name, updatedAt: c.updatedAt })),
    ];
    configList.value = entries;
}

export async function loadConfig(id) {
    if (id === DEFAULT_ID) {
        return getDefaultConfig();
    }
    const config = await idbGet(STORE, id);
    return config || null;
}

export async function saveConfig(config) {
    if (config.id === DEFAULT_ID) {
        throw new Error('Cannot overwrite the default config');
    }
    config.updatedAt = Date.now();
    await idbPut(STORE, config);
    await loadConfigList();
    return config.id;
}

export async function createConfig(name, topology) {
    const config = {
        id: getUid(),
        name,
        updatedAt: Date.now(),
        topology: JSON.parse(JSON.stringify(topology)),
    };
    await idbPut(STORE, config);
    await loadConfigList();
    return config.id;
}

export async function duplicateConfig(id, newName) {
    const source = await loadConfig(id);
    if (!source) throw new Error(`Config ${id} not found`);
    return createConfig(newName || `${source.name} (copy)`, source.topology);
}

export async function deleteConfig(id) {
    if (id === DEFAULT_ID) {
        throw new Error('Cannot delete the default config');
    }
    await idbDelete(STORE, id);
    if (activeConfigId.value === id) {
        activeConfigId.value = DEFAULT_ID;
    }
    await loadConfigList();
}
