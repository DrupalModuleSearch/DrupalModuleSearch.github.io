<template>
  <div class="resultWrapper">
    <div class="result">
      <h3><a :href="hit._source.url">{{ hit._source.title }}</a></h3>
      <p class="badge-group">
        <span
          v-if="hit._source.type"
          class="badge badge-pill badge-info"
        >
          <i class="fa fa-file-code-o" /> {{ formatFacetKey(hit._source.type, 'type') }}
        </span>
        <span
          v-for="compatibility in hit._source.compatibility"
          :key="compatibility"
          class="badge badge-pill badge-primary"
        >
          <i class="fa fa-code-fork" /> {{ formatFacetKey(compatibility, 'compatibility') }}
        </span>
        <span
          v-if="hit._source.project_type"
          class="badge badge-pill badge-primary"
        >
          <i class="fa fa-code-fork" /> {{ formatFacetKey(hit._source.project_type, 'project_type') }}
        </span>
        <span
          v-if="hit._source.download_count"
          class="badge badge-pill badge-secondary"
        >
          <i class="fa fa-download" /> {{ formatLongNumber(hit._source.download_count) }}
        </span>
        <span
          v-if="hit._source.author"
          class="badge badge-pill badge-secondary"
        >
          <i class="fa fa-user" /> {{ hit._source.author }}
        </span>
        <span
          v-if="hit._source.maintenance_status"
          class="badge badge-pill badge-secondary"
        >
          <i class="fa fa-cog" /> {{ formatFacetKey(hit._source.maintenance_status, 'maintenance_status') }}
        </span>
        <span
          v-if="hit._source.development_status"
          class="badge badge-pill badge-secondary"
        >
          <i class="fa fa-code" /> {{ formatFacetKey(hit._source.development_status, 'development_status') }}
        </span>
        <span
          v-for="category in hit._source.category"
          :key="category"
          class="badge badge-pill badge-secondary"
        >
          <i class="fa fa-tag" /> {{ formatFacetKey(category, 'category') }}
        </span>
      </p>
      <p
        class="small body"
        v-if="hit.highlight"
      >
        {{ cleanBody(hit.highlight.body[0]) }}
      </p>
    </div>
  </div>
</template>

<script>
import ES from '@/elasticsearch';

export default {
  props: {
    hit: {
      type: Object,
      required: true
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
    formatLongNumber(number) {
      const decimalPlaces = 1;
      const base = Math.floor(Math.log(Math.abs(number)) / Math.log(1000));
      const suffix = 'kmbt'[base - 1];
      return suffix ? (number / (1000 ** base)).toFixed(decimalPlaces) + suffix : number;
    },
    cleanBody() {
      return (value) => {
        var div = document.createElement("div");
        div.innerHTML = value;
        var text = div.textContent || div.innerText || "";
        return text;
      }
    }
  },
};
</script>
