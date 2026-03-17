import { css } from "../deps/goober.mjs";
import Page from "../components/Page.mjs";
import "../services/data/common.mjs";

const styles = {
    
};

export default {
    name: 'Home',
    inject: ['router'],
    components: { Page },
    data: () => ({}),
    template: `
        <Page>
            <h1>Home</h1>
            <p>Welcome to the home page!</p>
            <p>This is a simple Vue.js application.</p>
            <p>Use the navigation links to explore the app.</p>
        </Page>`,
}
