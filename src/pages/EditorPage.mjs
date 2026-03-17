import { reactive } from "../deps/vue.mjs";
import { css } from "../deps/goober.mjs";
import { getUid } from "../utilities/strings.mjs";
import { loadConfig, saveConfig, createConfig, activeConfigId, configList } from "../services/data/config-store.mjs";
import defaultTopology from "../config/topology.mjs";
import EditorCanvas from "../components/editor/EditorCanvas.mjs";
import PropertyPanel from "../components/editor/PropertyPanel.mjs";
import StateDefinitionsEditor from "../components/editor/StateDefinitionsEditor.mjs";
import RouteEditor from "../components/editor/RouteEditor.mjs";
import ImportDialog from "../components/editor/ImportDialog.mjs";
import EntityList from "../components/editor/EntityList.mjs";

const styles = {
    container: css`
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    `,
    sidebar: css`
        width: 280px;
        flex-shrink: 0;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        background: #ffffff;
    `,
    rightPanel: css`
        width: 300px;
        flex-shrink: 0;
        border-left: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        background: #ffffff;
    `,
    toolbar: css`
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid #e2e8f0;
        background: #ffffff;
        flex-shrink: 0;
    `,
    modeBtn: css`
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
    `,
    modeBtnActive: css`
        background: #206bc4;
        color: white;
        border-color: #206bc4;
    `,
    divider: css`
        width: 1px;
        height: 24px;
        background: #e2e8f0;
    `,
    configName: css`
        border: none;
        background: transparent;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 2px 4px;
        outline: none;
        min-width: 120px;
        &:hover { background: #f1f5f9; border-radius: 4px; }
        &:focus { background: #fff; border-radius: 4px; box-shadow: 0 0 0 2px #4299e1; }
    `,
    unsaved: css`
        font-size: 0.6875rem;
        color: #f76707;
        margin-left: 0.25rem;
    `,
    addDropdown: css`
        position: relative;
        display: inline-block;
    `,
    addMenu: css`
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 10;
        margin-top: 2px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        min-width: 130px;
        padding: 0.25rem 0;
    `,
    addMenuItem: css`
        display: block;
        width: 100%;
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
        text-align: left;
        border: none;
        background: none;
        cursor: pointer;
        &:hover { background: #f1f5f9; }
    `,
    hint: css`
        font-size: 0.75rem;
        color: #4299e1;
        margin-left: 0.5rem;
    `,
};

export default {
    name: 'EditorPage',
    components: { EditorCanvas, PropertyPanel, StateDefinitionsEditor, RouteEditor, ImportDialog, EntityList },
    inject: ['router'],
    data() {
        return {
            topology: null,
            configId: null,
            configName: 'New Config',
            mode: 'select', // 'select' | 'add-edge'
            selectedId: null,
            selectedType: null,
            edgeSource: null,
            dirty: false,
            loading: true,
            showImport: false,
            showAddMenu: false,
        };
    },
    async created() {
        const paramConfigId = this.router.state.routeParams?.configId;
        if (paramConfigId) {
            const config = await loadConfig(paramConfigId);
            if (config) {
                this.configId = config.id;
                this.configName = config.name;
                this.topology = reactive(structuredClone(config.topology));
                this.loading = false;
                return;
            }
        }
        // New config — start from blank
        this.configId = null;
        this.configName = 'New Config';
        this.topology = reactive(this.blankTopology());
        this.loading = false;
    },
    methods: {
        blankTopology() {
            return {
                source: '',
                destination: '',
                stateDefinitions: {
                    healthy: { label: 'Healthy', flow: 'pass', colour: '#2fb344' },
                    offline: { label: 'Offline', flow: 'block', colour: '#d63939' },
                },
                nodes: {},
                edges: {},
                routes: [],
                zones: {},
            };
        },
        setMode(m) {
            this.mode = m;
            this.edgeSource = null;
            this.showAddMenu = false;
        },
        onSelect({ id, type }) {
            this.selectedId = id;
            this.selectedType = type;
            this.showAddMenu = false;
        },
        onDeselect() {
            this.selectedId = null;
            this.selectedType = null;
            this.showAddMenu = false;
            if (this.mode === 'add-edge') {
                this.edgeSource = null;
            }
        },
        addNode() {
            this.showAddMenu = false;
            const id = 'node-' + getUid();
            // Position near existing nodes or at a default spot
            const { x, y } = this.nextEntityPosition();
            this.topology.nodes[id] = {
                label: 'New Node',
                x, y,
                states: ['healthy', 'offline'],
                default: 'healthy',
            };
            // Auto-nest in selected zone
            if (this.selectedType === 'zone' && this.selectedId) {
                const zone = this.findZone(this.selectedId);
                if (zone) {
                    if (!zone.children) zone.children = [];
                    zone.children.push(id);
                }
            }
            this.dirty = true;
            this.selectedId = id;
            this.selectedType = 'node';
        },
        nextEntityPosition() {
            const nodes = Object.values(this.topology.nodes);
            if (nodes.length === 0) return { x: 100, y: 100 };
            // Place to the right of the rightmost node
            let maxX = -Infinity, correspondingY = 100;
            for (const n of nodes) {
                if (n.x > maxX) { maxX = n.x; correspondingY = n.y; }
            }
            return {
                x: Math.round((maxX + 220) / 10) * 10,
                y: Math.round(correspondingY / 10) * 10,
            };
        },
        onEdgeSource({ nodeId, pointName }) {
            this.edgeSource = { nodeId, pointName };
        },
        onEdgeTarget({ nodeId, pointName }) {
            if (nodeId === this.edgeSource.nodeId) {
                this.edgeSource = null;
                return;
            }
            const id = 'edge-' + getUid();
            this.topology.edges[id] = {
                from: this.edgeSource.nodeId,
                to: nodeId,
                fromPoint: this.edgeSource.pointName,
                toPoint: pointName,
                states: ['healthy', 'offline'],
                default: 'healthy',
            };
            this.dirty = true;
            this.edgeSource = null;
            this.setMode('select');
            this.selectedId = id;
            this.selectedType = 'edge';
        },
        onMoveNode({ nodeId, x, y }) {
            const node = this.topology.nodes[nodeId];
            if (node) {
                node.x = x;
                node.y = y;
                this.dirty = true;
            }
        },
        onPropertyUpdate({ id, type, field, value }) {
            if (type === 'topology') {
                this.topology[field] = value;
            } else if (type === 'node') {
                this.topology.nodes[id][field] = value;
            } else if (type === 'edge') {
                this.topology.edges[id][field] = value;
            } else if (type === 'zone') {
                const zone = this.findZone(id);
                if (zone) zone[field] = value;
            }
            this.dirty = true;
        },
        onPropertyDelete({ id, type }) {
            if (type === 'node') {
                delete this.topology.nodes[id];
                // Clean up edges referencing this node
                for (const [eid, edge] of Object.entries(this.topology.edges)) {
                    if (edge.from === id || edge.to === id) {
                        delete this.topology.edges[eid];
                    }
                }
                // Clean up zone children referencing this node
                this.removeNodeFromZones(id, this.topology.zones);
                // Clean up route paths
                for (const route of this.topology.routes) {
                    route.path = route.path.filter(n => n !== id);
                }
            } else if (type === 'edge') {
                delete this.topology.edges[id];
            } else if (type === 'zone') {
                this.removeZone(id, this.topology.zones);
            }
            this.selectedId = null;
            this.selectedType = null;
            this.dirty = true;
        },
        findZone(id, zones = this.topology.zones) {
            for (const [zid, zone] of Object.entries(zones)) {
                if (zid === id) return zone;
                if (zone.zones) {
                    const found = this.findZone(id, zone.zones);
                    if (found) return found;
                }
            }
            return null;
        },
        removeNodeFromZones(nodeId, zones) {
            for (const zone of Object.values(zones)) {
                if (zone.children) {
                    const idx = zone.children.indexOf(nodeId);
                    if (idx >= 0) zone.children.splice(idx, 1);
                }
                if (zone.zones) this.removeNodeFromZones(nodeId, zone.zones);
            }
        },
        removeZone(id, zones) {
            if (zones[id]) {
                delete zones[id];
                return true;
            }
            for (const zone of Object.values(zones)) {
                if (zone.zones && this.removeZone(id, zone.zones)) return true;
            }
            return false;
        },
        onReparentZone({ zoneId, newParentId }) {
            // Extract the zone data from its current location
            const zoneData = this.extractZone(zoneId, this.topology.zones);
            if (!zoneData) return;
            // Insert into new parent
            if (newParentId) {
                const parent = this.findZone(newParentId);
                if (!parent) return;
                if (!parent.zones) parent.zones = {};
                parent.zones[zoneId] = zoneData;
            } else {
                // Move to top level
                this.topology.zones[zoneId] = zoneData;
            }
            this.dirty = true;
        },
        extractZone(id, zones) {
            if (zones[id]) {
                const data = zones[id];
                delete zones[id];
                return data;
            }
            for (const zone of Object.values(zones)) {
                if (zone.zones) {
                    const found = this.extractZone(id, zone.zones);
                    if (found) return found;
                }
            }
            return null;
        },
        addZone() {
            this.showAddMenu = false;
            const id = 'zone-' + getUid();
            const newZone = {
                label: 'New Zone',
                type: 'generic',
                states: ['available', 'outage'],
                default: 'available',
                children: [],
                zones: {},
            };
            // Auto-nest in selected zone
            if (this.selectedType === 'zone' && this.selectedId) {
                const parentZone = this.findZone(this.selectedId);
                if (parentZone) {
                    if (!parentZone.zones) parentZone.zones = {};
                    parentZone.zones[id] = newZone;
                } else {
                    this.topology.zones[id] = newZone;
                }
            } else {
                this.topology.zones[id] = newZone;
            }
            // Ensure the zone states exist in stateDefinitions
            if (!this.topology.stateDefinitions.available) {
                this.topology.stateDefinitions.available = { label: 'Available', flow: 'pass', colour: '#2fb344' };
            }
            if (!this.topology.stateDefinitions.outage) {
                this.topology.stateDefinitions.outage = { label: 'Outage', flow: 'block', colour: '#d63939' };
            }
            this.dirty = true;
            this.selectedId = id;
            this.selectedType = 'zone';
        },
        startAddEdge() {
            this.showAddMenu = false;
            this.setMode('add-edge');
        },
        // State definitions
        onStateDef_Update({ key, field, value }) {
            this.topology.stateDefinitions[key][field] = value;
            this.dirty = true;
        },
        onStateDef_Add({ key, definition }) {
            this.topology.stateDefinitions[key] = definition;
            this.dirty = true;
        },
        onStateDef_Remove(key) {
            delete this.topology.stateDefinitions[key];
            this.dirty = true;
        },
        // Routes
        onRouteUpdate({ index, field, value }) {
            if (field === 'swap') {
                const routes = this.topology.routes;
                const temp = routes[index];
                routes[index] = routes[value];
                routes[value] = temp;
                // Update priorities
                routes.forEach((r, i) => r.priority = i + 1);
            } else {
                this.topology.routes[index][field] = value;
            }
            this.dirty = true;
        },
        onRouteAdd() {
            this.topology.routes.push({
                label: `Route ${this.topology.routes.length + 1}`,
                priority: this.topology.routes.length + 1,
                path: [],
            });
            this.dirty = true;
        },
        onRouteRemove(index) {
            this.topology.routes.splice(index, 1);
            this.topology.routes.forEach((r, i) => r.priority = i + 1);
            this.dirty = true;
        },
        // Save
        async save() {
            const topology = JSON.parse(JSON.stringify(this.topology));
            if (this.configId) {
                await saveConfig({ id: this.configId, name: this.configName, topology });
            } else {
                this.configId = await createConfig(this.configName, topology);
                // Update URL to include the config ID
                window.location.hash = '#/editor/' + this.configId;
            }
            this.dirty = false;
        },
        onImported(configId) {
            // The ImportDialog navigates to the editor for the new config
        },
        // Export JSON
        exportJson() {
            const json = JSON.stringify(this.topology, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (this.configName || 'topology') + '.json';
            a.click();
            URL.revokeObjectURL(url);
        },
    },
    template: `<div v-if="loading" class="d-flex align-items-center justify-content-center" style="flex: 1">
        <div class="spinner-border text-primary" role="status"></div>
    </div>
    <template v-else>
        <div class="${styles.toolbar}">
            <input class="${styles.configName}" :value="configName"
                   @input="configName = $event.target.value; dirty = true" />
            <span v-if="dirty" class="${styles.unsaved}">unsaved</span>
            <div class="${styles.divider}"></div>
            <div class="${styles.addDropdown}">
                <button class="btn btn-sm ${styles.modeBtn}"
                        :class="{ '${styles.modeBtnActive}': mode === 'add-edge' }"
                        @click="showAddMenu = !showAddMenu">Add ▾</button>
                <div v-if="showAddMenu" class="${styles.addMenu}">
                    <button class="${styles.addMenuItem}" @click="addNode">Node</button>
                    <button class="${styles.addMenuItem}" @click="addZone">Zone</button>
                    <button class="${styles.addMenuItem}" @click="startAddEdge">Edge</button>
                </div>
            </div>
            <div class="${styles.divider}"></div>
            <button class="btn btn-sm btn-primary ${styles.modeBtn}" @click="save">Save</button>
            <button class="btn btn-sm btn-ghost-secondary ${styles.modeBtn}" @click="exportJson">Export JSON</button>
            <button class="btn btn-sm btn-ghost-secondary ${styles.modeBtn}" @click="showImport = true">Import</button>
            <span v-if="mode === 'add-edge' && !edgeSource" class="${styles.hint}">
                Click a connection point on the first node
            </span>
            <span v-else-if="mode === 'add-edge' && edgeSource" class="${styles.hint}">
                Click a connection point on the second node
            </span>
        </div>
        <div class="${styles.container}">
            <div class="${styles.sidebar}">
                <EntityList
                    :topology="topology"
                    :selected-id="selectedId"
                    :selected-type="selectedType"
                    @select="onSelect"
                />
                <PropertyPanel
                    :topology="topology"
                    :selected-id="selectedId"
                    :selected-type="selectedType"
                    @update="onPropertyUpdate"
                    @delete="onPropertyDelete"
                    @reparent-zone="onReparentZone"
                />
            </div>
            <EditorCanvas
                :topology="topology"
                :mode="mode"
                :selected-id="selectedId"
                :selected-type="selectedType"
                :edge-source="edgeSource"
                @select="onSelect"
                @deselect="onDeselect"
                @edge-source="onEdgeSource"
                @edge-target="onEdgeTarget"
                @move-node="onMoveNode"
            />
            <div class="${styles.rightPanel}">
                <StateDefinitionsEditor
                    :state-definitions="topology.stateDefinitions"
                    @update="onStateDef_Update"
                    @add="onStateDef_Add"
                    @remove="onStateDef_Remove"
                />
                <RouteEditor
                    :routes="topology.routes"
                    :nodes="topology.nodes"
                    @update-route="onRouteUpdate"
                    @add-route="onRouteAdd"
                    @remove-route="onRouteRemove"
                />
            </div>
        </div>
        <ImportDialog v-model:show="showImport" @imported="onImported" />
    </template>`,
};
