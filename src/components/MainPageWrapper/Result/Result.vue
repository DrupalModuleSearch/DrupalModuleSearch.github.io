<template>
  <div class="resultWrapper">
    <div class="result">
      <h3><a :href="hit._source.url">{{ hit._source.title }}</a></h3>
      <p class="badge-group">
        <span v-if="hit._source.type" class="badge badge-pill badge-info">
          <i class="fa fa-file-code-o"></i> {{ hit._source.type | formatFacetKey('type') }}
        </span>
        <span
          v-for="compatibility in hit._source.compatibility"
          :key="compatibility"
          class="badge badge-pill badge-primary">
          <i class="fa fa-code-fork"></i> {{ compatibility | formatFacetKey('compatibility') }}
        </span>
        <span v-if="hit._source.project_type" class="badge badge-pill badge-primary">
          <i class="fa fa-code-fork"></i> {{ hit._source.project_type | formatFacetKey('project_type') }}
        </span>
        <span v-if="hit._source.download_count" class="badge badge-pill badge-secondary">
          <i class="fa fa-download"></i> {{ hit._source.download_count | formatLongNumber }}
        </span>
        <span v-if="hit._source.author" class="badge badge-pill badge-secondary">
          <i class="fa fa-user"></i> {{ hit._source.author }}
        </span>
        <span v-if="hit._source.maintenance_status" class="badge badge-pill badge-secondary">
          <i class="fa fa-cog"></i> {{ hit._source.maintenance_status | formatFacetKey('maintenance_status') }}
        </span>
        <span v-if="hit._source.development_status" class="badge badge-pill badge-secondary">
          <i class="fa fa-code"></i> {{ hit._source.development_status | formatFacetKey('development_status') }}
        </span>
        <span
          v-for="category in hit._source.category"
          :key="category"
          class="badge badge-pill badge-secondary">
          <i class="fa fa-tag"></i> {{ category | formatFacetKey('category') }}
        </span>

      </p>
      <p class="small body" v-if="hit.highlight">{{ hit.highlight.body[0] | striphtml }}</p>
    </div>
  </div>
</template>

<script>
export default {
  props: ['hit'],
  filters: {
    formatLongNumber(number) {
      const decimalPlaces = 1;
      const base = Math.floor(Math.log(Math.abs(number)) / Math.log(1000));
      const suffix = 'kmbt'[base - 1];
      return suffix ? (number / (1000 ** base)).toFixed(decimalPlaces) + suffix : number;
    },
  },
};
</script>
