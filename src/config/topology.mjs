export default {
  source: "camera-1",
  destination: "playout",

  stateDefinitions: {
    healthy:     { label: "Healthy",      flow: "pass",  colour: "#2fb344" },
    degraded:    { label: "Degraded",     flow: "pass",  colour: "#f76707" },
    packetLoss:  { label: "Packet Loss",  flow: "pass",  colour: "#f76707" },
    offline:     { label: "Offline",      flow: "block", colour: "#d63939" },
    down:        { label: "Down",         flow: "block", colour: "#d63939" },
    available:   { label: "Available",    flow: "pass",  colour: "#2fb344" },
    impaired:    { label: "Impaired",     flow: "pass",  colour: "#f76707" },
    outage:      { label: "Outage",       flow: "block", colour: "#d63939" },
  },

  nodes: {
    "camera-1": {
      label: "Camera 1",
      x: 50, y: 200,
      positioning: "custom",
      states: ["healthy", "offline"],
      default: "healthy",
    },
    "encoder-primary": {
      label: "Primary Encoder",
      x: 250, y: 100,
      positioning: "custom",
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "encoder-backup": {
      label: "Backup Encoder",
      x: 250, y: 300,
      positioning: "custom",
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "packager": {
      label: "Packager",
      x: 450, y: 200,
      positioning: "custom",
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "cdn-primary": {
      label: "Primary CDN",
      x: 650, y: 100,
      positioning: "custom",
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "cdn-backup": {
      label: "Backup CDN",
      x: 650, y: 300,
      positioning: "custom",
      states: ["healthy", "degraded", "offline"],
      default: "healthy",
    },
    "playout": {
      label: "Playout",
      x: 850, y: 200,
      positioning: "custom",
      states: ["healthy", "offline"],
      default: "healthy",
    },
  },

  edges: {
    "cam1-enc-pri":  { from: "camera-1",        to: "encoder-primary", fromPoint: "top-right",    toPoint: "left", states: ["healthy", "packetLoss", "down"], default: "healthy" },
    "cam1-enc-bak":  { from: "camera-1",        to: "encoder-backup",  fromPoint: "bottom-right", toPoint: "left", states: ["healthy", "down"],               default: "healthy" },
    "enc-pri-pkg":   { from: "encoder-primary",  to: "packager",        fromPoint: "right",        toPoint: "top-left", states: ["healthy", "packetLoss", "down"], default: "healthy" },
    "enc-bak-pkg":   { from: "encoder-backup",   to: "packager",        fromPoint: "right",        toPoint: "bottom-left", states: ["healthy", "down"],               default: "healthy" },
    "pkg-cdn-pri":   { from: "packager",         to: "cdn-primary",     fromPoint: "top-right",    toPoint: "left", states: ["healthy", "packetLoss", "down"], default: "healthy" },
    "pkg-cdn-bak":   { from: "packager",         to: "cdn-backup",      fromPoint: "bottom-right", toPoint: "left", states: ["healthy", "down"],               default: "healthy" },
    "cdn-pri-play":  { from: "cdn-primary",      to: "playout",         fromPoint: "right",        toPoint: "top-left", states: ["healthy", "down"],               default: "healthy" },
    "cdn-bak-play":  { from: "cdn-backup",       to: "playout",         fromPoint: "right",        toPoint: "bottom-left", states: ["healthy", "down"],               default: "healthy" },
  },

  routes: [
    { label: "Primary", priority: 1, path: ["camera-1", "encoder-primary", "packager", "cdn-primary", "playout"] },
    { label: "Backup",  priority: 2, path: ["camera-1", "encoder-backup",  "packager", "cdn-backup",  "playout"] },
  ],

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
      children: [],
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
