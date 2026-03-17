import Header from "./Header.mjs";
import { applicationReady, signalDOMReady } from "../services/data/lifecycle.mjs";
import ProgrammaticModals from "./ProgrammaticModals.mjs";

export default {
    name: 'App',
    inject: ['router'],
    components: { Header, ProgrammaticModals },
    data: () => ({ applicationReady }),
    template: `<div class="page">
        <Header />
        <main class="page-wrapper">
            <component :is="router.state.activeRoute" v-if="applicationReady" />
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
        </main>
        <ProgrammaticModals />
    </div>`,
    mounted: () => {
        signalDOMReady();
    },
}