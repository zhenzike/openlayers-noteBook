import Vue from 'vue'
import App from './App.vue'
// 导入路由模块
import router from '@/router'

// 导入样式
import './assets/css/bootstrap.css'
import './index.css'

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
Vue.use(ElementUI);



Vue.config.productionTip = false

new Vue({
  render: h => h(App),
  router
}).$mount('#app')
