import { getUid } from "./strings.mjs";

/** 
 * Anchors a target element to an anchor element.
 * 
 * Works with the anchorPositioningPolyfill.If the polyfill is not available,
 * it's assumed that the browser supports the CSS anchor positioning.
 * 
 * See {@link https://caniuse.com/css-anchor-positioning} for browser support.
 * 
 * @param {HTMLAnchorElement} anchor The element to use as the anchor.
 * @param {HTMLElement} target The element to anchor to the positioning of.
 * @param {string} [id] The ID of the anchor element. If not provided, a unique
 * ID will be generated.
 * @returns {string} The ID of the anchor element.
 * 
 * @type {(anchor: HTMLAnchorElement, target: HTMLElement) => void} */
export const anchorPosition = (anchor, target, id = null) => {
    id = id || 'anchor-' + getUid();
    if (typeof window.anchorPositioningPolyfill !== 'undefined') {
        anchor.setAttribute('anchor-name', id);
        target.setAttribute('anchor-target', id);
        target.setAttribute('anchor-position', 'bottom left');
        target.setAttribute('anchor-inset', '0 0 0 ' + (anchor.clientWidth * -1));
        window.anchorPositioningPolyfill.scanDOM();
        return id;
    }
    const cssId = `--${id}`;
    anchor.style.anchorName = cssId;
    Object.assign(target.style, {
        position: 'absolute',
        positionAnchor: cssId,
        top: 'anchor(' + cssId + ' bottom)',
        right: 'anchor(' + cssId + ' end, 50%)',
    });
    return id;
}