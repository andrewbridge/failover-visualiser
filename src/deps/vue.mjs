export { createApp, ref, reactive, shallowReactive, h, watchEffect, watch, computed, nextTick, markRaw } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js'
import { watchEffect } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js';

/** 
 * @template T
 * @typedef {import("../app").Vue.Ref<T>} Ref<T>
 * @type {(refs: { [key: string]: import('../app').Vue.Ref<T>}, readonly: boolean) => { [key: string]: () => T }} */
 export const mapRefs = (refs, readonly = true) => {
    const mappedRefs = {};
    for ( const refName in refs) {
        const getter = () => refs[refName].value;
        mappedRefs[refName] = readonly ? getter : {
            get: getter,
            set: (value) => refs[refName].value = value,
        };
    }
    return mappedRefs;
}

/** @type {(ref: Ref<any>, persistKey: string, permanently: boolean) => void} */
export const persistRef = (ref, persistKey, permanently = false) => {
    const storage = permanently ? window.localStorage : window.sessionStorage;
    if (persistKey in storage) {
        ref.value = JSON.parse(storage.getItem(persistKey));
    }
    watchEffect(() => storage.setItem(persistKey, JSON.stringify(ref.value)));
}
