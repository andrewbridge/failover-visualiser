import { css } from "../../deps/goober.mjs";

const styles = {
    container: css`
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
    `,
    section: css`
        &:not(:last-child) {
            border-bottom: 1px solid #f1f5f9;
        }
    `,
    sectionHeader: css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.375rem 0.75rem;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #667382;
        background: #f8fafc;
        cursor: pointer;
        user-select: none;
        &:hover { background: #f1f5f9; }
    `,
    count: css`
        font-weight: 400;
        color: #9ca3af;
    `,
    item: css`
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.75rem 0.25rem 1.25rem;
        font-size: 0.8125rem;
        cursor: pointer;
        &:hover { background: #f1f5f9; }
    `,
    itemSelected: css`
        background: #e8f4fd;
        &:hover { background: #dbeafe; }
    `,
    icon: css`
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        border-radius: 3px;
    `,
    nodeIcon: css`
        border: 2px solid #667382;
        background: #fff;
    `,
    edgeIcon: css`
        border: none;
        background: none;
        position: relative;
        &::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 2px;
            background: #9ca3af;
        }
    `,
    zoneIcon: css`
        border: 1.5px dashed #60a5fa;
        background: #e8f4fd;
    `,
    label: css`
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    `,
    sublabel: css`
        font-size: 0.6875rem;
        color: #9ca3af;
        flex-shrink: 0;
    `,
};

export default {
    name: 'EntityList',
    props: {
        topology: Object,
        selectedId: String,
        selectedType: String,
    },
    emits: ['select'],
    data() {
        return {
            showNodes: true,
            showEdges: true,
            showZones: true,
        };
    },
    computed: {
        nodeEntries() {
            return Object.entries(this.topology.nodes || {});
        },
        edgeEntries() {
            return Object.entries(this.topology.edges || {});
        },
        zoneEntries() {
            return this.flattenZones(this.topology.zones || {});
        },
    },
    methods: {
        flattenZones(zones, depth = 0) {
            const result = [];
            for (const [id, zone] of Object.entries(zones)) {
                result.push({ id, zone, depth });
                if (zone.zones) {
                    result.push(...this.flattenZones(zone.zones, depth + 1));
                }
            }
            return result;
        },
        selectEntity(id, type) {
            this.$emit('select', { id, type });
        },
        isSelected(id, type) {
            return this.selectedId === id && this.selectedType === type;
        },
        getEdgeLabel(edge) {
            if (edge.label) return edge.label;
            const fromLabel = this.topology.nodes[edge.from]?.label || edge.from;
            const toLabel = this.topology.nodes[edge.to]?.label || edge.to;
            return fromLabel + ' → ' + toLabel;
        },
    },
    template: `<div class="${styles.container}">
        <div class="${styles.section}">
            <div class="${styles.sectionHeader}" @click="showNodes = !showNodes">
                <span>Nodes <span class="${styles.count}">({{ nodeEntries.length }})</span></span>
                <span>{{ showNodes ? '▾' : '▸' }}</span>
            </div>
            <template v-if="showNodes">
                <div v-for="[id, node] in nodeEntries" :key="id"
                     class="${styles.item}"
                     :class="{ '${styles.itemSelected}': isSelected(id, 'node') }"
                     @click="selectEntity(id, 'node')">
                    <div class="${styles.icon} ${styles.nodeIcon}"></div>
                    <span class="${styles.label}">{{ node.label }}</span>
                    <span class="${styles.sublabel}">{{ id }}</span>
                </div>
            </template>
        </div>
        <div class="${styles.section}">
            <div class="${styles.sectionHeader}" @click="showEdges = !showEdges">
                <span>Edges <span class="${styles.count}">({{ edgeEntries.length }})</span></span>
                <span>{{ showEdges ? '▾' : '▸' }}</span>
            </div>
            <template v-if="showEdges">
                <div v-for="[id, edge] in edgeEntries" :key="id"
                     class="${styles.item}"
                     :class="{ '${styles.itemSelected}': isSelected(id, 'edge') }"
                     @click="selectEntity(id, 'edge')">
                    <div class="${styles.icon} ${styles.edgeIcon}"></div>
                    <span class="${styles.label}">{{ getEdgeLabel(edge) }}</span>
                    <span class="${styles.sublabel}">{{ id }}</span>
                </div>
            </template>
        </div>
        <div class="${styles.section}">
            <div class="${styles.sectionHeader}" @click="showZones = !showZones">
                <span>Zones <span class="${styles.count}">({{ zoneEntries.length }})</span></span>
                <span>{{ showZones ? '▾' : '▸' }}</span>
            </div>
            <template v-if="showZones">
                <div v-for="{ id, zone, depth } in zoneEntries" :key="id"
                     class="${styles.item}"
                     :class="{ '${styles.itemSelected}': isSelected(id, 'zone') }"
                     :style="{ paddingLeft: (1.25 + depth * 0.75) + 'rem' }"
                     @click="selectEntity(id, 'zone')">
                    <div class="${styles.icon} ${styles.zoneIcon}"></div>
                    <span class="${styles.label}">{{ zone.label }}</span>
                    <span class="${styles.sublabel}">{{ zone.children?.length || 0 }} nodes</span>
                </div>
            </template>
        </div>
    </div>`,
};
