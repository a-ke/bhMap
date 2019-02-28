/*
 * @Author: a-ke
 * @Date: 2019-02-22 17:25:41
 * @Last Modified by: a-ke
 * @Last Modified time: 2019-02-28 13:15:30
 * 插件说明：对百度地图进行了二次封装
 * 文档说明见项目根目录下的README.md文件
 */
var bhLib = window.bhLib = bhLib || {}; //创建命名空间
(function () {
  var dom = bhLib.dom = bhLib.dom || {};
  var map = bhLib.map = bhLib.map || {};
  var BMapScriptLoaded = false; //百度地图的主脚本是否加载完毕
  var BMapToolsScriptLoaded = {}; //百度地图工具脚本是否加载完毕
  var _event = new Event(); //事件实例

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
  var isArray = function(param) {
    return '[object Array]' === Object.prototype.toString.call(param);
  }

  /**
   * 设置变量的默认值
   * @param {*} value
   * @param {*} def
   * @return {*} 返回最终值
   */
  var setDefaultValue = function(value, def) {
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
  Event.prototype.on = function(e, callback) {
    this._eventMap[e] || (this._eventMap[e] = []);
    this._eventMap[e].push(callback);
  }

  /**
   * 触发相应的事件
   * @param {String} e 事件名称
   */
  Event.prototype.emit = function(e) {
    try {
      for (var i = 0, handle; handle = this._eventMap[e][i]; i++) {
        handle();
      }
    } catch (error) {
    }
  }

  /**
   * *******************
   * 发布订阅模式定义(end)
   * *******************
   */


  //地图的类
  function MapClass() {
    this.container = null; //初始化地图的DOM元素
    this.isOnline = true; //初始化的是离线地图还是在线地图
    this.centerPoint = null; //初始化地图的中心点
    this.zoomLevel = 1; //初始化地图的缩放级别
    this.maxZoom = 19; //地图的最大缩放级别
    this.minZoom = 1; //地图的最小缩放级别
    this.enableScrollWheelZoom = null; //控制是否开启滚轮缩放的方法
    this.enableKeyboard = null; //控制是否开启键盘操作的方法
    this.markerMap = {}; //地图中所有的标注点的集合

    this._bmap = null; //百度地图实例化对象
    this._defaultCursor = null; //地图的默认鼠标样式
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
  }

  //地图脚本准备完毕之后的回调
  MapClass.prototype._onScriptReady = function(callback) {
    _event.on('onScriptReady', callback); //执行插件内部的初始化函数
  }

  //地图初始化完成的回调
  MapClass.prototype.onReady = function(callback) {
    _event.on('onReady', callback.bind(this)); //执行外部的回调
  }

  /**
   * @desc 地图的初始化方法
   */
  MapClass.prototype._init = function() {
    var el = this.container;
    var centerPoint = this.centerPoint;
    var zoom = this.zoomLevel;

    this._bmap = new BMap.Map(el);
    this._bmap.setMaxZoom(this.maxZoom);
    this._bmap.setMinZoom(this.minZoom);
    this.enableScrollWheelZoom = this._bmap.enableScrollWheelZoom.bind(this._bmap);
    this.enableKeyboard = this._bmap.enableKeyboard.bind(this._bmap);
    this._defaultCursor = this._bmap.getDefaultCursor();

    this._bmap.centerAndZoom(new BMap.Point(centerPoint[0], centerPoint[1]), zoom);
    // this._bmap.addControl(new BMap.NavigationControl());

    this._drawManagerInit();
    _event.emit('onReady');
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
  MapClass.prototype._toolsInit = function() {
    var div = document.createElement('div');
    div.className = "bhMap-tools";
    div.id = "bhMapTools";
    div.oncontextmenu = function(e) {
      e.stopPropagation();
      e.preventDefault();
    };
    var html =
      '<span id="bhMapToolsMove" class="move">\
        <i class="iconfont bhMap-icon-shouzhi"></i>移动\
      </span>\
      <span id="bhMapToolsRanging" class="ranging">\
        <i class="iconfont bhMap-icon-ceju"></i>测距\
      </span>\
      <span id="bhMapToolsMark" class="mark">\
        <i class="iconfont bhMap-icon-weizhibiaoji"></i>标记\
      </span>\
      <span id="bhMapToolsArea" class="area">\
        <i class="iconfont bhMap-icon-zerenfanwei"></i>范围\
      </span>\
      <span id="bhMapToolsPolyline" class="way">\
        <i class="iconfont bhMap-icon-icon-xian"></i>路线\
      </span>';
    var mapBox = document.getElementById(this.container);
    var link = document.createElement('link');
    var fontLink = document.createElement('link');
    link.rel = "stylesheet";
    link.href = "./css/bohuiMap.css";
    fontLink.rel = "stylesheet";
    fontLink.href = "./font/iconfont.css";

    document.head.appendChild(link);
    document.head.appendChild(fontLink);
    div.innerHTML = html;
    mapBox.appendChild(div);
    this._toolsEventInit();
  }

  /**
   * @desc 控制是否开启工具条，默认关闭
   */
  MapClass.prototype.enableMapTools = function(flag, options) {
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
  MapClass.prototype.setMapTools = function(options) {
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
  MapClass.prototype._toolsEventInit = function() {
    var that = this;
    var polylineBtn = document.getElementById("bhMapToolsPolyline");
    var circleFilterBtn = document.getElementById("bhMapToolsArea");
    var rangingBtn = document.getElementById("bhMapToolsRanging");
    var markBtn = document.getElementById("bhMapToolsMark");
    var moveBtn = document.getElementById("bhMapToolsMove");
    polylineBtn.addEventListener('click', function() {
      that.enableDrawPolyLine();
    });
    circleFilterBtn.addEventListener('click', function() {
      that.enableCircleFilter();
    });
    rangingBtn.addEventListener('click', function() {
      that.enableRanging();
    });
    markBtn.addEventListener('click', function() {
      that.enableMark();
    });
    moveBtn.addEventListener('click', function() {
      that._drawingManagerObject.close();
    });
  }

  /**
   * @desc 鼠标绘制工具初始化
   */
  MapClass.prototype._drawManagerInit = function() {
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

    this._drawingManagerObject.addEventListener("polylinecomplete", function(overlay) {
      //画线完成后的回调
      that._drawingManagerObject.close();
      var pointArr = overlay.getPath();
      var pois = [];
      that._bmap.removeOverlay(overlay);
      pointArr.forEach(current => {
        pois.push(new BMap.Point(current.lng, current.lat));
      });
      var polyline = new BMap.Polyline(pois, that._polylineOptions);
      that._bmap.addOverlay(polyline);
      //创建右键菜单
      var removePolyline = function(e, ee, polyline) {
        that._bmap.removeOverlay(polyline);
      };
      var polylineMenu = new BMap.ContextMenu();
      polylineMenu.addItem(
        new BMap.MenuItem("删除", removePolyline.bind(polyline))
      );
      polyline.addContextMenu(polylineMenu);
    });
  }

  /**
   * @desc 开启折线的绘制
   */
  MapClass.prototype.enableDrawPolyLine = function() {
    this._drawingManagerObject.open();
    this._drawingManagerObject.setDrawingMode(BMAP_DRAWING_POLYLINE);
  }

  /**
   * @desc 开启圆形区域过滤
   */
  MapClass.prototype.enableCircleFilter = function() {
    var that = this;
    this._bmap.enableDragging();
    this._bmap.enableScrollWheelZoom();
    this._drawingManagerObject.close();
    this._drawingManagerObject.open();
    this._drawingManagerObject.setDrawingMode(BMAP_DRAWING_CIRCLE);

    this._bmap.removeOverlay(this._filterCircle.label);
    this._bmap.removeOverlay(this._filterCircle.circle);
    this._bmap.getOverlays().map(function(item) {
      item.show();
    });

    var myLabel = new BMap.Label();
    myLabel.setOffset(new BMap.Size(10, -6));

    BMapLib.EventWrapper.addListenerOnce(this._drawingManagerObject, 'circlecomplete', function(e, circle) {
      that._filterCircle.circle = circle;
      var radius = circle.getRadius();
      var r = radius.toFixed(2);
      var center = circle.getCenter();
      // 控制圆内的点
      var overlays = that._bmap.getOverlays();
      // vm.circle = overlays;
      overlays.map(function(item) {
        let distance = that._bmap.getDistance(item.point, center);
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
      circle.addEventListener("lineupdate", function(e) {
        radius = circle.getRadius();
        r = radius.toFixed(2);
        center = circle.getCenter();
        bounds = circle.getBounds().getNorthEast();
        point = new BMap.Point(bounds.lng, center.lat);
        myLabel.setContent(r + "m");
        myLabel.setPosition(point);

        var overlays = that._bmap.getOverlays();
        overlays.map(item => {
          let distance = that._bmap.getDistance(item.point, center);
          if (distance > radius) {
            item.hide();
          } else {
            item.show();
          }
        });
      });

      //创建右键菜单
      var removeCircle = function(e, ee, circle) {
        circle.disableEditing();
        that._bmap.removeOverlay(circle);
        that._bmap.removeOverlay(myLabel);
        overlays.map(function(item) {
          item.show();
        });
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
   * @desc 开启测距功能
   */
  MapClass.prototype.enableRanging = function() {
    this._drawingManagerObject.close();
    var myDis = new BMapLib.DistanceTool(this._bmap);
    myDis.open(); //开启鼠标测距
  }

  /**
   * @desc 开启标点功能
   */
  MapClass.prototype.enableMark = function() {
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
  MapClass.prototype.createMarker = function(point) {
    if (!point || !point.id) {
      throw new Error('创建标记的参数不正确');
    }
    var labelFlag = point.label ? true : false; //是否需要加载label
    var pt = new BMap.Point(point.lng, point.lat);
    var marker = null;
    if (labelFlag) {
      var titleLabel = new BMap.Label(point.label.content, {
        position: pt
      });
    }
    if (point.icon) {
      var width = setDefaultValue(point.icon.width, 19);
      var height = setDefaultValue(point.icon.height, 25);
      var icon = new BMap.Icon(point.icon.url, new BMap.Size(width, height));
      marker = new BMap.Marker(pt, { icon });
      labelFlag && titleLabel.setOffset(new BMap.Size(0, height));
    } else {
      marker = new BMap.Marker(pt);
      labelFlag && titleLabel.setOffset(new BMap.Size(0, 25));
    }
    labelFlag && point.label.style && titleLabel.setStyle(point.label.style);
    labelFlag && marker.setLabel(titleLabel);

    this.markerMap[point.id] = marker;
    this._bmap.addOverlay(marker);

    return marker;
  }

  /**
   * @desc 创建折线
   * @param {Object} line {list: [{lng: 116, lat:39}], options: {strokeColor: "#333", strokeWeight: '8', strokeOpacity: 0.8}}
   * @returns {Object} polyline值
   */
  MapClass.prototype.createPolyline = function(line) {
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
    line.list.forEach(current => {
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
   * @desc 渲染地图
   */
  MapClass.prototype._render = function(options) {
    if (options === undefined || options === null) {
      options = {};
    }
    if (!isObject(options)) {
      throw new Error("options must be an object");
    }
    this.container = options.container;
    this.centerPoint = setDefaultValue(options.centerPoint, [116.404, 39.915]);
    this.zoomLevel = setDefaultValue(options.zoomLevel, 11);
    this.maxZoom = setDefaultValue(options.maxZoom, 19);
    this.minZoom = setDefaultValue(options.minZoom, 11);

    this._onScriptReady(this._init.bind(this));

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
   * @desc 加载地图的主脚本
   * @param {Object} options 加载在线地图还是离线地图
   * @param {Array} toolsList 加载地图的工具库脚本
   */
  function loadMapMainScript (options, toolsList) {
    loadToolsScript(toolsList); //加载工具脚本
    if (options.isOnline) {
      window.BMap_loadScriptTime = (new Date).getTime();
      dom.loadScript('http://api.map.baidu.com/getscript?v=2.0&ak='+options.ak, function() {
        BMapScriptLoaded = true;
        _event.emit('mapMainScriptLoaded'); //加载工具脚本
      });
    } else {
      if (options.sourceRoot === undefined) {
        throw new Error("离线地图需要传入sourceRoot");
      }
      window.mapSourceRoot = options.sourceRoot;
      dom.loadScript(options.sourceRoot+'/map_load.js', function() {
        BMapScriptLoaded = true;
        _event.emit('mapMainScriptLoaded'); //加载工具脚本
      });
    }
  }

  /**
   * @desc 导入地图工具(依赖地图主脚本)的脚本
   * @param {Array} urlList
   */
  function loadToolsScript (urlList) {
    _event.on('mapMainScriptLoaded', function() {
      for (var i = 0, len = urlList.length; i < len; i++) {
        var current = urlList[i];
        BMapToolsScriptLoaded[current] = false;
        (function(current) {
          dom.loadScript(current, function() {
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
    map.render = function(options) {
      var _innerMap = new MapClass();
      _innerMap._render(options);
      return _innerMap;
    };
  }
  init();

})();