<template>
  <div id="sidebar-wrapper">
    <div class="container-fluid">
      <div class="row">
        <div class="col-sm-2">
          <a id="menu-toggle" @click="toggleSidebar">
            <i class="fa fa-bars" aria-hidden="true"></i>
          </a>
        </div>
        <div class="col-sm-10">
          <form id="searchform">
            <div class="form-group">
              <div class="input-group">
                <div class="input-group-prepend">
                  <span class="input-group-text" id="basic-addon1">
                    <i class="fa fa-search" aria-hidden="true"></i>
                  </span>
                </div>
                <input type="search" class="form-control" id="searchbox" placeholder="Search">
              </div>
            </div>
          </form>

          <div id="searchSummary"></div>
          <div id="searchFacets" class="card-group"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  methods: {
    toggleSidebar() {
      this.$emit('toggleSidebar');
    },
  },
};
</script>

<style lang="scss">
@import './Sidebar.scss';
</style>
