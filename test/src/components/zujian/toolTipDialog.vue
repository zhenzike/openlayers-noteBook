<template>
   <div  class="toolTipDialog">
        <div style="display:flex;width: 100%;">
            <div style="flex:1;text-align: left;padding: 0 4px ;">经度：{{ toolTipData.lat }}</div>
            <div style="flex:1;text-align: left;border-left: 1px solid #b6b6b6;padding: 0 4px ;">纬度：{{ toolTipData.lng }}</div>
        </div>
   </div>
</template>
<script>
export default {
   name: 'toolTipDialog',
   props: {
     toolTipData:{
        type:Object,
        default:{}
     }
   },
   data() {
     return {
       
     }
   },

   mounted() {
     
   },
   methods: {
     
   }
};
</script>
<style lang='less' scoped>
.toolTipDialog{
    background-color: white;
    width:200px;
    border-radius: 15px;
    padding: 8px;

}
</style>