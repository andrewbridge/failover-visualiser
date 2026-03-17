import { reactive } from "../deps/vue.mjs";
import { css } from "../deps/goober.mjs";
import defaultTopology from "../config/topology.mjs";
import { createScenario } from "../services/engine/scenario.mjs";
import { configList, activeConfigId, loadConfig } from "../services/data/config-store.mjs";
import { saveSimulatorState, loadSimulatorState, exportScenariosAsJson, importScenariosFromJson } from "../services/data/scenario-store.mjs";
import ScenarioPanel from "../components/ScenarioPanel.mjs";

const styles = {
    scenarioContainerHalf: css`
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem;
        align-items: flex-start;
    `,
    scenarioContainerThirds: css`
        flex: 1;
        display: flex;
        flex-wrap: nowrap;
        gap: 1rem;
        padding: 1rem;
        align-items: flex-start;
        overflow-x: auto;
    `,
    scenarioContainerThumbnail: css`
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
    `,
    thumbnailStrip: css`
        display: flex;
        flex-wrap: nowrap;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        overflow-x: auto;
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
    `,
    thumbnailSlot: css`
        cursor: pointer;
        border-radius: 6px;
        border: 2px solid transparent;
        overflow: hidden;
        flex-shrink: 0;
        width: 160px;
        height: 120px;
        position: relative;
    `,
    thumbnailSlotActive: css`
        border-color: #206bc4;
    `,
    thumbnailInner: css`
        transform: scale(0.3);
        transform-origin: top left;
        width: 333%;
        pointer-events: none;
    `,
    thumbnailOverlay: css`
        position: absolute;
        inset: 0;
        z-index: 1;
    `,
    thumbnailDetail: css`
        flex: 1;
        display: flex;
        padding: 1rem;
        min-height: 0;
        overflow: auto;
    `,
    scenarioCardThirds: css`
        flex: 0 0 calc(33.333vw - 1rem) !important;
        min-width: 320px !important;
    `,
    scenarioCardHalf: css`
        max-width: 50% !important;
    `,
    scenarioCardThumbnailDetail: css`
        flex: 1;
        min-width: 0;
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
            viewMode: localStorage.getItem('failover-vis-view-mode') || 'half',
            selectedScenarioId: null,
        };
    },
    computed: {
        configs() {
            return configList.value;
        },
        selectedScenario() {
            return this.scenarios.find(s => s.id === this.selectedScenarioId) || this.scenarios[0] || null;
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
        if (this.scenarios.length > 0) this.selectedScenarioId = this.scenarios[0].id;
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
            this.selectedScenarioId = scenario.id;
        },
        duplicateScenario(scenario) {
            const idx = this.scenarios.indexOf(scenario);
            const clone = scenario.clone(`${scenario.name} (copy)`);
            this.scenarioConfigs[clone.id] = this.scenarioConfigs[scenario.id];
            this.scenarios.splice(idx + 1, 0, clone);
            this.selectedScenarioId = clone.id;
        },
        removeScenario(scenario) {
            if (this.scenarios.length <= 1) return;
            const idx = this.scenarios.indexOf(scenario);
            if (idx !== -1) {
                this.scenarios.splice(idx, 1);
                delete this.scenarioConfigs[scenario.id];
                if (this.selectedScenarioId === scenario.id) {
                    this.selectedScenarioId = this.scenarios[Math.min(idx, this.scenarios.length - 1)]?.id ?? null;
                }
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
                if (this.selectedScenarioId === scenario.id) this.selectedScenarioId = newScenario.id;
            }
        },
        getScenarioConfigId(scenario) {
            return this.scenarioConfigs[scenario.id] || 'default';
        },
        setViewMode(mode) {
            this.viewMode = mode;
            localStorage.setItem('failover-vis-view-mode', mode);
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
                if (this.scenarios.length > 0) this.selectedScenarioId = this.scenarios[0].id;
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
            <div class="btn-group ms-auto" role="group" aria-label="View mode">
                <button class="btn btn-sm" :class="viewMode === 'half' ? 'btn-secondary' : 'btn-ghost-secondary'" @click="setViewMode('half')" title="Wrapped grid">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /></svg>
                </button>
                <button class="btn btn-sm" :class="viewMode === 'thirds' ? 'btn-secondary' : 'btn-ghost-secondary'" @click="setViewMode('thirds')" title="Side-by-side thirds">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M9 4l0 16" /><path d="M15 4l0 16" /></svg>
                </button>
                <button class="btn btn-sm" :class="viewMode === 'thumbnail' ? 'btn-secondary' : 'btn-ghost-secondary'" @click="setViewMode('thumbnail')" title="Thumbnail strip">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M4 15l16 0" /></svg>
                </button>
            </div>
        </div>
        <div v-if="viewMode === 'half'" class="${styles.scenarioContainerHalf}">
            <ScenarioPanel
                v-for="scenario in scenarios"
                :key="scenario.id"
                class="${styles.scenarioCardHalf}"
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
        <div v-else-if="viewMode === 'thirds'" class="${styles.scenarioContainerThirds}">
            <ScenarioPanel
                v-for="scenario in scenarios"
                :key="scenario.id"
                class="${styles.scenarioCardThirds}"
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
        <div v-else class="${styles.scenarioContainerThumbnail}">
            <div class="${styles.thumbnailStrip}">
                <div
                    v-for="scenario in scenarios"
                    :key="scenario.id"
                    class="${styles.thumbnailSlot}"
                    :class="{ '${styles.thumbnailSlotActive}': scenario.id === selectedScenarioId }"
                    @click="selectedScenarioId = scenario.id"
                >
                    <div class="${styles.thumbnailOverlay}"></div>
                    <div class="${styles.thumbnailInner}">
                        <ScenarioPanel
                            :scenario="scenario"
                            :topology="getScenarioTopology(scenario)"
                            :can-remove="false"
                            :configs="configs"
                            :active-config-id="getScenarioConfigId(scenario)"
                        />
                    </div>
                </div>
            </div>
            <div class="${styles.thumbnailDetail}">
                <ScenarioPanel
                    v-if="selectedScenario"
                    :key="'detail-' + selectedScenario.id"
                    class="${styles.scenarioCardThumbnailDetail}"
                    :scenario="selectedScenario"
                    :topology="getScenarioTopology(selectedScenario)"
                    :can-remove="scenarios.length > 1"
                    :configs="configs"
                    :active-config-id="getScenarioConfigId(selectedScenario)"
                    @duplicate="duplicateScenario(selectedScenario)"
                    @remove="removeScenario(selectedScenario)"
                    @change-config="onChangeConfig(selectedScenario, $event)"
                />
            </div>
        </div>
    </div>`,
};
