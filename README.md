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

1. `bh.map.loadScript({isOnline, sourceRoot}, urlList)`

参数 | 类型 | 说明 | 必选
-- | -- | -- | --
isOnline | boolean | 加载在线地图还是离线地图 | 是
sourceRoot | string | 离线地图资源的根目录路径（当设置为离线地图时，该值是必须的） | 否
urlList | array | 地图工具脚本的路径(如鼠标绘制工具库等) | 否

2. `bh.map.render(options)`

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
options | object | 初始化地图时的一些参数 | 是 | -
options.container | string | 地图初始化的DOM元素的id | 是 | -
options.centerPoint | array | 地图的中心点，第一个值是经度，第二个值是纬度（默认值为天安的经纬度） | 否 | [116.404, 39.915]
options.zoomLevel | number | 地图初始化的缩放级别（1~19）| 否 | 11

返回值是地图的实例化对象，比如叫：myMap

3. `myMap.enableScrollWheelZoom(flag)`

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
flag | boolean | 是否开启鼠标滚轮操作地图缩放 | 否 | true

4. `myMap.enableKeyboard(flag)`

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
flag | boolean | 是否开启键盘操作 | 否 | true

5. `myMap.enableMapTools(flag, options)`

参数 | 类型 | 说明 | 必选 | 默认值
-- | -- | -- | -- | --
flag | boolean | 是否开启自定义工具条 | 是 | -
