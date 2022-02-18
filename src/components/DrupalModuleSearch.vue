<template>
  <div
    id="wrapper"
    :class="{ sidebarToggled: sidebarExpanded }"
  >
    <DmsSidebar
      @toggleSidebar="toggleSidebar"
      @runSearch="updateQuery"
      @toggleFacet="toggleFacet"
      :aggregations="aggregations"
    />
    <MainPageWrapper
      :hits="hits"
      :search-in-progress="searchInProgress"
      :load-more="loadMore"
      :reset-toggle="resetToggle"
    />
  </div>
</template>

<script>
import DmsSidebar from '@/components/DmsSidebar/DmsSidebar';
import MainPageWrapper from '@/components/MainPageWrapper/MainPageWrapper';
import ES from '@/elasticsearch';

export default {
  components: {
    DmsSidebar,
    MainPageWrapper,
  },
  data() {
    return {
      sidebarExpanded: false,
      hits: null,
      aggregations: null,
      page: 0,
      resetToggle: false,
      searchInProgress: false,
    };
  },
  methods: {
    loadMore($state) {
      $state.loading();
      this.page += 1;
      this.searchInProgress = true;

      ES.search(this.page)
        .then((response) => {
          this.hits.push(...response.hits.hits);
          this.aggregations = response.aggregations;
          if (response.hits.hits.length < ES.pageLength) {
            $state.complete();
          }
        })
        .catch(() => {
          $state.error();
        })
        .finally(() => {
          this.searchInProgress = false;
          $state.loaded();
        });
    },
    toggleSidebar() {
      this.sidebarExpanded = !this.sidebarExpanded;
    },
    updateQuery(query) {
      ES.query = query;
      this.updateRoute();
    },
    updateRoute() {
      // Params starts with query.
      const params = { query: ES.query };
      if (params.query === undefined || params.query.length === 0) {
        params.query = '-';
      }

      // Now add a param for each of the facetMap. Each param will be at least '-'.
      Object.keys(ES.facetMap).forEach((key) => {
        params[key] = '-';
        if (ES.activeFacets[key] && ES.activeFacets[key].length) {
          params[key] = ES.activeFacets[key].join(',');
        }
      });

      // Strip any trailing - placeholders from the URL
      ['query', ...Object.keys(ES.facetMap)].reverse().some((key) => {
        if (params[key] === '-') {
          // Remove key
          delete params[key];
          return false;
        }
        return true;
      });

      // Set the route. This event will cause the properties on this component
      // to get set via the router. This triggers the watched route params.
      this.$router.push({
        name: 'DrupalModuleSearch',
        params,
      });
    },
    toggleFacet(key, value) {
      ES.activeFacets[key] = ES.activeFacets[key] || [];

      // If this value exists in the array, splice it out.
      const existingIndex = ES.activeFacets[key].indexOf(value);
      if (existingIndex !== -1) {
        ES.activeFacets[key].splice(existingIndex, 1);
      } else {
        // Otherwise push it in.
        ES.activeFacets[key].push(value);
      }

      this.updateRoute();
    },
  },
  watch: {
    '$route.params': {
      immediate: true,
      handler(routeParams) {
        Object.keys(ES.facetMap).forEach((key) => {
          if (routeParams[key] && routeParams[key] !== '-') {
            ES.activeFacets[key] = routeParams[key].split(',');
          } else {
            ES.activeFacets[key] = null;
          }
        });

        if (routeParams.query === undefined || routeParams.query.length === 0 || routeParams.query === '-') {
          ES.query = undefined;
        } else {
          ES.query = routeParams.query;
        }

        this.page = 0;
        this.searchInProgress = true;
        this.resetToggle = !this.resetToggle;

        ES.search(0)
          .then((response) => {
            this.hits = response.hits.hits;
            this.aggregations = response.aggregations;
          })
          .finally(() => {
            this.searchInProgress = false;
          });
      },
    },
  },
};
</script>
