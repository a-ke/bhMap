/*
 * @Author: a-ke
 * @Date: 2019-02-22 17:25:41
 * @Last Modified by: a-ke
 * @Last Modified time: 2019-02-26 17:16:06
 * 插件说明：对百度地图进行了二次封装
 * 文档说明见项目根目录下的README.md文件
 */
var bhLib = window.bhLib = bhLib || {}; //创建命名空间
(function () {
  var dom = bhLib.dom = bhLib.dom || {};
  var map = bhLib.map = bhLib.map || {};
  var _innerMap = null; //插件内部的地图实例化对象

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

  //地图的类
  function MapClass() {
    this.BMapScriptLoaded = false; //百度地图的脚本是否加载完毕
    this.container = null; //初始化地图的DOM元素
    this.isOnline = true; //初始化的是离线地图还是在线地图
    this.sourceRoot = null; //离线地图资源根目录
    this.centerPoint = null; //初始化地图的中心点
    this.zoomLevel = 1; //初始化地图的缩放级别
    this.BMapAK = ''; //在线地图的百度开发者ak码

    this._bmap = null; //百度地图实例化对象
    this._event = new Event(); //事件实例
  }

  //导入地图的脚本
  MapClass.prototype.loadScript = function () {
    var that = this;
    if (this.isOnline) {
      window.BMap_loadScriptTime = (new Date).getTime();
      dom.loadScript('http://api.map.baidu.com/getscript?v=2.0&ak='+this.BMapAK, function() {
        that.BMapScriptLoaded = true;
      });
    } else {
      if (this.sourceRoot === null) {
        throw new Error("离线地图需要传入sourceRoot");
      }
      dom.loadScript(this.sourceRoot+'/map_load.js', function() {
        that.BMapScriptLoaded = true;
      });
    }
  }

  //判断地图是否具备了初始化的条件
  MapClass.prototype.isReady = function() {
    return this.BMapScriptLoaded;
  }

  //地图脚本准备完毕之后的回调
  MapClass.prototype.onReady = function(callback) {
    this._event.on('onReady', this.init.bind(this)); //执行插件内部的初始化函数
    this._event.on('onReady', callback.bind(map)); //执行外部的回调
  }

  //地图的初始化
  MapClass.prototype.init = function() {
    var el = this.container;
    var centerPoint = this.centerPoint;
    var zoom = this.zoomLevel;

    this._bmap = new BMap.Map(el);

    //对外的部分接口
    map._bmap = this._bmap;
    map.enableScrollWheelZoom = this._bmap.enableScrollWheelZoom.bind(this._bmap);
    map.enableKeyboard = this._bmap.enableKeyboard.bind(this._bmap);

    this._bmap.centerAndZoom(new BMap.Point(centerPoint[0], centerPoint[1]), zoom);
    this._bmap.addControl(new BMap.NavigationControl());
  }

  //渲染地图
  MapClass.prototype.render = function(options) {
    var that = this;
    if (options === undefined || options === null) {
      options = {};
    }
    if (!isObject(options)) {
      throw new Error("options must be an object");
    }
    this.container = options.container;
    this.isOnline = setDefaultValue(options.isOnline, true);
    this.sourceRoot = setDefaultValue(options.sourceRoot, null);
    this.centerPoint = setDefaultValue(options.centerPoint, [116.404, 39.915]);
    this.zoomLevel = setDefaultValue(options.zoomLevel, 11);
    this.BMapAK = setDefaultValue(options.BMapAK, null);

    if (this.sourceRoot !== null) {
      //window.mapSourceRoot是为了map_load.js文件使用
      window.mapSourceRoot = this.sourceRoot;
    }

    this.loadScript();

    // 等待地图脚本都准备完毕
    (function loop() {
      if (that.isReady()) {
        that._event.emit('onReady');
        return;
      }
      setTimeout(loop, 300);
    })();
  }


  _innerMap = new MapClass();

  function init() {
    //插件初始化
    //对外暴露的接口
    //剩下的一部分在MapClass原型的init函数里
    map.render = _innerMap.render.bind(_innerMap);
    map.onReady = _innerMap.onReady.bind(_innerMap);
  }
  init();

})();