<script setup lang="ts">
import KAdsorbent from "./components/KAdsorbent.vue";
import {ref} from "vue";

let test_dom = ref<any>(null);
let ref1 = ref(null);

function rd(e: any) {
  ref1.value = e
}

</script>

<template>
  <div>
    <div ref="test_dom" style="width: 0.7vw;height: 0.7vh"></div>
    {{ ref1 }}
    <k-adsorbent
        @redraw="rd"
        style="position: absolute;left: 200px"
        :pointer="false"
        :round="4"
        :gap="8"
        :la-width="32"
        cover
    >
      <div style="width: 100px;height: 60px;background-color: rgba(81,253,33,0.6);"></div>
      <div style="width: 70px;height: 160px;background-color: rgba(81,253,33,0.6);"></div>
      <div style="width: 100px;height: 60px;background-color: rgba(81,253,33,0.6);"></div>
      <div style="width: 100px;height: 60px;background-color: rgba(33,110,253,0.67);transform: translate3d(100px,100px,0);"></div>
    </k-adsorbent>
  </div>
</template>

<style>
</style>
