<template>
  <div class="container">
    <div style="display: flex">
      <el-button type="primary" size="mini" @click="startMeasure"
        >开始</el-button
      >
      <el-button type="primary" size="mini" @click="stopMeasure"
        >结束</el-button
      >
    </div>
    <div id="map" class="map"></div>
    <toolTipDialog
      ref="toolTipDialog"
      :toolTipData="toolTipData"
    ></toolTipDialog>
  </div>
</template>
<script>
import { getData } from "../api/api";
import Map from "ol/Map.js";
import TileLayer from "ol/layer/Tile.js";
import View from "ol/View.js";
import XYZ from "ol/source/XYZ";
import Feature from "ol/Feature";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Circle as CircleStyle, Style, Fill, Stroke } from "ol/style";
import { LineString, MultiLineString, Polygon, Circle } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import toolTipDialog from "./zujian/toolTipDialog.vue";
import Overlay from "ol/Overlay";
import Draw from "ol/interaction/Draw.js";
import { getLength} from 'ol/sphere.js';
export default {
  data() {
    return {
      map: null,
      lastFeatureSolar: null,
      lastPointStyleFeature: null,
      toolTipData: {
        lng: "",
        lat: "",
      },
      ovlayer: null,
    };
  },

  components: {
    toolTipDialog,
  },

  mounted() {
    this.initMap();
    this.getData();
    this.designHoverOnMap();
    this.toolTipDialogFn();
  },
  methods: {
    initMap() {
      this.map = new Map({
        controls: [],
        layers: [
          //图层数组，可视内容实际由各个图层堆叠而成
          new TileLayer({
            //瓦片图层
            source: new XYZ({
              //数据源
              url: "http://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7",
            }),
          }),
        ],
        target: "map",
        view: new View({
          //视图设置
          center: [20037508, 1746891], //设置地图的初始显示区域将以经度 0 和纬度 0 为中心
          zoom: 3,
          maxZoom: 5, //最大放大倍数
          minZoom: 2.5,
        }),
      });
    },

    getData() {
      getData().then((res) => {
        const { data } = res;
        let points = data.points; //获取到了台风路径数据
        // this.createPointLine(points);
        this.setTimeCreatePointLine(points);
      });
    },

    //随时间生成点和线
    setTimeCreatePointLine(points) {
      let index = 0;
      let layer = new VectorLayer();
      let source = new VectorSource();
      layer.setSource(source);
      let lineSetTime = setInterval(() => {
        if (index == points.length - 1) clearInterval(lineSetTime);
        let position = [points[index].lng, points[index].lat];
        let featurePoint = new Feature({
          geometry: new point(fromLonLat(position)),
        });
        featurePoint.setStyle(
          new Style({
            image: new CircleStyle({
              fill: new Fill({
                color: this.judgeColorByWindLevel(points[index].strong),
              }),
              radius: 4,
            }),
          })
        );

        if (
          points[index].radius7.length != 0 ||
          points[index].radius7 != null
        ) {
          let featureSolar = this.drawAccurateSolar(points[index]);
          if (this.lastFeatureSolar != null) {
            source.removeFeature(this.lastFeatureSolar);
          }
          this.lastFeatureSolar = featureSolar;
          source.addFeature(featureSolar);
        }

        featurePoint.set("featerDataType", "pointType");
        featurePoint.set("featerData", points[index]);
        source.addFeature(featurePoint);

        if (index != 0) {
          let lastPosition = [points[index - 1].lng, points[index - 1].lat];
          let featureLine = new Feature({
            geometry: new LineString([
              fromLonLat(lastPosition),
              fromLonLat(position),
            ]),
          });
          source.addFeature(featureLine);
        }
        index++;
      }, 300);

      this.map.addLayer(layer);
    },

    //使用多边形绘制风圈
    drawSolar(point) {
      let positionArr = [];
      let data_R_arr = point.radius7.split("|").map((k) => {
        return parseFloat(k);
      });

      let Configs = {
        data_X: parseFloat(point.lng),
        data_Y: parseFloat(point.lat),
        data_R: {
          SE: data_R_arr[0] / 100,
          NE: data_R_arr[1] / 100,
          NW: data_R_arr[2] / 100,
          SW: data_R_arr[3] / 100,
        },
      };

      let _interval = 6;
      for (let i = 0; i < 360 / _interval; i++) {
        let r = 0;
        let angle = i * _interval;
        if (angle > 0 && angle <= 90) {
          r = Configs.data_R.NE;
        } else if (angle > 90 && angle <= 180) {
          r = Configs.data_R.NW;
        } else if (angle > 180 && angle <= 270) {
          r = Configs.data_R.SW;
        } else {
          r = Configs.data_R.SE;
        }

        let x = Configs.data_X + r * Math.cos((angle * 3.14) / 180);
        let y = Configs.data_Y + r * Math.sin((angle * 3.14) / 180);

        positionArr.push(fromLonLat([x, y]));
      }

      let feature = new Feature({
        geometry: new Polygon([positionArr]), //这里接受的参数形式实际上是[[],[]]的形式，第一个数组为外部轮廓，第二个数组为内部挖孔，不传则只有一个无挖孔的多边形
      });
      return feature;
    },

    //使用canvas准确的绘制风圈
    drawAccurateSolar(point) {
      let data_R_arr = point.radius7.split("|").map((k) => {
        return parseFloat(k);
      });
      let Configs = {
        data_X: parseFloat(point.lng),
        data_Y: parseFloat(point.lat),
        data_R: {
          SE: data_R_arr[0] * 1100,
          NE: data_R_arr[1] * 1100,
          NW: data_R_arr[2] * 1100,
          SW: data_R_arr[3] * 1100,
        },
      };

      const circleFeature = new Feature({
        geometry: new Circle(fromLonLat([point.lng, point.lat])),
      });

      circleFeature.setStyle(
        new Style({
          renderer(coordinates, state) {
            //渲染器通常使用canvas,coordinates：表示要素的几何坐标 ,states是一个对象，具有context：绘图上下文对象、resolution：分辨率。它表示当前地图的分辨率，可以用于计算绘制元素时的距离、大小等，以及其他属性
            let [x, y] = coordinates[0];
            const ctx = state.context;
            ctx.beginPath();
            let count = 1;
            for (let i in Configs.data_R) {
              let radius = 0.5 * Math.PI * count;
              let distance = Configs.data_R[i] / state.resolution;
              ctx.arc(x, y, distance, radius - 0.5 * Math.PI, radius);
              count++;
            }
            ctx.fillStyle = "rgba(246, 57, 14, 0.3)";
            ctx.fill();
            ctx.closePath();
          },
        })
      );

      circleFeature.set("AccurateSolar", true);
      return circleFeature;
    },

    //划动事件
    designHoverOnMap() {
      this.map.on("pointermove", (e) => {
        let pixel = e.pixel;
        let feature = this.map.forEachFeatureAtPixel(pixel, (featureData) => {
          return featureData;
        });
        if (feature) {
          //存在要素
          if (feature.get("featerDataType") == "pointType") {
            if (this.lastPointStyleFeature != null) {
              this.lastPointStyleFeature.getStyle().getImage().setRadius(4);
              this.lastPointStyleFeature.changed();
            }
            this.map.getTargetElement().style.cursor = "pointer"; //当划过的要点是指定的要素时，修改map的鼠标样式，其他情况下还原
            feature.getStyle().getImage().setRadius(8); //点要素半径是通过style对象中的image对象设置的，这里也需要逐层获取来设置
            this.lastPointStyleFeature = feature;
            feature.changed();

            let featerData = feature.get("featerData"); //获取要素携带的数据，这里是设置要素时手动添加的属性

            this.toolTipData.lng = featerData.lng;
            this.toolTipData.lat = featerData.lat;
            this.ovlayer.setPosition(
              feature.geometryChangeKey_.target.flatCoordinates
            ); //设置叠加层的位置
          } else {
            this.map.getTargetElement().style.cursor = "";
            if (this.lastPointStyleFeature != null) {
              this.lastPointStyleFeature.getStyle().getImage().setRadius(4);
              this.lastPointStyleFeature.changed();
            }
            this.ovlayer.setPosition(undefined);
          }
        } else {
          //不存在要素
          this.map.getTargetElement().style.cursor = "";
          if (this.lastPointStyleFeature != null) {
            this.lastPointStyleFeature.getStyle().getImage().setRadius(4);
            this.lastPointStyleFeature.changed();
          }
          this.ovlayer.setPosition(undefined);
        }
      });
    },

    //挂载叠加层
    toolTipDialogFn() {
      this.ovlayer = new Overlay({
        element: this.$refs.toolTipDialog.$el,
        autoPan: {
          animation: {
            duration: 250,
          },
        },
        position: undefined, //初始位置
      });
      this.map.addOverlay(this.ovlayer); //将叠加层挂载到地图上
    },

    //开始测距
    startMeasure() {
      const source = new VectorSource();
      const layer = new VectorLayer({
        source: source,
        style: {
          "fill-color": "rgba(255, 255, 255, 0.2)",
          "stroke-color": "#ffcc33",
          "stroke-width": 2,
          "circle-radius": 7,
          "circle-fill-color": "#ffcc33",
        },
      });

      let feature;
      let helpTooltip;
      let helpTooltipElement;
      let measureTooltipElement;
      let measureTooltip;
      let draw;
      this.map.on("pointermove", (e) => {
        let helpMsgs = "点击地图作为目标点";
        if (feature) {
          helpMsgs = "双击地图作为结束点";
        }
        let tip = this.createHelpTooltip(helpTooltipElement, helpTooltip,[15,0]);
        helpTooltipElement = tip[0];
        helpTooltip = tip[1];
        helpTooltipElement.innerHTML = helpMsgs;
        helpTooltip.setPosition(e.coordinate);
        helpTooltipElement.classList.remove("hidden");
      });

      draw = this.drawFn(source, draw); //添加绘制交互
      this.map.addInteraction(draw); //添加绘制交互

      //监听绘制事件
      let listener;
      draw.on("drawstart", (e) => {
        feature = e.feature;
        let tooltipCoord = e.coordinate;
        listener = feature.getGeometry().on("change", (evt) =>{
          const geom = evt.target;
          let output;
          output = this.formatLength(geom)
          let tip = this.createHelpTooltip(
            measureTooltipElement,
            measureTooltip,
            [0,-15]
          );
          measureTooltipElement = tip[0];
          measureTooltip = tip[1];
          tooltipCoord = geom.getLastCoordinate();
          measureTooltipElement.innerHTML = output;
          measureTooltip.setPosition(tooltipCoord);
        });
      });

      this.map.addLayer(layer);
    },

    formatLength(line) {
      const length = getLength(line);
      let output;
      if (length > 100) {
        output = Math.round((length / 1000) * 100) / 100 + " " + "km";
      } else {
        output = Math.round(length * 100) / 100 + " " + "m";
      }
      return output;
    },

    //鼠标跟随提醒
    createHelpTooltip(element, tip,offset) {
      if (element) {
        element.parentNode.removeChild(element);
      }
      element = document.createElement("div");
      element.className = "ol-tooltip hidden";
      tip = new Overlay({
        element: element,
        offset: offset,
        positioning: "center-left",
      });
      this.map.addOverlay(tip);
      return [element, tip];
    },

    //交互绘制
    drawFn(source, draw) {
      draw = new Draw({
        source: source,
        type: "LineString",
        style: new Style({
          fill: new Fill({
            color: "rgba(255, 255, 255, 0.2)",
          }),
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 0.5)",
            lineDash: [10, 10],
            width: 2,
          }),
          image: new CircleStyle({
            radius: 5,
            stroke: new Stroke({
              color: "rgba(0, 0, 0, 0.7)",
            }),
            fill: new Fill({
              color: "rgba(255, 255, 255, 0.2)",
            }),
          }),
        }),
      });
      return draw;
    },

    //结束测距
    stopMeasure() {},

    //根据台风等级设置点的颜色
    judgeColorByWindLevel(level) {
      let colorMap = {
        热带风暴: "green",
        热带低压: "blue",
        台风: "pink",
        强热带风暴: "red",
        强台风: "yellow",
        超强台风: "salmon",
      };
      return colorMap[level];
    },

    //直接生成点和线
    createPointLine(points) {
      let features = []; //用于存储地理要素
      let linePosition = []; //存储连线的起始坐标数组
      points.forEach((k, index) => {
        let position = [k.lng, k.lat]; //点的经纬度
        let featurePoint = new Feature({
          geometry: new point(fromLonLat(position)),
        });
        featurePoint.setStyle(
          new Style({
            //为要素对象设置颜色需要使用setStyle方法,并需要引入一个Style对象
            image: new CircleStyle({
              //声明样式形状为圆形
              fill: new Fill({
                //声明填充颜色，也需要引入fill对象
                color: this.judgeColorByWindLevel(k.strong),
              }),
              radius: 4, //设置圆形样式的半径
            }),
          })
        );
        features.push(featurePoint);

        if (index != points.length - 1) {
          let nextPosition = [points[index + 1].lng, points[index + 1].lat];
          linePosition.push([fromLonLat(position), fromLonLat(nextPosition)]);
        }
      });

      let lineFeature = new Feature({
        geometry: new MultiLineString(linePosition),
      });
      features.push(lineFeature);
      // 矢量图层
      let layer = new Vector();
      //矢量数据源
      let source = new VectorSource();
      // source.addFeature(features); 不加s表示只添加一个feature，加上可以添加数组
      source.addFeatures(features);

      layer.setSource(source);
      this.map.addLayer(layer);
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