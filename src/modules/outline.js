
("use strict");
layui.define(["jquery"], function (exports) {

  // jquery的初始化
  if (!window.$) window.$ = layui.$;

  /**
   * body的jq对象
   */
  let $body = $("body");

  /**
   * layui-this 指代大纲指向当前的dom
   * @type {string}
   */
  let THIS = "layui-this";

  let OUTLINE = "layui-outline";

  // 收起的样式 retract
  let RETRACT = "layui-outline-retract";

  let handler = {
    /**
     * @inner 是否绑定过全局事件
     */
    eventflag: false,

    /**
     * 可配置的window
     */
    window: window,

    /**
     * 设置window
     * @param win
     */
    setWindow: function(win){
      handler.window = win;
    },

    /**
     * @inner 渲染调用方法
     */
    render: function(){


      /**
       * @inner 最高层级
       * @type {number}
       * @desc
       *    一般层级是以1、2、3...这种形式来的,但是实际使用时不太会直接使用h1、h2、h3标签而是选用其它标签;为了让始终是1为最高层级
       * 又不用非在lay-options属性中指定层级,这里添加一个标准层级,h标签的数字要减去这个数字才是最终层级。
       *    这个是取第一个遍历到的,没有指定lay-options属性里面的level的h标签的数字
       */
      let baseLevel = 0;

      /**
       * @inner 大纲列表序号
       * @type {number}
       * @desc
       *    给每个dom都加上序号,方便后面操作dom
       */
      let intervalIndex = 0;

      /**
       * @inner 大纲列表缓存
       * @type {*[]}
       * @desc
       *    这里缓存了大纲的一些主要信息: 在滚动时,通过遍历这上面的信息就可以确定哪个项应该被选中
       */
      handler.relationList = [];

      // 当前容器滚动的位置,方便二次渲染的时候确定位置
      var scrollTop = handler.window.scrollTop === undefined ? handler.window.pageYOffset : handler.window.scrollTop || document.documentElement.scrollTop;

      let ulHtml = '';

      document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function (domElement){

        /**
         * 配置项获取规则：
         *    lay-options属性 > dom属性
         *
         *    id(dom的id属性): 该属性决定锚点
         *    title(dom的id属性|dom的内容): 该属性决定大纲上面展示的内容
         *    level(dom的标签级别): 该属性决定在大纲上面的缩进
         *    hot: 该属性决定大纲上面有无小圆点 - default:false
         *    anchor: 该属性决定在大纲上是否生成可点击的a标签  - default:true
         */
        let _opt = {
          id: null,
          title: null,
          level: null,
          hot: false,
          anchor: true,
        }
        // 获取dom的lay-options属性值
        let optionsAttr = domElement.getAttribute("lay-options");
        if(optionsAttr !== undefined) {
          // 处理参数
          let options = optionsAttr ? JSON.parse(String(optionsAttr).replace(/\'/g, () => '"')) : {};
          _opt.id = options.id;
          _opt.title = options.title;
          _opt.level = options.level;
          _opt.hot = options.hot !== undefined ? options.hot : _opt.hot;
          _opt.anchor = options.anchor !== undefined ? options.anchor : _opt.anchor;
        }
        if(!_opt.level && !baseLevel) baseLevel = parseInt(domElement.tagName.substr(1,2));
        // 最后取dom上面的信息
        if(!_opt.id) _opt.id = domElement.getAttribute("id");
        if(!_opt.title) _opt.title = domElement.getAttribute("title") ? domElement.getAttribute("title") : domElement.textContent;
        if(!_opt.level) _opt.level = parseInt(domElement.tagName.substr(1,2)) - baseLevel + 1;
        let rect = domElement.getBoundingClientRect();
        _opt.index = ++ intervalIndex;
        _opt.top = rect.top + scrollTop;
        _opt.height = rect.height;
        // 缓存配置项
        handler.relationList.push(_opt);
        // 根据信息构造dom
        ulHtml += `<li lay-id = "${_opt.index}" ${_opt.level > 1 ? `level="${_opt.level}"`: ``}  >
                    ${_opt.anchor ? `<a _href = "${_opt.id}">${_opt.title}
                                            ${_opt.hot ? `<span class="layui-badge-dot"></span>`:``}
                                    </a>`:`${_opt.title}${_opt.hot ? `<span class="layui-badge-dot"></span>`:``}`}
                 </li>`;
        /*                    ${_opt.anchor ? `<a href = "${_opt.id}">${_opt.title}
                                            ${_opt.hot ? `<span class="layui-badge-dot"></span>`:``}
                                    </a>`:``}*/
//<a href = "#examples" > 综合演示 < span className = "layui-badge-dot" > < /span></a >
          /*var anchorElement = document.querySelectorAll('.anchor');

          // 添加 scroll 事件监听器
          window.addEventListener('scroll', function() {
              // 获取当前滚动位置
              var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          anchorElement.forEach(function(e){  var rect = e.getBoundingClientRect(); if (rect.top <= 5 && (rect.top + rect.height) >= -5) {
                  console.log('滚动到了锚点位置：' + e);
              } })
              // 比较当前滚动位置和锚点位置

          });*/

      });
      /**
       * dom 结构
       *    layui-outline-container  -- 最外层容器,方法查找和插入dom的
       *      - layui-outline-bth  -- 小屏幕时点击打开的按钮
       *      - layui-outline-side -- 放置在右侧的整个区域绝对定位
       *          - layui-outline-side-fixed -- 绝对定位的区域
       *              - layui-outline-side-close -- 关闭的按钮区域
       *              - layui-outline-dir
       *                  - layui-outline-ul -- ul的主题区域
       */
      let html = `
        <div class = "${OUTLINE}-container">
            <button type="button" class="${OUTLINE}-bth layui-btn-sm layui-btn"><i class="layui-icon layui-icon-shrink-right"></i></button>
            <div class="${OUTLINE}-side">
                <div class="${OUTLINE}-side-fixed">
                    <i class="${OUTLINE}-side-close layui-icon layui-icon-spread-left"></i>
                    <div class="${OUTLINE}-dir">
                        <ul class="${OUTLINE}-ul">${ulHtml}</ul>
                    </div>
                </div>
            </div>
        </div>
      `;
      let fitBody = handler.window.getBoundingClientRect ? $(handler.window) : $body;
      // 移除原来的dom
      // $body.find('.layui-outline-ul').remove();
      fitBody.find('.' + OUTLINE + '-container').remove();
      // 添加新生成的dom
      // $body.append($(html));
      fitBody.append($(html));
      // 添加监听事件
      if(!handler.eventflag) handler.addListener();
    },

    /**
     * @function 迭代数组
     * @param {*} arr   需要被迭代的数组
     * @param {Function} cb 回调函数
     * @desc
     *
     *    <p style = "color: #16b777;text-indent: 10px;">遍历数组,直到回调函数返回false或遍历结束</p>
     *    <ul>
     *      <li>遍历传入值,可以接收数组或object对象,其回调函数的参数与之一致</li>
     *      <li>回调函数一旦返回false则遍历结束</li>
     *      <li>这个方法本身不会去修改原来传入的对象,也不会有新的对象返回</li>
     *    </ul>
     */
    every: function(arr, cb){
      for (var key = 0; key < arr.length; key++) {
        if (cb) {
          if (cb(arr[key], key, arr) === false) break;
        }
      }
    },

    /**
     * @inner 将大纲调整至id为传入值的位置
     * @param id
     */
    fix: function(id){
      let index = 0;
      handler.every(handler.relationList, function(option){
        if(option.id == id){
          index = option.index;
          return false;
        }
      });
      return handler.doFix(index);
    },

    /**
     * @inner 将大纲调整至index对应的dom
     * @param index
     */
    doFix: function(index){
      let fitBody = handler.window.getBoundingClientRect ? $(handler.window) : $body;
      fitBody.find('.layui-outline-ul').find('.' + THIS).removeClass(THIS);
      fitBody.find('.layui-outline-ul').find('[lay-id="'+index+'"]').addClass(THIS);
      // $body.find('.layui-outline-ul').find('.' + THIS).removeClass(THIS);
      // $body.find('.layui-outline-ul').find('[lay-id="'+index+'"]').addClass(THIS);
      return false;
    },

    /**
     * @inner 添加监听事件
     */
    addListener: function(){

      // 添加屏幕滚动事件
      handler.window.addEventListener('scroll', function() {

        if(handler.relationList && handler.relationList.length > 0){
          // 定义一个值,来判断那个区域最靠上方
          let minValue = 0;
          // 获取当前滚动位置
          var scrollTop = handler.window.scrollTop === undefined ? handler.window.pageYOffset : handler.window.scrollTop || document.documentElement.scrollTop;
          handler.every(handler.relationList, function(option){
            let topFlag = scrollTop >= option.top - option.height/2;
            let bottomFlag = scrollTop <= option.top + option.height/2;
            if(topFlag && bottomFlag) return handler.doFix(option.index);
            // 判断最小值
            if(!minValue) minValue = Math.abs(scrollTop - option.top);
            if(minValue < Math.abs(scrollTop - option.top)){
              return handler.doFix(option.index - 1);
            }else{
              minValue = Math.abs(scrollTop - option.top);
            }
            return true;
          })
        }
      });

      // 判断,如果传入的handler.window并不是window只是普通的dom,需要考虑它当前的top值,否则定位不够准确
      let _offsetTop = handler.window.getBoundingClientRect ? handler.window.getBoundingClientRect().top : 0;
      let fitBody = handler.window.getBoundingClientRect ? $(handler.window) : $body;

      fitBody
      // $body
        .find("." + OUTLINE + "-container").on('click', '*[_href]', function(){
        let id = $(this).attr("_href");
        if(id && handler.relationList && handler.relationList.length > 0){
          handler.every(handler.relationList, function(option){
            if(option.id == id) {
              handler.window.scrollTo(null, option.top - _offsetTop);
              setTimeout(function (){
                handler.doFix(option.index);
              });
              return false;
            }
            return true;
          })
        }

      });

      // 点击图标收起outline
      fitBody.find("." + OUTLINE + "-container").on('click', '.layui-outline-side-close', function(){
        if(fitBody.find("." + OUTLINE + "-container").hasClass(RETRACT)){
          fitBody.find("." + OUTLINE + "-container").removeClass(RETRACT);
        }else{
          fitBody.find("." + OUTLINE + "-container").addClass(RETRACT);
        }
      });

      // 点击按钮展开outline
      fitBody.find("." + OUTLINE + "-container").on('click', '.layui-outline-bth', function(){
        if(fitBody.find("." + OUTLINE + "-container").hasClass(RETRACT)){
          fitBody.find("." + OUTLINE + "-container").removeClass(RETRACT);
        }else{
          fitBody.find("." + OUTLINE + "-container").addClass(RETRACT);
        }
      });
    },
  };

  exports("outline", handler);
});
