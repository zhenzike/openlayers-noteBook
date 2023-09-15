# 基本概念

<img src="tu/概念.png" style="zoom:67%;" >

## 生成一个基本的地图

<img src="tu/基本地图.png">

html:

```html
<template>
  <div>
    <div id="map" class="map" tabindex="0"></div>
    <button id="zoom-out" @click="bigOrSmall('big')">放大</button>
    <button id="zoom-in" @click="bigOrSmall('small')">缩小</button>
  </div>
</template>
```

**vue**:

```js
import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import XYZ from 'ol/source/XYZ'
export default {
    data() {
        return {
            map: null,
        }
    },
    mounted() {
        this.initMap()
    },
    methods: {
        initMap() {
            this.map = new Map({
                layers: [      //图层数组，可视内容实际由各个图层堆叠而成
                    new TileLayer({    //瓦片图层
                        source: new XYZ({   //数据源
                            url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7'
                        })
                    }),
                ],
                target: 'map',
                view: new View({   //视图设置
                    center: [0, 0],  //设置地图的初始显示区域将以经度 0 和纬度 0 为中心
                    zoom: 2,
                }),
            });
        },

        bigOrSmall(str) {
            const view = this.map.getView();     //获取获取当前地图的视图对象
            const zoom = view.getZoom();           //获取缩放级别
            if (str == 'big') {
                view.setZoom(zoom + 1);    //将层级放大
            } else {
                view.setZoom(zoom - 1);    //将层级减少
            }
        }
    },
};
```

css:

```css
.map {
  width: 100%;
  height: 400px;
}

a.skiplink {
  position: absolute;
  clip: rect(1px, 1px, 1px, 1px);
  padding: 0;
  border: 0;
  height: 1px;
  width: 1px;
  overflow: hidden;
}

a.skiplink:focus {
  clip: auto;
  height: auto;
  width: auto;
  background-color: #fff;
  padding: 0.3em;
}

#map:focus {
  outline: #4A74A8 solid 0.15em;
}
```

## 台风实例

数据可获取 台风路径 网通过控制台获取台风路径数据，之后将数据放置在public下的json文件中(自己创建)，这样可用ajax来请求本地文件来模拟网络请求

### 绘制点

```js
initMap() {
    this.map = new Map({
        layers: [      //图层数组，可视内容实际由各个图层堆叠而成
            new TileLayer({    //瓦片图层
                source: new XYZ({   //数据源
                    url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7'
                })
            }),
        ],
        target: 'map',
        view: new View({   //视图设置
            center: [20037508, 1746891],  //设置地图的初始显示区域
            zoom: 3,
        }),
    });
},

    getData() {
        getData().then(res => {
            const { data } = res;
            let points = data.points;  //获取到了台风路径数据
            let features = [];   //用于存储地理要素
            points.forEach(k => {
                let position = [k.lng, k.lat];  //点的经纬度
                let featurePoint = new Feature({
                    // geometry  用来指明地理要素的几何形状，这里指明为 点
                    // 地图的投影如果不做说明则 默认的是3857即球面投影，所以可以使用fromLonLat将经纬度转换为球面投影
                    geometry:new point(fromLonLat(position))
                });
                features.push(featurePoint)
            })

            // 矢量图层
            let layer = new Vector()
            //矢量数据源
            let source = new VectorSource();
            // source.addFeature(features); 不加s表示只添加一个feature，加上可以添加数组
            source.addFeatures(features); //为数据源添加地理要素
            layer.setSource(source);  //为图层添加数据源
            this.map.addLayer(layer)  //为视图添加图层
        })
    },
```

### 添加样式(setStyle)

```js
//接绘制点后，可以在将单个要素保存到要素数组前，设置其样式
points.forEach(k => {
    let position = [k.lng, k.lat];  //点的经纬度
    let featurePoint = new Feature({
        geometry:new point(fromLonLat(position))
    });
    featurePoint.setStyle(new Style({    //为要素对象设置颜色需要使用setStyle方法,并需要引入一个Style对象
        image:new Circle({     //声明样式形状为圆形(可以使用其他形状，同样需要引入)
            fill: new Fill({   //声明填充颜色，也需要引入fill对象
                color:this.judgeColorByWindLevel(k.strong)
            }),
            radius:4    //设置圆形样式的半径
        })
    }))
    features.push(featurePoint)
})
```

### 绘制连线

连线有两种：

- **LineString**：一般用于控制两点之间的连线，也就是需要精准的控制每一条线时，使用这个
- **MultiLineString**：一般用于控制多点之间的连线，想要一次性控制所有连线时使用这个

这里不对连线做特殊处理，所以使用==MultiLineString==一次性渲染所有连线【**注意**:==连线需要设置开始、结束坐标==】

```js
//接上回设置好点的样式之后，在遍历点的信息的同时，获取该点以及下一个点的坐标信息，用于连线
let linePosition = [];  //存储连线的起始坐标数组
points.forEach((k, index) => {
    let position = [k.lng, k.lat];  
    let featurePoint = new Feature({
        geometry: new point(fromLonLat(position))
    });
    featurePoint.setStyle(new Style({  
        image: new Circle({   
            fill: new Fill({  
                color: this.judgeColorByWindLevel(k.strong)
            }),
            radius: 4    
        })
    }))
    features.push(featurePoint)

    if (index != points.length - 1) {   
        let nextPosition = [points[index + 1].lng, points[index + 1].lat]; //获取下一个点的坐标
        linePosition.push([fromLonLat(position), fromLonLat(nextPosition)])  //保存连线的开始、结尾坐标数组
    }
})

let  lineFeature=new  Feature({  //设置多点连线要素
    geometry:new MultiLineString(linePosition)
})
features.push(lineFeature)
```

#### 定时绘制点与连线

```js
setTimeCreatePointLine(points) {  //参数points为点的坐标系信息以及描述
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

        if (index < points.length - 1) {
            let nextPosition = [points[index + 1].lng, points[index + 1].lat];
            let featureLine = new Feature({
                geometry: new LineString([fromLonLat(position), fromLonLat(nextPosition)])
            })
            source.addFeature(featureLine)
        }
        index++;

    }, 200)

    this.map.addLayer(layer)
},
```



### 绘制风圈

根据每个点的坐标来绘制风圈，并删除上一个风圈：

```js
if(points[index].radius7.length!=0||points[index].radius7!=null){
    let featureSolar=this.drawSolar(points[index]);
    if(this.lastFeatureSolar!=null){
        source.removeFeature(this.lastFeatureSolar)
    }
    this.lastFeatureSolar=featureSolar
    source.addFeature(featureSolar)
}
```



使用多边形绘制风圈：

- **Polygon([positionArr1，positionArr2])**【这里接受的参数形式实际上是[[],[]]的形式，第一个数组为外部轮廓，第二个数组为内部挖孔，不传第二个数组则只有一个无挖孔的多边形】

```js
drawSolar(point) {
    let positionArr=[];
    let data_R_arr = point.radius7.split('|').map(k => {
        return parseFloat(k)
    })

    let Configs = {
        data_X: parseFloat(point.lng),
        data_Y: parseFloat(point.lat),
        data_R: {
            "SE": data_R_arr[0]/100,
            "NE": data_R_arr[1]/100,
            "NW": data_R_arr[2]/100,
            "SW": data_R_arr[3]/100
        }
    };

    let _interval = 6
    for (let i = 0; i < 360 / _interval; i++) {
        let r = 0;
        let angle = i * _interval;
        if (angle > 0 && angle <= 90) {
            r = Configs.data_R.NE;
        }
        else if (angle > 90 && angle <= 180) {
            r = Configs.data_R.NW;
        }
        else if (angle > 180 && angle <= 270) {
            r = Configs.data_R.SW;
        }
        else {
            r = Configs.data_R.SE;
        }

        let x = Configs.data_X + r * Math.cos(angle * 3.14 / 180);
        let y = Configs.data_Y + r * Math.sin(angle * 3.14 / 180);

        positionArr.push(fromLonLat([x,y]))
    }


    let feature=new Feature({
        geometry:new Polygon([positionArr])   //这里接受的参数形式实际上是[[],[]]的形式，第一个数组为外部轮廓，第二个数组为内部挖孔，不传则只有一个无挖孔的多边形
    });
    return feature
},
```





### 点击事件以及hover事件

**前置api**：

- **getTargetElement ( ) { HTMLElementy }**: 获取 map实例正在渲染的dom 节点，返回一个element(节点)或者在没有目标的时候返回null
- **forEachFeatureAtPixel ( pixel, callback, opt_options ) { T | undefined}** :在这个像素点遍历所有的feature ,如果有feature执行—个callback



#### ol地图事件

**绑定事件：map.on(type, listener)**

**取消绑定：map.un(type, listener)**

**type:事件类型**

**listener：执行的函数体**

```js
//事件类型
let type = {
    click:'click',//单击
    dblclick:'dblclick',//双击，双击会触发click
    singleclick:'singleclick',//单击，延迟250毫秒，就算双击不会触发
    moveend:'moveend',//鼠标滚动事件
    pointermove:'pointermove',//鼠标移动事件
    pointerdrag:'pointerdrag',//鼠标拖动事件
    precompose:'precompose',//地图准备渲染，为渲染
    postcompose:'postcompose',//地图渲染中
    postrender:'postrender',//地图渲染全部结束
    changeLayerGroup:'change:layerGroup',//地图图层增删时触发
    changeSize:'change:size',//地图窗口发生变化就会触发
    changeTarget:'change:target',//地图绑定的div发生更改时触发
    changeView:'change:view',//地图view对象发生变化触发
    propertychange:'propertychange',//Map对象中任意的property值改变时触发
}
```

通常与**map.forEachFeatureAtPixel(pixel, callback)**搭配使用：

```js
//假如为地图绑定了hover事件，当鼠标划过地图时，可以获取到划过的像素点的信息，其中就有像素点的坐标pixel,此时搭配map.forEachFeatureAtPixel可获取到要素
map.on('click',function(e){
    //屏幕坐标
    let pixel = this.map.getEventPixel(e.originalEvent);
    //检测与视口上的像素相交的要素
    map.forEachFeatureAtPixel(pixel,function(feature,layers){
        //feature,返回的要素
        console.log(feature)
        //layers，返回的图层
        console.log(layers)
    })
})
```
