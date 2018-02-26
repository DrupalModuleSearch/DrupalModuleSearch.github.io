<template>
  <div id="page-content-wrapper">
    <div class="container-fluid">
      <div class="row">
        <div class="col">
          <ul class="nav nav-pills float-right">
            <li class="nav-item"><a class="nav-link active" href="#">Home</a></li>
            <li class="nav-item">
              <a class="nav-link" href="#about" data-toggle="modal" data-target="#about">About</a>
            </li>
          </ul>
          <h3 class="text-muted">Drupal module search</h3>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div id="searchResults"><p>Lets do a search!</p></div>
          <div id="pager"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import './MainPageWrapper.scss';
</style>
