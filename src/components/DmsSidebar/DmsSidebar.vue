<template>
  <div id="sidebar-wrapper">
    <div class="container-fluid">
      <div class="row">
        <div class="col-sm-2">
          <a
            id="menu-toggle"
            @click="toggleSidebar"
          >
            <i
              class="fa fa-bars"
              aria-hidden="true"
            />
          </a>
        </div>
        <div class="col-sm-10">
          <div class="form-group mb-4">
            <div class="input-group">
              <div
                class="input-group-text"
                id="basic-addon1"
              >
                <i
                  class="fa fa-search"
                  aria-hidden="true"
                />
              </div>
              <input
                type="search"
                class="form-control"
                v-model="mutableQuery"
                @input="runSearch"
                placeholder="Search"
              >
            </div>
          </div>

          <div id="searchSummary" />
          <div id="searchFacets">
            <Facet
              v-for="aggregation in sortedAggregations"
              :aggregation="aggregation"
              :key="aggregation.id"
              @toggleFacet="toggleFacet"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _debounce from 'lodash/debounce';
import ES from '@/elasticsearch';
import Facet from './DmsFacet/DmsFacet';

export default {
  props: {
    aggregations: {
      type: Array,
      default() { return [] }
    },
  },
  components: {
    Facet,
  },
  data() {
    return {
      mutableQuery: ES.query,
    };
  },
  methods: {
    toggleSidebar() {
      this.$emit('toggleSidebar');
    },
    toggleFacet(key, value) {
      this.$emit('toggleFacet', key, value);
    },
  },
  computed: {
    sortedAggregations() {
      if (!this.aggregations) {
        return []
      }

      return Object
        .keys(ES.facetMap)
        .reduce((acc, key) => {
          const agg = this.aggregations.find(a => a.key === key)
          if (agg) {
            acc.push(agg)
          }
          return acc
        }, [])
    },
    runSearch() {
      return _debounce(function inputCaptured(e) {
        this.$emit('runSearch', e.srcElement.value);
      }, 250).bind(this);
    },
  },
};
</script>
