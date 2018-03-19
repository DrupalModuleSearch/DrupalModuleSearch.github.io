<template>
  <div class="resultWrapper">
    <div class="result">
      <h3><a :href="hit._source.url">{{ hit._source.title }}</a></h3>
      <p class="small url"><a :href="hit._source.url">{{ hit._source.url }}</a></p>
      <p class="badge-group">
        <span v-if="hit._source.author" class="badge badge-pill badge-secondary">
          <i class="fa fa-user"></i> {{ hit._source.author }}
        </span>
        <span v-if="hit._source.download_count" class="badge badge-pill badge-secondary">
          <i class="fa fa-download"></i> Downloads: {{ hit._source.download_count }}
        </span>
        <span v-if="hit._source.maintenance_status" class="badge badge-pill badge-secondary">
          <i class="fa fa-cog"></i> {{ hit._source.maintenance_status }}
        </span>
        <span v-if="hit._source.development_status" class="badge badge-pill badge-secondary">
          <i class="fa fa-code"></i> {{ hit._source.development_status }}
        </span>
        <span
          v-for="category in hit._source.category"
          :key="category"
          class="badge badge-pill badge-secondary">
          <i class="fa fa-tag"></i> {{ category }}
        </span>
        <span
          v-for="compatibility in hit._source.compatibility"
          :key="compatibility"
          class="badge badge-pill badge-primary">
          <i class="fa fa-code-fork"></i> {{ compatibility }}
        </span>

        <span v-if="hit._source.project_type" class="badge badge-pill badge-primary">
          <i class="fa fa-code-fork"></i> Project Type: {{ hit._source.project_type }}
        </span>
      </p>
      <p class="small body" v-if="hit.highlight" v-html="hit.highlight.body[0]" />
    </div>
  </div>
</template>

<script>
export default {
  props: ['hit'],
};
</script>

<style lang="scss">
@import './Result.scss'
</style>
