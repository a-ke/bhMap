/*
 * @Author: a-ke
 * @Date: 2019-02-22 17:25:41
 * @Last Modified by: a-ke
 * @Last Modified time: 2019-02-26 10:58:18
 * 插件说明：对百度地图进行了二次封装
 */
var bhLib = window.bhLib = bhLib || {}; //创建命名空间
(function () {
  bhLib.dom = bhLib.dom || {};
  bhLib.dom.loadScript = function (url, callback) {
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
    document.getElementsTagName('head')[0].appendChild('script');
  }
})();