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
  const $ = layui.jquery;
  if (!window.$) window.$ = layui.$;

  /**
   * @constant
   * 鼠标按下事件名称
   * @type {string}
   */
  const EVENT_DOWN = layui.device().mobile ? 'touchstart' : 'mousedown';

  /**
   * @constant
   * 鼠标抬起事件名称
   * @type {string}
   */
  const EVENT_UP = layui.device().mobile ? 'touchend' : 'mouseup';


  /**
   * @const
   * 当前模块的名称
   * @type {string}
   */
  const KEY = "windows";

  /**
   * @const
   * 窗口的jq对象
   */
  const $root = $(window);
  /**
   * @const
   * body的jq对象
   */
  const $body = $("body");

  /**
   * @constant 收缩菜单的icon标签的class名称
   */
  const ICON_SHRINK = "layui-icon-shrink-right";
  /**
   * @constant 展开菜单的icon标签的class名称
   */
  const ICON_SPREAD = "layui-icon-spread-left";
  /**
   * chrome与phone 展开or收缩菜单的样式类名
   */
  const APP_SPREAD_SM = "layadmin-side-spread-sm";
  const SIDE_SHRINK = "layadmin-side-shrink";
  const SIDE_NAV_ITEMD = "layui-nav-itemed";

  /**
   * @constant 代表这个选项被选中的样式名称
   * @description
   * > layui-this
   */
  const THIS = "layui-this";

  /**
   * @constant 代表这个选项隐藏的样式名称
   * @description
   * > layui-hide
   */
  const HIDE = "layui-hide";

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
    if (layui.type(isClear) != 'function') {
      fn._throttleID && clearTimeout(fn._throttleID);
    } else {
      debounce(true, isClear);
      var param = {
        context: fn.context || null,
        args: fn.args || [],
        time: fn.time || 300
      };
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

    this.each = function(fn){
      let node = this.head.next;
      do{
        /**
         * 排除掉虚拟(空的)头和尾节点
         */
        if(node && node.value){
          fn && fn(node);
          node = node.next;
        }
      }while (node && node.next);
    };

  }

  /**
   * @namespace rollPage
   * @private
   * @desc
   * > 实现选项卡定位逻辑
   * > 这里的逻辑是完全照搬layuiAdmin里面的
   * @type {{auto: ((function(*, *): (undefined|*))|*), left: rollPage.left, right: rollPage.right}}
   */
  let rollPage = {
    /**
     * @inner 将内容向右边移动一个可视化距离
     * @param {*} root 需要传入{@linkplain $tabGroup 选项卡组的jq对象}
     * @deprecated
     * > root.outerWidth()  可视化距离
     *
     *
     * > prefLeft 下一步还能藏多远的距离，如果是正数说明不太够了，将第一项 left=0 的都要抽出来。
     */
    left: function left(root, index) {
      // 1.首先获取到 菜单条  它距离容器左侧的距离
      var tabsLeft = parseFloat(root.css("left"));
      /**
       * 2.判断这个距离tabsLeft的值(这个值只能是小于等于00)
       *  情况一、这个值是等于0的，说明菜单条的左侧已经已经不能再向右边移动了。直接返回，不做改变
       * (仅仅使用  !tabsLeft  可能是 ''  或者 null  如果是 == 0 也不行 '' == 0 也是true
       *  所以满足 !tabsLeft 和  <= 0 两种条件的就只有 数字 0 了)
       *  情况二、这个值小于0
       */
      if (!tabsLeft && tabsLeft <= 0) return;
      /**
       * 3.计算需要移动的距离
       *  到此 tabsLeft必然小于0 ， root.outerWidth()菜单可视宽度是大于0 的
       *  -(tabsLeft + root.outerWidth())    ==>  - -tabsLeft  - root.outerWidth();
       *  - -tabsLeft 是菜单条超过左侧的距离
       *  那么prefLeft的实际意义是  菜单条 向右移动一个 菜单可视宽度，此时  菜单条和容器左侧的距离
       *
       *
       *
       *  prefLeft：首先使用菜单可视宽度(root.outerWidth())加上tabsLeft,得到移动后，原来展示的信息可保留的最大距离
       *    ( 相当于可视距离减去移动被替换的距离，得到剩下可保留的原来的最大距离 )
       *    因为这个tabsLeft必然小于0，所以最后的结果必然小于 root.outerWidth()
       *    情况一、如果这个距离大于0等于0，你左边超出的部分，菜单可视宽度完全可以展示出来，说明只需要把左边超出的部分移动展示出来。
       *    情况二、如果这个距离小于0，说明你左边超出的部分，要想一次展示出来，整个菜单可视距离都利用上还不够，只能展示一部分。
       */
      var prefLeft = -(tabsLeft + root.outerWidth());
      // if (prefLeft >= 0) return root.css("left", 0);
      /**
       * 现在假设 强行将菜单的left设置为了0，菜单的左侧就对齐了，那么右侧会超出来一大截，超出的距离就是 prefLeft的等值
       * 此时
       * 依次遍历所有的li标签  它们left值第一个是0 后面慢慢增大
       * 当left值增加到等于或者超过 ‘prefLeft的等值’ 时，此时如果这个点处在菜单可视化左侧的0点，可以认为这样就刚刚好向右移了一个可视化距离
       *       a                b
       * |__________________|_________|   如果想求a比b长多少，可以将两个线段重合起来比较
       *               a-b
       * |___________|______|
       */
      root.children("li").each(function (index, item) {
        var li = $(item),
          left = li.position().left;
        if (left >= prefLeft) {
          root.css("left", -left);
          return false;
        }
      });
    },

    /**
     * @inner 将所选中的内容展示到菜单可视范围内
     * @param {*} root 需要传入{@linkplain $tabGroup 选项卡组的jq对象}
     * @param {*} index 弹出层在选项卡组中的编号({@linkplain layui.windows.cache 缓存}中值代表的index项),用来确定是将哪个名称展示在可视范围内
     */
    auto: function auto(root, index) {
      var tabsLeft = parseFloat(root.css("left")); // 获得被选中li标签
      var thisLi = root.find('[lay-id="' + index + '"]');
      if (!thisLi[0]) return;
      var thisLeft = thisLi.position().left; // tabsLeft 必然是一个负数  -tabsLeft 指的是root藏住的长度
      // 如果 thisLeft < -tabsLeft 代表这个li被藏在左边了
      // 那就直接把它放在左边第一个的位置
      if (thisLeft < -tabsLeft) {
        return root.css("left", -thisLeft);
      } // thisLeft + thisLi.outerWidth() 指的是li标签的尾部到root头部的距离
      // outerWidth - tabsLeft 指的是可视的尾部到root头部的距离
      // li被藏在了右边看不全
      if (thisLeft + thisLi.outerWidth() >= root.outerWidth() - tabsLeft) {
        // 计算被藏住的长度
        var subLeft = thisLeft + thisLi.outerWidth() - (root.outerWidth() - tabsLeft);
        root.children("li").each(function (i, item) {
          var li = $(item),
            left = li.position().left;
          if (left + tabsLeft > subLeft) {
            root.css("left", -left);
            return false;
          }
        });
      }
    },

    /**
     * @inner 将内容向左边移动一个可视化距离
     * @param {*} root 需要传入{@linkplain $tabGroup 选项卡组的jq对象}
     */
    right: function right(root, index) {
      var tabsLeft = parseFloat(root.css("left")); // left + li.outerWidth() li标签的位置
      // root.outerWidth() - tabsLeft 被展示到的最远位置
      // 将第一个在右边被遮住的li放在第一个展示
      root.children("li").each(function (index, item) {
        var li = $(item),
          left = li.position().left;
        if (left + li.outerWidth() >= root.outerWidth() - tabsLeft) {
          root.css("left", -left);
          return false;
        }
      });
    }
  };

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
       * 首页菜单点击事件回调名称
       */
      menuClick: 'MENU_CLICK',

    },

    /**
     * @inner
     * 主页相关参数配置
     */
    homePage: {

      /**
       * @inner 侧边的菜单栏当前是否展开
       * @description
       * 1. true展开
       * 2. false收缩
       */
      spread: false,

      /**
       * @inner 是否总是收起
       */
      spreadAlayws: false,

      /**
       * @inner 菜单展开的最小像素点
       */
      minSpreadPx: 765,

      /**
       * @inner 缓存所有页面的resize事件
       */
      resizeFn: {},

      /**
       * @inner 单例配置项缓存的key
       */
      singleton: 'singleton',

      /**
       * @inner 动态层级 配置项缓存的key
       */
      dynamicIndex: 'dynamicIndex',

    },

    /**
     * @inner
     * 主页渲染dom,jq对象
     */
    destination: null,


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
     * 设置单例模式
     * @param {Boolean} flag   true or false
     * @description
     *  这个模式下,打开弹出层会最小化上一个弹出层,达到只有一个弹出层被关注的效果
     */
    setSingleton: function(flag){
      layui.data(KEY, {
        key: windows.homePage.singleton,
        value: flag,
      });
    },

    /**
     * @method
     * 获取单例配置项
     */
    getSingleton: function (){
      return layui.data(KEY)[windows.homePage.singleton];
    },

    /**
     * @method
     * 设置动态层级
     * @param {Boolean} flag   true or false
     * @description
     *    动态层级即为人工干预各个弹出层的zIndex值,使得关注的弹出层始终处于最上层
     */
    setDynamicIndex: function (flag){
      layui.data(KEY, {
        key: windows.homePage.dynamicIndex,
        value: flag,
      });
    },

    /**
     * @method
     * 获取动态层级配置项
     */
    getDynamicIndex: function (){
      return layui.data(KEY)[windows.homePage.dynamicIndex];
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

        if(windows.getDynamicIndex() === true){
          /**
           * 添加弹出层标题点击事件
           */
          // layero.on('click', '.layui-layer-title', function(){
          //   windows.setTop(deliver.key);
          // });
          /**
           * layer模块禁用了点击事件,通过下面来实现效果
           */
          layero.on(EVENT_DOWN, ".layui-layer-title", function (e) {
            windows.setTop(deliver.key);
          });


        }

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
              debounce(layui[deliver.module]["resizing"], {context: windows, args: [layero]});
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
                debounce(layui[deliver.module]["resizing"], {context: windows, args: [layero]});
            });
          }
        }
      };
      deliver.resizing = resizing;

      /*  修改[拖拽完毕]回调函数  */
      var _moveEnd = deliver.moveEnd;
      var moveEnd = function (layero) {
        /**
         * 执行默认的回调函数
         */
        _moveEnd && _moveEnd(layero);

        /**
         * 记录当前弹出层信息,防止下面的restore方法将样式信息修改错误
         */
        windows._record(layero);
      };
      deliver.moveEnd = moveEnd;

      /**
       * 返回包装后的配置项
       */
      return deliver;

    },


    build: function(destination){

      /**
       * 定义首页dom元素
       */
      windows.destination = destination;

      /*** 添加事件 *****************/
      /**
       * 弹出层成功回调 - 添加首页上方选项卡组的li标签
       */
      windows.on(windows.eventKey.beforeSuccess, function(data){

        var deliver = data.deliver;
        var field = data.field;

        /** 添加选项卡 */
        /**
         * 创建li标签
         */
        var tabDom = document.createElement("li");
        tabDom.setAttribute("class", "lay-framework-tab");
        tabDom.setAttribute("lay-id", field.index);
        tabDom.setAttribute("lay-page-key", deliver.key);

        /**
         * 创建文本,把文本加入到li标签
         */
        var tabTxtDom = document.createTextNode("");
        tabTxtDom.textContent = deliver.name;
        tabDom.appendChild(tabTxtDom);

        /**
         * 创建一个用以删除的图标,把图标加入到li标签
         */
        var tabIconDom = document.createElement("i");
        tabIconDom.setAttribute("class", "layui-icon layui-icon-close");
        tabDom.appendChild(tabIconDom);

        /**
         * 获取选项卡的dom对象
         */
        let $tabGroup = windows.destination.find(".lay-framework-tab-title");

        /**
         * 把li标签加入选项卡组中
         */
        $tabGroup.append(tabDom);

        /**
         * 添加鼠标右键操作
         */
        windows.contextmenuTabsPage(deliver.key, tabDom);

      });

      /**
       * 弹出层销毁回调 - 移除首页上方选项卡组的li标签
       */
      windows.on(windows.eventKey.afterEnd, function(data){
        var _node = data.node;

        if(_node){
          /**
           * 获取选项卡的dom对象
           */
          let $tabGroup = windows.destination.find(".lay-framework-tab-title");
          /** 移除选项卡 */
          $tabGroup.find('[lay-id="' + _node.value.index + '"]').remove();
        }

      });

      /**
       * 弹出层最小化回调 - 隐藏弹出层
       */
      windows.on(windows.eventKey.min, function(data){

        $('#' + WINDOWS_ID_PREFIX + data.value).removeClass(HIDE).addClass(HIDE);

      });

      /**
       * 弹出层恢复回调 - 显示弹出层
       */
      windows.on(windows.eventKey.restore, function(data){

        $('#' + WINDOWS_ID_PREFIX + data.value).removeClass(HIDE);

      });

      /**
       * 点击菜单小图标展开菜单
       */
      layui.element.on("nav(lay-framework-side-menu)", function (elem) {
        if (elem.siblings(".layui-nav-child")[0] && !windows.homePage.spread) windows.sideFlexible(!windows.homePage.spread);
      });


      /**
       * 窗口初始时过小的特殊处理,将这个监听事件放入window的resize事件中持续的监听
       */
      windows.resize("frame", function () {
        windows.sideFlexible($root.width() < windows.homePage.minSpreadPx ? false : windows.homePage.spreadAlayws);
      }, true);

      /**
       * 选项卡关闭按钮点击事件
       */
      windows.destination.find(".lay-framework-tab-title").on("click", ".layui-icon-close", function (e) {
        e.stopPropagation();
        var index = $(this).parent().attr("lay-id");
        layui.layer.close(index);
      });

      /**
       * 主菜单点击事件
       */
      $body.on("click", "*[lay-page-key]", function (e) {
        layui.event.call(this, KEY, windows.eventKey.menuClick , e);
      });

      /**
       * 自定义的头部菜单事件
       */
      layui.util.event("lay-header-event", {
        // 伸缩
        flexible: function flexible() {
          windows.sideFlexible(!windows.homePage.spread);
        },
        // 主题设置
        theme: function theme() {
          layui.colortheme && layui.colortheme.popup();
        },
        // 关闭当前页
        closeThisTabs: function closeThisTabs() {
          /**
           * 从缓存中取出当前页的index值,然后再调用删除这个指定的页面
           */
          var node = windows.cache.head.next;
          node && layui.layer.close(node.value.index);
        },
        //关闭其它标签页
        closeOtherTabs: function closeOtherTabs() {
          windows.closeOtherPage();
        },
        //关闭全部标签页
        closeAllTabs: function closeAllTabs() {
          windows.closeAllPage();
        },
        rollPageLeft: function rollPageLeft() {
          windows.rollPageLeft();
        },
        rollPageRight: function rollPageRight() {
          windows.rollPageRight();
        },

      });

    },

    /**
     * @inner 为key代表的窗口添加窗口resize事件
     * @param {*} key 窗口的id,就是菜单调用时的key({@linkplain windows.cache 缓存}中值代表的key项)
     * @param {*} fn 回调函数
     * @param {*} immediate 是否立即执行回调,默认false
     * @returns
     */
    resize: function resize(key, fn, immediate = false) {
      /**
       * 主页面的key限制取frame
       */
      var _value = key == "frame" ? {key: 'frame'} : windows.cache.get(key);
      /**
       * 没有从 {@linkplain windows.cache 缓存} 中获取到指定key的缓存
       */
      if (!_value) return;

      /**
       * 移除原有的resize事件
       */
      if (windows.homePage.resizeFn[_value.key]) {
        $root.off("resize", windows.homePage.resizeFn[_value.key]);
        delete windows.homePage.resizeFn[_value.key];
      }

      /**
       * 没有传入回调函数就是仅移除
       */
      if (!fn) return;

      /**
       * 是否立即执行这个回调函数
       */
      immediate && fn();

      /**
       * 设置resize事件
       */
      windows.homePage.resizeFn[_value.key] = fn;
      $root.on("resize", function () {
        debounce(windows.homePage.resizeFn[_value.key]);
      });
    },

    /**
     * @inner 执行已缓存的窗口key的resize回调函数
     * @param {*} key 窗口的id,就是菜单调用时的key({@linkplain windows.cache 缓存}中值代表的key项)
     */
    doResize: function doResize(key) {
      var node = windows.cache.get(key);
      node && windows.homePage.resizeFn[key] && windows.homePage.resizeFn[key]();
    },

    /**
     * @inner 解绑 为key代表的窗口的resize事件
     * @param {*} key 窗口的id,就是菜单调用时的key({@linkplain windows.cache 缓存}中值代表的key项)
     * @returns
     */
    cancelResize: function cancelResize(key) {
      return windows.homePage.resize(key);
    },

    /**
     * @inner 将tab控制栏向左边移动
     */
    rollPageLeft: function rollPageLeft() {
      /**
       * 获取选项卡的dom对象
       */
      let $tabGroup = windows.destination.find(".lay-framework-tab-title");
      rollPage.left($tabGroup);
    },

    /**
     * @inner 将tab控制栏向右边移动
     */
    rollPageRight: function rollPageRight() {
      /**
       * 获取选项卡的dom对象
       */
      let $tabGroup = windows.destination.find(".lay-framework-tab-title");
      rollPage.right($tabGroup);
    },

    /**
     * @inner 将当前编号index的tab栏移动到可视的区域
     * @param {*} index 弹出层在选项卡组中的编号({@linkplain windows.cache 缓存}中值代表的index项),用来确定是将哪个名称展示在可视范围内
     */
    rollPageAuto: function rollPageAuto(index) {
      /**
       * 获取选项卡的dom对象
       */
      let $tabGroup = windows.destination.find(".lay-framework-tab-title");
      rollPage.auto($tabGroup, index);
    },

    /**
     * @method 控制侧边主菜单的展开和收缩
     * @param {*} status 展开和收缩标志(true.展开;false.收缩)
     * @desc
     *    创建 {@linkplain windows.homePage.spread  展开和收缩的标志} 将传入的标志与之对比
     *    如果一致就不作处理,不一致在处理后将此标志进行修改
     */
    sideFlexible: function sideFlexible(status) {
      /**
       * 此为首页展开和收缩点击事件的dom对象,根据实际状态将idon更换为 {@linkplain ICON_SHRINK 收缩} 或者 {@linkplain ICON_SPREAD 展开}
       */
      var iconElem = windows.destination.find(".lay-framework-flexible");

      /**
       * > 设置按钮的图标
       * > 设置状态，PC：默认展开、移动：默认收缩
       */
      iconElem.removeClass(ICON_SPREAD).removeClass(ICON_SHRINK).addClass(status === true ? ICON_SHRINK : ICON_SPREAD);

      /**
       * > 设置 {@linkplain windows.destination 首页区域 }的样式,这个样式来影响侧边菜单的样式的
       */
      windows.destination.removeClass(status ? SIDE_SHRINK : APP_SPREAD_SM);

      /**
       * 响应式处理
       */
      if (status) {
        windows.destination.removeClass(APP_SPREAD_SM).addClass($root.width() < windows.homePage.minSpreadPx ? APP_SPREAD_SM : "");
      } else {
        windows.destination.removeClass(SIDE_SHRINK).addClass($root.width() < windows.homePage.minSpreadPx ? "" : SIDE_SHRINK);
      }

      /**
       * 缓存当前的展开or收缩状态
       */
      windows.homePage.spread = status;
    },

    /**
     * @method 置顶页面
     * @param {*} key 窗口的id,就是菜单调用时的key,({@linkplain windows.cache 缓存}中值代表的key项)
     * @returns
     *
     */
    setTop: function setTop(key) {
      if (!key) return;
      /**
       * 根据key去缓存中获取对应的缓存
       */
      var node = windows.cache.get(key);
      if(node){
        /**
         * 如果从缓存中获取到了,就直接置顶这个页面
         */
        windows.doSetTop(node.index);
      }
    },

    /**
     * @inner 执行置顶页面
     * @param {*} id 弹出层在选项卡组中的编号({@linkplain windows.cache 缓存}中值代表的index项)
     * @param {*} name 新增的特殊处理,这里是以name做页面的key
     */
    doSetTop: function doSetTop(id, name) {

      /**
       * 获取选项卡的dom对象
       */
      let $tabGroup = windows.destination.find(".lay-framework-tab-title");

      /**
       * 将 id 对应的标签设置选中样式 - 高亮
       */
      $tabGroup.find('[lay-id="' + id + '"]').addClass(THIS).siblings("." + THIS).removeClass(THIS); // 页面当前置顶

      /**
       * 获取当前弹出层的最高层级
       */
      let layerIndex = layui.layer.zIndex + 1;

      /**
       * 遍历缓存
       * 需要注意的是在方法 {@linkplain windows.setTop 置顶页面时}已经调用了 {@linkplain windows.cache 缓存}的get方法
       * 让当前的缓存对象已经是置顶了，所以直接遍历缓存的时候顺序也是正确的
       */
      windows.cache.each(function(v){

        /**
         * 获取弹出层窗口的dom对象
         * @type {jQuery|HTMLElement|*}
         */
        let layero = $('#' + WINDOWS_ID_PREFIX + v.value.index);

        if(windows.getDynamicIndex() === true){
          /**
           * 动态层级,修改各个弹出层的z-index的值
           */
          layero.css('z-index', -- layerIndex);
        }

        if(v.value.index == id){
          /**
           * 菜单属性data-name 设置成配置项的id
           */
          windows.router(v.value.key);
          /**
           * 恢复当前的弹出层
           */
          if (layero.attr("area")) {
            layui.layer.restore(v.value.index);
          }
        } else {

          if(windows.getSingleton() === true){

            /**
             * 最小化其它的弹出层
             */
            layui.layer.min(v.value.index);

          }

        }

      });

      /**
       * 标签页自动适应位置
       */
      windows.rollPageAuto(id);
    },

    /**
     * @method
     * 绑定右键点击事件
     * @param {*} key  窗口的id,就是菜单调用时的key,({@linkplain windows.cache 缓存}中值代表的key项)
     * @param {*} tabDom  需要绑定事件的<li></li>标签
     */
    contextmenuTabsPage: function contextmenuTabsPage(key, tabDom) {
      var menus = [{
        title: "关闭",
        menuType: "close",
        id: "close"
      }, {
        title: "关闭其它",
        menuType: "closeOther",
        id: "closeOther"
      }, {
        title: "关闭全部",
        menuType: "closeAll",
        id: "closeAll"
      }, {
        title: "取消",
        menuType: "cancel",
        id: "cancel"
      }];

      layui.dropdown.render({
        elem: tabDom,
        id: key,
        trigger: "contextmenu",
        isAllowSpread: false,
        data: menus,
        click: function click(obj, othis) {
          var _key = $(tabDom).attr("lay-page-key");
          var _node = windows.cache.touch(_key);
          if (obj.menuType === "close") {
            /**
             * 关闭当前弹出层
             */
            _node && layui.layer.close(_node.index);
          } else if (obj.id === "closeOther") {
            /**
             * 没有获取到缓存信息,关闭所有弹出层
             */
            if (!_node) return windows.closeAllPage();

            /**
             * 置顶选中的弹出层
             */
            windows.setTop(_key);

            /**
             * 关闭其它弹出层
             */
            windows.closeOtherPage();
          } else if(obj.id === "closeAll"){
            /**
             * 关闭所有弹出层
             */
            windows.closeAllPage();
          } else {

            /**
             * 留一个关闭的项,什么也不做
             */
          }
        }
      });
    },

    /**
     * @method
     * 关闭当前页以外的其它页面
     */
    closeOtherPage: function closeAllPage(){
      var _node = windows.cache.head.next;
      if(_node){
        layui.each(windows.cache.cache, function(k, v){
          if(v.value.key != _node.value.key) layui.layer.close(v.value.index);
        });
      }
    },

    /**
     * @method
     * 关闭所有的弹出层
     */
    closeAllPage: function closeAllPage() {
      layui.each(windows.cache.cache, function(k, v){
        layui.layer.close(v.value.index);
      });
    },

    /**
     * @method
     * 同步菜单路由
     * @param {*} key 窗口的id,就是菜单调用时的key({@linkplain windows.cache 缓存}中值代表的key项)
     */
    router: function router(key) {
      var sideMenu = windows.destination.find('.lay-framework-side-menu');

      /**
       * 重置状态
       */
      sideMenu.find('.' + THIS).removeClass(THIS);
      sideMenu.find('.' + SIDE_NAV_ITEMD).removeClass(SIDE_NAV_ITEMD);

      /**
       * 更新菜单的展开收起状态
       */
      windows.sideFlexible($root.width() < windows.homePage.minSpreadPx ? false : windows.homePage.spreadAlayws);

      /**
       * 开始捕获
       */
      windows._matchMenu(key, sideMenu.children('li'));
    },

    /**
     * @inner
     * 记录下当前弹出层的位置信息,防止使用restore方法之后弹出层的大小和位置发生改变
     * @param layero
     * @private
     * @description
     *   这个方法是layer里面的ready里面的方法
     */
    _record: function _record(layero){
      if(!layero[0]) return window.console && console.error('index error');
      var type = layero.attr('type');
      var contentElem = layero.find('.layui-layer-content');
      var contentRecordHeightElem = type === 'iframe' ? contentElem.children('iframe') : contentElem;
      var area = [
        layero[0].style.width || windows._getStyle(layero[0], 'width'),
        layero[0].style.height || windows._getStyle(layero[0], 'height'),
        layero.position().top,
        layero.position().left + parseFloat(layero.css('margin-left'))
      ];
      /**
       * 不需要下面这一步
       */
      // layero.find('.layui-layer-max').addClass('layui-layer-maxmin');
      layero.attr({area: area});
      contentElem.data("LAYUI_LAYER_CONTENT_RECORD_HEIGHT", windows._getStyle(contentRecordHeightElem[0], 'height'));
    },

    /**
     * @inner
     * 获取样式信息
     * @param node
     * @param name
     * @returns {*}
     * @private
     * @description
     *   这个方法是layer里面的ready里面的方法
     */
    _getStyle: function(node, name){
      var style = node.currentStyle ? node.currentStyle : window.getComputedStyle(node, null);
      return style[style.getPropertyValue ? 'getPropertyValue' : 'getAttribute'](name);
    },

    /**
     * @inner
     * 获取菜单dom上面的 信息
     * @param {*} item
     * @returns
     * - list: 下面的子菜单
     * - name: 菜单的名称
     */
    _getItemData: function _getItemData(item) {
      return {
        list: item.children('.layui-nav-child'),
        name: item.data('name')
      };
    },

    /**
     * @inner
     * 捕获指定的菜单,设置为选中样式
     * @param {*} key  窗口的id,就是菜单调用时的key({@linkplain layui.windows.cache 缓存}中值代表的key项)
     * @param {*} list 菜单列表
     */
    _matchMenu: function _matchMenu(key, list) {
      list.each(function (index1, item1) {
        var othis1 = $(item1),
          data1 = windows._getItemData(othis1),
          listChildren1 = data1.list.children('dd'),
          matched1 = key == data1.name;

        if (matched1) {
          var selected = data1.list[0] ? SIDE_NAV_ITEMD : THIS;
          othis1.addClass(selected).siblings().removeClass(selected); //标记选择器

          return false;
        } else {
          var res1 = true;
          listChildren1.each(function (index2, item2) {
            var othis2 = $(item2),
              data2 = windows._getItemData(othis2),
              listChildren2 = data2.list.children('dd'),
              matched2 = key == data2.name;

            if (matched2) {
              var selected = data2.list[0] ? SIDE_NAV_ITEMD : THIS;
              othis2.addClass(selected).siblings().removeClass(selected); //标记选择器
              // 修改1

              othis1.addClass(SIDE_NAV_ITEMD).siblings().removeClass(SIDE_NAV_ITEMD);
              res1 = false;
              return false;
            } else {
              var res2 = true;
              listChildren2.each(function (index3, item3) {
                var othis3 = $(item3),
                  data3 = windows._getItemData(othis3),
                  matched3 = key == data3.name;

                if (matched3) {
                  var selected = data3.list[0] ? SIDE_NAV_ITEMD : THIS;
                  othis3.addClass(selected).siblings().removeClass(selected); //标记选择器
                  // 修改2

                  othis2.addClass(SIDE_NAV_ITEMD).siblings().removeClass(SIDE_NAV_ITEMD);
                  res2 = false; // 修改1

                  othis1.addClass(SIDE_NAV_ITEMD).siblings().removeClass(SIDE_NAV_ITEMD);
                  return false;
                }
              });
              res1 = res2;
              return res2;
            }
          });
          return res1;
        }
      });
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
