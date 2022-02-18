<template>
  <div id="page-content-wrapper">
    <div class="container-fluid">
      <div class="row">
        <div class="col">
          <h3 class="text-muted">
            Drupal module search
          </h3>
        </div>
      </div>
      <div class="row">
        <p v-if="hits == null">
          Lets do a search!
        </p>
        <DmsResult
          v-for="hit in hits"
          :hit="hit"
          :key="hit._id"
        />
        <DmsSpinner v-if="searchInProgress" />
        <div id="pager" />
      </div>
    </div>
  </div>
</template>

<script>
import DmsResult from './DmsResult/DmsResult';
import DmsSpinner from './DmsSpinner/DmsSpinner';

export default {
  props: {
    hits: {
      type: Array,
      default() { return [] },
    },
    searchInProgress: {
      type: Boolean,
      default: false
    }
  },
  components: {
    DmsResult,
    DmsSpinner,
  },
};
</script>
