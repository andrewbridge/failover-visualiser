import { css } from "../deps/goober.mjs";
import Home from "../pages/Home.mjs";
import viewport from "../services/data/viewport.mjs";

const styles = {
  stickyTopReset: css`
    @media (min-width: 768px) {
      position: static;
    }
  `,
  heading: css`
    @media (max-width: 767px) {
      margin-left: auto;
      margin-right: auto;
      padding-left: 3.3rem !important;
    }
  `,
  selectedDropdownItem: css`
    &, &:hover, &:focus {
      color: var(--tblr-primary-fg);
      text-decoration: none;
      background-color: var(--tblr-primary);
    }
  `,
  iosTabBar: css`
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.1);
    height: 60px;
    padding: 0;
    z-index: 1000;
  `,
  iosTab: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 7px 0;
    
    .nav-link {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5px 0;
      text-align: center;
      width: 100%;
    }
  `,
  iosTabIcon: css`
    font-size: 22px;
    margin-bottom: 3px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  iosTabLabel: css`
    font-size: 10px;
    font-weight: 500;
    margin-top: 1px;
  `,
  activeTab: css`
    color: var(--tblr-primary);
  `,
};

export default {
    name: 'Header',
    inject: ['router'],
    data: () => ({ viewport }),
    watch: {
      viewport: {
        immediate: true,
        deep: true,
        handler(newViewport) {
          const footerClassName = 'has-bottom-nav';
          if (newViewport.xs || newViewport.sm) {
            document.body.classList.add(footerClassName);
          } else {
            document.body.classList.remove(footerClassName);
          }
        }
      }
    },
    computed: {
        navLinks() {
          return [
            { name: 'Home', href: this.router.getPath(Home) },
          ]
        }
    },
    methods: {
      openAddModal() {
        alert('Not implemented yet');
      }
    },
    template: `
    <div class="sticky-top ${styles.stickyTopReset}">
      <header class="navbar navbar-expand-md navbar-light d-print-none">
          <div class="container-xl">
            <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-md-3 ${styles.heading}">
                Habit Log
            </h1>
            <div class="navbar-nav flex-row order-md-last">
              <div class="nav-item d-flex me-3">
                <div class="btn-list">
                  <button class="btn btn-icon" @click="openAddModal">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
      </header>
      <header class="navbar-expand-md">
          <div class="collapse navbar-collapse">
            <div class="navbar navbar-light">
              <div class="container-xl">
                <ul class="navbar-nav">
                  <li class="nav-item d-none d-md-block" v-for="link in navLinks" :key="link.name" :class="{ active: router.state.activeHash === link.href }">
                    <a class="nav-link" :href="link.href">
                      <span class="nav-link-title">
                        {{link.name}}
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </header>
      </div>
      <Teleport to="#teleport-footer" v-if="viewport.xs || viewport.sm">
        <footer class="d-md-none position-fixed bottom-0 w-100 ${styles.iosTabBar}">
          <div class="container-xl h-100 p-0">
            <ul class="navbar-nav h-100 d-flex flex-row justify-content-around m-0">
              <li 
                class="nav-item flex-fill ${styles.iosTab}" 
                v-for="link in navLinks" 
                :key="link.name"
              >
                <a 
                  class="nav-link" 
                  :href="link.href" 
                  :class="router.state.activeHash === link.href ? '${styles.activeTab}' : ''"
                >
                  <div class="${styles.iosTabIcon}">
                    &uarr;
                  </div>
                  <span class="nav-link-title ${styles.iosTabLabel}">
                    {{link.name}}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </footer>
      </Teleport>`,
}
