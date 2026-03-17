import { css } from "../../deps/goober.mjs";
import { POINT_NAMES, getOccupiedPoints } from "../../utilities/layout.mjs";

const styles = {
    panel: css`
        padding: 0.75rem;
        overflow-y: auto;
        font-size: 0.8125rem;
    `,
    section: css`
        margin-bottom: 0.75rem;
    `,
    sectionTitle: css`
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #667382;
        margin-bottom: 0.375rem;
        letter-spacing: 0.02em;
    `,
    field: css`
        margin-bottom: 0.5rem;
    `,
    label: css`
        display: block;
        font-size: 0.75rem;
        color: #667382;
        margin-bottom: 0.125rem;
    `,
    stateRow: css`
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin-bottom: 0.25rem;
    `,
    deleteBtn: css`
        margin-top: 0.75rem;
    `,
};

export default {
    name: 'PropertyPanel',
    props: {
        topology: Object,
        selectedId: String,
        selectedType: String, // 'node' | 'edge' | 'zone' | null
    },
    emits: ['update', 'delete', 'reparent-zone'],
    computed: {
        element() {
            if (!this.selectedId || !this.selectedType) return null;
            if (this.selectedType === 'node') return this.topology.nodes[this.selectedId];
            if (this.selectedType === 'edge') return this.topology.edges[this.selectedId];
            if (this.selectedType === 'zone') return this.findZone(this.selectedId);
            return null;
        },
        nodeIds() {
            return Object.keys(this.topology.nodes);
        },
        allStateKeys() {
            return Object.keys(this.topology.stateDefinitions);
        },
        zoneIds() {
            const ids = [];
            this.collectZoneIds(this.topology.zones, ids);
            return ids;
        },
        currentParentZoneId() {
            if (this.selectedType !== 'zone') return null;
            return this.findParentZoneId(this.selectedId, this.topology.zones);
        },
        availableParentZones() {
            if (this.selectedType !== 'zone') return [];
            const descendants = new Set();
            this.collectDescendantZoneIds(this.selectedId, descendants);
            return this.zoneIds.filter(id => id !== this.selectedId && !descendants.has(id));
        },
        availableFromPoints() {
            if (!this.element || this.selectedType !== 'edge') return POINT_NAMES;
            const occupied = getOccupiedPoints(this.element.from, this.topology.edges);
            const current = this.element.fromPoint || 'right';
            return POINT_NAMES.filter(p => p === current || !occupied.has(p));
        },
        availableToPoints() {
            if (!this.element || this.selectedType !== 'edge') return POINT_NAMES;
            const occupied = getOccupiedPoints(this.element.to, this.topology.edges);
            const current = this.element.toPoint || 'left';
            return POINT_NAMES.filter(p => p === current || !occupied.has(p));
        },
    },
    methods: {
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
        collectZoneIds(zones, ids) {
            for (const [zid, zone] of Object.entries(zones)) {
                ids.push(zid);
                if (zone.zones) this.collectZoneIds(zone.zones, ids);
            }
        },
        findParentZoneId(targetId, zones, parentId = null) {
            for (const [zid, zone] of Object.entries(zones)) {
                if (zid === targetId) return parentId;
                if (zone.zones) {
                    const found = this.findParentZoneId(targetId, zone.zones, zid);
                    if (found !== undefined) return found;
                }
            }
            return undefined;
        },
        collectDescendantZoneIds(zoneId, result) {
            const zone = this.findZone(zoneId);
            if (!zone || !zone.zones) return;
            for (const [childId, childZone] of Object.entries(zone.zones)) {
                result.add(childId);
                this.collectDescendantZoneIds(childId, result);
            }
        },
        getZoneLabel(id) {
            const z = this.findZone(id);
            return z ? z.label : id;
        },
        onReparentZone(newParentId) {
            this.$emit('reparent-zone', { zoneId: this.selectedId, newParentId: newParentId || null });
        },
        updateField(field, value) {
            this.$emit('update', { id: this.selectedId, type: this.selectedType, field, value });
        },
        toggleState(stateKey) {
            const states = [...(this.element.states || [])];
            const idx = states.indexOf(stateKey);
            if (idx >= 0) {
                states.splice(idx, 1);
            } else {
                states.push(stateKey);
            }
            this.updateField('states', states);
        },
        onDelete() {
            this.$emit('delete', { id: this.selectedId, type: this.selectedType });
        },
        updateTopologyField(field, value) {
            this.$emit('update', { id: null, type: 'topology', field, value });
        },
    },
    template: `<div class="${styles.panel}">
        <!-- Topology-level props when nothing selected -->
        <template v-if="!element">
            <div class="${styles.section}">
                <div class="${styles.sectionTitle}">Topology</div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Source Node</label>
                    <select class="form-select form-select-sm"
                            :value="topology.source"
                            @change="updateTopologyField('source', $event.target.value)">
                        <option v-for="id in nodeIds" :key="id" :value="id">{{ topology.nodes[id]?.label || id }}</option>
                    </select>
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Destination Node</label>
                    <select class="form-select form-select-sm"
                            :value="topology.destination"
                            @change="updateTopologyField('destination', $event.target.value)">
                        <option v-for="id in nodeIds" :key="id" :value="id">{{ topology.nodes[id]?.label || id }}</option>
                    </select>
                </div>
            </div>
        </template>

        <!-- Node properties -->
        <template v-if="selectedType === 'node' && element">
            <div class="${styles.section}">
                <div class="${styles.sectionTitle}">Node: {{ selectedId }}</div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Label</label>
                    <input class="form-control form-control-sm" :value="element.label"
                           @input="updateField('label', $event.target.value)" />
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Positioning</label>
                    <select class="form-select form-select-sm" :value="element.positioning || 'auto'"
                            @change="updateField('positioning', $event.target.value)">
                        <option value="auto">Auto</option>
                        <option value="custom">Custom (manual)</option>
                    </select>
                </div>
                <template v-if="element.positioning === 'custom'">
                    <div class="${styles.field}">
                        <label class="${styles.label}">X</label>
                        <input class="form-control form-control-sm" type="number" :value="element.x"
                               @input="updateField('x', Number($event.target.value))" />
                    </div>
                    <div class="${styles.field}">
                        <label class="${styles.label}">Y</label>
                        <input class="form-control form-control-sm" type="number" :value="element.y"
                               @input="updateField('y', Number($event.target.value))" />
                    </div>
                </template>
            </div>
            <div class="${styles.section}">
                <div class="${styles.sectionTitle}">States</div>
                <div v-for="key in allStateKeys" :key="key" class="${styles.stateRow}">
                    <input type="checkbox" class="form-check-input"
                           :checked="element.states && element.states.includes(key)"
                           @change="toggleState(key)" />
                    <span>{{ topology.stateDefinitions[key].label }}</span>
                </div>
                <div class="${styles.field}" style="margin-top: 0.375rem">
                    <label class="${styles.label}">Default State</label>
                    <select class="form-select form-select-sm" :value="element.default"
                            @change="updateField('default', $event.target.value)">
                        <option v-for="s in element.states" :key="s" :value="s">{{ topology.stateDefinitions[s]?.label || s }}</option>
                    </select>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-danger ${styles.deleteBtn}" @click="onDelete">Delete Node</button>
        </template>

        <!-- Edge properties -->
        <template v-if="selectedType === 'edge' && element">
            <div class="${styles.section}">
                <div class="${styles.sectionTitle}">Edge: {{ selectedId }}</div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Label</label>
                    <input class="form-control form-control-sm" :value="element.label || ''"
                           @input="updateField('label', $event.target.value)" placeholder="Optional name" />
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">From</label>
                    <select class="form-select form-select-sm" :value="element.from"
                            @change="updateField('from', $event.target.value)">
                        <option v-for="id in nodeIds" :key="id" :value="id">{{ topology.nodes[id]?.label || id }}</option>
                    </select>
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">To</label>
                    <select class="form-select form-select-sm" :value="element.to"
                            @change="updateField('to', $event.target.value)">
                        <option v-for="id in nodeIds" :key="id" :value="id">{{ topology.nodes[id]?.label || id }}</option>
                    </select>
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">From Point</label>
                    <select class="form-select form-select-sm" :value="element.fromPoint || 'right'"
                            @change="updateField('fromPoint', $event.target.value)">
                        <option v-for="pt in availableFromPoints" :key="pt" :value="pt">{{ pt }}</option>
                    </select>
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">To Point</label>
                    <select class="form-select form-select-sm" :value="element.toPoint || 'left'"
                            @change="updateField('toPoint', $event.target.value)">
                        <option v-for="pt in availableToPoints" :key="pt" :value="pt">{{ pt }}</option>
                    </select>
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Label Position ({{ Math.round((element.labelPosition ?? 0.5) * 100) }}%)</label>
                    <input type="range" class="form-range" min="0" max="1" step="0.05"
                           :value="element.labelPosition ?? 0.5"
                           @input="updateField('labelPosition', Number($event.target.value))" />
                </div>
            </div>
            <div class="${styles.section}">
                <div class="${styles.sectionTitle}">States</div>
                <div v-for="key in allStateKeys" :key="key" class="${styles.stateRow}">
                    <input type="checkbox" class="form-check-input"
                           :checked="element.states && element.states.includes(key)"
                           @change="toggleState(key)" />
                    <span>{{ topology.stateDefinitions[key].label }}</span>
                </div>
                <div class="${styles.field}" style="margin-top: 0.375rem">
                    <label class="${styles.label}">Default State</label>
                    <select class="form-select form-select-sm" :value="element.default"
                            @change="updateField('default', $event.target.value)">
                        <option v-for="s in element.states" :key="s" :value="s">{{ topology.stateDefinitions[s]?.label || s }}</option>
                    </select>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-danger ${styles.deleteBtn}" @click="onDelete">Delete Edge</button>
        </template>

        <!-- Zone properties -->
        <template v-if="selectedType === 'zone' && element">
            <div class="${styles.section}">
                <div class="${styles.sectionTitle}">Zone: {{ selectedId }}</div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Label</label>
                    <input class="form-control form-control-sm" :value="element.label"
                           @input="updateField('label', $event.target.value)" />
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Type</label>
                    <select class="form-select form-select-sm" :value="element.type"
                            @change="updateField('type', $event.target.value)">
                        <option value="on-prem">On-Prem</option>
                        <option value="region">Region</option>
                        <option value="az">Availability Zone</option>
                        <option value="generic">Generic</option>
                    </select>
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Parent Zone</label>
                    <select class="form-select form-select-sm"
                            :value="currentParentZoneId || ''"
                            @change="onReparentZone($event.target.value)">
                        <option value="">(Top level)</option>
                        <option v-for="id in availableParentZones" :key="id" :value="id">{{ getZoneLabel(id) }}</option>
                    </select>
                </div>
                <div class="${styles.field}">
                    <label class="${styles.label}">Children (nodes)</label>
                    <div v-for="id in nodeIds" :key="id" class="${styles.stateRow}">
                        <input type="checkbox" class="form-check-input"
                               :checked="element.children && element.children.includes(id)"
                               @change="toggleChild(id)" />
                        <span>{{ topology.nodes[id]?.label || id }}</span>
                    </div>
                </div>
            </div>
            <div class="${styles.section}">
                <div class="${styles.sectionTitle}">States</div>
                <div v-for="key in allStateKeys" :key="key" class="${styles.stateRow}">
                    <input type="checkbox" class="form-check-input"
                           :checked="element.states && element.states.includes(key)"
                           @change="toggleState(key)" />
                    <span>{{ topology.stateDefinitions[key].label }}</span>
                </div>
                <div class="${styles.field}" style="margin-top: 0.375rem">
                    <label class="${styles.label}">Default State</label>
                    <select class="form-select form-select-sm" :value="element.default"
                            @change="updateField('default', $event.target.value)">
                        <option v-for="s in element.states" :key="s" :value="s">{{ topology.stateDefinitions[s]?.label || s }}</option>
                    </select>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-danger ${styles.deleteBtn}" @click="onDelete">Delete Zone</button>
        </template>
    </div>`,
    // Additional methods for zone children
    created() {
        this.toggleChild = (nodeId) => {
            const children = [...(this.element.children || [])];
            const idx = children.indexOf(nodeId);
            if (idx >= 0) {
                children.splice(idx, 1);
            } else {
                children.push(nodeId);
            }
            this.updateField('children', children);
        };
    },
};
