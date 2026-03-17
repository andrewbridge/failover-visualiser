import { ref, watch } from "../deps/vue.mjs";

const activeModals = ref(new Set());

watch(activeModals, (modals) => {
    if (modals.size === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = null;
        document.body.style.paddingRight = null;
        return;
    }
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '8px';
});

export default {
    props: ['show', 'title', 'close'],
    emits: ['update:show'],
    computed: {
        hasHeader() {
            return this.$slots.header || this.title;
        },
        hasClose() {
            return this.close !== false;
        },
        hasBodyClose() {
            return !this.hasHeader && this.hasClose;
        }
    },
    watch: {
        show: {
            handler(isShown) {
                if (isShown) {
                    activeModals.value.add(this);
                    return;
                }
                activeModals.value.delete(this);
            },
            immediate: true,
        }
    },
    unmounted() {
        activeModals.value.delete(this);
    },
    template: `
    <Teleport to="#teleport-root">
        <div class="modal modal-blur fade" :class="{ show }" :style="{ display: show ? 'block' : 'none' }" tabindex="-1" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div class="modal-content" :class="{ 'pt-4': hasBodyClose }">
                    <div class="modal-header" v-if="hasHeader">
                        <slot name="header">
                            <h5 class="modal-title">{{title}}</h5>
                        </slot>
                        <button v-if="close !== false" type="button" class="btn-close" @click="$emit('update:show', false)" aria-label="Close"></button>
                    </div>
                    <button v-if="hasBodyClose" type="button" class="btn-close" @click="$emit('update:show', false)" aria-label="Close"></button>
                    <slot />
                </div>
            </div>
        </div>
    </Teleport>`,
}