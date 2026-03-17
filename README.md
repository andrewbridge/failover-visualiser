# vue-spa-template

Lorem ipsum dolor.

## Usage

[View app online](https://example.com/)

The app is a PWA which can be added to your phone's home screen. The app will work without a network connection after being loaded once.

### Locally

Serve it in a browser with any HTTP server. A node based server is included in the `package.json`:

```bash
npm run serve
```

## Development

This tool is build step free, just serve it in a browser with any HTTP server, but `npm run serve` is an included command.

To keep dependencies in one place, third party packages are loaded via `modules/deps.mjs` and exposed to the rest of the codebase by exporting as necessary. As support for import maps is getting better, we can probably migrate to using those instead.

Where possible, use an ESM compatible verison of the package, or even better don't load a third party package at all.

Vue components are kept withing `modules/components`. Because we include the parser, templates can be provided in a `template` property of the exported component, usually in a template literal string to allow for line breaks and static variable insertion.

We use [goober](https://github.com/cristianbote/goober) to provide lightweight CSS-in-JS functionality, although we currently only use it to generate class names to attach a styles string to a unique class name.

We largely rely on [Tabler](https://tabler.io/) for UI, which is a derivative of [Bootstrap](https://getbootstrap.com/), refer to both framework's preview code and documentation.
