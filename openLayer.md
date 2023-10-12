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

# 台风实例

数据可获取 台风路径 网通过控制台获取台风路径数据，之后将数据放置在public下的json文件中(自己创建)，这样可用ajax来请求本地文件来模拟网络请求

## 绘制点

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

## 添加样式(setStyle)

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

## 绘制连线

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

### 定时绘制点与连线

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



## 绘制风圈(多边形)

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

## 准确绘制风圈(canvas)

可以使用ol自带的渲染器结合canvans进行渲染

```js
    drawAccurateSolar(point) {
      let data_R_arr = point.radius7.split('|').map(k => {
        return parseFloat(k)
      })

      let Configs = {
        data_X: parseFloat(point.lng),
        data_Y: parseFloat(point.lat),
        data_R: {
          "SE": data_R_arr[0]* 1100,
          "NE": data_R_arr[1]* 1100,
          "NW": data_R_arr[2]* 1100,
          "SW": data_R_arr[3]* 1100
        }
      };
     
      const circleFeature = new Feature({
        geometry: new Circle(fromLonLat([point.lng, point.lat])),
      });
    
      circleFeature.setStyle(
        new Style({
          renderer(coordinates, state) {   //渲染器通常使用canvas,coordinates：表示要素的几何坐标 ,states是一个对象，具有context：绘图上下文对象、resolution：分辨率。它表示当前地图的分辨率，可以用于计算绘制元素时的距离、大小等，以及其他属性
            let [x, y] = coordinates[0];
            const ctx = state.context;
            ctx.beginPath();
            let count=1;
            for (let i in Configs.data_R) {
              let radius=0.5*Math.PI*count
              let distance=Configs.data_R[i] /state.resolution
              ctx.arc(x,y,distance,radius-0.5*Math.PI,radius);
              count++;
            }
            ctx.fillStyle='rgba(246, 57, 14, 0.3)';
            ctx.fill();
            ctx.closePath();
          }
        })
      )

      circleFeature.set('AccurateSolar',true)
      return   circleFeature;
    },
```



## ol地图事件

**前置api**：

- **getTargetElement ( ) { HTMLElementy }**: 获取 map实例正在渲染的dom 节点，返回一个element(节点)或者在没有目标的时候返回null
- **forEachFeatureAtPixel ( pixel, callback, opt_options ) { T | undefined}** :在这个像素点遍历所有的feature ,如果有feature执行—个callback

### 常用事件

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

### 为地图绑定事件

```js
//划动事件
designHoverOnMap() {
    this.map.on('pointermove', e => {   //为地图绑定滑动事件
        let pixel = e.pixel;
        let feature = this.map.forEachFeatureAtPixel(pixel, (featureData) => { //通过forEachFeatureAtPixel将与该像素相交的要素返回
            return featureData
        })
        if (feature) {  //如果该像素点存在要素
            if (feature.get('featerDataType') == 'pointType') {
                if (this.lastPointStyleFeature != null) {
                    this.lastPointStyleFeature.getStyle().getImage().setRadius(4);
                    this.lastPointStyleFeature.changed()
                }
                this.map.getTargetElement().style.cursor = 'pointer'     //当划过的要点是指定的要素时，修改map的鼠标样式，其他情况下还原
                feature.getStyle().getImage().setRadius(8)       //点要素半径是通过style对象中的image对象设置的，这里也需要逐层获取来设置
                this.lastPointStyleFeature = feature;
                feature.changed();

                let featerData=feature.get('featerData')    //获取要素携带的数据，这里是设置要素时手动添加的属性

                this.toolTipData.lng=featerData.lng;
                this.toolTipData.lat=featerData.lat;
                this.ovlayer.setPosition(feature.geometryChangeKey_.target.flatCoordinates)  //设置叠加层的位置
            } else {
                this.map.getTargetElement().style.cursor = ''
                if (this.lastPointStyleFeature != null) {
                    this.lastPointStyleFeature.getStyle().getImage().setRadius(4);
                    this.lastPointStyleFeature.changed()
                }
                this.ovlayer.setPosition(undefined)
            }
        } else {  //不存在要素
            this.map.getTargetElement().style.cursor = ''
            if (this.lastPointStyleFeature != null) {
                this.lastPointStyleFeature.getStyle().getImage().setRadius(4);
                this.lastPointStyleFeature.changed()
            }
            this.ovlayer.setPosition(undefined)
        }
    })
},

```

### 解绑

```js
//可以使用变量存储绑定的事件
let listenObj= this.map.on('pointermove', e => {})
//之后就可以使用unByKey('事件名')来接触绑定
unByKey('listenObj')
```



## 叠加层(overlay)

可用于信息提示框之类的效果

### 挂载叠加层

```js
<toolTipDialog ref="toolTipDialog" :toolTipData="toolTipData"></toolTipDialog> //这里可用组件设置叠加层效果
//-----------------------------------以上为html--------------------
//挂载叠加层
toolTipDialogFn() {
    this.ovlayer = new Overlay({    // Overlay需要引入
        element: this.$refs.toolTipDialog.$el,  //这里需要获得叠加层的dom对象，在vue中可通过refs获取
        autoPan: {                   
            animation: {                 //设置叠加层的自动平移的效果，用时250毫秒【当叠加层的显示内容超出视图，将会自动平移至可完全显示叠加层的位置】
                duration: 250,
            },
        },
        position:undefined,   //初始位置
    })
    this.map.addOverlay(this.ovlayer)   //将叠加层挂载到地图上
}, 
```

### 设置叠加层数据(set)

==要素本身不携带数据==，因此在生成要素时，需要手动为要素设置属性，用以获取数据。

```js
featurePoint.set('featerData', points[index]) //在前面例子中，使用set为点要素添加 属性和值
//获取到数据后，可通过prop向叠加层传递数据，如：
let featerData=feature.get('featerData')
this.toolTipData.lng=featerData.lng;
this.toolTipData.lat=featerData.lat;
```

### 设置叠加层位置

在划过事件中，当划过的要素确认为需要的要素时，可将该要素的坐标传递设置给叠加层,此时叠加层将会出现在要素位置

```js
this.ovlayer.setPosition(feature.geometryChangeKey_.target.flatCoordinates)  
```



## 交互

### 测距
