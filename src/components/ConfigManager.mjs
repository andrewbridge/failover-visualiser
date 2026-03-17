import { css } from "../deps/goober.mjs";
import Modal from "./Modal.mjs";
import { configList, activeConfigId, deleteConfig, duplicateConfig, loadConfig } from "../services/data/config-store.mjs";
import { exportConfigAsJson } from "../services/data/json-export.mjs";
import EditorPage from "../pages/EditorPage.mjs";

const styles = {
    list: css`
        list-style: none;
        padding: 0;
        margin: 0;
    `,
    item: css`
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid #e2e8f0;
        &:last-child { border-bottom: none; }
    `,
    name: css`
        flex: 1;
        font-weight: 500;
    `,
    date: css`
        font-size: 0.75rem;
        color: #667382;
        margin-left: auto;
    `,
    activeBadge: css`
        font-size: 0.6875rem;
        background: #206bc4;
        color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
    `,
    defaultBadge: css`
        font-size: 0.6875rem;
        background: #e2e8f0;
        color: #667382;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
    `,
    actions: css`
        display: flex;
        gap: 0.25rem;
        flex-shrink: 0;
    `,
};

export default {
    name: 'ConfigManager',
    components: { Modal },
    props: {
        show: Boolean,
    },
    emits: ['update:show'],
    inject: ['router'],
    computed: {
        configs() {
            return configList.value;
        },
    },
    methods: {
        formatDate(ts) {
            if (!ts) return 'built-in';
            return new Date(ts).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        },
        isActive(id) {
            return activeConfigId.value === id;
        },
        isDefault(id) {
            return id === 'default';
        },
        select(id) {
            activeConfigId.value = id;
        },
        editConfig(id) {
            this.$emit('update:show', false);
            window.location.hash = id === 'default' ? '#/editor' : '#/editor/' + id;
        },
        async duplicate(id) {
            await duplicateConfig(id);
        },
        async remove(id) {
            if (this.isDefault(id)) return;
            await deleteConfig(id);
        },
        async exportConfig(id) {
            const config = await loadConfig(id);
            if (config) exportConfigAsJson(config);
        },
        newConfig() {
            this.$emit('update:show', false);
            window.location.hash = '#/editor';
        },
    },
    template: `<Modal :show="show" title="Configurations" @update:show="$emit('update:show', $event)">
        <div class="modal-body p-0">
            <ul class="${styles.list}">
                <li v-for="config in configs" :key="config.id" class="${styles.item}">
                    <span class="${styles.name}">{{ config.name }}</span>
                    <span v-if="isDefault(config.id)" class="${styles.defaultBadge}">built-in</span>
                    <span v-if="isActive(config.id)" class="${styles.activeBadge}">active</span>
                    <span class="${styles.date}">{{ formatDate(config.updatedAt) }}</span>
                    <div class="${styles.actions}">
                        <button class="btn btn-sm btn-ghost-primary" @click="select(config.id)" title="Set active"
                                :disabled="isActive(config.id)">Use</button>
                        <button class="btn btn-sm btn-ghost-secondary" @click="editConfig(config.id)" title="Edit">Edit</button>
                        <button class="btn btn-sm btn-ghost-secondary" @click="duplicate(config.id)" title="Duplicate">Dup</button>
                        <button class="btn btn-sm btn-ghost-secondary" @click="exportConfig(config.id)" title="Export JSON">Export</button>
                        <button v-if="!isDefault(config.id)" class="btn btn-sm btn-ghost-danger"
                                @click="remove(config.id)" title="Delete">&times;</button>
                    </div>
                </li>
            </ul>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" @click="newConfig">New Config</button>
        </div>
    </Modal>`,
};
