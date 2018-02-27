<template>
  <div id="page-content-wrapper">
    <div class="container-fluid">
      <div class="row">
        <div class="col">
          <h3 class="text-muted">Drupal module search</h3>
        </div>
      </div>
      <div class="row">
        <p v-if="hits == null">Lets do a search!</p>
        <Result v-for="hit in hits" :hit="hit" :key="hit._id"/>

        <div id="pager"></div>
      </div>
    </div>
  </div>
</template>

<script>
import Result from './Result/Result';

export default {
  props: ['hits'],
  components: {
    Result,
  },
};
</script>

<style lang="scss">
@import './MainPageWrapper.scss'
</style>
