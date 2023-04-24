<script setup lang="ts">
import KAdsorbent from "./components/KAdsorbent.vue";
import {onMounted, ref} from "vue";
import {moveElement} from "@/script";

let test_dom = ref<any>(null);
let ref1 = ref(null);
let wid = ref<any>(undefined);
let hei = ref<any>(undefined);
let watchDom = ref(null);

function rd(e: any) {
  ref1.value = e
}
onMounted(()=>{
  window.addEventListener('resize',()=>{
    wid.value=window.innerWidth
    hei.value=window.innerHeight
  })
  moveElement(watchDom.value!)
})
</script>

<template>
  <div>
    <div ref="watchDom" style="background-color: black;width: 60px;height: 60px;opacity: .5;"></div>
    <div ref="test_dom" style="width: 0.7vw;height: 0.7vh"></div>
    <k-adsorbent
        @redraw="rd"
        :watch-dom="watchDom"
        style="position: absolute;left: 200px"
        :pointer="false"
        :round="4"
        :gap="8"
        :la-width="32"
        cover
        :width="wid"
        :height="hei"
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
