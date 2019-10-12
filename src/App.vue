<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div>
    <router-view/>
  </div>
</template>

<style lang="scss">
  $card-bg: transparent;
  @import '~bootstrap';
  @import './components/Sidebar/Sidebar.scss';
  @import './components/Sidebar/Facet/Facet.scss';
  @import './components/MainPageWrapper/MainPageWrapper.scss';
  @import './components/MainPageWrapper/Result/Result.scss';
  @import './components/MainPageWrapper/Spinner/Spinner.scss';
</style>
