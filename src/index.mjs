import "./deps/polyfills.mjs";
import { createApp } from "./deps/vue.mjs";
import router from "./services/routes.mjs";
import App from './components/App.mjs';

const root = document.getElementById('root');
root.innerHTML = '';
const app = createApp(App);
app.use(router);
app.mount(root);
