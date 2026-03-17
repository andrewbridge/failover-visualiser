export default {
    name: 'Page',
    props: ['title', 'class'],
    template: `
    <div :class="$props['class']">
        <div class="container-xl" v-if="title">
            <div class="page-header d-print-none">
                <slot name="header">
                    <div class="row g-2 align-items-center">
                        <div class="col d-flex">
                                <h2 class="page-title">{{title}}</h2>
                        </div>
                    </div>
                </slot>
            </div>
        </div>
        <div class="page-body">
            <div class="container-xl">
                <div class="row">
                    <slot />
                </div>
            </div>
        </div>
    </div>`
}
