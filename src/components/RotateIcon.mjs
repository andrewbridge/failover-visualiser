import { css } from "../deps/goober.mjs";

const styles = css`
    @keyframes rotate-icon {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    & {
        position: relative;
        animation-name: rotate-icon;
        animation-duration: 1s;
        animation-iteration-count: infinite;

        & > :only-child {
            margin: 0 auto;
        }
    }
`

export default {
    name: 'RotateIcon',
    template: `<span class="${styles}">
        <slot />
    </span>`,
}