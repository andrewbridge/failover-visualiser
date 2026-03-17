import "https://unpkg.com/@ungap/with-resolvers@0.1.0/index.js";
if (!CSS.supports('anchor-name: --anchor')) {
    import('./polyfills/anchorPositioning.mjs');
}