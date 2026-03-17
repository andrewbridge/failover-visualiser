import { css } from "../../deps/goober.mjs";

const styles = {
    container: css`
        padding: 0.75rem;
        font-size: 0.8125rem;
    `,
    title: css`
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #667382;
        margin-bottom: 0.5rem;
        letter-spacing: 0.02em;
    `,
    row: css`
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin-bottom: 0.375rem;
        & input, & select {
            min-width: 0;
        }
    `,
    colourInput: css`
        width: 28px;
        height: 28px;
        padding: 1px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        cursor: pointer;
        flex-shrink: 0;
    `,
    keyInput: css`
        width: 80px;
        flex-shrink: 0;
    `,
    labelInput: css`
        flex: 1;
        min-width: 60px;
    `,
    flowSelect: css`
        width: 70px;
        flex-shrink: 0;
    `,
    removeBtn: css`
        flex-shrink: 0;
        padding: 0.125rem 0.375rem;
        font-size: 0.75rem;
        line-height: 1;
    `,
};

export default {
    name: 'StateDefinitionsEditor',
    props: {
        stateDefinitions: Object,
    },
    emits: ['update', 'add', 'remove', 'rename'],
    data() {
        return { newKey: '' };
    },
    computed: {
        entries() {
            return Object.entries(this.stateDefinitions);
        },
    },
    methods: {
        onUpdate(key, field, value) {
            this.$emit('update', { key, field, value });
        },
        onRemove(key) {
            this.$emit('remove', key);
        },
        onAdd() {
            const key = this.newKey.trim().replace(/\s+/g, '-').toLowerCase();
            if (!key || this.stateDefinitions[key]) return;
            this.$emit('add', { key, definition: { label: key, flow: 'pass', colour: '#667382' } });
            this.newKey = '';
        },
    },
    template: `<div class="${styles.container}">
        <div class="${styles.title}">State Definitions</div>
        <div v-for="[key, def] in entries" :key="key" class="${styles.row}">
            <input type="color" class="${styles.colourInput}"
                   :value="def.colour"
                   @input="onUpdate(key, 'colour', $event.target.value)" />
            <input class="form-control form-control-sm ${styles.labelInput}"
                   :value="def.label"
                   @input="onUpdate(key, 'label', $event.target.value)" />
            <select class="form-select form-select-sm ${styles.flowSelect}"
                    :value="def.flow"
                    @change="onUpdate(key, 'flow', $event.target.value)">
                <option value="pass">Pass</option>
                <option value="inactive">Inactive</option>
                <option value="block">Block</option>
            </select>
            <button class="btn btn-sm btn-outline-danger ${styles.removeBtn}" @click="onRemove(key)"
                    title="Remove">&times;</button>
        </div>
        <div class="${styles.row}" style="margin-top: 0.5rem">
            <input class="form-control form-control-sm ${styles.keyInput}"
                   v-model="newKey" placeholder="Key…"
                   @keyup.enter="onAdd" />
            <button class="btn btn-sm btn-outline-primary" @click="onAdd">Add</button>
        </div>
    </div>`,
};
