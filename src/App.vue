<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="scss">
  $card-bg: transparent;
  $enable-gradients: true;
  $enable-rounded: false;
  
  @import '~bootstrap';
  @import './components/DmsSidebar/DmsSidebar.scss';
  @import './components/DmsSidebar/DmsFacet/DmsFacet.scss';
  @import './components/MainPageWrapper/MainPageWrapper.scss';
  @import './components/MainPageWrapper/DmsResult/DmsResult.scss';
  @import './components/MainPageWrapper/DmsSpinner/DmsSpinner.scss';
</style>
