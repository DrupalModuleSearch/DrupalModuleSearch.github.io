<template>
  <div
    class="card card-default facet"
    :class="{collapsed}"
  >
    <div
      class="card-header"
      @click="toggleCollapse"
    >
      <span class="icon" />
      <span class="card-title small">{{ aggregation.name }}</span>
    </div>

    <ul
      :id="'collapse_' + aggregation.key"
      class="list-group list-group-flush pre-scrollable"
    >
      <li
        v-for="item in aggregation.items"
        :key="item.key"
        class="list-group-item d-flex justify-content-between align-items-center"
        :class="{refined: item.refined}"
        :data-facet-key="aggregation.key"
        :data-facet-value="item.key"
        @click="refine"
      >
        <div class="value small">
          {{ formatFacetKey(item.key, aggregation.key) }}
        </div>
        <span class="badge badge-secondary badge-pill">{{ item.doc_count }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
import ES from '@/elasticsearch';

export default {
  props: {
    aggregation: {
      type: Object,
      required: true
    },
  },
  data: function() {
    return {
      collapsed: !this.aggregation.isRefined
    }
  },
  computed: {
    formatFacetKey() {
      return (value, aggregationKey) => {
        if (ES.facetMap[aggregationKey].labels && ES.facetMap[aggregationKey].labels[value]) {
          return ES.facetMap[aggregationKey].labels[value]
        }
        return value;
      }
    },
  },
  methods: {
    refine(e) {
      this.$emit('toggleFacet', e.currentTarget.dataset.facetKey, e.currentTarget.dataset.facetValue);
    },
    toggleCollapse() {
      this.collapsed = !this.collapsed;
    },
  }
};
</script>
