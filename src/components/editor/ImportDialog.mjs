import { css } from "../../deps/goober.mjs";
import Modal from "../Modal.mjs";
import { parseMermaid } from "../../services/importers/mermaid-importer.mjs";
import { parseDrawio } from "../../services/importers/drawio-importer.mjs";
import { createConfig } from "../../services/data/config-store.mjs";
import { importConfigFromJson } from "../../services/data/json-export.mjs";

const styles = {
    tabs: css`
        display: flex;
        gap: 0;
        border-bottom: 1px solid #e2e8f0;
    `,
    tab: css`
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 0.875rem;
        border-bottom: 2px solid transparent;
        color: #667382;
        &:hover { color: #1e293b; }
    `,
    tabActive: css`
        color: #206bc4;
        border-bottom-color: #206bc4;
    `,
    textarea: css`
        width: 100%;
        min-height: 200px;
        font-family: monospace;
        font-size: 0.8125rem;
        resize: vertical;
    `,
    error: css`
        color: #d63939;
        font-size: 0.8125rem;
        margin-top: 0.375rem;
    `,
    success: css`
        color: #2fb344;
        font-size: 0.8125rem;
        margin-top: 0.375rem;
    `,
};

export default {
    name: 'ImportDialog',
    components: { Modal },
    props: {
        show: Boolean,
    },
    emits: ['update:show', 'imported'],
    data() {
        return {
            activeTab: 'mermaid',
            inputText: '',
            error: null,
            success: null,
            importing: false,
        };
    },
    watch: {
        show(v) {
            if (v) {
                this.inputText = '';
                this.error = null;
                this.success = null;
            }
        },
    },
    methods: {
        setTab(tab) {
            this.activeTab = tab;
            this.inputText = '';
            this.error = null;
            this.success = null;
        },
        async onFileInput(e) {
            const file = e.target.files?.[0];
            if (!file) return;
            this.inputText = await file.text();
        },
        async doImport() {
            this.error = null;
            this.success = null;
            this.importing = true;

            try {
                let configId;

                if (this.activeTab === 'mermaid') {
                    const { topology, stats } = parseMermaid(this.inputText);
                    configId = await createConfig('Mermaid Import', topology);
                    this.success = `Imported ${stats.nodes} nodes, ${stats.edges} edges, ${stats.zones} zones. Configure states, routes, and details in the editor.`;
                } else if (this.activeTab === 'drawio') {
                    const { topology, stats } = parseDrawio(this.inputText);
                    configId = await createConfig('Draw.io Import', topology);
                    this.success = `Imported ${stats.nodes} nodes, ${stats.edges} edges. Configure states, routes, zones, and details in the editor.`;
                } else if (this.activeTab === 'json') {
                    configId = await importConfigFromJson(this.inputText);
                    this.success = 'Config imported successfully.';
                }

                this.$emit('imported', configId);
                // Close after a brief moment
                setTimeout(() => {
                    this.$emit('update:show', false);
                    window.location.hash = '#/editor/' + configId;
                }, 1000);
            } catch (err) {
                this.error = err.message;
            } finally {
                this.importing = false;
            }
        },
    },
    template: `<Modal :show="show" title="Import Diagram" @update:show="$emit('update:show', $event)">
        <div class="${styles.tabs}">
            <div class="${styles.tab}" :class="{ '${styles.tabActive}': activeTab === 'mermaid' }"
                 @click="setTab('mermaid')">Mermaid</div>
            <div class="${styles.tab}" :class="{ '${styles.tabActive}': activeTab === 'drawio' }"
                 @click="setTab('drawio')">Draw.io</div>
            <div class="${styles.tab}" :class="{ '${styles.tabActive}': activeTab === 'json' }"
                 @click="setTab('json')">JSON</div>
        </div>
        <div class="modal-body">
            <template v-if="activeTab === 'mermaid'">
                <p style="font-size: 0.8125rem; color: #667382; margin-bottom: 0.5rem">
                    Paste a Mermaid graph definition. Supports <code>graph LR/TD</code>, node labels,
                    edges (<code>--></code>), and <code>subgraph</code> blocks (mapped to zones).
                </p>
                <textarea class="form-control ${styles.textarea}" v-model="inputText"
                          placeholder="graph LR&#10;    A[Camera] --> B[Encoder]&#10;    B --> C[CDN]"></textarea>
            </template>
            <template v-if="activeTab === 'drawio'">
                <p style="font-size: 0.8125rem; color: #667382; margin-bottom: 0.5rem">
                    Upload a <code>.drawio</code> file or paste its XML content.
                </p>
                <input type="file" class="form-control form-control-sm mb-2" accept=".drawio,.xml"
                       @change="onFileInput" />
                <textarea class="form-control ${styles.textarea}" v-model="inputText"
                          placeholder="Paste Draw.io XML here..."></textarea>
            </template>
            <template v-if="activeTab === 'json'">
                <p style="font-size: 0.8125rem; color: #667382; margin-bottom: 0.5rem">
                    Upload or paste a previously exported topology JSON.
                </p>
                <input type="file" class="form-control form-control-sm mb-2" accept=".json"
                       @change="onFileInput" />
                <textarea class="form-control ${styles.textarea}" v-model="inputText"
                          placeholder="Paste topology JSON here..."></textarea>
            </template>
            <div v-if="error" class="${styles.error}">{{ error }}</div>
            <div v-if="success" class="${styles.success}">{{ success }}</div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-ghost-secondary" @click="$emit('update:show', false)">Cancel</button>
            <button class="btn btn-primary" @click="doImport" :disabled="!inputText.trim() || importing">
                {{ importing ? 'Importing…' : 'Import' }}
            </button>
        </div>
    </Modal>`,
};
