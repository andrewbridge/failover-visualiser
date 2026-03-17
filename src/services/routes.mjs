import Route from "../deps/route-parser.mjs";
import { ref, markRaw, reactive, watchEffect, computed } from "../deps/vue.mjs";
import Home from "../pages/Home.mjs";

const defaultPath = '/';
const defaultHash = '#' + defaultPath;
export const routes = {
    '/': Home,
}

const compiledRoutes = Object.entries(routes).map(([spec, component]) => ({ route: new Route(spec), spec, component }));

const activeSpec = ref(null);
const activeRoute = ref(null);
const routeParams = ref({});
const activeHash = computed(() => getPath(activeRoute.value, routeParams.value));
const activePath = computed(() => activeHash.value.slice(1));

const redirectToDefault = () => window.location.hash = defaultHash;

const selectRoute = () => {
    const currentPath = window.location.hash.slice(1);
    if (currentPath === '') return redirectToDefault();
    let params;
    const matchedRoute = compiledRoutes.find(({ route }) => params = route.match(currentPath));
    if (!matchedRoute) return redirectToDefault();
    activeSpec.value = matchedRoute.spec;
    activeRoute.value = markRaw(matchedRoute.component);
    routeParams.value = params;
};

selectRoute();

window.addEventListener('hashchange', selectRoute);

const getSpec = (component) => {
    if (component === null) return null;
    const componentName = typeof component === 'string' ? component : component.name;
    return compiledRoutes.find(({ component: routeComponent }) => componentName === routeComponent.name);
}

const getPath = (component, params = {}) => {
    const routeConfiguration = getSpec(component);
    if (!routeConfiguration) return '#' + defaultPath;
    return '#' + routeConfiguration.route.reverse(params);
}

const goTo = (component, params = {}) => {
    window.location.hash = getPath(component, params);
}

export default {
    install: (app, options) => {
        const stateObject = reactive({});
        watchEffect(() => {
            stateObject.activeSpec = activeSpec.value;
            stateObject.activeRoute = activeRoute.value;
            stateObject.activePath = activePath.value;
            stateObject.activeHash = activeHash.value;
            stateObject.routeParams = routeParams.value;
        });
        app.provide('router', {
            getSpec,
            getPath,
            goTo,
            defaultPath,
            defaultHash,
            state: stateObject
        });
    }
}