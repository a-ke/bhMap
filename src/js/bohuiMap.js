/*
 * @Author: a-ke
 * @Date: 2019-02-22 17:25:41
 * @Last Modified by: a-ke
 * @Last Modified time: 2019-02-27 13:53:43
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
    this.container = null; //初始化地图的DOM元素
    this.isOnline = true; //初始化的是离线地图还是在线地图
    this.centerPoint = null; //初始化地图的中心点
    this.zoomLevel = 1; //初始化地图的缩放级别
    this.enableScrollWheelZoom = null; //控制是否开启滚轮缩放的方法
    this.enableKeyboard = null; //控制是否开启键盘操作的方法

    this._bmap = null; //百度地图实例化对象
  }

  //地图脚本准备完毕之后的回调
  MapClass.prototype.onScriptReady = function(callback) {
    _event.on('onScriptReady', callback); //执行插件内部的初始化函数
  }

  //地图初始化完成的回调
  MapClass.prototype.onReady = function(callback) {
    _event.on('onReady', callback.bind(this)); //执行外部的回调
  }

  //地图的初始化
  MapClass.prototype.init = function() {
    var el = this.container;
    var centerPoint = this.centerPoint;
    var zoom = this.zoomLevel;

    this._bmap = new BMap.Map(el);
    this.enableScrollWheelZoom = this._bmap.enableScrollWheelZoom.bind(this._bmap);
    this.enableKeyboard = this._bmap.enableKeyboard.bind(this._bmap);

    this._bmap.centerAndZoom(new BMap.Point(centerPoint[0], centerPoint[1]), zoom);
    // this._bmap.addControl(new BMap.NavigationControl());

    _event.emit('onReady');
  }

  //自定义工具栏初始化
  MapClass.prototype.ToolsInit = function() {
    var div = document.createElement('div');
    div.className = "bhMap-tools";
    div.id = "bhMapTools";
    div.oncontextmenu = function(e) {
      e.stopPropagation();
      e.preventDefault();
    };
    var html =
      '<span class="move">\
        <i class="iconfont bhMap-icon-shouzhi"></i>移动\
      </span>\
      <span class="ranging">\
        <i class="iconfont bhMap-icon-ceju"></i>测距\
      </span>\
      <span class="mark">\
        <i class="iconfont bhMap-icon-weizhibiaoji"></i>标记\
      </span>\
      <span class="area">\
        <i class="iconfont bhMap-icon-zerenfanwei"></i>范围\
      </span>\
      <span class="way">\
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
  }

  //控制是否开启工具条，默认关闭
  MapClass.prototype.enableMapTools = function(flag, options) {
    var toolsEle = document.getElementById('bhMapTools');
    if (flag === undefined) {
      flag = true;
    }
    if (flag) {
      //开启工具条
      if (!toolsEle) {
        this.ToolsInit();
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

  //工具条的配置
  MapClass.prototype.setMapTools = function(options) {
    if (!options) {
      throw new Error('工具条的设置参数错误');
    }

  }

  //渲染地图
  MapClass.prototype.render = function(options) {
    if (options === undefined || options === null) {
      options = {};
    }
    if (!isObject(options)) {
      throw new Error("options must be an object");
    }
    this.container = options.container;
    this.centerPoint = setDefaultValue(options.centerPoint, [116.404, 39.915]);
    this.zoomLevel = setDefaultValue(options.zoomLevel, 11);

    this.onScriptReady(this.init.bind(this));

    // 等待地图脚本都准备完毕
    (function loop() {
      if (isScriptReady()) {
        _event.emit('onScriptReady');
        return;
      }
      setTimeout(loop, 300);
    })();
  }


  //导入地图的脚本
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

  //导入地图工具（依赖地图主文件）的脚本
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

  //所有的脚本是否准备好
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

  function init() {
    //插件初始化
    map.loadScript = loadMapMainScript;
    map.render = function(options) {
      var _innerMap = new MapClass();
      _innerMap.render(options);
      return _innerMap;
    };
  }
  init();

})();