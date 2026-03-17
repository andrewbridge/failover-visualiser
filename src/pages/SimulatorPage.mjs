import { reactive } from "../deps/vue.mjs";
import { css } from "../deps/goober.mjs";
import defaultTopology from "../config/topology.mjs";
import { createScenario } from "../services/engine/scenario.mjs";
import { configList, activeConfigId, loadConfig } from "../services/data/config-store.mjs";
import { saveSimulatorState, loadSimulatorState, exportScenariosAsJson, importScenariosFromJson } from "../services/data/scenario-store.mjs";
import ScenarioPanel from "../components/ScenarioPanel.mjs";

const styles = {
    scenarioContainer: css`
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem;
        align-items: flex-start;
    `,
};

export default {
    name: 'SimulatorPage',
    components: { ScenarioPanel },
    data() {
        return {
            // Cache of loaded topology configs: configId -> topology object
            topologyCache: reactive({ default: defaultTopology }),
            // Per-scenario config bindings: scenario.id -> configId
            scenarioConfigs: reactive({}),
            scenarios: reactive([]),
        };
    },
    computed: {
        configs() {
            return configList.value;
        },
    },
    watch: {
        scenarios: { deep: true, handler() { this.scheduleSave(); } },
        scenarioConfigs: { deep: true, handler() { this.scheduleSave(); } },
    },
    async created() {
        this._loading = true;
        const saved = await loadSimulatorState();
        if (saved && saved.length > 0) {
            await this.loadScenariosFromData(saved);
        } else {
            const configId = activeConfigId.value || 'default';
            await this.ensureTopologyLoaded(configId);
            const topo = this.topologyCache[configId] || defaultTopology;
            const scenario = createScenario(topo, "Default — all healthy");
            this.scenarios.push(scenario);
            this.scenarioConfigs[scenario.id] = configId;
        }
        this._loading = false;
    },
    methods: {
        async ensureTopologyLoaded(configId) {
            if (this.topologyCache[configId]) return;
            const config = await loadConfig(configId);
            if (config) {
                this.topologyCache[configId] = config.topology;
            }
        },
        async loadScenariosFromData(data) {
            for (const s of data) {
                const requestedConfigId = s.configId || 'default';
                await this.ensureTopologyLoaded(requestedConfigId);
                // Fall back to default if the config no longer exists
                const configId = this.topologyCache[requestedConfigId] ? requestedConfigId : 'default';
                const topo = this.topologyCache[configId] || defaultTopology;
                const scenario = createScenario(topo, s.name, s.stateOverrides || {}, s.routeMode || 'first-viable');
                this.scenarios.push(scenario);
                this.scenarioConfigs[scenario.id] = configId;
            }
        },
        getTopologyForScenario(scenarioId) {
            const configId = this.scenarioConfigs[scenarioId] || activeConfigId.value || 'default';
            return this.topologyCache[configId] || defaultTopology;
        },
        getScenarioTopology(scenario) {
            return this.getTopologyForScenario(scenario.id);
        },
        async addScenario() {
            const configId = activeConfigId.value || 'default';
            await this.ensureTopologyLoaded(configId);
            const topo = this.topologyCache[configId] || defaultTopology;
            const scenario = createScenario(topo, `Scenario ${this.scenarios.length + 1}`);
            this.scenarioConfigs[scenario.id] = configId;
            this.scenarios.push(scenario);
        },
        duplicateScenario(scenario) {
            const idx = this.scenarios.indexOf(scenario);
            const clone = scenario.clone(`${scenario.name} (copy)`);
            this.scenarioConfigs[clone.id] = this.scenarioConfigs[scenario.id];
            this.scenarios.splice(idx + 1, 0, clone);
        },
        removeScenario(scenario) {
            if (this.scenarios.length <= 1) return;
            const idx = this.scenarios.indexOf(scenario);
            if (idx !== -1) {
                this.scenarios.splice(idx, 1);
                delete this.scenarioConfigs[scenario.id];
            }
        },
        async onChangeConfig(scenario, configId) {
            await this.ensureTopologyLoaded(configId);
            this.scenarioConfigs[scenario.id] = configId;
            // Replace the scenario with one bound to the new topology
            const topo = this.topologyCache[configId] || defaultTopology;
            const idx = this.scenarios.indexOf(scenario);
            if (idx !== -1) {
                const newScenario = createScenario(topo, scenario.name);
                this.scenarioConfigs[newScenario.id] = configId;
                delete this.scenarioConfigs[scenario.id];
                this.scenarios.splice(idx, 1, newScenario);
            }
        },
        getScenarioConfigId(scenario) {
            return this.scenarioConfigs[scenario.id] || 'default';
        },
        scheduleSave() {
            if (this._loading) return;
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => {
                saveSimulatorState(this.scenarios, this.scenarioConfigs);
            }, 500);
        },
        exportScenarios() {
            exportScenariosAsJson(this.scenarios, this.scenarioConfigs, this.configs);
        },
        async onImportFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const imported = importScenariosFromJson(text);
                this._loading = true;
                this.scenarios.splice(0, this.scenarios.length);
                for (const key of Object.keys(this.scenarioConfigs)) {
                    delete this.scenarioConfigs[key];
                }
                await this.loadScenariosFromData(imported);
                this._loading = false;
                saveSimulatorState(this.scenarios, this.scenarioConfigs);
            } catch (e) {
                alert(`Import failed: ${e.message}`);
            }
            event.target.value = '';
        },
    },
    template: `<div>
        <div class="d-flex align-items-center gap-2 px-3 pt-3">
            <button class="btn btn-primary" @click="addScenario">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                Add Scenario
            </button>
            <button class="btn btn-ghost-secondary" @click="exportScenarios" title="Export scenarios as JSON">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
                Export
            </button>
            <label class="btn btn-ghost-secondary" title="Import scenarios from JSON">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 9l5 -5l5 5" /><path d="M12 4l0 12" /></svg>
                Import
                <input type="file" accept=".json" style="display:none" @change="onImportFile" />
            </label>
        </div>
        <div class="${styles.scenarioContainer}">
            <ScenarioPanel
                v-for="(scenario, index) in scenarios"
                :key="scenario.id"
                :scenario="scenario"
                :topology="getScenarioTopology(scenario)"
                :can-remove="scenarios.length > 1"
                :configs="configs"
                :active-config-id="getScenarioConfigId(scenario)"
                @duplicate="duplicateScenario(scenario)"
                @remove="removeScenario(scenario)"
                @change-config="onChangeConfig(scenario, $event)"
            />
        </div>
    </div>`,
};
