<template>
  <div class="container">
    <div id="map" class="map"></div>
  </div>
</template>
<script>
import { getData } from '../api/api'
import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import XYZ from 'ol/source/XYZ'
import Feature from 'ol/Feature';
import Vector from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector';
import point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Circle, Style, Fill } from 'ol/style'
import { LineString, MultiLineString } from 'ol/geom';
import VectorLayer from 'ol/layer/Vector';
export default {
  data() {
    return {
      map: null,
    }
  },
  mounted() {
    this.initMap();
    this.getData();
  },
  methods: {
    initMap() {
      this.map = new Map({
        controls: [],
        layers: [      //图层数组，可视内容实际由各个图层堆叠而成
          new TileLayer({    //瓦片图层
            source: new XYZ({   //数据源
              url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7'
            })
          }),
        ],
        target: 'map',
        view: new View({   //视图设置
          center: [20037508, 1746891],  //设置地图的初始显示区域将以经度 0 和纬度 0 为中心
          zoom: 3,
          maxZoom:5,  //最大放大倍数
          minZoom:2.5,
        }),
      });
    },

    getData() {
      getData().then(res => {
        const { data } = res;
        let points = data.points;  //获取到了台风路径数据
        // this.createPointLine(points);
        this.setTimeCreatePointLine(points);
      })
    },



    //直接生成点和线
    createPointLine(points) {
      let features = [];   //用于存储地理要素
      let linePosition = [];  //存储连线的起始坐标数组
      points.forEach((k, index) => {
        let position = [k.lng, k.lat];  //点的经纬度
        let featurePoint = new Feature({
          geometry: new point(fromLonLat(position))
        });
        featurePoint.setStyle(new Style({    //为要素对象设置颜色需要使用setStyle方法,并需要引入一个Style对象
          image: new Circle({     //声明样式形状为圆形
            fill: new Fill({   //声明填充颜色，也需要引入fill对象
              color: this.judgeColorByWindLevel(k.strong)
            }),
            radius: 4    //设置圆形样式的半径
          })
        }))
        features.push(featurePoint)

        if (index != points.length - 1) {
          let nextPosition = [points[index + 1].lng, points[index + 1].lat];
          linePosition.push([fromLonLat(position), fromLonLat(nextPosition)])
        }

      })

      let lineFeature = new Feature({
        geometry: new MultiLineString(linePosition)
      })
      features.push(lineFeature)
      // 矢量图层
      let layer = new Vector()
      //矢量数据源
      let source = new VectorSource();
      // source.addFeature(features); 不加s表示只添加一个feature，加上可以添加数组
      source.addFeatures(features);

      layer.setSource(source);
      this.map.addLayer(layer)
    },


    //随时间生成点和线
    setTimeCreatePointLine(points) {
      let index = 0;
      let layer = new VectorLayer();
      let source = new VectorSource();
      layer.setSource(source)
      let lineSetTime = setInterval(() => {
        if (index == points.length - 1) clearInterval(lineSetTime);
        let position = [points[index].lng, points[index].lat];
        let featurePoint = new Feature({
          geometry: new point(fromLonLat(position))
        })
        featurePoint.setStyle(new Style({
          image: new Circle({
            fill: new Fill({
              color: this.judgeColorByWindLevel(points[index].strong)
            }),
            radius: 4
          })
        }))
        source.addFeature(featurePoint);

        if (index !=0) {
          let lastPosition = [points[index - 1].lng, points[index - 1].lat];
          let featureLine = new Feature({
            geometry: new LineString([fromLonLat(lastPosition), fromLonLat(position)])
          })
          source.addFeature(featureLine)
        }
        index++;

      }, 200)

      this.map.addLayer(layer)
    },


    //根据台风等级设置点的颜色
    judgeColorByWindLevel(level) {
      let colorMap = {
        "热带风暴": 'green',
        "热带低压": 'blue',
        "台风": 'pink',
        "强热带风暴": 'red',
        "强台风": 'yellow',
        "超强台风": 'salmon',
      }
      return colorMap[level]
    },

  },

};
</script>
<style  scoped>
body {
  padding: 0 !important;
}

.container {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  width: 100vw;
  height: 100vh;
  text-align: center;
}

.map {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;

}
</style>