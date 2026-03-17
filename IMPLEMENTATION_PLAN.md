# Video Flow Failover Simulator — Implementation Plan

## Overview

A throwaway web app for interactively testing failover and failure conditions in a live video cloud architecture. Users define a topology (nodes, edges, routes) in JSON, then click elements to toggle failure states and observe how video flow reroutes or breaks.

The app is a finite state machine visualiser. Each node (system) and edge (connection) has a set of named states. Routes define explicit primary/backup paths through the graph. The engine resolves which route is active based on current states, and the SVG diagram animates flow accordingly. Multiple named scenarios can be displayed side-by-side for comparison.

## Stack & Conventions

**This project follows the conventions of [vue-spa-template](https://github.com/andrewbridge/vue-spa-template).** Specifically:

- **No build step.** All source is native ESM, served directly via an HTTP server (`npm run serve` or `npm run dev`).
- **Vue 3 Options API** with string `template` literals (template compiler build of Vue).
- **Dependencies** are loaded from CDN (unpkg) and re-exported through `src/deps/*.mjs` files. No npm runtime dependencies — `package.json` only has dev/serve scripts.
- **Goober** (`css` tagged template) for scoped CSS-in-JS. Styles are defined as a `styles` object at the top of each component file, then interpolated into template strings as class names.
- **Tabler CSS** (loaded via CDN `<link>` in `index.html`) for UI chrome — buttons, cards, badges, dropdowns, layout utilities.
- **Components** are plain objects with `name`, `template`, `data`, `computed`, `methods`, `components`, etc. Exported as default from `.mjs` files.
- **No router needed** for this app — it's a single-page tool.
- **Service Worker / PWA** setup from the template can be stripped or left as-is.

### Key patterns to follow

**Deps pattern** (`src/deps/vue.mjs`):
```js
export { createApp, ref, reactive, ... } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js';
```

**Goober scoped styles** (see `Header.mjs`):
```js
import { css } from "../deps/goober.mjs";

const styles = {
  myClass: css`
    color: red;
    font-weight: bold;
  `,
};

export default {
  template: `<div class="${styles.myClass}">Hello</div>`,
};
```

**Programmatic modals** (see `ProgrammaticModals.mjs`): The template has a `spawnModal(component, props, events)` utility that renders modals into a teleport target. We can use this pattern for the state picker popover if needed, or use Tabler's dropdown positioning.

**Lifecycle gating** (see `services/data/lifecycle.mjs`): The template uses `applicationReady` ref gated on DOM + data readiness. Use this pattern to gate rendering on topology config being loaded.

## Data Model

### Topology Config (`src/config/topology.mjs`)

A single default-exported object defining the entire diagram. This is the only file users edit to describe their architecture.

```js
export default {
  // Source and destination node IDs — the engine checks if flow can get from source to destination
  source: "camera-1",
  destination: "playout",

  // Reusable state definitions. Every state referenced by a node or edge must be defined here.
  // `flow` is the only field the engine cares about: "pass" means video can traverse, "block" means it cannot.
  // `colour` is used for rendering. `label` is the human-readable name shown in the state picker.
  stateDefinitions: {
    healthy:     { label: "Healthy",      flow: "pass",  colour: "#2fb344" },
    degraded:    { label: "Degraded",     flow: "pass",  colour: "#f76707" },
    packetLoss:  { label: "Packet Loss",  flow: "pass",  colour: "#f76707" },
    offline:     { label: "Offline",      flow: "block", colour: "#d63939" },
    down:        { label: "Down",         flow: "block", colour: "#d63939" },
    // Zone-level states
    available:   { label: "Available",    flow: "pass",  colour: "#2fb344" },
    impaired:    { label: "Impaired",     flow: "pass",  colour: "#f76707" },
    outage:      { label: "Outage",       flow: "block", colour: "#d63939" },
  },

  // Nodes represent systems/services in the architecture.
  // `x` and `y` are SVG coordinates for positioning.
  // `states` is an array of keys from stateDefinitions — the set of states this node can be in.
  // `default` is the initial state.
  nodes: {
    "camera-1": {
      label: "Camera 1",
      x: 50, y: 200,
      states: ["healthy", "offline"],
      default: "healthy",
    },
    "encoder-primary": {
      label: "Primary Encoder",
      x: 250, y: 100,
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "encoder-backup": {
      label: "Backup Encoder",
      x: 250, y: 300,
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "packager": {
      label: "Packager",
      x: 450, y: 200,
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "cdn-primary": {
      label: "Primary CDN",
      x: 650, y: 100,
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "cdn-backup": {
      label: "Backup CDN",
      x: 650, y: 300,
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "playout": {
      label: "Playout",
      x: 850, y: 200,
      states: ["healthy", "offline"],
      default: "healthy",
    },
  },

  // Edges are connections between nodes.
  // `from` and `to` are node IDs.
  // `states` and `default` work the same as nodes.
  edges: {
    "cam1-enc-pri":  { from: "camera-1",        to: "encoder-primary", states: ["healthy", "packetLoss", "down"], default: "healthy" },
    "cam1-enc-bak":  { from: "camera-1",        to: "encoder-backup",  states: ["healthy", "down"],               default: "healthy" },
    "enc-pri-pkg":   { from: "encoder-primary",  to: "packager",        states: ["healthy", "packetLoss", "down"], default: "healthy" },
    "enc-bak-pkg":   { from: "encoder-backup",   to: "packager",        states: ["healthy", "down"],               default: "healthy" },
    "pkg-cdn-pri":   { from: "packager",         to: "cdn-primary",     states: ["healthy", "packetLoss", "down"], default: "healthy" },
    "pkg-cdn-bak":   { from: "packager",         to: "cdn-backup",      states: ["healthy", "down"],               default: "healthy" },
    "cdn-pri-play":  { from: "cdn-primary",      to: "playout",         states: ["healthy", "down"],               default: "healthy" },
    "cdn-bak-play":  { from: "cdn-backup",       to: "playout",         states: ["healthy", "down"],               default: "healthy" },
  },

  // Routes are explicit paths through the graph, checked in priority order.
  // Each path is an ordered array of node IDs. The engine infers which edges connect consecutive nodes.
  // The first route where ALL nodes and ALL connecting edges have flow: "pass" wins.
  routes: [
    { label: "Primary", priority: 1, path: ["camera-1", "encoder-primary", "packager", "cdn-primary", "playout"] },
    { label: "Backup",  priority: 2, path: ["camera-1", "encoder-backup",  "packager", "cdn-backup",  "playout"] },
  ],

  // Zones are nested visual containers representing physical locations, cloud regions,
  // and availability zones. They render as labelled bounding boxes around their child nodes.
  // Zone boxes are auto-sized from the bounding box of their contained nodes (plus padding).
  //
  // Zones are also stateful. A zone in a "block" state (e.g. "outage") forces ALL child nodes
  // to be treated as blocked during route resolution, regardless of their individual states.
  // This cascades through nested zones: if a region is in outage, all its AZs and their nodes
  // are effectively blocked.
  //
  // `type` controls the visual style:
  //   - "on-prem": solid border, subtle grey fill
  //   - "region": dashed border, subtle coloured fill (e.g. light blue for AWS)
  //   - "az": dotted border, slightly deeper fill
  //   - "generic": default dashed border, no fill
  zones: {
    "on-prem": {
      label: "On-Premises — Studio A",
      type: "on-prem",
      states: ["available", "outage"],
      default: "available",
      children: ["camera-1"],
      zones: {},
    },
    "aws-eu-west-1": {
      label: "AWS eu-west-1 (Ireland)",
      type: "region",
      states: ["available", "impaired", "outage"],
      default: "available",
      children: [],  // No nodes directly in the region, only in AZs
      zones: {
        "eu-west-1a": {
          label: "eu-west-1a",
          type: "az",
          states: ["available", "impaired", "outage"],
          default: "available",
          children: ["encoder-primary", "packager", "cdn-primary"],
          zones: {},
        },
        "eu-west-1b": {
          label: "eu-west-1b",
          type: "az",
          states: ["available", "impaired", "outage"],
          default: "available",
          children: ["encoder-backup", "cdn-backup"],
          zones: {},
        },
      },
    },
    "viewer": {
      label: "Viewer Edge",
      type: "on-prem",
      states: ["available", "outage"],
      default: "available",
      children: ["playout"],
      zones: {},
    },
  },
};
```

### Route Edge Resolution

Routes are defined as sequences of node IDs. The engine needs to find the edge connecting each consecutive pair. This requires a lookup: for nodes A→B, find the edge where `from === A && to === B`. Build this lookup once at init from the edges config.

If a route references a node pair with no defined edge, that's a config error — surface it clearly in the UI.

### Scenario State

Each scenario holds a map of state overrides:

```js
// scenario.stateOverrides = { "encoder-primary": "offline", "cam1-enc-pri": "packetLoss", "eu-west-1a": "outage" }
// Anything not in the map uses the default from the topology config.
// Zone overrides are keyed by zone ID (including nested zones, using their local key e.g. "eu-west-1a").
// Zone IDs must not collide with node or edge IDs.
```

## Engine

### `src/services/engine/route-resolver.mjs`

Pure function. No side effects, no Vue reactivity — just takes data in, returns results.

```js
/**
 * @param {Object} topology - The full topology config
 * @param {Object} stateOverrides - Map of node/edge ID → current state name
 * @returns {{
 *   activeRoute: { label: string, priority: number, path: string[] } | null,
 *   overallStatus: "online" | "degraded" | "offline",
 *   flowSegments: Map<string, "flowing" | "inactive" | "blocked">,
 *   activeRouteLabel: string | null
 * }}
 */
export function resolveFlow(topology, stateOverrides) { ... }
```

**Algorithm:**

1. Build an edge lookup: `Map<"fromId->toId", edgeId>`.
2. Build a node-to-zone ancestry map: for each node, determine all ancestor zones (immediate zone, parent zone, etc.). Flatten the nested zone tree into `Map<nodeId, zoneId[]>` where the array is ordered innermost-first.
3. For each route (sorted by priority):
   a. For each node in the route's path:
      - Check ancestor zones first: if ANY ancestor zone has a state with `flow: "block"`, the node is effectively blocked regardless of its own state.
      - Otherwise, get the node's effective state (override or default).
   b. For each consecutive node pair, find the edge via lookup, get its effective state.
   c. Classify the route: if all states have `flow: "pass"`, route is viable. If any have `flow: "pass"` with a "degraded"-type colour (amber), route is "degraded". If any have `flow: "block"`, route is blocked.
4. Pick the first viable route (fully passing or degraded).
5. Build `flowSegments` map: every node and edge on the active route gets `"flowing"`, everything on blocked routes gets `"blocked"`, everything else gets `"inactive"`.
6. Determine `overallStatus`:
   - `"online"` — active route exists and all segments are healthy (green).
   - `"degraded"` — active route exists but has at least one amber/degraded segment (including zone-level "impaired").
   - `"offline"` — no viable route.

**Zone cascade logic detail:** The zone cascade is a read-only overlay during resolution — it doesn't modify the scenario's state overrides. A node's individual state is still stored and displayed as-is. But the engine treats the node as blocked if any ancestor zone is blocking. This means if you set a zone to "outage" and then back to "available", all child nodes return to their individual states automatically.

### `src/services/engine/scenario.mjs`

Factory function that creates a reactive scenario object.

```js
import { reactive } from "../../deps/vue.mjs";

/**
 * @param {Object} topology - The topology config (for reading defaults and available states)
 * @param {string} name - Human-readable scenario name
 * @param {Object} [initialOverrides={}] - Optional starting state overrides
 * @returns {Object} Reactive scenario object
 */
export function createScenario(topology, name, initialOverrides = {}) {
  return reactive({
    name,
    stateOverrides: { ...initialOverrides },

    // Get the effective state for a node or edge
    getState(id) { ... },

    // Set a specific state
    setState(id, stateName) { ... },

    // Cycle to the next state in the element's states array
    // Works for nodes, edges, and zones
    cycleState(id) { ... },

    // Reset all overrides to defaults
    reset() { ... },

    // Clone into a new scenario with a new name
    clone(newName) { ... },
  });
}
```

## Components

### File Structure

```
src/
  index.html              # Entry point — Tabler CSS from CDN, mount point, ESM script
  index.mjs               # createApp, mount, no router
  deps/
    vue.mjs               # Re-export from unpkg (keep existing)
    goober.mjs            # Re-export from unpkg (keep existing)
  config/
    topology.mjs          # Default topology config (the example broadcast chain)
  services/
    engine/
      route-resolver.mjs  # Pure function: resolveFlow(topology, overrides) → flow state
      scenario.mjs        # Scenario factory: createScenario(topology, name) → reactive scenario
    data/
      lifecycle.mjs       # Keep existing pattern for app readiness gating
  components/
    App.mjs               # Top-level: manages scenario list, horizontal layout
    ScenarioPanel.mjs     # Single scenario card: diagram + status + name
    DiagramSvg.mjs        # SVG container: renders all zones, nodes and edges, handles viewBox
    ZoneBox.mjs           # Nested zone container: auto-sized rect with label, click for zone state
    NodeBox.mjs           # Single node in SVG: rect + label + state badge, click handler
    EdgePath.mjs          # Single edge in SVG: bezier path with flow animation, click handler
    StatePicker.mjs       # Dropdown popover for selecting a state, positioned near click target
    StatusBanner.mjs      # Overall status indicator (Online/Degraded/Offline badge)
  utilities/
    strings.mjs           # Keep existing (getUid, toTitleCase)
    css.mjs               # Keep existing if needed
```

### Component Details

#### `App.mjs`
- Manages a `reactive([])` array of scenarios.
- On mount, creates one default scenario ("Default — all healthy").
- Renders a toolbar with "Add Scenario" and "Reset All" buttons (Tabler button styles).
- Below that, a horizontal flex container with `overflow-x: auto` holding `ScenarioPanel` components.
- Each panel gets its scenario object as a prop, plus the topology config.
- Emits from panels: `duplicate(scenario)`, `remove(scenario)`.
- On duplicate: pushes `scenario.clone(newName)` to the array.
- On remove: splices from array (confirm if only one left).

#### `ScenarioPanel.mjs`
- Receives `scenario` and `topology` as props.
- Computes `flowResult` via `resolveFlow(topology, scenario.stateOverrides)` — this is a Vue `computed` so it auto-updates when overrides change.
- Renders as a Tabler card (`div.card`) with:
  - Card header: editable scenario name, duplicate button, remove button, reset button.
  - Card body: `DiagramSvg` component.
  - Card footer: `StatusBanner` showing `flowResult.overallStatus`, plus the active route label if any.
- Minimum width of ~500px per panel so horizontal scroll works.

#### `DiagramSvg.mjs`
- Receives `topology`, `scenario`, `flowResult` as props.
- Renders an `<svg>` element with a `viewBox` computed from node positions (with padding).
- Defines SVG `<defs>` for the flow animation:
  ```xml
  <style>
    @keyframes flowAnimation {
      to { stroke-dashoffset: -20; }
    }
    .edge-flowing {
      stroke-dasharray: 10 5;
      animation: flowAnimation 0.5s linear infinite;
    }
  </style>
  ```
- Render order (back to front): zone boxes → edges → nodes. This ensures nodes sit on top of edges, which sit on top of zone backgrounds.
- Iterates `topology.zones` recursively → renders `ZoneBox` for each (zones render first, as background containers).
- Iterates `topology.edges` → renders `EdgePath` for each.
- Iterates `topology.nodes` → renders `NodeBox` for each.
- Emits `pick-state` event with `{ elementId, elementType, mouseEvent }` when a child is clicked. Handles showing/hiding the `StatePicker` overlay. `elementType` can be `"node"`, `"edge"`, or `"zone"`.

**SVG viewBox calculation:** Find min/max x/y across all nodes, add padding (e.g. 80px each side for node width + breathing room). Zone auto-sizing padding should be accounted for in the overall viewBox. Something like:
```js
const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;
const PADDING = 40;
const ZONE_PADDING = 30; // Extra space inside zone boxes around their child nodes
// viewBox = `${minX - PADDING - ZONE_PADDING} ${minY - PADDING - ZONE_PADDING} ${width} ${height}`
```

#### `ZoneBox.mjs`
- Receives `zoneId`, `config` (the zone's config), `allNodes` (topology nodes, for computing bounds), `state`, `stateDefinition`, `depth` (nesting level, 0 for top-level zones).
- **Auto-sizing:** Computes its bounding box from the positions of all descendant nodes (direct `children` + nodes in nested `zones`, recursively). The box is the min/max x/y of those nodes, expanded by `ZONE_PADDING` on all sides, plus extra top padding for the label.
- Renders an SVG `<g>` containing:
  - `<rect>` styled by `config.type`:
    - `"on-prem"`: solid 1px border, `#f4f6fa` fill, `#667382` stroke.
    - `"region"`: dashed 2px border, `#e8f4fd` fill, `#4299e1` stroke.
    - `"az"`: dotted 1.5px border, `#dbeafe` fill, `#60a5fa` stroke.
    - `"generic"`: dashed 1px border, `#f9fafb` fill, `#9ca3af` stroke.
  - When the zone is in a "block" state (e.g. "outage"), the fill gets a red-tinted overlay and the border goes red.
  - When "impaired", border goes amber.
  - `<text>` label positioned at top-left inside the rect (with small padding). Styled smaller/lighter than node labels.
  - Small state badge in the top-right corner of the zone rect (similar to node state badges).
- `@click` on the zone background (not on child nodes) emits to parent to open state picker for this zone.
- Nested zones render as children of the parent zone's `<g>`, creating the visual nesting.

#### `NodeBox.mjs`
- Receives `nodeId`, `config` (the node's config from topology), `state` (effective current state name), `stateDefinition` (the resolved state definition object), `flowStatus` ("flowing"/"inactive"/"blocked").
- Renders an SVG `<g>` containing:
  - `<rect>` with rounded corners, fill white, stroke colour from `stateDefinition.colour`.
  - `<text>` with the node label, centred.
  - Small state badge: `<rect>` + `<text>` below/inside the main rect showing the state label.
- If `flowStatus === "flowing"`, the border could have a subtle pulse or glow.
- `@click` emits to parent to open state picker for this node.

**Positioning:** The node's `x`/`y` from config is the top-left corner of the rect. The `<g>` gets `transform="translate(x, y)"`.

#### `EdgePath.mjs`
- Receives `edgeId`, `config` (from/to), `fromNode`/`toNode` (resolved node configs for positions), `state`, `stateDefinition`, `flowStatus`.
- Renders an SVG `<g>` containing:
  - A `<path>` — cubic bezier from the right edge of the source node to the left edge of the target node. Control points offset horizontally for a smooth curve.
  - A wider invisible `<path>` with `stroke-width: 15; opacity: 0` for a larger click target.
  - If `flowStatus === "flowing"`: path gets class `edge-flowing`, stroke colour from the active route's worst state colour.
  - If `flowStatus === "blocked"`: stroke colour red/grey, no animation.
  - If `flowStatus === "inactive"`: stroke colour light grey, no animation.
- `@click` emits to parent for state picker.

**Bezier calculation:**
```js
const startX = fromNode.x + NODE_WIDTH;
const startY = fromNode.y + NODE_HEIGHT / 2;
const endX = toNode.x;
const endY = toNode.y + NODE_HEIGHT / 2;
const midX = (startX + endX) / 2;
// d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
```

#### `StatePicker.mjs`
- A positioned dropdown/popover.
- Receives `elementId`, `elementType` ("node", "edge", or "zone"), `availableStates` (array of `{ key, label, colour, flow, isActive }`), `position` (`{ x, y }` in page coordinates).
- Renders as a Tabler dropdown menu (`div.dropdown-menu.show`) absolutely positioned near the click point.
- Each state is a dropdown item with a colour dot and label. The current state is highlighted.
- Clicking a state emits `select-state` with `{ elementId, stateName }`.
- Clicking outside or pressing Escape closes it.
- Positioning: use fixed positioning based on the mouse event's `clientX`/`clientY`, with bounds checking to keep it on screen.

#### `StatusBanner.mjs`
- Receives `status` ("online"/"degraded"/"offline") and `activeRouteLabel` (string or null).
- Renders a Tabler badge:
  - Online: `badge bg-green` — "Online via {routeLabel}"
  - Degraded: `badge bg-orange` — "Degraded via {routeLabel}"
  - Offline: `badge bg-red` — "Offline — No viable route"

## Implementation Order

Work through these phases sequentially. Each phase should result in something testable.

### Phase 1: Project Scaffolding
1. Copy the template. Strip the router, `Home` page, `Header` (replace with a simple header), and service worker. Keep `deps/`, `utilities/`, `lifecycle.mjs`, `ProgrammaticModals.mjs`, and `Modal.mjs`.
2. Update `index.html` title.
3. Update `index.mjs` to mount `App` without router.
4. Create empty component files with minimal templates so the app renders.
5. Create `config/topology.mjs` with the sample broadcast chain config (the full example from the data model section above).
6. Verify it serves and renders a blank page with the header.

### Phase 2: Engine
1. Implement `services/engine/route-resolver.mjs` — the `resolveFlow` pure function.
2. Implement `services/engine/scenario.mjs` — the `createScenario` factory.
3. Test the engine by logging output from a scenario with the sample topology. You could add a temporary `console.log` in `App.mjs`'s `mounted` hook that creates a scenario, sets a few overrides, and logs `resolveFlow` output.

### Phase 3: Static Diagram Rendering
1. Implement `DiagramSvg.mjs` — SVG container with viewBox calculation, iterates zones, nodes and edges.
2. Implement `ZoneBox.mjs` — auto-sized bounding rect computed from descendant node positions, with label and type-based styling. Render nested zones recursively.
3. Implement `NodeBox.mjs` — renders each node as a styled rect + text at the configured position.
4. Implement `EdgePath.mjs` — renders bezier paths between nodes.
5. Wire into `ScenarioPanel.mjs` so a single scenario panel shows the static diagram.
6. Wire `App.mjs` to create one default scenario and render one `ScenarioPanel`.
7. At this point you should see the full diagram rendered statically with zone containers, all nodes and edges.

### Phase 4: Flow Visualisation
1. Add the CSS keyframe animation to `DiagramSvg.mjs`'s SVG `<defs>`.
2. Wire `flowResult` from the engine into `EdgePath` and `NodeBox` — pass `flowStatus` and state colour.
3. Apply the `edge-flowing` class and stroke colours dynamically.
4. Apply node border colours based on state.
5. Implement `StatusBanner.mjs` and add it to `ScenarioPanel.mjs`.
6. At this point the default scenario should show all-green flowing animation with "Online" status.

### Phase 5: Interactive State Toggling
1. Implement `StatePicker.mjs` — the positioned dropdown.
2. Add click handlers to `NodeBox`, `EdgePath`, and `ZoneBox` that emit to `DiagramSvg`.
3. In `DiagramSvg`, handle the click by showing `StatePicker` at the click position with the element's available states.
4. On state selection, call `scenario.setState(id, stateName)`. The computed `flowResult` should reactively update, causing the diagram to re-render with new colours/animation.
5. For zone clicks: clicking the zone background (not a child node) opens the zone's state picker. Setting a zone to "outage" should visually cascade — child nodes should appear blocked (the engine handles this, the rendering picks it up from `flowResult`).
6. Test: click a node, set it to "offline", observe the flow animation stopping and rerouting to the backup path.
7. Test: set an AZ to "outage", observe all nodes in that AZ showing as blocked and flow rerouting.

### Phase 6: Scenario Management
1. Implement scenario add/duplicate/remove in `App.mjs`.
2. Make scenario names editable (inline text input in the panel header).
3. Add horizontal scroll layout with multiple panels.
4. Add reset button per scenario.
5. Test: create two scenarios side-by-side, configure different failure states, compare.

### Phase 7: Polish
1. Visual refinements — node sizing, edge curvature, label positioning, overall spacing.
2. Edge cases — config validation (missing edges for route, unknown state references), helpful error messages.
3. A small legend or help panel showing what the colours and animation mean.
4. Consider: keyboard shortcuts (e.g. `R` to reset the focused scenario).
5. Consider: JSON import/export for topologies (textarea modal with load/save).

## Constants & Sizing

Define these in a shared constants file or at the top of `DiagramSvg.mjs`:

```js
export const NODE_WIDTH = 140;
export const NODE_HEIGHT = 60;
export const NODE_BORDER_RADIUS = 8;
export const NODE_BORDER_WIDTH = 3;
export const EDGE_STROKE_WIDTH = 3;
export const EDGE_HIT_AREA_WIDTH = 15;  // Invisible wider path for easier clicking
export const EDGE_DASH_ARRAY = "10 5";
export const EDGE_ANIMATION_DURATION = "0.5s";
export const SVG_PADDING = 40;
export const ZONE_PADDING = 30;         // Padding inside zone boxes around child nodes
export const ZONE_LABEL_HEIGHT = 24;    // Extra top padding for zone label text
export const ZONE_BORDER_RADIUS = 12;
```

## Notes

- The topology config is the single source of truth. The engine and all components derive everything from it plus the scenario's state overrides.
- The engine is deliberately pure — no Vue imports, no reactivity. This makes it trivially testable and keeps the logic separate from the rendering.
- **Zone cascade is read-only.** When a zone blocks its children, the engine treats them as blocked but doesn't modify their state overrides. This means toggling a zone back to "available" instantly restores all child nodes to their individual states. The UI should reflect this — nodes inside a blocked zone should visually show as blocked (e.g. greyed out, red overlay) but their individual state badge should still show their actual configured state, so users can see what will resume when the zone comes back.
- **Zone IDs must be globally unique** across zones, nodes, and edges, since they all share the same state overrides map. The config should be validated for collisions at init.
- **Zone auto-sizing** is computed fresh on each render from descendant node positions. If nodes are repositioned (future drag feature), zones resize automatically.
- For large/complex topologies, the manual `x`/`y` positioning will get tedious. A future enhancement could be a drag-to-reposition mode that writes back to the config, or integration with a layout algorithm (e.g. dagre). But for now, manual positioning is fine.
- The Tabler CSS already includes dropdown, badge, card, and button styles — lean on these rather than hand-rolling UI components.
- All SVG content is inline in Vue templates via string literals. No external SVG files.
