import { createApp, h } from "vue";
import InfiniteLoading from "v3-infinite-loading";
import App from './App';
import router from './router';

const app = createApp({
  render: () => h(App)
});

app.use(router);
app.component("InfiniteLoading", InfiniteLoading);
app.mount("#app");
