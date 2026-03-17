/**
* Anchor Positioning Polyfill
* Emulates CSS anchor positioning for browsers without native support
*/
class AnchorPositioningPolyfill {
    constructor() {
        this.anchors = new Map();
        this.elements = new Map();
        this.resizeObserver = new ResizeObserver(this.updatePositions.bind(this));
        this.mutationObserver = new MutationObserver(this.handleDOMChanges.bind(this));
        
        // Initialize
        this.init();
    }
    
    init() {
        // Find all anchor elements and positioned elements
        this.scanDOM();
        
        // Set up observers
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'id']
        });
        
        // Handle scroll and resize events
        window.addEventListener('scroll', this.updatePositions.bind(this), { passive: true });
        window.addEventListener('resize', this.updatePositions.bind(this), { passive: true });
    }
    
    scanDOM() {
        // Find elements with anchor-name attribute (anchors)
        document.querySelectorAll('[anchor-name]').forEach(anchor => {
            const name = anchor.getAttribute('anchor-name');
            this.anchors.set(name, anchor);
            this.resizeObserver.observe(anchor);
        });
        
        // Find elements with anchor-positioning attributes
        document.querySelectorAll('[anchor-position]').forEach(element => {
            const anchorName = element.getAttribute('anchor-target');
            if (anchorName && this.anchors.has(anchorName)) {
                this.elements.set(element, {
                    anchorName,
                    position: element.getAttribute('anchor-position') || 'top left',
                    inset: element.getAttribute('anchor-inset') || '0px'
                });
                this.resizeObserver.observe(element);
            }
        });
        
        this.updatePositions();
    }
    
    handleDOMChanges() {
        // Clear existing tracked elements
        this.anchors.forEach(anchor => this.resizeObserver.unobserve(anchor));
        this.elements.forEach((_, element) => this.resizeObserver.unobserve(element));
        
        this.anchors.clear();
        this.elements.clear();
        
        // Rescan the DOM
        this.scanDOM();
    }
    
    updatePositions() {
        this.elements.forEach((config, element) => {
            const anchor = this.anchors.get(config.anchorName);
            if (!anchor) return;
            
            const anchorRect = anchor.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            
            // Parse position
            const [vPos, hPos] = config.position.split(' ');
            
            // Parse inset values (top, right, bottom, left)
            let insets = [0, 0, 0, 0]; // Default insets
            if (config.inset) {
                const insetValues = config.inset.split(' ').map(val => parseInt(val) || 0);
                if (insetValues.length === 1) {
                    insets = [insetValues[0], insetValues[0], insetValues[0], insetValues[0]];
                } else if (insetValues.length === 2) {
                    insets = [insetValues[0], insetValues[1], insetValues[0], insetValues[1]];
                } else if (insetValues.length === 4) {
                    insets = insetValues;
                }
            }
            
            // Calculate position
            let top, left;
            
            // Vertical positioning
            switch (vPos) {
                case 'top':
                top = anchorRect.top - elementRect.height - insets[0];
                break;
                case 'center':
                top = anchorRect.top + (anchorRect.height / 2) - (elementRect.height / 2);
                break;
                case 'bottom':
                top = anchorRect.bottom + insets[2];
                break;
                default:
                top = anchorRect.top;
            }
            
            // Horizontal positioning
            switch (hPos) {
                case 'left':
                left = anchorRect.left - elementRect.width - insets[3];
                break;
                case 'center':
                left = anchorRect.left + (anchorRect.width / 2) - (elementRect.width / 2);
                break;
                case 'right':
                left = anchorRect.right + insets[1];
                break;
                default:
                left = anchorRect.left;
            }
            
            // Apply positioning
            element.style.position = 'absolute';
            element.style.top = `${top + window.scrollY}px`;
            element.style.left = `${left + window.scrollX}px`;
        });
    }
}

// Initialize the polyfill if the browser doesn't support anchor positioning
window.anchorPositioningPolyfill = new AnchorPositioningPolyfill();
