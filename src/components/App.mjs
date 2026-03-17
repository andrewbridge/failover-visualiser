import { applicationReady, signalDOMReady } from "../services/data/lifecycle.mjs";
import { css } from "../deps/goober.mjs";
import ProgrammaticModals from "./ProgrammaticModals.mjs";
import ConfigManager from "./ConfigManager.mjs";
import SimulatorPage from "../pages/SimulatorPage.mjs";
import EditorPage from "../pages/EditorPage.mjs";

const styles = {
    app: css`
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    `,
    toolbar: css`
        flex-shrink: 0;
    `,
    navLink: css`
        padding: 0.5rem 0.75rem;
        color: inherit;
        text-decoration: none;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        &:hover {
            background: rgba(0, 0, 0, 0.04);
        }
    `,
    navLinkActive: css`
        background: rgba(0, 0, 0, 0.06);
        color: #206bc4;
    `,
};

export default {
    name: 'App',
    components: { ProgrammaticModals, ConfigManager, SimulatorPage, EditorPage },
    inject: ['router'],
    data() {
        return {
            applicationReady,
            showConfigManager: false,
        };
    },
    computed: {
        simulatorPath() {
            return this.router.getPath(SimulatorPage);
        },
        editorPath() {
            return this.router.getPath(EditorPage);
        },
        isSimulator() {
            return this.router.state.activeRoute === SimulatorPage;
        },
        isEditor() {
            return this.router.state.activeRoute === EditorPage;
        },
    },
    template: `<div class="${styles.app}">
        <div class="navbar navbar-expand-md navbar-light d-print-none ${styles.toolbar}">
            <div class="container-fluid">
                <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-btn pe-0 pe-md-3 mb-0">
                    Failover Visualiser
                </h1>
                <div class="d-flex align-items-center gap-1">
                    <a :href="simulatorPath"
                       class="${styles.navLink}"
                       :class="{ '${styles.navLinkActive}': isSimulator }">
                        Simulator
                    </a>
                    <a :href="editorPath"
                       class="${styles.navLink}"
                       :class="{ '${styles.navLinkActive}': isEditor }">
                        Editor
                    </a>
                    <button class="${styles.navLink} btn btn-ghost-secondary btn-sm"
                            @click="showConfigManager = true"
                            style="border: none">
                        Configs
                    </button>
                </div>
            </div>
        </div>
        <template v-if="applicationReady">
            <component :is="router.state.activeRoute" />
        </template>
        <div class="page my-auto" v-else>
            <div class="container container-slim py-4">
                <div class="text-center">
                    <div class="text-secondary mb-3">Loading...</div>
                    <div class="progress progress-sm">
                        <div class="progress-bar progress-bar-indeterminate"></div>
                    </div>
                </div>
            </div>
        </div>
        <ConfigManager v-model:show="showConfigManager" />
        <ProgrammaticModals />
    </div>`,
    mounted() {
        signalDOMReady();
    },
};
