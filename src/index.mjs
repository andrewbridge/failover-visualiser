import "./deps/polyfills.mjs";
import { createApp } from "./deps/vue.mjs";
import App from './components/App.mjs';
import router from './services/routes.mjs';

const root = document.getElementById('root');
root.innerHTML = '';
const app = createApp(App);
app.use(router);
app.mount(root);

// Registering Service Worker
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/sw.js');
}