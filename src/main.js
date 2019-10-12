import Vue from 'vue';
import infiniteScroll from 'vue-infinite-scroll';
import App from './App';
import router from './router';

Vue.use(infiniteScroll);

Vue.config.productionTip = false;

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  render: (h) => h(App),
});
