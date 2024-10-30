/**
 * @function 表单增强
 * @since v0.0.1
 * @author Malphite
 * @desc
 *
 *  <p>在原有的{@link layui.form.render} 表单刷新渲染方法的前提下,在这个过程中添加更多的渲染机会,实现更多的需求功能</p>
 *  <p>简单原理:</p>
 *  <ul>
 *    <li>使用代理模式替换原有的方法,并在此方法之前和方法之后进行处理;其好处是,没有新增方法,可以降低学习成本</li>
 *    <li>额外使用一个js的object来映射表单,可以通过这个对象来间接控制表单</li>
 *  </ul>
 *
 */
("use strict");
layui.define(["jquery", "lay", "layer"], function (exports) {

  // jquery的初始化
  if (!window.$) window.$ = layui.$;

  /**
   * @const
   * 当前模块的名称
   * @type {string}
   */
  const KEY = "windows";

  /**
   * @const
   * 弹出层最外层dom的id属性的前缀(后面是加上弹出层的index,可以组合查找弹出层的最外层的dom)
   * @type {string}
   */
  const WINDOWS_ID_PREFIX = "layui-layer";

  /**
   * @const
   * 当前弹出层选用的主题样式的class名称
   * @type {string}
   */
  const WINDOWS_THEME_CLASSNAME = "layui-layer-windows";

  /**
   * @private
   * 窗口自增计数
   * @type {number}
   */
  var intervalIndex = 0;

  /**
   * @var
   * 原始的open方法
   * @type {Function}
   */
  var openForever = layui.layer.open;

  /**
   * @var
   * 原始的min方法
   * @type {Function}
   */
  var minForever = layui.layer.min;

  /**
   * @var
   * 原始的restore方法
   * @type {Function}
   */
  var restoreForever = layui.layer.restore;

  /**
   * @method
   * 防抖 - 自定义,不用layui的debounce方法
   * @param isClear
   * - 传入一个函数,则第二个参数是一个配置项;
   * - 传入一个boolean,则代表阻止第二个参数(函数)的执行
   * @param fn  配置项 or 执行函数
   * @description
   * > 配置项:
   * - context 函数执行的上下文
   * - args 回调函数的参数列表
   * - time 防抖时间(单位毫秒)
   */
  function debounce(isClear, fn) {
    if (!handler.isFunction(isClear)) {
      fn._throttleID && clearTimeout(fn._throttleID);
    } else {
      handler.debounce(true, isClear);
      var param = handler.assign({
        context: null,
        args: [],
        time: 300
      }, fn);
      isClear._throttleID = setTimeout(function () {
        isClear.apply(param.context, param.args);
      }, param.time);
    }
  }


  /**
   * @constructor
   * 双向链表节点对象
   * @param {*} key
   * @param {*} value
   */
  function bidirectionalLinkedListNode(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }

  /**
   * @constructor
   * 页面配置项缓存
   * @param {Number} capacity 缓存容量,默认是64
   */
  function lruCache(capacity) {
    if (capacity === void 0) {
      capacity = 64;
    }

    /**
     * @inner
     * 缓存的最大容量
     * @type {Number}
     */
    this.capacity = capacity;

    /**
     * @inner
     * 缓存的当前容量
     * @type {number}
     */
    this.size = 0;

    /**
     * @inner
     * 缓存的内部映射,用来遍历
     */
    this.cache = {};

    /**
     * @inner
     * 伪头部 {@linkplain bidirectionalLinkedListNode 缓存节点}
     * @type {bidirectionalLinkedListNode}
     */
    this.head = new bidirectionalLinkedListNode();

    /**
     * @inner
     * 伪尾部 {@linkplain bidirectionalLinkedListNode 缓存节点}
     * @type {bidirectionalLinkedListNode}
     */
    this.tail = new bidirectionalLinkedListNode();

    /**
     * 将头部的下一个节点设置为伪尾部节点
     */
    this.head.next = this.tail;

    /**
     * 将尾部的上一个节点设置成伪头部节点
     */
    this.tail.prev = this.head;
    /**
     * @method
     * 获取缓存中key所对应的值
     * @param {*} key
     * @returns key - 对应的值
     */
    this.get = function (key) {
      var node = this.cache[key];
      if (!node) return null;
      /**
       * 如果key存在值,先通过hash表进行定位,再移动到头部
       */
      this._moveToHead(node);
      return node.value;
    };

    /**
     * @method
     * 获取缓存中key所对应的值(仅获取,不涉及缓存操作)
     * @param {*} key
     * @returns key - 对应的值
     */
    this.touch = function (key) {
      var node = this.cache[key];
      return node ? node.value : null;
    };

    /**
     * @method
     * 向缓存中放入 key - value
     * @param {*} key
     * @param {*} value
     * @returns tail.value
     * @desc 如果缓存达到容量上限会删除最近最少使用的一项，并返回它所对应的value(改为这个节点)
     * 返回的信息是缓存中删除的项，可以用来提醒删除对应的信息,达到缓存一致的效果
     */
    this.put = function (key, value) {
      var node = this.cache[key];
      if (!node) {
        /**
         * 如果key不存在值,创建一个新的节点
         */
        var newNode = new bidirectionalLinkedListNode(key, value);

        /**
         * 添加进hash表
         * 缓存的内部映射
         */
        this.cache[key] = newNode;

        /**
         * 添加进双向联表的头部
         */
        this._addToHead(newNode);

        /**
         * 当前缓存的容量加一
         */
        this.size++;

        /**
         * 比较当前缓存容量和最大缓存容量
         */
        if (this.size > this.capacity) {
          /**
           * 如果超过容量,删除双向联表的尾部节点
           */
          var tail = this._removeTail();

          /**
           * 删除hash表中对应的项
           * 缓存的内部映射
           */
          delete this.cache[tail.key];

          /**
           * 当前缓存的容量减一
           */
          this.size--;

          /**
           * 返回这个被移除的节点
           */
          return tail;
        }
      } else {

        /**
         * 如果 key 存在
         * 先通过hash表定位,再修改 value
         */
        node.value = value;

        /**
         * 将这个节点移动到头部
         */
        this._moveToHead(node);
      }
    };

    /**
     * @method
     * 通过key删除对应缓存
     * @param {*} key
     * @returns 被删除的节点 or null
     */
    this.remove = function (key) {
      var node = this.cache[key];
      if (node) {
        this._removeNode(node);
        delete this.cache[key];
        this.size--;
      }
      return node;
    };

    this._addToHead = function (node) {
      node.prev = this.head;
      node.next = this.head.next;
      this.head.next.prev = node;
      this.head.next = node;
    };

    this._removeNode = function (node) {
      node.prev.next = node.next;
      node.next.prev = node.prev;
    };

    this._moveToHead = function (node) {
      this._removeNode(node);
      this._addToHead(node);
    };

    this._removeTail = function () {
      var res = this.tail.prev;
      this._removeNode(res);
      return res;
    };
  }

  /**
   * @namespace
   * @public
   * 弹出层相关方法与属性
   */
  let windows = {

    /**
     * @inner 配置项缓存
     * @description
     * > 保存的类似于一个key - value形式的map
     * >> key 可以是点击页面的一个id(可能是字符串)
     * ***
     * >> value 值的可以是一个对象，和页面上面的tab页面控制的id和弹层的属性挂钩
     * >>> 1. index: 是layui弹出层的index
     * >>> 2. key: 窗口的id,就是菜单调用时的key
     */
    cache: new lruCache(),

    /**
     * @inner
     * 事件名称
     */
    eventKey: {

      /**
       * 弹出层执行 [最小化] 操作后的事件回调名称
       */
      min: 'WINDOWS_AFTER_MIN',

      /**
       * 弹出层执行 [恢复] 操作后的事件回调名称
       */
      restore: 'WINDOWS_AFTER_RESTORE',

      /**
       * 弹出层执行参数 [过滤] 操作的事件名称, 过滤掉返回值为false的配置项
       */
      filter: 'WINDOWS_OPTION_FILTER',

      /**
       * 弹出层执行success [成功] 回调函数 之前执行的事件回调名称
       */
      beforeSuccess: 'WINDOWS_SUCCESS_BEFORE',

      /**
       * 弹出层执行success [成功] 回调函数 之后执行的事件回调名称
       */
      afterSuccess: 'WINDOWS_SUCCESS_AFTER',

      /**
       * 弹出层执行end [销毁] 回调函数 之前执行的事件回调名称
       */
      beforeEnd: 'WINDOWS_END_BEFORE',

      /**
       * 弹出层执行end [销毁] 回调函数 之后执行的事件回调名称
       */
      afterEnd: 'WINDOWS_END_AFTER',

      /**
       * [暂停播放]的事件回调名称
       */
      suspend: 'SHIP_PLAYBACK_SUSPEND',


    },

    /**
     * @method
     * 添加事件监听
     * @param type {String}  从 {@linkplain windows.eventKey 事件类型}
     * @param callback 回调函数
     */
    on: function(type, callback){
      return layui.onevent.call(this, KEY, type, callback);
    },

    /**
     * @method
     * 设置主要颜色
     * @param {Number} r 颜色的r值
     * @param {Number} g 颜色的g值
     * @param {Number} b 颜色的b值
     */
    setMainColor: function(r,g,b){
      return windows.setColor('--windows-main-bgColor', r, g, b);
    },

    /**
     * @method
     * 设置颜色
     * @param {String} k css对应的变量名称
     * @param {Number} r 颜色的r值
     * @param {Number} g 颜色的g值
     * @param {Number} b 颜色的b值
     */
    setColor: function(k, r,g,b){
      document.documentElement.style.setProperty(k, `${r}, ${g}, ${b}`);
    },

    /**
     * @method
     * 处理layui弹出层参数
     * @param {Object} deliver 弹层相关参数
     * @param {*} args0 补充参数1 [补充参数;回调函数]
     * @param {*} args1 保留参数,暂不定义
     * @returns
     *  - 新的弹层配置项
     *  - 弹层返回的index值
     */
    open: function(deliver, args0, args1){


      /**
       * @inner
       * 过滤判断
       * @type {boolean}
       * @description
       *  > 以此参数作为下面过滤判断的标准(true.进行参数包装;false.不对参数进行包装,直接返回)
       *  ***
       *  > 符合下面任意一条,该参数取true:
       *  >> - 自定义filter函数的返回值为true
       *  >> - 传入参数中,明确有windows这个配置项,且设置为true
       *
       */
      let filter = layui.event.call(windows, KEY, windows.eventKey.filter , { deliver: deliver ,args0: args0 ,args1: args1 });
      // 特殊处理,只有返回false才能返回false,其它的返回的是null
      if (filter === false) {
        /**
         * 设置窗口的key,作为放入 {@linkplain windows.cache 配置项缓存} 中的key
         */
        if(!deliver.key) deliver.key = 'WINDOWS-' + intervalIndex ++;
      } else {
        return deliver;
      }

      /*  修改弹出层主题  */
      /**
       * > 修改配置项 skin:
       * - 如果没有传入skin配置项的,默认取 {@linkplain WINDOWS_THEME_CLASSNAME 主题样式}
       * - 如果传入了skin配置项的,在它的基础上加上 {@linkplain WINDOWS_THEME_CLASSNAME 主题样式} (方便后面扩展带skin配置项的弹出层)
       */
      deliver.skin = deliver.skin ? (deliver.skin + ' ' + WINDOWS_THEME_CLASSNAME) : WINDOWS_THEME_CLASSNAME;

      /*  修改[成功]回调函数  */
      /**
       * @private
       * 默认的成功回调函数
       */
      var _success = deliver.success;
      var success = function(layero, index, args2){

        /**
         * 执行缓存写入之前的成功回调函数
         */
        layui.event.call(windows, KEY, windows.eventKey.beforeSuccess , { deliver: deliver ,args0: args0 ,args1: args1, field: { layero: layero, index: index, args2: args2} });
        /**
         * 将窗口信息加入缓存中
         */
        var _node = windows.cache.put(deliver.key, {
          key: deliver.key,
          index: index,
        });

        /**
         * 判断是否有弹出层需要销毁
         *  - 缓存有上限,达到上前会丢弃一个多余的元素
         *  - 这个丢弃的元素对应的弹出层需要销毁(缓存关联已清除,其它后续处理希望放在end事件里面)
         */
        if (_node) {
          layui.layer.close(_node.value.index);
        }

        /**
         * 执行配置项里面的成功回调
         */
        _success && _success(layero, index, {} ,args2);

        /**
         * 执行缓存写入之后的成功回调函数
         */
        layui.event.call(windows, KEY, windows.eventKey.afterSuccess , { deliver: deliver ,args0: args0 ,args1: args1, field: { layero: layero, index: index, args2: args2, node: _node} });

        /**
         * 加载配置项里面的layui模块
         */
        if(deliver.module){
          /**
           * 判断传入的args0是不是一个回调函数
           * @type {boolean}
           */
          var callbackFlag = layui.type(args0) == 'function';

          if(layui[deliver.module]){
            /**
             * 这个模块已经存在了
             * 判断它的是否拥有有效的run方法
             */
            if(layui[deliver.module] && layui[deliver.module].run && layui.type(layui[deliver.module].run) == 'function' ){
              /**
               * 执行run方法
               */
              layui[deliver.module].run(layero, index, layui.layer, callbackFlag ? null : args0);
              /**
               * 如果传入的是回调函数就执行这个回调函数
               */
              callbackFlag && args0.call(layui[deliver.module]);
            }
          }else{
            /**
             * 这个模块不存在
             * 调用use方法加载
             */
            layui.use(deliver.module, function(){
              /**
               * 判断它的是否拥有有效的run方法
               */
              if(layui[deliver.module] && layui[deliver.module].run && layui.type(layui[deliver.module].run) == 'function'){
                /**
                 * 执行run方法
                 */
                layui[deliver.module].run(layero, index, layui.layer, callbackFlag ? null : args0);
                /**
                 * 如果传入的是回调函数就执行这个回调函数
                 */
                callbackFlag && args0.call(layui[deliver.module]);
              }
            });
          }
        }
      };

      deliver.success = success;

      /*  修改[销毁]回调函数  */
      /**
       * @private
       * 默认的销毁回调函数
       */
      var _end = deliver.end;

      var end = function(){

        /**
         * 执行缓存删除之前的销毁回调函数
         */
        layui.event.call(windows, KEY, windows.eventKey.beforeEnd , { deliver: deliver ,args0: args0 ,args1: args1 });

        /**
         * 删除缓存
         */
        var _node = windows.cache.remove(deliver.key);

        /**
         * 执行配置项里面的销毁回调
         */
        _end && _end();

        /**
         * 执行缓存删除之后的销毁回调函数
         */
        layui.event.call(windows, KEY, windows.eventKey.afterEnd , { deliver: deliver ,args0: args0 ,args1: args1 , node: _node});

        /**
         * 加载配置项里面的layui模块
         */
        if(deliver.module){
          if(layui[deliver.module]){
            /**
             * 这个模块已经存在了
             * 判断它的是否拥有有效的destroy方法
             */
            if(layui[deliver.module] && layui[deliver.module].destroy && layui.type(layui[deliver.module].destroy) == 'function' )
              layui[deliver.module].destroy();
          }else{
            /**
             * 这个模块不存在
             * 调用use方法加载
             */
            layui.use(deliver.module, function(){
              /**
               * 判断它的是否拥有有效的destroy方法
               */
              if(layui[deliver.module] && layui[deliver.module].destroy && layui.type(layui[deliver.module].destroy) == 'function' )
                layui[deliver.module].destroy();
            });
          }
        }
      };

      deliver.end = end;

      /*  修改[更新]回调函数  */
      var _resizing = deliver.resizing;

      var resizing = function resizing(layero) {
        /**
         * 执行默认的回调函数
         */
        _resizing && _resizing(layero);

        /**
         * 加载配置项里面的layui模块
         */
        if(deliver.module){
          if(layui[deliver.module]){
            /**
             * 这个模块已经存在了
             * 判断它的是否拥有有效的resizing方法
             */
            if(layui[deliver.module] && layui[deliver.module].destroy && layui.type(layui[deliver.module].resizing) == 'function' )
              debounce(layui[deliver.moudle]["resizing"], {context: windows, args: [layero]});
          }else{
            /**
             * 这个模块不存在
             * 调用use方法加载
             */
            layui.use(deliver.module, function(){
              /**
               * 判断它的是否拥有有效的resizing方法
               */
              if(layui[deliver.module] && layui[deliver.module].destroy && layui.type(layui[deliver.module].resizing) == 'function' )
                debounce(layui[deliver.moudle]["resizing"], {context: windows, args: [layero]});
            });
          }
        }
      };
      deliver.resizing = resizing;

      /**
       * 返回包装后的配置项
       */
      return deliver;

    },

  };


  /**
   * 修改原来的open方法
   * @param deliver
   * @param args0
   * @param args1
   * @returns {*}
   */
  layui.layer.open = function (deliver, args0, args1) {
    /**
     * 调用方法处理参数
     */
    var tempResult = windows.open(deliver, args0, args1);

    /**
     * - 如果返回数字说明弹窗被打开直接返回窗口的index值
     * - 如果返回配置项,就直接调用原来的方法返回
     */
    return /^\d+$/.test(String(tempResult)) ? tempResult : openForever(tempResult);
  };


  /**
   * 修改原来的min方法
   * @param index
   * @returns {*}
   */
  layui.layer.min = function (index) {
    /**
     * 先调用方法执行最小化操作
     */
    var res = minForever(index);
    if (res !== false)
      layui.event.call(windows, KEY , windows.eventKey.min , {value: index});
    return res;
  };

  /**
   * 修改原来的restore方法
   * @param index
   */
  layui.layer.restore = function (index) {

    /**
     * 判断对应的窗口是否有area属性,没有的情况下去调用会报错
     */
    if ($('#' + WINDOWS_ID_PREFIX + index).attr("area")) {
      restoreForever(index);
      layui.event.call(windows, KEY , windows.eventKey.restore , {value: index});
    }

  };

  exports(KEY, windows);

});
