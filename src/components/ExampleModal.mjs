import Modal from "./Modal.mjs";

export default {
    components: { Modal },
    props: ['show', 'title'],
    emits: ['update:show'],
    data: () => ({ exampleData: '', loading: false }),
    template: `       
        <Modal title="Example" :show="show" @update:show="$emit('update:show', false)">
            <div class="modal-body">
                <div class="row">
                    <div class="col-lg-6">
                        <div class="mb-3">
                            <label class="form-label">Example</label>
                            <input type="text" class="form-control" v-model="exampleData" :disabled="loading" />
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-link link-secondary" @click="$emit('update:show', false)" :disabled="loading">Cancel</button>
                <button class="btn btn-primary ms-auto" :disabled="loading" @click="submitExample">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Submit
                </button>
          </div>
        </Modal>`,
        methods: {
            async submitExample() {
                this.loading = true;
                // TODO: Submit action here
                this.loading = false;
                this.$emit('update:show', false);
            }
        }
}
