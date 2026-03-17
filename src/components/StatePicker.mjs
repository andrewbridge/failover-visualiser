import { css } from "../deps/goober.mjs";

const styles = {
    overlay: css`
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
    `,
    menu: css`
        position: fixed;
        z-index: 1001;
        min-width: 160px;
    `,
    dot: css`
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 8px;
        flex-shrink: 0;
    `,
    item: css`
        display: flex;
        align-items: center;
        cursor: pointer;
    `,
    active: css`
        font-weight: 600;
        background-color: #f1f5f9;
    `,
};

export default {
    name: 'StatePicker',
    props: {
        elementId: String,
        elementType: String,
        availableStates: Array,
        position: Object,
    },
    emits: ['select-state', 'close'],
    computed: {
        menuStyle() {
            const x = Math.min(this.position.x, window.innerWidth - 200);
            const y = Math.min(this.position.y, window.innerHeight - this.availableStates.length * 36 - 20);
            return `left: ${x}px; top: ${y}px;`;
        },
    },
    mounted() {
        this._onKeydown = (e) => {
            if (e.key === 'Escape') this.$emit('close');
        };
        window.addEventListener('keydown', this._onKeydown);
    },
    unmounted() {
        window.removeEventListener('keydown', this._onKeydown);
    },
    methods: {
        selectState(stateName) {
            this.$emit('select-state', { elementId: this.elementId, stateName });
        },
    },
    template: `<div>
        <div class="${styles.overlay}" @click="$emit('close')"></div>
        <div class="dropdown-menu show ${styles.menu}" :style="menuStyle">
            <a v-for="s in availableStates"
               :key="s.key"
               class="dropdown-item ${styles.item}"
               :class="{ '${styles.active}': s.isActive }"
               href="#"
               @click.prevent="selectState(s.key)">
                <span class="${styles.dot}" :style="'background-color: ' + s.colour"></span>
                {{ s.label }}
            </a>
        </div>
    </div>`,
};
