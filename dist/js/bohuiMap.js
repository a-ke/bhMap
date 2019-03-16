/*
 * @Author: a-ke
 * @Date: 2019-02-22 17:25:41
 * @Last Modified by: a-ke
 * @Last Modified time: 2019-03-16 12:44:27
 * 插件说明：对百度地图进行了二次封装
 * 文档说明见项目根目录下的README.md文件
 */
var bhLib = window.bhLib = bhLib || {}; //创建命名空间
(function () {
  var dom = bhLib.dom = bhLib.dom || {};
  var map = bhLib.map = bhLib.map || {};
  var BMapScriptLoaded = false; //百度地图的主脚本是否加载完毕
  var BMapToolsScriptLoaded = {}; //百度地图工具脚本是否加载完毕
  var _event = map._event = new Event(); //事件实例
  var isOnline = true;

  //获取正在执行的js路径
  var scripts = document.getElementsByTagName("script");
  var JS__FILE__ = scripts[scripts.length - 1].getAttribute("src");
  var jsDir = JS__FILE__.substr(0, JS__FILE__.lastIndexOf("/") + 1)


  /**
   * 判断给定的参数是否为对象
   * @param {*} param
   * @return {boolean} 如果是对象返回true，否则返回false
   */
  var isObject = function (param) {
    return '[object Object]' === Object.prototype.toString.call(param);
  }

  /**
   * 判断给定的参数是否为数组
   * @param {*} param
   * @return {boolean} 如果是数组返回true，否则返回false
   */
  var isArray = function (param) {
    return '[object Array]' === Object.prototype.toString.call(param);
  }

  /**
   * 设置变量的默认值
   * @param {*} value
   * @param {*} def
   * @return {*} 返回最终值
   */
  var setDefaultValue = function (value, def) {
    return value === undefined ? def : value;
  }

  dom.loadScript = function (url, callback) {
    //动态插入script标签，并且监测是否加载完成
    var script = document.createElement('script');
    if (script.readyState) { // IE
      script.onreadystatechange = function () {
        if (script.readyState === 'loaded' || script.readyState === 'complete') {
          script.onreadystatechange = null;
          callback();
        }
      }
    } else { // 其他浏览器
      script.onload = function () {
        callback();
      }
    }
    script.src = url;
    document.getElementsByTagName('head')[0].appendChild(script);
  }

  /**
   * *********************
   * 发布订阅模式定义(start)
   * *********************
   */
  //事件类
  function Event() {
    this._eventMap = {}; //保存已注册的事件函数
  }

  /**
   * 注册事件
   * @param {string} e 事件名称
   * @param {Function} callback 事件的回调函数
   */
  Event.prototype.on = function (e, callback) {
    this._eventMap[e] || (this._eventMap[e] = []);
    this._eventMap[e].push(callback);
  }

  /**
   * 解绑事件
   * @param {String} e 事件名称
   * @param {Function} callback 要解绑的事件函数
   */
  Event.prototype.off = function(e, callback) {
    if (!this._eventMap[e]) return;
    var index = this._eventMap[e].indexOf(callback);
    this._eventMap[e].splice(index, 1);
  }

  /**
   * 清空事件的回调
   * @param {String} e 事件名称
   */
  Event.prototype.clean = function(e) {
    if (!this._eventMap[e]) return;
    delete this._eventMap[e];
  }

  /**
   * 触发相应的事件
   * @param {String} e 事件名称
   */
  Event.prototype.emit = function (e) {
    try {
      if (!this._eventMap[e]) return;
      var temp = Array.prototype.slice.call(arguments, 1);
      for (var i = 0, handle; handle = this._eventMap[e][i]; i++) {
        // handle();
        handle.apply(null, temp);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * *******************
   * 发布订阅模式定义(end)
   * *******************
   */

  // ********************* 重写聚合点的类(start) ***************

  function rewriteCluster() {
    /**
     * 获取一个扩展的视图范围，把上下左右都扩大一样的像素值。
     * @param {Map} map BMap.Map的实例化对象
     * @param {BMap.Bounds} bounds BMap.Bounds的实例化对象
     * @param {Number} gridSize 要扩大的像素值
     *
     * @return {BMap.Bounds} 返回扩大后的视图范围。
     */
    var getExtendedBounds = function (map, bounds, gridSize) {
      bounds = cutBoundsInRange(bounds);
      var pixelNE = map.pointToPixel(bounds.getNorthEast());
      var pixelSW = map.pointToPixel(bounds.getSouthWest());
      pixelNE.x += gridSize;
      pixelNE.y -= gridSize;
      pixelSW.x -= gridSize;
      pixelSW.y += gridSize;
      var newNE = map.pixelToPoint(pixelNE);
      var newSW = map.pixelToPoint(pixelSW);
      return new BMap.Bounds(newSW, newNE);
    };

    /**
     * 按照百度地图支持的世界范围对bounds进行边界处理
     * @param {BMap.Bounds} bounds BMap.Bounds的实例化对象
     *
     * @return {BMap.Bounds} 返回不越界的视图范围
     */
    var cutBoundsInRange = function (bounds) {
      var maxX = getRange(bounds.getNorthEast().lng, -180, 180);
      var minX = getRange(bounds.getSouthWest().lng, -180, 180);
      var maxY = getRange(bounds.getNorthEast().lat, -74, 74);
      var minY = getRange(bounds.getSouthWest().lat, -74, 74);
      return new BMap.Bounds(new BMap.Point(minX, minY), new BMap.Point(maxX, maxY));
    };

    /**
     * 对单个值进行边界处理。
     * @param {Number} i 要处理的数值
     * @param {Number} min 下边界值
     * @param {Number} max 上边界值
     *
     * @return {Number} 返回不越界的数值
     */
    var getRange = function (i, mix, max) {
      mix && (i = Math.max(i, mix));
      max && (i = Math.min(i, max));
      return i;
    };

    /**
     * @ignore
     * Cluster
     * @class 表示一个聚合对象，该聚合，包含有N个标记，这N个标记组成的范围，并有予以显示在Map上的TextIconOverlay等。
     * @constructor
     * @param {MarkerClusterer} markerClusterer 一个标记聚合器示例。
     */
    function Cluster(markerClusterer) {
      this._markerClusterer = markerClusterer;
      this._map = markerClusterer.getMap();
      this._minClusterSize = markerClusterer.getMinClusterSize();
      this._isAverageCenter = markerClusterer.isAverageCenter();
      this._center = null; //落脚位置
      this._markers = []; //这个Cluster中所包含的markers
      this._gridBounds = null; //以中心点为准，向四边扩大gridSize个像素的范围，也即网格范围
      this._isReal = false; //真的是个聚合

      this._clusterMarker = new BMapLib.TextIconOverlay(this._center, this._markers.length, {
        "styles": this._markerClusterer.getStyles(),
        "clusterImageIndex": this._getImageIndex()
      });
      //this._map.addOverlay(this._clusterMarker);
    }

    /**
     * 获取聚合点的图片在styles中的下标
     */
    Cluster.prototype._getImageIndex = function() {
      var index = 0;
      for(var i = 0, marker; marker = this._markers[i]; i++) {
        if (marker.clusterImageIndex === undefined) marker.clusterImageIndex = 0;
        if (marker.clusterImageIndex > index) {
          index = marker.clusterImageIndex
        }
      }
      return index;
    }

    /**
     * 向该聚合添加一个标记。
     * @param {Marker} marker 要添加的标记。
     * @return 无返回值。
     */
    Cluster.prototype.addMarker = function (marker) {
      if (this.isMarkerInCluster(marker)) {
        return false;
      } //也可用marker.isInCluster判断,外面判断OK，这里基本不会命中

      if (!this._center) {
        this._center = marker.getPosition();
        this.updateGridBounds(); //
      } else {
        if (this._isAverageCenter) {
          var l = this._markers.length + 1;
          var lat = (this._center.lat * (l - 1) + marker.getPosition().lat) / l;
          var lng = (this._center.lng * (l - 1) + marker.getPosition().lng) / l;
          this._center = new BMap.Point(lng, lat);
          this.updateGridBounds();
        } //计算新的Center
      }

      marker.isInCluster = true;
      this._markers.push(marker);

      var len = this._markers.length;
      if (len < this._minClusterSize) {
        this._map.addOverlay(marker);
        //this.updateClusterMarker();
        return true;
      } else if (len === this._minClusterSize) {
        for (var i = 0; i < len; i++) {
          var tmplabel = this._markers[i].getLabel();
          this._markers[i].getMap() && this._map.removeOverlay(this._markers[i]);
          this._markers[i].setLabel(tmplabel);
        }

      }
      this._map.addOverlay(this._clusterMarker);
      this._isReal = true;
      this.updateClusterMarker();
      return true;
    };

    /**
     * 判断一个标记是否在该聚合中。
     * @param {Marker} marker 要判断的标记。
     * @return {Boolean} true或false。
     */
    Cluster.prototype.isMarkerInCluster = function (marker) {
      if (this._markers.indexOf) {
        return this._markers.indexOf(marker) != -1;
      } else {
        for (var i = 0, m; m = this._markers[i]; i++) {
          if (m === marker) {
            return true;
          }
        }
      }
      return false;
    };

    /**
     * 判断一个标记是否在该聚合网格范围中。
     * @param {Marker} marker 要判断的标记。
     * @return {Boolean} true或false。
     */
    Cluster.prototype.isMarkerInClusterBounds = function (marker) {
      return this._gridBounds.containsPoint(marker.getPosition());
    };

    Cluster.prototype.isReal = function (marker) {
      return this._isReal;
    };

    /**
     * 更新该聚合的网格范围。
     * @return 无返回值。
     */
    Cluster.prototype.updateGridBounds = function () {
      var bounds = new BMap.Bounds(this._center, this._center);
      this._gridBounds = getExtendedBounds(this._map, bounds, this._markerClusterer.getGridSize());
    };

    /**
     * 更新该聚合的显示样式，也即TextIconOverlay。
     * @return 无返回值。
     */
    Cluster.prototype.updateClusterMarker = function () {
      if (this._map.getZoom() > this._markerClusterer.getMaxZoom()) {
        this._clusterMarker && this._map.removeOverlay(this._clusterMarker);
        for (var i = 0, marker; marker = this._markers[i]; i++) {
          this._map.addOverlay(marker);
        }
        return;
      }

      if (this._markers.length < this._minClusterSize) {
        this._clusterMarker.hide();
        return;
      }

      this._clusterMarker.setPosition(this._center);

      this._clusterMarker.setText(this._markers.length);

      this._clusterMarker.setImageIndex(this._getImageIndex());
    };

    /**
     * 删除该聚合。
     * @return 无返回值。
     */
    Cluster.prototype.remove = function () {
      for (var i = 0, m; m = this._markers[i]; i++) {
        var tmplabel = this._markers[i].getLabel();
        this._markers[i].getMap() && this._map.removeOverlay(this._markers[i]);
        this._markers[i].setLabel(tmplabel);
      } //清除散的标记点
      this._map.removeOverlay(this._clusterMarker);
      this._markers.length = 0;
      delete this._markers;
    }

    /**
     * 获取该聚合所包含的所有标记的最小外接矩形的范围。
     * @return {BMap.Bounds} 计算出的范围。
     */
    Cluster.prototype.getBounds = function () {
      var bounds = new BMap.Bounds(this._center, this._center);
      for (var i = 0, marker; marker = this._markers[i]; i++) {
        bounds.extend(marker.getPosition());
      }
      return bounds;
    };

    /**
     * 获取该聚合的落脚点。
     * @return {BMap.Point} 该聚合的落脚点。
     */
    Cluster.prototype.getCenter = function () {
      return this._center;
    }

    return Cluster;
  }
  // ********************* 重写聚合点的类(end) ***************

  // ********************* 自定义覆盖物类(start) ***************

  /**
   * @desc 生成自定义覆盖物的类
   */
  function createCustomOverlayClass() {
    function CustomOverlay(map, point, html, offset, zIndex) {
      this._map = map;
      this._point = new BMap.Point(point[0], point[1]);
      this._html = html;
      this._offset = offset || {};
      this.zIndex = zIndex || 0;
    }

    CustomOverlay.prototype = new BMap.Overlay();

    CustomOverlay.prototype.initialize = function() {
      var div = this._div =  document.createElement("div");
      div.style.position = "absolute";
      div.style.zIndex = BMap.Overlay.getZIndex(this._point.lat);
      div.style.minWidth = "20px";
      div.style.minHeight = "20px";
      div.innerHTML = this._html;

      this._map.getPanes().floatPane.appendChild(div);

      this._map.addEventListener('zoomend', this.draw.bind(this));

      return div;
    }

    CustomOverlay.prototype.draw = function() {
      var map = this._map;
      var pixel = map.pointToOverlayPixel(this._point);
      var left = setDefaultValue(this._offset.left, 0);
      var top = setDefaultValue(this._offset.top, -20);
      var transform = setDefaultValue(this._offset.transform, 'translate(-50%, -100%)');
      this._div.style.zIndex = BMap.Overlay.getZIndex(this._point.lat) + this.zIndex * 1000000;
      this._div.style.left = pixel.x + left + "px";
      this._div.style.top = pixel.y + top + "px";
      this._div.style.transform = transform;
    }

    CustomOverlay.prototype.remove = function() {
      this._div.parentElement.removeChild(this._div);
    }

    return CustomOverlay;
  }

  // ********************* 自定义覆盖物类(end) ***************

  //地图的类
  function MapClass() {
    this.container = null; //初始化地图的DOM元素
    this.centerPoint = null; //初始化地图的中心点
    this.zoomLevel = 1; //初始化地图的缩放级别
    this.maxZoom = 19; //地图的最大缩放级别
    this.minZoom = 1; //地图的最小缩放级别
    this.enableScrollWheelZoom = null; //控制是否开启滚轮缩放的方法
    this.enableKeyboard = null; //控制是否开启键盘操作的方法
    this.markerMap = {}; //地图中所有的标注点的集合
    this.markerPointArr = []; //地图上所有的标注点的point数组
    this.markerClusterOptions = null; //点聚合的配置项

    this._bmap = null; //百度地图实例化对象
    this._drawingManagerObject = null; //鼠标绘制库实例化对象
    this._polylineOptions = {
      strokeColor: "#333",
      strokeWeight: "8", //折线的宽度，以像素为单位
      strokeOpacity: 0.8 //折线的透明度，取值范围0 - 1
    }; //地图上绘制的折线样式
    this._filterCircle = {
      circle: null,
      label: null
    }; //保存圆形区域过滤的圆形，保证此圆形的唯一性
    this._markerCluster = null; //点聚合对象
    this._CumtomOverlay = null; //自定义覆盖物类(在脚本加载完毕后初始化)
  }

  //地图脚本准备完毕之后的回调
  MapClass.prototype._onScriptReady = function (callback) {
    try {
      if (isScriptReady()) {
        callback();
      } else {
        _event.on('onScriptReady', callback); //执行插件内部的初始化函数
      }
    } catch (error) {
      throw error;
    }
  }

  //地图初始化完成的回调
  MapClass.prototype.onReady = function (callback) {
    if (this._bmap) {
      callback.call(this);
    } else {
      _event.on('ready', callback.bind(this)); //执行外部的回调
    }
  }

  /**
   * @desc 地图的初始化方法
   */
  MapClass.prototype._init = function () {
    var el = this.container;
    var centerPoint = this.centerPoint;
    var zoom = this.zoomLevel;

    this._bmap = new BMap.Map(el);
    this._bmap.setMaxZoom(this.maxZoom);
    this._bmap.setMinZoom(this.minZoom);
    this.enableScrollWheelZoom = this._bmap.enableScrollWheelZoom.bind(this._bmap);
    this.enableKeyboard = this._bmap.enableKeyboard.bind(this._bmap);

    this._bmap.centerAndZoom(new BMap.Point(centerPoint[0], centerPoint[1]), zoom);
    // var top_right_navigation = new BMap.NavigationControl({anchor: BMAP_ANCHOR_BOTTOM_RIGHT, type: BMAP_NAVIGATION_CONTROL_SMALL});
    // this._bmap.addControl(top_right_navigation);
    // this._bmap.addControl(new BMap.NavigationControl());

    this._CumtomOverlay = createCustomOverlayClass();

    if (this.markerClusterOptions && this.markerClusterOptions.enable) {
      //开启点聚合
      try {
        this._enableMarkerCluster(this.markerClusterOptions.options);
      } catch (error) {
        throw error
      }
    }

    this._drawManagerInit();
    this._navigationControlInit();
    _event.emit('ready');
    _event.clean('ready');
  }

  /**
   * 导航控制栏初始化
   */
  MapClass.prototype._navigationControlInit = function() {
    var div = document.createElement('div');
    div.className = "bhMap-navigation";
    var html =
      '<span id="bhMapBestView" title="最佳视野">\
        <i class="iconfont icon-bhMap-quanjing"></i>\
      </span>\
      <span id="bhMapZoomIn" title="放大一级">\
        <i class="iconfont icon-bhMap-fangda"></i>\
      </span>\
      <span id="bhMapZoomOut" title="缩小一级">\
        <i class="iconfont icon-bhMap-suoxiao"></i>\
      </span>';
    var mapBox = document.getElementById(this.container);
    div.innerHTML = html;
    mapBox.appendChild(div);


    this._navigationControlEventInit();
  }

  /**
   * 导航控制栏事件初始化
   */
  MapClass.prototype._navigationControlEventInit = function() {
    var that = this;
    var bestViewBtn = document.getElementById('bhMapBestView');
    var zoomInBtn = document.getElementById('bhMapZoomIn');
    var zoomOutBtn = document.getElementById('bhMapZoomOut');

    bestViewBtn.addEventListener('click', function() {
      that._bmap.setViewport(that.markerPointArr);
    });

    zoomInBtn.addEventListener('click', function() {
      that._bmap.zoomIn();
    });

    zoomOutBtn.addEventListener('click', function() {
      that._bmap.zoomOut();
    });
  }

  /**
   * **************
   * 自定义工具条开始
   * 以及工具条上工具的方法实现
   * **************
   */

  /**
   * @desc 自定义工具栏初始化
   */
  MapClass.prototype._toolsInit = function () {
    var div = document.createElement('div');
    div.className = "bhMap-tools";
    div.id = "bhMapTools";
    div.oncontextmenu = function (e) {
      e.stopPropagation();
      e.preventDefault();
    };
    var html =
      '<span id="bhMapToolsMove" class="move">\
        <i class="iconfont icon-bhMap-yidong"></i>移动\
      </span>\
      <span id="bhMapToolsRanging" class="ranging">\
        <i class="iconfont icon-bhMap-ceju"></i>测距\
      </span>\
      <span id="bhMapToolsMark" class="mark">\
        <i class="iconfont icon-bhMap-biaoji"></i>标记\
      </span>\
      <span id="bhMapToolsArea" class="area">\
        <i class="iconfont icon-bhMap-fangwei"></i>范围\
      </span>\
      <span id="bhMapToolsPolyline" class="way">\
        <i class="iconfont icon-bhMap-zhexian"></i>折线\
      </span>';
    var mapBox = document.getElementById(this.container);
    div.innerHTML = html;
    mapBox.appendChild(div);
    this._toolsEventInit();
  }

  /**
   * @desc 控制是否开启工具条，默认关闭
   */
  MapClass.prototype.enableMapTools = function (flag, options) {
    var toolsEle = document.getElementById('bhMapTools');
    if (flag) {
      //开启工具条
      if (!toolsEle) {
        this._toolsInit();
      } else {
        toolsEle.style.display = 'block';
      }
    } else {
      //关闭工具条
      if (toolsEle) {
        toolsEle.style.display = 'none';
      }
    }

    if (options) {
      this.setMapTools(options);
    }
  }

  /**
   * @desc 工具条的配置
   */
  MapClass.prototype.setMapTools = function (options) {
    if (!options) {
      throw new Error('工具条的设置参数错误');
    }
    try {
      this._polylineOptions.strokeWeight = setDefaultValue(options.polylineOptions.strokeWeight, this._polylineOptions.strokeWeight);
      this._polylineOptions.strokeColor = setDefaultValue(options.polylineOptions.strokeColor, this._polylineOptions.strokeColor);
      this._polylineOptions.strokeOpacity = setDefaultValue(options.polylineOptions.strokeOpacity, this._polylineOptions.strokeOpacity);
    } catch (error) {
      throw new Error("工具条的设置参数错误");
    }
  }

  /**
   * @desc 自定义工具条上按钮的事件初始化
   */
  MapClass.prototype._toolsEventInit = function () {
    var that = this;
    var polylineBtn = document.getElementById("bhMapToolsPolyline");
    var circleFilterBtn = document.getElementById("bhMapToolsArea");
    var rangingBtn = document.getElementById("bhMapToolsRanging");
    var markBtn = document.getElementById("bhMapToolsMark");
    var moveBtn = document.getElementById("bhMapToolsMove");
    polylineBtn.addEventListener('click', function () {
      that.enableDrawPolyLine();
    });
    circleFilterBtn.addEventListener('click', function () {
      that.enableCircleFilter();
    });
    rangingBtn.addEventListener('click', function () {
      that.enableRanging();
    });
    markBtn.addEventListener('click', function () {
      that.enableMark();
    });
    moveBtn.addEventListener('click', function () {
      that._drawingManagerObject.close();
    });
  }

  /**
   * @desc 鼠标绘制工具初始化
   */
  MapClass.prototype._drawManagerInit = function () {
    var that = this;
    //实例化鼠标绘制对象
    this._drawingManagerObject = new BMapLib.DrawingManager(this._bmap, {
      isOpen: false,
      drawingType: BMAP_DRAWING_CIRCLE,
      enableDrawingTool: false,
      enableCalculate: false,
      circleOptions: {
        fillColor: "blue",
        strokeWeight: 1,
        fillOpacity: 0.3,
        strokeOpacity: 1
      },
      polylineOptions: this._polylineOptions
    });

    this._drawingManagerObject.addEventListener("polylinecomplete", function (overlay) {
      //画线完成后的回调
      that._drawingManagerObject.close();
      var pointArr = overlay.getPath();
      var pois = [];
      that._bmap.removeOverlay(overlay);
      pointArr.forEach(function (current) {
        pois.push(new BMap.Point(current.lng, current.lat));
      });
      var polyline = new BMap.Polyline(pois, that._polylineOptions);
      that._bmap.addOverlay(polyline);
      //创建右键菜单
      var removePolyline = function (e, ee, polyline) {
        that._bmap.removeOverlay(polyline);
      };
      var polylineMenu = new BMap.ContextMenu();
      polylineMenu.addItem(
        new BMap.MenuItem("删除", removePolyline.bind(polyline))
      );
      polyline.addContextMenu(polylineMenu);
    });

    this._drawingManagerObject.addEventListener("markercomplete", function(e, marker) {
      _event.emit("markercomplete", marker);
    });

    this._drawingManagerObject.addEventListener("polylinecomplete", function(polyline) {
      _event.emit("polylinecomplete", polyline);
    });
  }

  /**
   * @desc 开启折线的绘制
   */
  MapClass.prototype.enableDrawPolyLine = function () {
    this._drawingManagerObject.open();
    this._drawingManagerObject.setDrawingMode(BMAP_DRAWING_POLYLINE);
  }

  /**
   * @desc 开启圆形区域过滤
   */
  MapClass.prototype.enableCircleFilter = function () {
    var that = this;
    this._bmap.enableDragging();
    this._bmap.enableScrollWheelZoom();
    this._drawingManagerObject.close();
    this._drawingManagerObject.open();
    this._drawingManagerObject.setDrawingMode(BMAP_DRAWING_CIRCLE);

    this._bmap.removeOverlay(this._filterCircle.label);
    this._bmap.removeOverlay(this._filterCircle.circle);
    this._bmap.getOverlays().map(function (item) {
      if (item instanceof BMap.Label) return;
      item.show();
    });

    var myLabel = new BMap.Label();
    myLabel.setOffset(new BMap.Size(10, -6));

    BMapLib.EventWrapper.addListenerOnce(this._drawingManagerObject, 'circlecomplete', function (e, circle) {
      that._filterCircle.circle = circle;
      var radius = circle.getRadius();
      var r = radius.toFixed(2);
      var center = circle.getCenter();
      // 控制圆内的点
      var overlays = that._bmap.getOverlays();
      // vm.circle = overlays;
      overlays.map(function (item) {
        var point = item.point;
        if (item instanceof BMapLib.TextIconOverlay) {
          point = item._position;
        }
        if (item instanceof BMap.Label) {
          return;
        }
        var distance = that._bmap.getDistance(point, center);
        if (distance > radius) {
          item.hide();
        } else {
          item.show();
        }
      });

      // 设置距离标签
      var bounds = circle.getBounds().getNorthEast();
      var point = new BMap.Point(bounds.lng, center.lat);
      myLabel.setContent(r + "m");
      myLabel.setPosition(point);
      that._filterCircle.label = myLabel;
      that._bmap.addOverlay(myLabel);

      circle.enableEditing();

      // 拖动圆触发
      circle.addEventListener("lineupdate", that._reFilter.bind(that));

      //地图移动结束后重新过滤
      // that._bmap.addEventListener("moveend", that._reFilter.bind(that));
      var moveEnd = BMapLib.EventWrapper.addListener(that._bmap, 'moveend', that._reFilter.bind(that));

      //地图缩放后重新过滤
      // that._bmap.addEventListener("zoomend", that._reFilter.bind(that));
      var zoomEnd = BMapLib.EventWrapper.addListener(that._bmap, 'zoomend', that._reFilter.bind(that));

      //圆形区域删除后删除事件
      circle.addEventListener("remove", function () {
        that._filterCircle.circle = null;
        that._filterCircle.label = null;
        that._bmap.getOverlays().map(function (item) {
          if (item instanceof BMap.Label) return;
          item.show();
        });
        BMapLib.EventWrapper.removeListener(moveEnd);
        BMapLib.EventWrapper.removeListener(zoomEnd);
      });

      //创建右键菜单
      var removeCircle = function (e, ee, circle) {
        circle.disableEditing();
        that._bmap.removeOverlay(circle);
        that._bmap.removeOverlay(myLabel);
      };
      var circleFilterMenu = new BMap.ContextMenu();
      circleFilterMenu.addItem(
        new BMap.MenuItem("删除", removeCircle.bind(circle))
      );
      circle.addContextMenu(circleFilterMenu);

      that._drawingManagerObject.close();
      // this.getAllSourcePoint();
      // this.ptInCircle(overlay.point, overlay.xa);
      that._bmap.panTo(center);
    });
  }

  /**
   * @desc 重新对标点或聚合点进行过滤
   */
  MapClass.prototype._reFilter = function () {
    var that = this;
    try {
      var circle = this._filterCircle.circle;
      var radius = circle.getRadius();
      var r = radius.toFixed(2);
      var center = circle.getCenter();
      var bounds = circle.getBounds().getNorthEast();
      var point = new BMap.Point(bounds.lng, center.lat);
      var myLabel = this._filterCircle.label;
      myLabel.setContent(r + "m");
      myLabel.setPosition(point);

      var overlays = this._bmap.getOverlays();
      overlays.map(function (item) {
        var overlaysPoint = item.point;
        if (item instanceof BMapLib.TextIconOverlay) {
          overlaysPoint = item._position;
        }
        if (item instanceof BMap.Label) {
          return;
        }
        var distance = that._bmap.getDistance(overlaysPoint, center);
        if (distance > radius) {
          item.hide();
        } else {
          item.show();
        }
      });
      myLabel.show();
    } catch (error) {}
  }

  /**
   * @desc 开启测距功能
   */
  MapClass.prototype.enableRanging = function () {
    this._drawingManagerObject.close();
    var myDis = new BMapLib.DistanceTool(this._bmap);
    myDis.open(); //开启鼠标测距
  }

  /**
   * @desc 开启标点功能
   */
  MapClass.prototype.enableMark = function () {
    this._drawingManagerObject.open();
    this._drawingManagerObject.setDrawingMode(BMAP_DRAWING_MARKER);
  }

  /**
   * **************
   * 自定义工具条结束
   * **************
   */

  /**
   * @desc 创建标记
   * @param {Object} point {id: '1', title: 'title', lng: '111', lat: '111'}
   * @returns {Object} Marker值
   */
  MapClass.prototype.createMarker = function (point) {
    if (!point || point.id === undefined || point.id === null) {
      throw new Error('创建标记的参数不正确');
    }
    var labelFlag = point.label ? true : false; //是否需要加载label
    var pt = new BMap.Point(point.lng, point.lat);
    var marker = null;
    this.markerPointArr.push(pt);
    if (labelFlag) {
      var titleLabel = new BMap.Label(point.label.content, {
        position: pt
      });
    }
    if (point.icon) {
      var width = setDefaultValue(point.icon.width, 19);
      var height = setDefaultValue(point.icon.height, 25);
      var icon = new BMap.Icon(point.icon.url, new BMap.Size(width, height));
      marker = new BMap.Marker(pt, {
        icon: icon
      });
      labelFlag && titleLabel.setOffset(new BMap.Size(0, height));
    } else {
      marker = new BMap.Marker(pt);
      labelFlag && titleLabel.setOffset(new BMap.Size(0, 25));
    }
    labelFlag && point.label.style && titleLabel.setStyle(point.label.style);
    labelFlag && marker.setLabel(titleLabel);

    this.markerMap[point.id] = marker;
    if (this._markerCluster) {
      //开启了点聚合
      this._markerCluster.addMarker(marker);
    } else {
      this._bmap.addOverlay(marker);
    }

    return marker;
  }

  /**
   * @desc 创建折线
   * @param {Object} line {list: [{lng: 116, lat:39}], options: {strokeColor: "#333", strokeWeight: '8', strokeOpacity: 0.8}}
   * @returns {Object} polyline值
   */
  MapClass.prototype.createPolyline = function (line) {
    var pois = [];
    var color, weight, opacity;
    try {
      color = setDefaultValue(line.options.strokeColor, '#333');
      weight = setDefaultValue(line.options.strokeWeight, '8');
      opacity = setDefaultValue(line.options.strokeOpacity, 0.8);
    } catch (error) {
      color = '#333';
      weight = '8';
      opacity = 0.8
    }
    line.list.forEach(function (current) {
      pois.push(new BMap.Point(current.lng, current.lat));
    });
    var polyline = new BMap.Polyline(pois, {
      enableEditing: false, //是否启用线编辑，默认为false
      enableClicking: true, //是否响应点击事件，默认为true
      strokeWeight: weight, //折线的宽度，以像素为单位
      strokeOpacity: opacity, //折线的透明度，取值范围0 - 1
      strokeColor: color //折线颜色
    });
    this._bmap.addOverlay(polyline);
    return polyline;
  }

  /**
   * @desc 开启点聚合功能
   * @param {Object} options {markers: [], gridSize: 60, maxZoom: 5, minClusterSize: 2, isAverangeCenter: false, styles: []}
   */
  MapClass.prototype._enableMarkerCluster = function (options) {
    !options && (options = {});
    if (!BMapLib || !BMapLib.MarkerClusterer) {
      throw new Error("缺少MarkerClusterer的js文件");
    }
    if (!BMapLib || !BMapLib.TextIconOverlay) {
      throw new Error("缺少TextIconOverlay的js文件");
    }

    //设置默认值
    this.markerClusterOptions.clickExpand = setDefaultValue(this.markerClusterOptions.clickExpand, true);

    var styles = options.styles;
    if (isArray(styles)) {
      for (var i = 0, current; current = styles[i]; i++) {
        if (isArray(current.size) && current.size.length === 2) {
          current.size = new BMap.Size(current.size[0], current.size[1]);
        }
        if (isArray(current.anchor) && current.anchor.length === 2) {
          current.anchor = new BMap.Size(current.anchor[0], current.anchor[1]);
        }
        if (isArray(current.offset) && current.offset.length === 2) {
          current.offset = new BMap.Size(current.offset[0], current.offset[1]);
        }
      }
    }

    if (!this.markerClusterOptions.clickExpand) {
      this._rewriteTextIconOverlay();
      var Cluster = rewriteCluster();
      this._rewriteMarkerClusterer(Cluster);
    }
    this._markerCluster = new BMapLib.MarkerClusterer(this._bmap, options);
  }

  // ************* 聚合点定制化(start) ***************

  /**
   * @desc 重写TextIconOverlay类的原型上的一些方法，从而实现特殊需求
   */
  MapClass.prototype._rewriteTextIconOverlay = function () {
    try {
      var TextIconOverlay = BMapLib.TextIconOverlay;
      TextIconOverlay.prototype.getStyleByText = function (text, styles) {
        return styles[this._options.clusterImageIndex];
      }

      TextIconOverlay.prototype.setImageIndex = function(index) {
        this._options.clusterImageIndex = index;
        this._updateText();
        this._updateCss();
        this._updatePosition();
      }
    } catch (error) {}
  }

  /**
   * @desc 重写MarkerClusterer类的原型上的一些方法
   */
  MapClass.prototype._rewriteMarkerClusterer = function (Cluster) {
    try {
      var MarkerClusterer = BMapLib.MarkerClusterer;

      /**
       * 根据标记的位置，把它添加到最近的聚合中
       * @param {BMap.Marker} marker 要进行聚合的单个标记
       *
       * @return 无返回值。
       */
      MarkerClusterer.prototype._addToClosestCluster = function (marker) {
        var distance = 4000000;
        var clusterToAddTo = null;
        for (var i = 0, cluster; cluster = this._clusters[i]; i++) {
          var center = cluster.getCenter();
          if (center) {
            var d = this._map.getDistance(center, marker.getPosition());
            if (d < distance) {
              distance = d;
              clusterToAddTo = cluster;
            }
          }
          (function (cluster) {
            cluster._clusterMarker.onclick = function (e) { //在每个聚合点对象的视图对象上绑定事件
              //这样就可以为每一个聚合点绑定点击事件了
              _event.emit('clusterClick', cluster);
              return false;
            };
          })(cluster);
        }

        if (clusterToAddTo && clusterToAddTo.isMarkerInClusterBounds(marker)) {
          clusterToAddTo.addMarker(marker);
        } else {
          var cluster = new Cluster(this);
          cluster.addMarker(marker);
          this._clusters.push(cluster);
        }
      };

      /**
       * 重新生成，比如改变了属性等
       * @return 无返回值
       */
      MarkerClusterer.prototype._redraw = function () {
        this._clearLastClusters();
        this._createClusters();
        for (var i = 0, cluster; cluster = this._clusters[i]; i++) { //遍历所有的聚合点对象
          (function (cluster) {
            cluster._clusterMarker.onclick = function (e) { //在每个聚合点对象的视图对象上绑定事件
              //这样就可以为每一个聚合点绑定点击事件了
              _event.emit('clusterClick', cluster);
              return false;
            };
          })(cluster);
        }
      };

      MarkerClusterer.prototype._removeMarkersFromMap = function () {
        for (var i = 0,
          marker; marker = this._markers[i]; i++) {
          marker.isInCluster = false;
          var tmplabel = marker.getLabel();
          this._map.removeOverlay(marker);
          marker.setLabel(tmplabel)
        }
      };

      MarkerClusterer.prototype._removeMarker = function (marker) {
        var index = indexOf(marker, this._markers);
        if (index === -1) {
          return false
        }
        var tmplabel = marker.getLabel();
        this._map.removeOverlay(marker);
        marker.setLabel(tmplabel);
        this._markers.splice(index, 1);
        return true
      };


    } catch (error) {}
  }

  // ************* 聚合点定制化(end) ***************

  /**
   * @desc 创建自定义覆盖物
   */
  MapClass.prototype.createCustomOverlay = function(point, html, offset, zIndex) {
    var customOverlay = new this._CumtomOverlay(this._bmap, point, html, offset, zIndex);
    this._bmap.addOverlay(customOverlay);
    return customOverlay;
  }

  /**
   * 更换地图的皮肤
   * @param {String} str 在线地图传皮肤的名称，具体名称见http://lbsyun.baidu.com/jsdemo.htm#k0_2
   *                     离线地图传入皮肤瓦片的文件夹名称
   * @returns void
   */
  MapClass.prototype.changeMapStyle = function(str) {
    if (isOnline) {
      this._bmap.setMapStyle({style: str});
    } else {
      var tileLayer = new BMap.TileLayer(); //创建一个地图图层实例
      tileLayer.getTilesUrl = function(tileCoord, zoom) { //向地图返回地图图块的网址
        var x = tileCoord.x;
        var y = tileCoord.y;
        var tdir = offmapcfg.tiles_self.length > 0 ? offmapcfg.tiles_self : offmapcfg.home + str;
        return tdir + '/' + zoom + '/' + x + '/' + y + offmapcfg.imgext;
      }
      this._bmap.addTileLayer(tileLayer);
    }
  }

  /**
   * @desc 自定义事件
   * @param {String} e 事件名称
   * @param {Function} callback 事件触发的回调函数
   * @returns void
   */
  MapClass.prototype.addEventListener = function(e, callback) {
    _event.on(e, callback);
  }

  /**
   * @desc 解除事件绑定
   * @param {String} e 事件名称
   * @param {Function} callback 要解绑的事件回调函数
   *@return void
   */
  MapClass.prototype.removeEventListener = function(e, callback) {
    _event.off(e, callback);
  }

  /**
   * 清空地图上的标记
   * @returns void
   */
  MapClass.prototype.clearMarkers = function() {
    if (this._markerCluster) {
      this._markerCluster.clearMarkers();
    } else {
      for (var key in this.markerMap) {
        this._bmap.removeOverlay(this.markerMap[key]);
      }
    }
    this.markerMap = {};
    this.markerPointArr = [];
  }

  /**
   * 根据创建标点时所传入的id来获取marker
   * @returns Marker
   */
  MapClass.prototype.getMarkerById = function(id) {
    return this.markerMap[id];
  }
  /**
   * @desc 渲染地图
   */
  MapClass.prototype._render = function (options) {
    if (options === undefined || options === null) {
      options = {};
    }
    if (!isObject(options)) {
      throw new Error("reader函数的参数必须是个对象");
    }
    this.container = options.container;
    this.centerPoint = setDefaultValue(options.centerPoint, [116.404, 39.915]);
    this.zoomLevel = setDefaultValue(options.zoomLevel, 11);
    this.maxZoom = setDefaultValue(options.maxZoom, 19);
    this.minZoom = setDefaultValue(options.minZoom, 11);
    this.markerClusterOptions = setDefaultValue(options.markerClusterSetting, null);

    this._onScriptReady(this._init.bind(this));

  }


  /**
   * @desc 加载地图的主脚本
   * @param {Object} options 加载在线地图还是离线地图
   * @param {Array} toolsList 加载地图的工具库脚本
   */
  function loadMapMainScript(options, toolsList) {
    loadToolsScript(toolsList); //加载工具脚本

    var link = document.createElement('link');
    var fontLink = document.createElement('link');
    link.rel = "stylesheet";
    link.href = jsDir + "../css/bohuiMap.css";
    fontLink.rel = "stylesheet";
    fontLink.href = jsDir + "../font/iconfont.css";
    document.head.appendChild(link);
    document.head.appendChild(fontLink);

    if (options.isOnline) {
      window.BMap_loadScriptTime = (new Date).getTime();
      dom.loadScript('http://api.map.baidu.com/getscript?v=2.0&ak=' + options.ak, function () {
        BMapScriptLoaded = true;
        _event.emit('mapMainScriptLoaded'); //加载工具脚本
      });
    } else {
      if (options.sourceRoot === undefined) {
        throw new Error("离线地图需要传入sourceRoot");
      }
      window.mapSourceRoot = options.sourceRoot;
      dom.loadScript(options.sourceRoot + '/map_load.js', function () {
        (function loop() {
          if (offmapcfg.state && offmapcfg.state.indexOf(false) == -1) {
            BMapScriptLoaded = true;
            _event.emit('mapMainScriptLoaded'); //加载工具脚本
            return;
          }
          setTimeout(loop, 300);
        })();
      });
    }
    isOnline = options.isOnline;
    // 等待地图脚本都准备完毕
    (function loop() {
      if (isScriptReady()) {
        _event.emit('onScriptReady');
        return;
      }
      setTimeout(loop, 300);
    })();
  }

  /**
   * @desc 导入地图工具(依赖地图主脚本)的脚本
   * @param {Array} urlList
   */
  function loadToolsScript(urlList) {
    _event.on('mapMainScriptLoaded', function () {
      for (var i = 0, len = urlList.length; i < len; i++) {
        var current = urlList[i];
        BMapToolsScriptLoaded[current] = false;
        (function (current) {
          dom.loadScript(current, function () {
            BMapToolsScriptLoaded[current] = true;
          });
        })(current);
      }
    });
  }

  /**
   * @desc 判断所有的脚本是否准备完毕
   */
  function isScriptReady() {
    var flag = true;
    for (var current in BMapToolsScriptLoaded) {
      //判断所有的工具脚本是否加载完毕
      if (BMapToolsScriptLoaded.hasOwnProperty(current)) {
        if (!BMapToolsScriptLoaded[current]) {
          flag = false;
        }
      }
    }
    return BMapScriptLoaded && flag;
  }

  /**
   * @desc 插件初始化，也是整个插件的入口
   */
  function init() {
    //插件初始化
    map.loadScript = loadMapMainScript;
    map.render = function (options) {
      var _innerMap = new MapClass();
      try {
        _innerMap._render(options);
      } catch (error) {
        throw error;
      }
      return _innerMap;
    };
    map.onAllScriptLoaded = function(callback) {
      _event.on('onScriptReady', callback);
    }
  }
  init();

})();