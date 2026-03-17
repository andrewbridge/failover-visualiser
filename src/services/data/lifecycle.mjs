import { ref } from '../../deps/vue.mjs';
import { loadConfigList } from './config-store.mjs';

const DOMReady = Promise.withResolvers();
export const signalDOMReady = () => DOMReady.resolve();
export const applicationReady = ref(false);

Promise.all([DOMReady.promise, loadConfigList()]).then(() => {
    applicationReady.value = true;
});
