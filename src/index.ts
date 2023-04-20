import { createApp } from 'vue'
import type {App} from "vue";
import Main from './Main.vue'
import KAdsorbent from "./components/KAdsorbent.vue";

createApp(Main).mount('#app')

const install = (app: App) => {
    app.component(KAdsorbent.name, KAdsorbent);
};


export {
    KAdsorbent
}

export default {
    install
}
