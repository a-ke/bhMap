# 博汇地图js库说明文档
> 作者：a-ke<br/>
> 本js库依赖于百度地图库

## 安装说明
1. 引入js文件
```js
<script src="/dist/js/bohuiMap.min.js"></script>
```
2. 如果使用离线地图，则需要将本项目中的offlinemap文件夹部署到web服务器上，同时将下载好的地图瓦片数据放到offlinemap文件夹下的tiles或tiles_hybrid或tiles_self里。
    - tiles：标准版的瓦片
    - tiles_hybrid：卫星图瓦片
    - tiles_self: 自定义瓦片

## 使用说明
备注： 使用案例见dist目录下的demo.html

1. bh.map.loadScript({isOnline, sourceRoot}, urlList)
设置加载在线地图还是离线地图，同时加载必要的脚本文件

参数 | 类型 | 说明 | 必选
-- | -- | -- | --
isOnline | boolean | 加载在线地图还是离线地图 | 是
sourceRoot | string | 离线地图资源的根目录路径（当设置为离线地图时，该值是必须的） | 否
urlList | array | 地图工具脚本的路径(如鼠标绘制工具库等) | 否

例如：
```js
bhLib.map.loadScript({
  isOnline: true,
  // sourceRoot: '../offlinemap/',
  ak: "f1f0cc97a81b411aa64b614d22b42420"
}, [
  '../offlinemap/tools/DrawingManager_min.js',
  '../offlinemap/tools/DistanceTool_min.js',
  '../offlinemap/tools/EventWrapper.min.js'
]);
```

2. bh.map.render(options)
渲染地图的函数，options是地图初始化的基本参数

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
options | object | 初始化地图时的一些参数 | 是 | -
options.container | string | 地图初始化的DOM元素的id | 是 | -
options.centerPoint | array | 地图的中心点，第一个值是经度，第二个值是纬度（默认值为天安的经纬度） | 否 | [116.404, 39.915]
options.zoomLevel | number | 地图初始化的缩放级别（1~19）| 否 | 11

返回值是地图的实例化对象，比如叫：myMap

例如：
```js
var myMap = bhLib.map.render({
  container: 'mapDemo',
  centerPoint: [116.404, 39.915],
  zoomLevel: 13
});
```
3. myMap.onReady(callback)
地图初始化完成的回调函数

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
callback | Function | 地图初始化完成后的回调函数 | 是 | -

4. myMap.enableScrollWheelZoom(flag)
控制是否开启鼠标滚轮缩放

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
flag | boolean | 是否开启鼠标滚轮操作地图缩放 | 否 | true

5. myMap.enableKeyboard(flag)
控制是否开启键盘操作（上、下、左、右来移动地图）

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
flag | boolean | 是否开启键盘操作 | 否 | true

6. myMap.enableMapTools(flag, options)
控制是否开启地图内置工具条，options是工具条的一些设置

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
flag | boolean | 是否开启内置工具条 | 是 | -
options | Object | 工具条的配置项 | 否 | 详情见内部参数的默认值
options.polylineOptions | Object | 折线的样式 | 否 | 详情见内部参数的默认值
options.polylineOptions.strokeWeight | string | 折线的宽度(单位:px) | 否 | '8'
options.polylineOptions.strokeColor | string | 折线的颜色 | 否 | '#333'
options.polylineOptions.strokeOpacity | number | 折线的透明度 | 否 | 0.8

```js
myMap.enableMapTools(true, {
  polylineOptions: {
    strokeColor: 'red',
    strokeOpacity: 0.2
  }
});
```

7. myMap.setMapTools(options)
设置工具条上功能的配置

参数说明同 enableMapTools(flag, options) 方法中的options一样。

8. myMap.createMarker(param)
创建标记点

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
param | Object | 标点的信息 | 是 | -
param. id | String或者Number | 标点的唯一标识 | 是 | -
param.lng | Number | 标点的经度 | 是 | -
param.lat | Number | 标点的纬度 | 是 | -
param.icon | Object | 标点的图标信息 | 否 | null
param.icon.url | String | 标点图标的图片地址 | 是 | -
param.icon.width | Number | 标点图标的宽度（单位:px） | 否 | 19
param.icon.height | Number | 标点图标的高度（单位:px） | 否 | 25
param.label | Object | 标点的标题信息 | 否 | null
param.label.content | String | 标点标题的文字 | 是 | -
param.label.style | Object | 标点标题的样式 | 否 | -

```js
myMap.createMarker({
  id: '1',
  lng: '116.394415',
  lat: '39.928411',
  icon: {
    url: '../offlinemap/images/Mario.png',
    width: 32,
    height: 32
  },
  label: {
    content: '测试',
    style: {
      border: 'none',
      background: 'transparent'
    }
  }
});
```

9. myMap.createPolyline(line)
创建折线

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
line | Object | 折线的信息 | 是 | -
line.list | Array | 折线的点数组 | 是 | -
line.list[i].lng | Number | 经度 | 是 | -
line.list[i].lat | Number | 纬度 | 是 | -
line.options | Object | 线条的设置项 | 否 | -
line.options.strokeColor | String | 线条的颜色 | 否 | '#333'
line.options.strokeWeight | String | 线条的粗细 | 否 | '8'
line.options.strokeOpacity | Number | 线条的透明度 | 否 | 0.8

```js
myMap.createPolyline({
  list: [{lng: 116.296778, lat: 39.951073}, {lng: 116.377266, lat: 39.941337}, {lng: 116.358294, lat: 39.888431}],
  options: {
    strokeColor: 'red',
    strokeWeight: '8',
    strokeOpacity: 0.3
  }
});
```
