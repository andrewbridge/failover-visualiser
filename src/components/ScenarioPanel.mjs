import { computed } from "../deps/vue.mjs";
import { css } from "../deps/goober.mjs";
import { resolveFlow } from "../services/engine/route-resolver.mjs";
import DiagramSvg from "./DiagramSvg.mjs";
import StatusBanner from "./StatusBanner.mjs";

const styles = {
    panel: css`
        min-width: 500px;
        flex: 1 1 500px;
    `,
    nameInput: css`
        border: none;
        background: transparent;
        font-size: 1rem;
        font-weight: 600;
        padding: 2px 4px;
        outline: none;
        width: 100%;
        min-width: 0;
        &:hover {
            background: #f1f5f9;
            border-radius: 4px;
        }
        &:focus {
            background: #ffffff;
            border-radius: 4px;
            box-shadow: 0 0 0 2px #4299e1;
        }
    `,
    configSelect: css`
        font-size: 0.75rem;
        padding: 0.125rem 0.375rem;
        height: auto;
        max-width: 160px;
        border-color: #e2e8f0;
        color: #667382;
    `,
};

export default {
    name: 'ScenarioPanel',
    components: { DiagramSvg, StatusBanner },
    props: {
        scenario: Object,
        topology: Object,
        canRemove: Boolean,
        configs: { type: Array, default: () => [] },
        activeConfigId: { type: String, default: 'default' },
    },
    emits: ['duplicate', 'remove', 'change-config'],
    computed: {
        flowResult() {
            return resolveFlow(this.topology, this.scenario.stateOverrides);
        },
        hasMultipleConfigs() {
            return this.configs.length > 1;
        },
    },
    template: `<div class="card ${styles.panel}">
        <div class="card-header">
            <div class="d-flex align-items-center w-100 gap-2">
                <input
                    class="${styles.nameInput}"
                    :value="scenario.name"
                    @input="scenario.name = $event.target.value"
                />
                <select v-if="hasMultipleConfigs"
                        class="form-select ${styles.configSelect}"
                        :value="activeConfigId"
                        @change="$emit('change-config', $event.target.value)"
                        title="Topology config">
                    <option v-for="c in configs" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <div class="btn-list flex-nowrap ms-auto">
                    <button class="btn btn-ghost-secondary btn-sm" @click="scenario.reset()" title="Reset">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>
                    </button>
                    <button class="btn btn-ghost-secondary btn-sm" @click="$emit('duplicate')" title="Duplicate">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" /></svg>
                    </button>
                    <button v-if="canRemove" class="btn btn-ghost-danger btn-sm" @click="$emit('remove')" title="Remove">
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        </div>
        <div class="card-body p-2">
            <DiagramSvg
                :topology="topology"
                :scenario="scenario"
                :flow-result="flowResult"
            />
        </div>
        <div class="card-footer">
            <StatusBanner
                :status="flowResult.overallStatus"
                :active-route-label="flowResult.activeRouteLabel"
            />
        </div>
    </div>`,
};
