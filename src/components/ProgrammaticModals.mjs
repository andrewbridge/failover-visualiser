import { shallowReactive, watchEffect } from "../deps/vue.mjs"

const modals = shallowReactive(new Set());

export const spawnModal = (component, props, events = {}) => {
    const modal = { component, props, events };
    modals.add(modal);
    return {
        close: () => modals.delete(modal),
        promise: new Promise((resolve) => watchEffect(() => {
            if (!modals.has(modal)) resolve();
        }))
    }
}

export default {
    name: 'ProgrammaticModals',
    data: () => ({ modals }),
    template: `<component v-for="modal in modals" :is="modal.component" v-bind="modal.props" v-on="modal.events" :show="true" @update:show="() => modals.delete(modal)" />`,
}