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
      <div
        id="results"
        class="row"
      >
        <p v-if="hits == null">
          Lets do a search!
        </p>
        <DmsResult
          v-for="hit in hits"
          :hit="hit"
          :key="hit._id"
        />
        <DmsSpinner v-if="searchInProgress" />
        <InfiniteLoading
          @infinite="loadMore"
          :distance="240"
          :first-load="false"
          :identifier="resetToggle"
        />
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
    },
    loadMore: {
      type: Function,
      required: true,
    },
    resetToggle: {
      type: Boolean,
      required: true,
    }
  },
  components: {
    DmsResult,
    DmsSpinner,
  },
};
</script>
