import { reactive } from "../deps/vue.mjs";
import Modal from "./Modal.mjs";
import { spawnModal } from "./ProgrammaticModals.mjs";

/**
 * Spawn a confirmation modal with a custom title and prompt.
 * 
 * @param {string} title The title of the confirmation modal
 * @param {string} prompt The prompt text to display in the confirmation modal
 * @returns {{ close: () => void, confirmed: Promise<boolean>, closed: Promise<void> }} An object with methods to control the modal and promises that resolve when the user makes a choice
 */
export const spawnConfirmModal = (title, prompt) => {
    const props = reactive({
        loading: false,
        title,
        prompt
    });
    const { promise: confirmed, resolve } = Promise.withResolvers();
    const { close, promise: closed } = spawnModal(ConfirmModal, props, {
        'choose': async (choice) => {
            props.loading = true;
            resolve(choice);
        }
    });
    // Don't leave the confirmed promise in the event of a user canceling
    closed.then(() => resolve(false));
    return { close, confirmed, closed };
};

const ConfirmModal = {
    name: 'ConfirmModal',
    components: { Modal },
    props: ['show', 'loading', 'title', 'prompt'],
    emits: ['update:show', 'choose'],
    template: `       
        <Modal :title="title" :show="show" @update:show="$emit('update:show', false)">
            <div class="modal-body">
                <p>{{prompt}}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-link link-secondary" @click="$emit('choose', false)" :disabled="loading">No</button>
                <button class="btn btn-primary ms-auto" @click="$emit('choose', true)" :disabled="loading">Yes</button>
          </div>
        </Modal>`,
}
export default ConfirmModal;
