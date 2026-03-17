import { css } from "../../deps/goober.mjs";

const styles = {
    container: css`
        padding: 0.75rem;
        font-size: 0.8125rem;
    `,
    title: css`
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #667382;
        margin-bottom: 0.5rem;
        letter-spacing: 0.02em;
    `,
    routeCard: css`
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        background: #fafbfc;
    `,
    routeHeader: css`
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin-bottom: 0.375rem;
    `,
    pathList: css`
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        align-items: center;
        margin-top: 0.25rem;
    `,
    pathNode: css`
        background: #e2e8f0;
        border-radius: 4px;
        padding: 0.125rem 0.375rem;
        font-size: 0.6875rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    `,
    arrow: css`
        color: #9ca3af;
        font-size: 0.75rem;
    `,
    removeBtn: css`
        cursor: pointer;
        color: #d63939;
        font-weight: bold;
        font-size: 0.625rem;
        &:hover { color: #a82828; }
    `,
};

export default {
    name: 'RouteEditor',
    props: {
        routes: Array,
        nodes: Object,
    },
    emits: ['update-route', 'add-route', 'remove-route'],
    computed: {
        nodeIds() {
            return Object.keys(this.nodes);
        },
    },
    methods: {
        updateRouteField(index, field, value) {
            this.$emit('update-route', { index, field, value });
        },
        addNodeToPath(index) {
            const nodeId = this.nodeIds[0];
            if (!nodeId) return;
            const path = [...this.routes[index].path, nodeId];
            this.$emit('update-route', { index, field: 'path', value: path });
        },
        removeNodeFromPath(routeIndex, nodeIndex) {
            const path = [...this.routes[routeIndex].path];
            path.splice(nodeIndex, 1);
            this.$emit('update-route', { index: routeIndex, field: 'path', value: path });
        },
        changePathNode(routeIndex, nodeIndex, newNodeId) {
            const path = [...this.routes[routeIndex].path];
            path[nodeIndex] = newNodeId;
            this.$emit('update-route', { index: routeIndex, field: 'path', value: path });
        },
        moveRoute(index, direction) {
            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= this.routes.length) return;
            this.$emit('update-route', { index, field: 'swap', value: newIndex });
        },
        onAdd() {
            this.$emit('add-route');
        },
        onRemove(index) {
            this.$emit('remove-route', index);
        },
    },
    template: `<div class="${styles.container}">
        <div class="${styles.title}">Routes</div>
        <div v-for="(route, index) in routes" :key="index" class="${styles.routeCard}">
            <div class="${styles.routeHeader}">
                <span style="font-size: 0.6875rem; color: #667382">P{{ route.priority }}</span>
                <input class="form-control form-control-sm" style="flex: 1"
                       :value="route.label"
                       @input="updateRouteField(index, 'label', $event.target.value)" />
                <button class="btn btn-sm btn-ghost-secondary" @click="moveRoute(index, -1)" title="Move up"
                        :disabled="index === 0">&uarr;</button>
                <button class="btn btn-sm btn-ghost-secondary" @click="moveRoute(index, 1)" title="Move down"
                        :disabled="index === routes.length - 1">&darr;</button>
                <button class="btn btn-sm btn-ghost-danger" @click="onRemove(index)" title="Remove">&times;</button>
            </div>
            <div class="${styles.pathList}">
                <template v-for="(nodeId, ni) in route.path" :key="ni">
                    <span v-if="ni > 0" class="${styles.arrow}">&rarr;</span>
                    <span class="${styles.pathNode}">
                        <select class="form-select form-select-sm" style="padding: 0 0.25rem; height: auto; font-size: 0.6875rem; border: none; background: transparent; min-width: 60px"
                                :value="nodeId"
                                @change="changePathNode(index, ni, $event.target.value)">
                            <option v-for="id in nodeIds" :key="id" :value="id">{{ nodes[id]?.label || id }}</option>
                        </select>
                        <span class="${styles.removeBtn}" @click="removeNodeFromPath(index, ni)">&times;</span>
                    </span>
                </template>
                <button class="btn btn-sm btn-ghost-primary" @click="addNodeToPath(index)"
                        style="padding: 0.125rem 0.375rem; font-size: 0.6875rem">+ Node</button>
            </div>
        </div>
        <button class="btn btn-sm btn-outline-primary" @click="onAdd">Add Route</button>
    </div>`,
};
