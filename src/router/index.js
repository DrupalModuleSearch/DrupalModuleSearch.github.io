import { createWebHashHistory, createRouter } from "vue-router";

import DrupalModuleSearch from '@/components/DrupalModuleSearch';
import ES from '@/elasticsearch';

const pathParams = ['query'].concat(Object.keys(ES.facetMap)).map((key) => `:${key}?`).join('/');
export default new createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: `/${pathParams}`,
      name: 'DrupalModuleSearch',
      component: DrupalModuleSearch,
      props: true,
    },
  ],
});
