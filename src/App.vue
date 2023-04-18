<script setup lang="ts">
import Adsorbent from "./components/Adsorbent.vue";
import {ref} from "vue";

let test_dom = ref<any>(null);
</script>

<template>
  <div>
    <div ref="test_dom" style="width: 0.7vw;height: 0.7vh"></div>
    <adsorbent>
      <div style="width: 100px;height: 60px;background-color: rgba(253,33,33,0.6)"></div>
    </adsorbent>
  </div>
</template>

<style>
</style>
