<template>
  <div id="wrapper" v-bind:class="{ toggled: sidebarExpanded }">
    <Sidebar v-on:toggleSidebar="toggleSidebar" />
    <MainPageWrapper />
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar/Sidebar';
import MainPageWrapper from '@/components/MainPageWrapper/MainPageWrapper';

export default {
  components: {
    Sidebar,
    MainPageWrapper,
  },
  data() {
    return {
      sidebarExpanded: false,
    };
  },
  methods: {
    toggleSidebar() {
      this.sidebarExpanded = !this.sidebarExpanded;
    },
  },
};

</script>

<style lang="scss">
body {
  background-color: $gray-100;
  font-family: 'Droid Sans', sans-serif;
}
</style>
