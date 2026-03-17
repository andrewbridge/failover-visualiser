import { reactive } from '../../deps/vue.mjs';

const matchMediaXS = window.matchMedia("(max-width: 575px)");
const matchMediaSM = window.matchMedia("(min-width: 576px) and (max-width: 767px)");
const matchMediaMD = window.matchMedia("(min-width: 768px) and (max-width: 991px)");
const matchMediaLG = window.matchMedia("(min-width: 992px) and (max-width: 1199px)");
const matchMediaXL = window.matchMedia("(min-width: 1200px) and (max-width: 1399px)");
const matchMediaXXL = window.matchMedia("(min-width: 1400px)");
const matchers = [
    matchMediaXS,
    matchMediaSM,
    matchMediaMD,
    matchMediaLG,
    matchMediaXL,
    matchMediaXXL
];

const viewport = reactive({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    xxl: false,
});
const updateViewport = () => {
    viewport.xs = matchMediaXS.matches;
    viewport.sm = matchMediaSM.matches;
    viewport.md = matchMediaMD.matches;
    viewport.lg = matchMediaLG.matches;
    viewport.xl = matchMediaXL.matches;
    viewport.xxl = matchMediaXXL.matches;
}
updateViewport();

matchers.forEach(matcher => {
    matcher.addEventListener('change', updateViewport);
});

export default viewport;
