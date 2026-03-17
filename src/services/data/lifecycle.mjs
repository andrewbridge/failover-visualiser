import { ref } from '../../deps/vue.mjs';

// TODO: Do we actually need this? Maybe work out a better way
const DOMReady = Promise.withResolvers();
export const signalDOMReady = () => DOMReady.resolve();
export const DOMReadyPromise = DOMReady.promise;
const dataReady = Promise.withResolvers();
export const signalDataReady = () => dataReady.resolve();
export const dataReadyPromise = dataReady.promise;
export const applicationReady = ref(false);
export const applicationReadyPromise = Promise.all([DOMReady.promise, dataReady.promise]);
applicationReadyPromise.then(() => {
    applicationReady.value = true;
});
