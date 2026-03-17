# Failover Visualiser

An interactive web tool for simulating and visualising failover scenarios in video/media cloud architectures. Design a network topology, toggle components into failure states, and watch the flow reroute in real time.

The codebase has almost entirely been produced by Claude Code (model Opus 4.6).

## Usage

[View app online](https://andrewbridge.github.io/failover-visualiser)

The app is a PWA which can be added to your phone's home screen. The app will work without a network connection after being loaded once.

### Simulator

The Simulator page shows an SVG topology diagram with nodes (systems), edges (connections), and zones (physical regions). Click any node or edge to toggle its health state — the diagram updates immediately, rerouting flow and updating status indicators.

**Key features:**
- Create multiple named scenarios to test different failure combinations
- Side-by-side comparison with Half, Thirds, or Thumbnail view modes
- Toggle between showing only the best active route or all viable routes
- Export/import scenarios as JSON for sharing or documentation
- State is persisted to localStorage across reloads

### Editor

The Editor page lets you design custom topologies. Add or modify nodes, edges, zones, and routes, then save the topology or import one from Draw.io or Mermaid diagram formats. Multiple saved configurations can be managed via the Configs panel.

### Locally

Serve it in a browser with any HTTP server. A node based server is included in the `package.json`:

```bash
npm run serve
```

## Development

This tool is build step free, just serve it in a browser with any HTTP server, but `npm run serve` is an included command.

To keep dependencies in one place, third party packages are loaded via `modules/deps.mjs` and exposed to the rest of the codebase by exporting as necessary. As support for import maps is getting better, we can probably migrate to using those instead.

Where possible, use an ESM compatible version of the package, or even better don't load a third party package at all.

Vue components are kept within `modules/components`. Because we include the parser, templates can be provided in a `template` property of the exported component, usually in a template literal string to allow for line breaks and static variable insertion.

We use [goober](https://github.com/cristianbote/goober) to provide lightweight CSS-in-JS functionality, although we currently only use it to generate class names to attach a styles string to a unique class name.

We largely rely on [Tabler](https://tabler.io/) for UI, which is a derivative of [Bootstrap](https://getbootstrap.com/), refer to both framework's preview code and documentation.
