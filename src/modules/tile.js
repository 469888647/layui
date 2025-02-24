/**
 * @function 快捷菜单
 * @since v0.0.1
 * @author Malphite
 * @desc
 *
 * > 2023/11 v0.1.X => v0.2.X
 *
 *  >> 从独立的模块搬过来统一维护
 *
 *  <p>快捷菜单是将win10UI中的磁贴菜单进行复刻</p>
 *  <p>简单原理:</p>
 *  <ul>
 *    <li>使用一个三维数组来代替菜单进行运算</li>
 *  </ul>
 *
 * > 2024/12 rebuild AS v0.3.X
 *    >> 这次更新了下列内容
 *
 *  - [main] 修改成多个快捷菜单实例的模式,这种设计更合理
 *
 *  - [main] 实现了磁贴比例和快捷菜单列数的自定义,打破之前定死的100像素单位和固定3列
 *
 *  - [main] 将磁贴点击事件通过layui事件托管,不必出现在配置项中,主要针对的是配置项的缓存问题,function无法缓存
 *
 *  - [main] 修改颜色样式,应当随着layui主题变化,主要是结合colortheme来实现
 *
 *  - [main] 磁贴配置项中添加content,方便调用者进行自定义(如嵌入流媒体内容)
 *
 *  - 磁贴配置项添加kv属性,用于补充信息;id可以不用传了,防止传入重复的id导致系统出问题
 *
 *  - 修复了一个bug,这会导致小磁贴在左右移动时会叠在大磁贴上面
 *
 *  - 新增磁贴右键事件,弹出dropdown菜单来实现删除功能(新引入模块dropdown)
 *
 *  - 新增了一个缓存更新事件,用于缓存更新时返回缓存信息来进行后端的持久化操作
 *
 *  - 新增tile参数 refuseAnimate ,默认false 是否禁用动画(true-禁用;false不禁用)
 *
 */
("use strict");
layui.define(["jquery", "layer"], function (exports) {


  /**
   * @public
   * @constant
   * 当前模块名称
   */
  const KEY = "tile";

  /**
   * @constant 初始化jQuery
   * @description
   * > 使用layui里面内置的jQuery
   */
  const $ = layui.jquery;
  if (!window.$) window.$ = layui.$;

  /**
   * @public
   * 定义touchStart事件名称
   * @type {String}
   */
  var touchStart = "touchstart";

  /**
   * @public
   * 定义touchMove事件名称
   * @type {String}
   */
  var touchMove = "touchmove";

  /**
   * @public
   * 定义touchEnd事件名称
   * @type {String}
   */
  var touchEnd = "touchend";

  /**
   * 兼容旧版本ie
   */
  if (window.navigator.msPointerEnabled) {
    touchStart = "MSPointerDown";
    touchMove = "MSPointerMove";
    touchEnd = "‌MSPointerUp";
  }else if (window.navigator.pointerEnabled) {
    touchStart = "pointerdown";
    touchMove = "pointermove";
    touchEnd = "pointerup";
  }

  /**
   * @constant
   * 按下事件名称
   * @type {String}
   * @description
   *   通过layui.device().mobile判断是否是移动设备,从而决定是鼠标事件还是触摸事件
   */
  const EVENT_DOWN = layui.device().mobile ? touchStart : 'mousedown';

  /**
   * @constant
   * 移动事件名称
   * @type {String}
   * @description
   *   通过layui.device().mobile判断是否是移动设备,从而决定是鼠标事件还是触摸事件
   */
  const EVENT_MOVE = layui.device().mobile ? touchMove : 'mousemove';

  /**
   * @constant
   * 抬起事件名称
   * @type {String}
   * @description
   *   通过layui.device().mobile判断是否是移动设备,从而决定是鼠标事件还是触摸事件
   */
  const EVENT_UP = layui.device().mobile ? touchEnd : 'mouseup';

  /**
   * @namespace
   * @constant
   *  公共变量
   * @description
   *  定义一系列变量
   */
  const constant = {

    /**
     * @inner
     * 块结构最外层的class选择器名称
     * @type {String}
     */
    STRUCT_CLASS: "layui-layer-struct",

    /**
     * @inner
     * 磁贴结构最外层的class选择器名称
     * @type {String}
     */
    TILE_CLASS: "layui-layer-tile",

    /**
     * @inner
     * 块结构标题区域的class选择器名称
     * @type {String}
     */
    STRUCT_NAME_CLASS: "layui-layer-struct-name",

    /**
     * @inner
     * 块结构 被选中、移动时的class选择器名称
     * @type {String}
     * @description
     *   > 为了保证能点选到磁贴，块结构样式的层级被默认的调小了
     *   >> 在移动时会发生其它块中的磁贴遮挡移动中的块结构
     *   > 为了防止这个情况，在移动时给块添加一个class，临时的提高它的zIndex
     */
    STRUCT_SELECTED_CLASS: "layui-layer-moving",


    /**
     * @inner
     * 块标题上面的输入框的class选择器名称
     * @type {String}
     */
    STRUCT_INPUT_AREA_CLASS: "layui-layer-struct-input",

    /**
     * @inner
     * 块结构被选中，正在修改和输入块的class选择器名称
     * @type {String}
     */
    STRUCT_INPUT_CLASS: "layui-layer-struct-select",

    /**
     * @inner
     * 占位块结构的class选择器名称
     * @type {String}
     */
    STRUCT_EXTRA_CLASS: "layui-layer-extra",

    /**
     * @inner
     * [缺省值]一个单位的像素长度
     * @type {Number}
     * @description
     *  > 单位是px
     */
    CAPACITY: 100,

    /**
     * @inner
     * [缺省值]一个块中磁贴的最大列数
     * @type {Number}
     */
    NUMBER_OF_COLUMNS: 3,

    /**
     * @inner
     * [缺省值]磁贴之间的最小间隔像素点
     * @type {Number}
     * @description
     *  > 单位是px
     */
    TILE_PADDING: 5,

    /**
     * @inner
     * [缺省值]块标题高度
     * @type {Number}
     * @description
     *  > 单位是px
     */
    TITLE_HEIGHT: 30,

    /**
     * @inner
     * [自增]磁贴的id
     * @type {Number}
     * @description
     *   - 在磁贴初始化的时候要判断,传入了就使用传入的id,没有传入就使用这个自增id
     *   - 在磁贴初始化的时候要判断,
     */
    TILEID: 0,

    /**
     * @inner
     * [自增]块的id
     * @type {Number}
     */
    STRUCTID: 0,

    /**
     * @inner
     * [自增]实例的id
     * @type {Number}
     */
    INSTANCEID: 0,

    /**
     * @inner
     * 事件类型
     */
    EVENT: {

      /**
       * @inner
       * 事件类型 - 磁贴点击事件名称
       * @type {String}
       */
      CLICK_TILE: "clickTile",

      /**
       * @inner
       * 事件类型 - 实例缓存更新事件
       * @type {String}
       */
      UPDATE_CACHE: "updateCache",

    },

    /**
     * @inner
     * [缺省值]layui缓存的顶层key
     * @type {String}
     * @description
     *
     *  layui.data[CACHE_KEY] = {
     *    'tile' || '_' ||  INSTANCEID: cache
     *  }
     *
     *  > 缓存的放入方式是以这个为key,下面是各个快捷菜单的缓存;各个快捷菜单以'tile_'打头,拼接它的id作为key
     *
     *  > 默认是取这个值,可以通过layui.config({tileKey:XXXXX})来进行修改
     *
     */
    CACHE_KEY: "windowsTile",

  };

  /**
   * @namespace
   * 工具方法集合
   * @description
   * 在尽可能的利用原有的工具方法之外,其它工具方法集合
   */
  let utils = {

    /**
     * @method
     * 判断两个对象是否相等
     * @param {*} a  对象a
     * @param {*} b  对象b
     */
    isEqual: function(a, b){
      let classNameA = toString.call(a);
      let classNameB = toString.call(b);
      /**
       * 首先判断数据类型是否一致
       */
      if(classNameA !== classNameB) return false;
      if(classNameA === "[object Object]") {
        /**
         * 判断两个对象类型是否一致
         */
        for (let key in a) {
          /**
           * 取a对象的各项对b对象中对应的值做比较
           */
          if (!utils.isEqual(a[key], b[key])) return false;
        }
        /**
         * 排除a,b两个对象中的key不完全一致
         */
        for (let key in b) {
          /**
           * 取b对象的各项对a对象中对应的值做比较
           */
          if (!utils.isEqual(a[key], b[key])) return false;
        }
        return true;
      } else if (classNameA === "[object Array]") {
        /**
         * 判断两个数组是否一致
         */
        /**
         * 判断数组长度是否一致
         */
        if(a.length !== b.length) return false;
        /**
         * 对数组的各项进行验证是否一致,上面验证了数组长度所以验证一项即可
         */
        for (let i = 0, len = a.length; i < len; i++) {
          if (!utils.isEqual(a[i], b[i])) return false;
        }
        return true;
      } else if (classNameA === "[object Function]") {
        return a.toString() === b.toString();
      } else {
        return Object.is(a, b);
      }
    },

    /**
     * @method
     * 复制二维数组
     * @param {*} matrix
     * @returns
     * @decs
     * 这里是复制二维数组,所以直接两次循环即可
     */
    cloneMatrix: function(matrix){

      let res = [];

      layui.each(matrix, function(key, vector){

        let _vector = [];

        layui.each(vector, function(k, v){

          _vector.push(v);

        });

        res.push(_vector);

      });

      return res;

    },

    /**
     * @method
     * 计算目标的dom与当前移动的dom交叉面积是否大于移动dom 或 目标dom 面积的一半
     * @param {*} targetDom
     * @param {*} moveDom
     * @returns 是否大于 50%
     * @desc
     *    网上是直接用两个dom的left() top() 比较的
     * 这里存在跨块的比较: 磁贴和其它块比较不再一个div中的位置没有对比性。
     * 这个改成了从 getBoundingClientRect() 里面取绝对位置
     *
     */
    isCross: function(targetDom, moveDom){
      if (targetDom === moveDom) return false;
      let targetOffsetLeft = parseInt(
        targetDom.get(0).getBoundingClientRect().left
      );
      let targetOffsetTop = parseInt(
        targetDom.get(0).getBoundingClientRect().top
      );
      let targetWidth = parseInt(targetDom.width());
      let targetHeight = parseInt(targetDom.height());
      let targetCrossLeft = targetOffsetLeft + targetWidth;
      let targetCrossTop = targetOffsetTop + targetHeight;
      let moveOffsetLeft = parseInt(moveDom.get(0).getBoundingClientRect().left);
      let moveOffsetTop = parseInt(moveDom.get(0).getBoundingClientRect().top);
      let moveWidth = parseInt(moveDom.width());
      let moveHeight = parseInt(moveDom.height());
      let width =
        Math.min(targetCrossLeft, moveOffsetLeft + moveWidth) -
        Math.max(targetOffsetLeft, moveOffsetLeft);
      let height =
        Math.min(targetCrossTop, moveOffsetTop + moveHeight) -
        Math.max(targetOffsetTop, moveOffsetTop);
      let stackArea = (width > 0 ? width : 0) * (height > 0 ? height : 0);
      let moveArea = moveWidth * moveHeight;
      if (stackArea <= 0) return false;
      return stackArea >= moveArea * 0.3
      // if(stackArea >= moveArea * 0.3) {
      //   return true;
      // }
      /**
       * 判断目标dom 面积的一半
       */
      // let moveCrossLeft = moveOffsetLeft + moveWidth;
      // let moveCrossTop = moveOffsetTop + moveHeight;

      // let _width =
      //   Math.min(moveCrossLeft, targetOffsetLeft + targetWidth) -
      //   Math.max(targetOffsetLeft, moveOffsetLeft);
      // let _height =
      //   Math.min(moveCrossTop, targetOffsetTop + targetHeight) -
      //   Math.max(targetOffsetTop, moveOffsetTop);
      // let _stackArea = (_width > 0 ? _width : 0) * (_height > 0 ? _height : 0);
      // let _moveArea = targetWidth * targetHeight;
      // if (_stackArea <= 0) return false;
      // return _stackArea >= _moveArea * 0.3
    },

  };

  /**
   * @constructor
   *  windowsTile块构造函数
   * @param {*} object 传入的配置参数
   *
   * @description
   *
   *   > 配置参数:
   *
   * - id  {String}  (选填) 唯一编号
   * - name  {String}  [选填] 名称,展示在title上面,后期可以允许用户自定义
   * - source(tileSource) {Array}  [选填] 所属tile配置参数集合
   * - capacity {Number}  [选填] 在当前示例中一个单位的像素长度,{@linkplain constant.CAPACITY 缺省值}
   * - columns {Number}  [选填] 在当前示例中磁贴的最大列数,{@linkplain constant.NUMBER_OF_COLUMNS 缺省值}
   */
  let struct = function (object = {}) {

    /**
     * @inner
     * 唯一编号
     */
    this.id = object.id || "";

    /**
     * @inner
     * 名称
     */
    this.name = object.name || "";

    /**
     * @inner
     *   块配置项的offsetLeft系数
     * @description
     *   由于当前只设计了一列，这个值统一取0
     */
    this.x = 0;

    /**
     * @inner
     *   块配置项的offsetTop像素值
     * @description
     *   这个是在处理块的过程中计算出来的，这里值统一取0
     */
    this.y = 0;


    /**
     * 最终的 - 磁贴的最大列数
     */
    let columns = object.columns || constant.NUMBER_OF_COLUMNS;

    /**
     * 最终的 - 单位的像素长度
     */
    let capacity = object.capacity || constant.CAPACITY;

    /**
     * 记录下当前的最大列数
     */
    this.columns = columns;

    /**
     * 记录下当前的像素长度
     */
    this.capacity = capacity;

    /**
     * @inner
     *   块配置项的宽度(像素点)
     * @description
     *   取当前实例的单位长度 * 列数
     */
    this.w = capacity * columns;

    /**
     * @inner
     *   块配置项的高度像素值
     * @description
     *   > 这个是在处理块的过程中计算出来的，这里值统一取0
     *   > 计算方式: 二维数组的长度 * {@linkplain constant.CAPACITY 标准长度} + {@linkplain constant.TITLE_HEIGHT 块标题高度}
     */
    this.h = 0;

    /**
     * @inner
     *   块中所有磁贴配置项的集合
     * @description
     *   这是块在处理过程中生成的一个配置项
     */
    this.source = [];

    /**
     * @inner
     *   二维数组
     * @description
     *   反应的是tile在块上面的分布情况
     */
    this.matrix = [];

    /**
     * @inner
     *   待处理的tile配置项
     */
    this.tileSource = layui.type(object.source) == 'array' ? object.source : [];
  };

  /**
   * @constructor
   *  windowsTile磁贴描述对象构造函数
   * @param {*} object  传入的配置参数
   *
   * @description
   *
   *  > 配置参数
   *
   * - id  {String}  (选填) 唯一编号
   * - name  {String}  [选填] 名称 ,与 img、 content 需要至少传入一个
   * - img  {String}  [选填] 引用图片路径 ,与 name、 content 需要至少传入一个
   * - content {String}  [选填] html片段 ,与 name、 img 需要至少传入一个
   * - bgColor {String} [选填] 背景颜色, rgba、hex等颜色字符串,默认取layui主题颜色
   * - color {String} [选填] 文字颜色, rgba、hex等颜色字符串,默认取layui主题颜色
   * - kv {Object} [选填] 补充参数
   * - x {Number} (选填) 磁贴的横坐标
   * - y {Number} (选填) 磁贴的纵坐标
   * - w {Number} (选填) 磁贴的宽度系数
   * - h {Number} (选填) 磁贴的高度系数
   * - refuseAnimate {Boolean} (选填) 是否禁用动画(true-禁用;false不禁用)
   *
   * > 更新了,点击事件不要在这里定义了,后面的事件统一在layui里面托管
   */
  let tile = function(object = {}){

    /**
     * @inner
     * 唯一编号
     */
    this.id = object.id;

    /**
     * @inner
     * 名称
     */
    this.name = object.name || "";

    /**
     * @inner
     * 背景图片相对路径
     */
    this.img = object.img || "";

    /**
     * @inner
     * html代码片段
     */
    this.content = object.content || "";

    /**
     * @inner
     * 背景颜色
     */
    this.bgColor = object.bgColor || "";

    /**
     * @inner
     * 字体颜色
     */
    this.color = object.color || "";

    /**
     * @inner
     * 磁贴的横坐标
     */
    this.x = object.x || 0;

    /**
     * @inner
     * 磁贴的纵坐标
     */
    this.y = object.y || 0;

    /**
     * @inner
     * 磁贴的宽度系数
     * @description
     * 取值大于0
     */
    this.w = object.w || 1;

    /**
     * @inner
     * 磁贴的高度系数
     * @description
     * 取值大于0
     */
    this.h = object.h || 1;

    /**
     * @inner
     * 传入的补充参数
     */
    this.kv = object.kv || {};

    /**
     * @inner
     * 是否正在移动
     */
    this.move = false;

    /**
     * @inner
     * 是否禁用动画
     */
    this.refuseAnimate = object.refuseAnimate ? true : false;

  };

  /**
   * @constructor
   * 磁贴管理的构造函数
   * @public
   * @param {*} destination  需要被渲染的目的地  jq对象
   * @param {*} options 配置参数
   * @returns {windowsTile} windowsTile 快捷菜单对象
   * @description
   *
   *  > 配置参数
   *
   * - id       {String}  (选填) 当前快捷菜单的唯一编号
   * - columns  {Number}  (选填) 当前快捷菜单的最大列数,将会同步给下面的块对象 {@linkplain constant.NUMBER_OF_COLUMNS 默认值}
   * - capacity {Number}  (选填) 当前快捷菜单的单位像素点,将会同步给下面的块对象 {@linkplain constant.CAPACITY 默认值}
   * - data     {Array}   [必填] 当前快捷菜单下面的块和磁贴的配置项
   * - cacheable {Boolean} (选填) 当前实例是否允许开启缓存
   */
  let windowsTile = function (destination, options) {
    return new windowsTile.fn.build(destination, options);
  };

  windowsTile.prototype = windowsTile.fn = {

    /**
     * @constructor
     * @private
     * @param {*} destination 需要被渲染的目的地  jq对象
     * @param {*} options 配置参数
     * @returns {windowsTile} windowsTile 快捷菜单对象
     * @description
     *
     *  > 配置参数
     *
     * - id       {String}  (选填) 当前快捷菜单的唯一编号
     * - columns  {Number}  (选填) 当前快捷菜单的最大列数,将会同步给下面的块对象 {@linkplain constant.NUMBER_OF_COLUMNS 默认值}
     * - capacity {Number}  (选填) 当前快捷菜单的单位像素点,将会同步给下面的块对象 {@linkplain constant.CAPACITY 默认值}
     * - data     {Array}   [必填] 当前快捷菜单下面的块和磁贴的配置项
     */
    build: function (destination, options = {}) {

      /** 1. 确定渲染的目的地。 */
      /**
       * @inner
       *
       * 渲染的目的地
       *
       * @type{jQuery}
       * @description
       *
       *  > 选择这个类型是为了方便后面的添加事件监听
       *
       * 1. 磁贴里面的dom是动态变化的 - 绑定事件采用的是jq里面的代理监听模式
       */
      this.destination = $(destination);

      /**
       * 2. 初始化管理对象使用过程中需要使用到的临时参数
       *  --- {@linkplain windowsTile.initTemporary 处理临时参数}
       */
      this.initTemporary();

      /** 3. 初始化实例的id */
      /**
       * @inner
       *
       * 快捷菜单的id
       *
       * @type{String|Number}
       * @description
       *
       * - 这个id可以传入,也可以由 {@linkplain constant.INSTANCEID 实例id}自增获取
       * - 这个id现在的用途是与 {@linkplain KEY 模块名称} 拼接成一个唯一的字符串,在layui的事件托管中使用
       */
      this.id = options.id || ++ constant.INSTANCEID;

      /** 4. 设置最大列数、单位像素长度 */
      /**
       * @inner
       *
       * 快捷菜单的最大列数
       *
       * @type{Number}
       * @description
       *
       * - 这个属性可以不用传,有{@linkplain constant.NUMBER_OF_COLUMNS 默认值}
       * - 这个属性在初始化块对象时传入块对象的配置参数中,使之一致
       */
      this.columns = options.columns || constant.NUMBER_OF_COLUMNS;

      /**
       * @inner
       *
       * 快捷菜单的单位像素长度
       *
       * @type{Number}
       * @description
       *
       * - 这个属性可以不用传,有{@linkplain constant.CAPACITY 默认值}
       * - 这个属性在初始化块对象时传入块对象的配置参数中,使之一致
       */
      this.capacity = options.capacity || constant.CAPACITY;


      /**
       * @inner
       *
       * 是否开启缓存功能
       *
       * @type{Boolean}
       * @description
       *
       *  > 这个属性可以通过后续的方法 {@link windowsTile.enableCache}和{@link windowsTile.disableCache} 调整
       */
      this.cacheable = !!options.cacheable;

      /**
       * @inner
       *
       * 是否自动缓存[默认否]
       * @type{Boolean}
       * @description
       *
       *  - 默认是关闭的,可以通过{@link windowsTile.enableAutoCache} 开启
       *  - 这个和 上面的cacheable共同判断在信息修改时,是否同步修改缓存里面的东西
       */
      this.autocache = false;

      /**
       * 4. {@linkplain windowsTile.getData 获取缓存信息 }
       */
      let cacheData = this.cacheable ? this.getData() : null;

      /**
       * 5. 初始化磁贴块配置项，将结果全部放入 this.data 中
       *
       * --- {@linkplain windowsTile.initData 初始化磁贴块配置项}
       * - 缓存信息 > 传入配置项 > 空数组
       */
      this.initData(cacheData || options.data || []);


      /**
       * 6. 添加 {@linkplain windowsTile.addListener} 事件监听
       */
      this.addListener();

      /**
       * 7. 最后{@linkplain windowsTile.doAnimate 开启动画}
       */
      if(options.refuseAnimate !== false)
        this.doAnimate();

      /**
       * 8. 返回当前实例
       */
      return this;
    },

    /**
     * @public
     * @function
     *
     * 添加事件监听
     *
     * @param {*} type  事件类型 {@link constant.EVENT}
     * @param {*} callback
     * @returns
     * @description
     *
     *  事件类型暂时取   clickTile 磁贴点击事件
     *
     */
    on: function(type, callback){
      layui.onevent.call(this, KEY + '_' + this.id, type, callback);
      return this;
    },

    /**
     * @private
     * @inner
     *
     * 为{@linkplain windowsTile 磁贴管理对象}初始化临时参数
     *
     * @desc
     *
     *  >     有以下参数:
     *
     *    - currentStruct 当前选中的 {@linkplain struct 块结构对象}
     *    - currentState  当前缓存的块状态，内含二维数组和磁贴的y坐标信息
     *    - currentTile   当前选中的 {@linkplain tile 磁贴对象}
     *    - currentPointX 当前鼠标的X位置
     *    - currentPointY 当前鼠标的Y位置
     *    - currentScrollY 当前滚动的Y位置
     *    - startPointX   鼠标按下时鼠标的X位置
     *    - startPointY   鼠标按下时鼠标的Y位置
     *    - classes       磁贴动画样式的集合
     *    - liveness      磁贴动画系数
     */
    initTemporary: function(){

      /**
       * @inner
       *
       * 当前选中的{@linkplain struct 块结构对象}
       *
       * @type {struct}
       * @desc
       *
       *    在鼠标移动块或者磁贴时(移动磁贴就取它当前所属的块)，将这个块的信息记录下来
       * 代表当前就对这个块进行操作。
       *
       *    相关变量: {@linkplain this.currentTile 磁贴对象}
       */
      this.currentStruct = null;

      /**
       * @inner
       *
       * 当前选中的{@linkplain tile 磁贴对象}
       *
       * @type {tile}
       * @desc
       *
       *    在鼠标移动磁贴时，将这个磁贴的信息记录下来,代表当前就对这个磁贴进行操作。
       *  1. 在选中磁贴的时候即有磁贴被选中，又有块被选中。
       *  2. 在选中块时，只有块被选中。
       *  通过上面两点，可以来判断当前是块被选中还是磁贴被选中
       */
      this.currentTile = null;

      /**
       * @inner
       *
       * 当前鼠标的X位置
       *
       * @type {Number}
       */
      this.currentPointX = 0;

      /**
       * @inner
       *
       * 当前鼠标的Y位置
       *
       * @type {Number}
       */
      this.currentPointY = 0;

      /**
       * @inner
       *
       * 当前滚动的Y位置
       *
       * @type {Number}
       */
      this.currentScrollY = 0;

      /**
       * @inner
       *
       * 鼠标按下时鼠标的X位置
       *
       * @type {Number}
       * @desc
       *  鼠标松开时与之比较
       */
      this.startPointX = 0;

      /**
       * @inner
       *
       * 鼠标按下时鼠标的Y位置
       *
       * @type {Number}
       * @desc
       *  鼠标松开时与之比较
       */
      this.startPointY = 0;

      /**
       * @inner
       *
       * 当前缓存的块信息
       *
       * @type {Object}
       * @desc
       *
       *    >     在修改磁贴的位置信息时，由于一些操作会大幅度的修改当前的块信息
       *    > 在每一次修改块信息之前，都应该将它这个时刻的重要信息备份一遍，方便后面来还原
       *    > 由于块信息里面包含DOM的jq对象，这里就不直接缓存块对象了。仅记录可能被修改的信息
       *
       *    >> 它包括下面两部分
       *
       *    1. matrix 二维数组。块信息中是以它来作为磁贴块之间碰撞检测的依据，
       *  所以在磁贴移动时，这个二维数组不可避免的会被修改。
       *
       *    2. pos 每个磁贴的 y 坐标信息。在磁贴移动时，一般是将其它磁贴的y进行修改来达到为当前磁贴让位的操作。
       *  磁贴配置项里面也有DOM信息。所以单单缓存它的y值
       */
      this.currentState = null;

      /**
       * @inner
       *
       * 磁贴动画样式集合
       *
       * @type {Array[String]}
       */
      this.classes = [];

      /**
       * @inner
       *
       * 磁贴动画系数(为0不参与动画)
       *
       * @type {Float}
       */
      this.liveness = 0;
    },

    /**
     * @private
     * @inner
     *
     * 为{@linkplain windowsTile 磁贴管理对象}初始化磁贴块配置项 data
     *
     * @param {*} source 磁贴块配置项 Object  or  [Object] 数组
     * @desc
     *
     *
     *
     *  一、传入参数结构
     *
     *    Object: {
     *
     *          id:   {String}(必填) 唯一标志
     *          name: {String}(选填) 块名称
     *          source：{Array}(选填) 它下面的磁贴配置项，最好不为空
     *          [
     *              {
     *                  id:   {String}(必填) 唯一标志
     *                  name: {String}(选填) 磁贴名称
     *                  img: {String}(选填) 引用图片路径
     *                  content: {String}(选填) html片段
     *                  bgColor: {String}(选填) 背景颜色,rgba、hex等颜色字符串
     *                  color: {String}(选填) 文字颜色,rgba、hex等颜色字符串
     *                  x: {Number} (选填) 磁贴的横坐标,默认是0
     *                  y: {Number} (选填) 磁贴的纵坐标,默认是0
     *                  w: {Number} (选填) 磁贴的宽度系数,默认是1
     *                  h: {Number} (选填) 磁贴的高度系数,默认是1
     *                  kv: {Object} (选填) 传入的补充参数
     *              }
     *          ]
     *    }
     */
    initData: function(source){

      /**
       * 1. 参数处理:
       *    接下来使用方法来对传入的参数进行遍历。由于这个遍历方法对Object也有特殊处理:
       * 会转而遍历Object的key-value。
       *    为了避免上面的情况发生，保证遍历的都是磁贴块配置项。所以这里对参数进行判断：
       * 如果它不是数组就将它转化成数组。
       */
      if (layui.type(source) != 'array') source = [source];

      /**
       * 2. 初始化data
       * 在 {@linkplain windowsTile 磁贴管理对象} 中是以名为 data 的变量保存所有的磁贴块信息的
       * 这里需要对它进行初始化。它是一个数组
       */
      if (!this.data) this.data = [];

      /**
       * 3. 新增，添加一个占位置的div
       * 这样在将STRUCT块往下拉到底的时候有div将高度撑起
       */
      this.destination.append(
        $(`<div class = "${constant.STRUCT_EXTRA_CLASS}"></div>`)
      );

      let self = this;

      /**
       * 4. 遍历  source  参数。将结果放入 data中
       * 这里在放入之前要将 参数先转化成 {@linkplain struct 块结构对象} 。
       * 还要将这个 {@linkplain tileProxy.initStruct 块对象初始化}。 完成它和它下属的磁贴配置项初始化
       */
      layui.each(source, function(key, value){
        /**
         * 将块的 capacity, columns 默认都是取当前菜单中设置的值
         */
        if(!value.capacity) value.capacity = self.capacity;
        if(!value.columns) value.columns = self.columns;
        self.data.push(self.initStruct(new struct(value)));
      });

    },

    /**
     * @public
     * @inner
     *
     * 修改当前实例的配置项 cacheable 为 true [允许使用缓存]
     *
     * @returns {windowsTile} 当前实例对象
     */
    enableCache: function(){
      this.cacheable = true;
      return this;
    },

    /**
     * @public
     * @inner
     *
     * 修改当前实例的配置项 cacheable 为 false [不允许使用缓存]
     *
     * @returns {windowsTile} 当前实例对象
     */
    disableCache: function(){
      this.cacheable = false;
      return this;
    },

    /**
     * @public
     * @inner
     *
     * 修改当前实例的配置项 autocache 为 true [允许自动缓存]
     *
     * @returns {windowsTile} 当前实例对象
     */
    enableAutoCache: function(){
      this.autocache = true;
      return this;
    },

    /**
     * @public
     * @inner
     *
     * 修改当前实例的配置项 autocache 为 false [不允许自动缓存]
     *
     * @returns {windowsTile} 当前实例对象
     */
    disableAutoCache: function(){
      this.autocache = false;
      return this;
    },

    /**
     * @public
     * @inner
     *
     * 获取当前实例的缓存信息
     *
     */
    getData: function(){
      let cacheKey = layui.cache.tileKey || constant.CACHE_KEY;
      let cacheObject = layui.data(cacheKey);
      let instKey = 'tile_' + this.id;
      return cacheObject[instKey] ? cacheObject[instKey] : null;
    },

    /**
     * @private
     * @inner
     *
     * 缓存当前实例的信息
     */
    setData: function(){

      /**
       * 1. 获取表名
       */
      let cacheKey = layui.cache.tileKey || constant.CACHE_KEY;

      /**
       * 2. 拼接当前实例的缓存key
       */
      let instKey = 'tile_' + this.id;

      /**
       * 3. 将当前实例里面的data信息序列化
       */
      let data = [];
      layui.each(this.data, function(key, struct){
        let structConfig = {
          id: struct.id,
          name: struct.name || "",
          source: [],
        };
        layui.each(struct.source, function(k, tile){
          structConfig.source.push({
            id: tile.id,
            name: tile.name || "",
            img: tile.img || "",
            content: tile.content || "",
            bgColor: tile.bgColor || "",
            color: tile.color || "",
            kv: tile.kv  || {},
            x: tile.x || 0,
            y: tile.y || 0,
            w: tile.w || 1,
            h: tile.h || 1,
            refuseAnimate: tile.refuseAnimate || false,
          });
        });
        data.push(structConfig);
      });

      /**
       * 4. 放入缓存中
       */
      layui.data(cacheKey, {
        key: instKey,
        value: data,
      });

      /**
       * 5. 执行缓存更新事件
       */
      layui.event.call(this, KEY + '_' + this.id, constant.EVENT.UPDATE_CACHE , { key: instKey ,value: data });

    },

    /**
     * @public
     * @inner
     *
     * 清除当前实例的缓存信息
     *
     */
    resetData: function(){
      let cacheKey = layui.cache.tileKey || constant.CACHE_KEY;
      let instKey = 'tile_' + this.id;
      layui.data(cacheKey, {
        key: instKey,
        remove: true,
      });
    },

    /**
     * @public
     * @inner
     *
     * 清除全部实例的缓存信息
     */
    resetAllData: function(){
      let cacheKey = layui.cache.tileKey || constant.CACHE_KEY;
      layui.data(cacheKey, null);
    },

    /**
     * @inner
     *
     *  初始化块结构
     *
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @returns 返回{@linkplain struct 块结构配置项}初始化结束的实例
     */
    initStruct: function(structInstance){

      /**
       * 补全id属性
       */
      if(!structInstance.id){
        /**
         * 没有id就调用 {@linkplain windowsTile.createStructId 生成方法}生成一个id
         */
        structInstance.id = this.createStructId();
      } else {

        if(parseInt(structInstance.id)){

          /**
           * 取当前id和constant.STRUCTID的较大值(是考虑到读取缓存的数据,这样可以恢复到缓存前的极大值)
           */
          constant.STRUCTID = Math.max(parseInt(structInstance.id), constant.STRUCTID);

        }
      }

      /**
       * 1. 首先将这个块对应的jQuery对象创建出来
       */
      if(!structInstance.DOM){
        structInstance.DOM = $(`
          <div class = "${constant.STRUCT_CLASS}" lay-struct-id = "${
          structInstance.id
        }">
            <div class = "${constant.STRUCT_NAME_CLASS}" struct-id = "${
          structInstance.id
        }">
              <div class = "layui-layer-struct-title">
                <div class = "layui-layer-struct-text">
                  ${structInstance.name}
                </div>
              </div>
              <div class = "layui-layer-struct-label">
                <div class = "layui-layer-struct-text">
                  ${structInstance.name == "" ? "命名组" : structInstance.name}
                </div>
                <div class = "layui-layer-struct-icon">
                  <i class = "layui-icon layui-icon-template-1"></i>
                </div>
              </div>
              <div class = "layui-layer-struct-edit">
                <div class = "layui-layer-struct-text">
                  <input type = "text" class = "${constant.STRUCT_INPUT_AREA_CLASS}" value = "${
          structInstance.name
        }" />
                </div>
                <div class = "layui-layer-struct-icon">
                  <i class = "layui-icon layui-icon-template-1"></i>
                </div>
              </div>
            </div>
          </div>
        `);
      }

      let self = this;

      /**
       * 2.
       * - 根据配置项 tileSource
       * - 将它所属的 {@linkplain tileProxy.initTile 磁贴配置项初始化}
       * - 并放入它的 source 列表中
       */
      layui.each(structInstance.tileSource, function(key, tileDesc){
        self.initTile(structInstance, new tile(tileDesc));
      });

      /**
       * 3.
       *
       * - 由于加入了磁贴配置项，这个操作会更新它下面的二维数组。
       * - 所以这里需要 {@linkplain windowsTile.updateStructShape 更新块形状}
       */
      self.updateStructShape(structInstance);

      /**
       * 4. 将当前的块对应的dom加入到 destination 渲染目的地里面去
       *
       * 这个块在此时还并没有加入到 this.data 中
       */
      self.destination.append(structInstance.DOM);

      /**
       * 5. 更新块的dom的位置
       *    - 在上面是将它加入到页面上，紧接着应该微调它的位置，
       *    - 在这一步可能会改变这个块和它随后的块的位置
       */
      self.updateStructPosition(structInstance);

      /**
       * 6. 更新块所属的磁贴的位置
       */
      self.updateTilePosition(structInstance);

      /**
       * 7. 返回这个实例
       */
      return structInstance;

    },

    /**
     * @inner
     *
     * 磁贴注册
     *
     * @method 初始化tile结构,并将它放入 {@linkplain struct 块实例} 中
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @param {*} tileInstance   传入{@linkplain tile 磁贴结构配置项}实例
     * @param {*} flag   是否阻止磁贴DOM加入块(true  是) 在移动操作中需要这样，防止动画不自然
     */
    initTile: function(structInstance, tileInstance, flag = false){

      let self = this;

      /**
       * 设置当前tile的id属性,自动校准，防止重复id导致程序出错
       *
       * 这里的校验也不够严谨,所以建议都不要给id,这里补全比较稳妥
       */
      if(tileInstance.id) {

        if(parseInt(tileInstance.id)){

          /**
           * 取当前id和constant.TILEID的较大值(是考虑到读取缓存的数据,这样可以恢复到缓存前的极大值)
           */
          constant.TILEID = Math.max(parseInt(tileInstance.id), constant.TILEID);

        }

      } else {

        /**
         * 补全id属性
         */
        tileInstance.id = ++ constant.TILEID;

      }

      /**
       * 1. 首先将这个磁贴对应的jQuery对象创建出来
       */
      if (!tileInstance.DOM){

        /**
         * 获取layui主题颜色
         * 1. --lay-framework-main-bgColor 背景颜色默认取layui主色
         * 2. --lay-framework-main-highlight-fontColor  文字颜色默认取layui高亮颜色
         */
        let styles = getComputedStyle(document.documentElement);
        var bgValue = styles.getPropertyValue('--lay-framework-main-bgColor') || '30, 159, 255';
        var fontValue = styles.getPropertyValue('--lay-framework-main-highlight-fontColor') || '250, 250, 250';
        var titleValue = tileInstance.name ? tileInstance.name : '';

        /**
         * 提前拼接tile的主体dom字符串
         *  - 由于现在条件变多了,这里将它单独拎出来处理
         */
        let tileBody = "";
        if(tileInstance.content){
          tileBody = tileInstance.content;
        } else {
          tileBody = !tileInstance.img ? tileInstance.name : `<img src = "${tileInstance.img}" />`;
        }

        tileInstance.DOM = $(`
        <div class = "${constant.TILE_CLASS}${tileInstance.refuseAnimate ? ' refuseAnimate':''}" lay-tile-id = "${tileInstance.id}" title = "${titleValue}" >
          <div class = "${constant.TILE_CLASS}-name" style = "background-color:${
          tileInstance.bgColor
            ? tileInstance.bgColor
            : "rgba(" + bgValue + ", 1)"
        };color:${tileInstance.color ? tileInstance.color : "rgba(" + fontValue + ", 1)" }">${tileBody}
            </div>
          </div>
        `);
      }

      /**
       * 2. 块配置项[二维数组扩容]
       * 在 块 中新加入 磁贴 可能导致磁贴指向区域是一个新的区域
       * 现在先是根据 磁贴的y坐标加上它的高度[即当前磁贴所能达到的最大的y轴位置]来对二维数组进行扩容
       */
      if (structInstance.matrix.length < tileInstance.y + tileInstance.h){

        /**
         * 如果当前的二维数组长度不足就需要将它扩容到满足的大小
         */
        self.matrixCapacity(
          structInstance.matrix,
          structInstance.matrix.length,
          tileInstance.y + tileInstance.h - structInstance.matrix.length
        );

      }

      /**
       * 3. 首次尝试获取二维数组的位置集
       */
      let points = self.getMatrixFillResult(
        structInstance.matrix,
        tileInstance
      );

      if(!points) {

        /**
         *  > 如果这个tile不能顺利的插入到结构体的二维数组中,说明:
         *      在即将插入的位置,已经被其它tile占用了
         *    [经过上一步扩容,已经能保证matrix二维数组可以装下这个tile<所以只存在占位这种情况]
         *
         *  > 现在的处理是:
         *      在tile指定的y轴偏移处[由上面的扩容理由可以确定,这个位置必然处于matrix二维数组内部]
         *      扩容 tile 的高度 [新扩容的向量必然是空向量]
         *      这样的话再执行一次查找位置集[不出意外,必然能找到位置集]
         */

        /* 放下面一次扩容即可,这里先假设已经以 tileInstance.h 进行过扩容了,下面或根据计算得到的 调整高度 进行扩容 */
        // self.matrixCapacity(
        //   structInstance.matrix,
        //   tileInstance.y,
        //   tileInstance.h
        // );

        /**
         * 上面修改了 matrix二维数组 [对插入处进行扩容]
         *    对插入点以上的行并没有影响,但是对下面的行都要进行调整
         *    正是由于这一步的操作
         *    后面才需要在初始化块结构之后 {@linkplain updateTilePosition 更新它下面的磁贴位置}
         *
         * 修改了一个bug,在判断时没有考虑到不同规格磁贴的重叠的问题
         *
         */

        /**
         * 调整高度,
         * - 先默认是调整 {@linkplain tileInstance.h 磁贴的高度}
         * - 后面有需要的话,可以对这个值进行调整
         */
        let fixLength = tileInstance.h;

        /**
         * 遍历一下,所有磁贴项,校准 fixLength
         */
        layui.each(structInstance.source, function(key, value){

          /**
           * 筛选处于y偏移以上的行
           */
          if(value.y < tileInstance.y){

            /**
             * (在x方向上)判断是否在它的左边或右边,不与之相交
             */
            var xFlag = value.x + value.w < tileInstance.x || tileInstance.x + tileInstance.w < value.x;

            /**
             * 这个磁贴不在下面,但是它的压在这个位置
             *
             *        |
             *      y |--------
             *    Y   |--------
             *        |--------
             *        |
             *
             * 如图, y在Y之上,但是它占用了三排,Y这一排也被占用了
             * 这个情况的磁贴依然会与新扩容的区域重叠而占据那部分空间,会导致后面的插入失败
             * 所以需要对调整高度 fixLength 的值进行调整
             */
            if (value.y + value.h > tileInstance.y && !xFlag){

              let _fixLength = tileInstance.y - value.y + tileInstance.h;
              if(_fixLength > fixLength){

                /**
                 * 这个过程可能不止一次,我们这里取最大的一个值,作为最后调整的值
                 */
                fixLength = _fixLength;
              }
            }
          }
        });

        /**
         * 以调整高度 对二维数组进行扩容
         *
         */
        self.matrixCapacity(
          structInstance.matrix,
          tileInstance.y,
          fixLength
        );

        /**
         * 遍历一下所有磁贴项,对受影响的磁贴进行y偏移的调整[加上调整高度 fixLength]
         */
        layui.each(structInstance.source, function(key, value){

          if (value.y >= tileInstance.y){

            /**
             * 情况一、  在下面的磁贴块,y轴偏移要增加
             */
            value.y += fixLength;

          } else if (value.y + value.h > tileInstance.y) {

            /**
             * 情况二、 这个磁贴不在下面,但是它的压在这个位置,因此也需要调整
             *
             *        |
             *      y |--------
             *    Y   |--------
             *        |--------
             *        |
             *
             * 如图, y在Y之上,但是它占用了三排,Y这一排也被占用了,所以也需要调整
             */
            value.y += fixLength;

          }

        });

        /**
         * 改了位置,要把二维数组也要同步一下
         *
         * 不加这步,对那种跨几个调整的就会失效
         */
        let newMatrix = utils.cloneMatrix(structInstance.matrix);
        layui.each(structInstance.source, function(key, tile){
          for(var i = 0; i < tile.w; i++) {
            for (var j = 0; j < tile.h; j++) {
              newMatrix[tile.y + j][tile.x + i] = tile.id;
            }
          }
        });
        structInstance.matrix = newMatrix;

        /**
         * 重新获取待修改的二维数组坐标
         * 由于刚刚扩容了足够的空向量，不出意外的话，这一步必然成功
         */
        points = self.getMatrixFillResult(
          structInstance.matrix,
          tileInstance
        );

      }

      /**
       * 4. 根据上面获取到的位置集合，将当前磁贴的id填充入二维数组中占位置
       */
      layui.each(points, function(key, point){
        structInstance.matrix[point.y][point.x] = tileInstance.id;
      });

      /**
       * 5. 将这个tile配置项加入到struct资源列表中
       */
      structInstance.source.push(tileInstance);

      /**
       * 6. 将dom放入块里面去
       */
      !flag && structInstance.DOM.append(tileInstance.DOM);

    },

    /**
     * @inner
     *
     *  添加事件监听
     *
     * @desc
     *
     *  - 对于点击事件最好处理成鼠标按下和鼠标抬起[两个事件触发结果鼠标的位置不变视为点击事件]
     *  - 对于移动事件都是鼠标按下进行捕获，鼠标移动触发移动事件，鼠标抬起释放捕获。[要考虑鼠标在移动过程中移除该区域的情况]
     *  - 鼠标按下是要判断dom的类型,是触发磁贴块,还是触发分组的事件
     *
     */
    addListener: function(){

      let self = this;
      let $body = $('body');

      /**
       * 块结构按下事件
       */
      self.destination.on(EVENT_DOWN, "." + constant.STRUCT_CLASS, function(e){

        /**
         * 首先获取块的唯一标识  id
         */
        let id = e.target.getAttribute("lay-struct-id");

        /**
         * 如果没有获取到指定的属性,说明点击的dom不是块结构,就直接返回
         */
        if(!id) return;

        /**
         * 记录下当前的块结构id
         */
        self.recordStructById(id);

        /**
         * 记录下当前的鼠标位置
         */
        self.updatePointPosition(e);

        /**
         * 记录下鼠标按下时的鼠标位置
         */
        self.startPointPosition(e);

      });

      /**
       * 块标题按下事件
       */
      self.destination.on(EVENT_DOWN, "." + constant.STRUCT_NAME_CLASS, function(e){

        /**
         * 适应移动端的事件操作,防止在移动端出现点击不能输入的问题
         */
        if(!layui.device().mobile){
          e.stopPropagation();
          e.preventDefault();
        }

        /**
         * 适应移动端的事件操作,移动端的e事件有区别
         *
         * > 这里不处理了,放在保存的时候一起处理
         */
          // if(layui.device().mobile && !e.clientX){
          //   e.clientX = event.changedTouches[0].clientX;
          //   e.clientY = event.changedTouches[0].clientY;
          // }

        let $parent = $(e.target);

        /**
         * 获取块的唯一标识  id
         */
        let id = $parent.attr("struct-id");

        if(!id) {

          /**
           * 不清楚什么情况
           * 定位到子 div中了，所以从父节点里面再尝试获取一次
           */
          $parent = $parent
            .parents()
            .filter("." + constant.STRUCT_NAME_CLASS);
          id = $parent.attr("struct-id");
        }

        if(!id) return;

        /**
         * 记录下当前的块结构id
         */
        self.recordStructById(id);

        /**
         * 记录下当前的鼠标位置
         */
        self.updatePointPosition(e);

        /**
         * 记录下鼠标按下时的鼠标位置
         */
        self.startPointPosition(e);

      });

      /**
       * 磁贴按下事件
       */
      self.destination.on(EVENT_DOWN, "." + constant.TILE_CLASS, function(e){

        /**
         * 新增判断,按下滚轮(1)，或者按下右键（2）不做处理
         * 按下左键 e.button == 0
         */
        if(e.button == 1 || e.button == 2) return;

        /**
         * 获取当前磁贴id 和当前磁贴所属的块的id [pid]
         * 两者缺一不可
         */
        let id = e.target.getAttribute("lay-tile-id");
        let pid = e.target.parentElement.getAttribute("lay-struct-id");
        if (!id || !pid) return;

        /**
         * 禁止再去触发块按下事件(它触发的还是错的)
         */
        if(!layui.device().mobile){
          e.stopPropagation();
          e.preventDefault();
        }

        /**
         * 记录下当前的磁贴结构(通过id)
         *
         * > 这里不顺便记录块信息是因为：
         *      在这个点击触发之后会触发上面的块点击事件，为了避免重复捕获，这里就不处理块了
         *
         * > 更正:
         *      还是要在这个随后处理块，因为这里的操作会把磁贴的dom转移到外层容器去
         */
        self.recordTileById(id, pid);

        /**
         * 记录下当前的块结构id
         */
        self.recordStructById(pid);

        /**
         * 记录下当前的鼠标位置
         */
        self.updatePointPosition(e);

        /**
         * 记录下鼠标按下时的鼠标位置
         */
        self.startPointPosition(e);

      });

      /**
       * body移动事件
       *
       *  - 为了防止移动事件移动到destination以外导致事件不能正确的结束,这里将监听放在body上
       *  - 在移动时通过一些条件来确定事件的触发与否
       */
      $body.on(EVENT_MOVE, function(e){

        /**
         * 触发块移动监测
         */
        self.onMovingStruct(e);

        /**
         * 触发磁贴移动监测
         */
        self.onMovingTile(e);

      });

      /**
       * 快捷菜单移动事件
       *
       *  - 上面对body的监听才是业务逻辑
       *  - 这里是修改一些特殊情况下面的bug
       */
      self.destination.on(EVENT_MOVE, function(e){

        /**
         * 调整, 适应移动端的事件操作
         * 如果是移动端设备,并且触发缩放操作(特殊处理,防止发生bug)
         */
        if(layui.device().mobile && e.scale !== 1){
          e.preventDefault();
        }

      });

      /**
       * body鼠标抬起事件
       *  - 在按下事件时就需要标记是否要监听之后的移动,在抬起事件中释放这个监听操作
       * 所以移动和抬起事件需要放在body中进行
       */
      $body.on(EVENT_UP, function(e){

        /**
         * 结束磁贴移动监测
         */
        self.onMovedTile(e);

        /**
         * 结束块移动监测
         */
        self.onMovedStruct(e);

        /**
         * 更新鼠标位置
         */
        self.updatePointPosition(e);

      });

      /**
       * 块名称点击事件
       *  - 在那里抬起就算
       */
      self.destination.on(EVENT_UP, "." + constant.STRUCT_NAME_CLASS ,function(e){

        /**
         * 适应移动端的事件操作
         */
        if(layui.device().mobile && !e.clientX){
          e.clientX = event.changedTouches[0].clientX;
          e.clientY = event.changedTouches[0].clientY;
        }

        /**
         * 只有这个时候的鼠标位置与按下的时候一致,才能说明是点击事件
         */
        if (self.startPointX != e.clientX || self.startPointY != e.clientY) return;

        /**
         * 防止点击修改名称列时,块移动事件没有正确结束
         */
        self.onMovedStruct(e);

        /**
         * 首先获取块的唯一标识  id
         */
        let $parent = $(e.target);
        let id = $parent.attr("struct-id");
        if (!id) {
          /** 不清楚什么情况，定位到子 div中了，所以从父节点里面再尝试获取一次 */
          $parent = $parent
            .parents()
            .filter("." + constant.STRUCT_NAME_CLASS);
          id = $parent.attr("struct-id");
        }
        if (!id) return;

        /**
         * 如果已经添加了正在编辑的样式，这里是再次点击，就移除样式，编辑结束
         */
        if ($parent.hasClass(constant.STRUCT_INPUT_CLASS)) {
          $parent.removeClass(constant.STRUCT_INPUT_CLASS);
          return;
        }

        /**
         * 没有样式就添加正在编辑的样式
         */
        $parent.addClass(constant.STRUCT_INPUT_CLASS);

        /**
         * 输入框获得焦点
         */
        let $input = $parent.find("." + constant.STRUCT_INPUT_AREA_CLASS);
        $input.focus();

        /**
         * 将焦点暂时调整到末尾
         */
        $input.get(0).selectionStart = $input.val().length;
        $input.get(0).selectionEnd = $input.val().length;

      });

      /**
       * 输入框失去焦点事件，输入完毕
       */
      self.destination.on("blur", "." + constant.STRUCT_INPUT_AREA_CLASS, function (e) {
        self.onModifiedStructName(e);
      });

      /**
       * 输入框输入回车键，输入完毕
       */
      self.destination.on("keydown", "." + constant.STRUCT_INPUT_AREA_CLASS, function (e) {
        if (e.keyCode === 13) {
          self.onModifiedStructName(e);
        }
      });

      /**
       * 磁贴鼠标右键事件
       *
       * 本来可以直接用dropdown的,发现没有生效,并且这个dom在反复放插入和移除
       * 这里直接用jquery绑定一次,然后再弹出dropdown,双保险嘛
       */
      self.destination.on("contextmenu", "." + constant.TILE_CLASS, function (e) {
        e.stopPropagation();
        e.preventDefault();

        layui.use(['dropdown'], function(){

          let menus = [
            {
              title: "删除",
              menuType: "close",
              id: "close"
            },
            { type: "-" },
            {
              title: "调整大小",
              menuType: "size",
              id: "#2",
              child: [],
            },
            { type: "-" },
            {
              title: "取消操作",
              menuType: "cancel",
              id: "cancel"
            }
          ];

          /**
           * @inner
           * 调整范围(列数的一半)
           * @type {number}
           */
          let size = Math.round(self.columns/2);

          for(var w = 1; w < size; w ++){

            for(var h = 1; h < size; h ++) {

              menus[2].child.push({
                title: w + " X " + h,
                menuType: "size",
                id: "#2-" + w + " - " + h,
                w: w,
                h: h
              });
            }
          }
          layui.dropdown.render({
            elem: e.target, // 触发事件的 DOM 对象
            show: true, // 外部事件触发即显示
            /*  trigger: "contextmenu",*/ /** 现在使用这个参数让下拉菜单跟随鼠标位置,效果太差,先禁用了 */
            data: menus,
            click: function click(obj, othis) {
              /** 关闭当前磁贴 */
              if (obj.menuType === "close") {
                /** 获取id信息 */
                let tileId = this.elem.attr("lay-tile-id");
                let structId = this.elem.parent().attr("lay-struct-id");

                /**参数校验 */
                if(!tileId || !structId) return layui.layer.msg("移除失败,信息不全!", {icon: 5});

                let tileInstance = null;
                let structInstance = null;
                /**
                 * 通过id查找实例对象
                 */
                layui.each(self.data, function(key, _struct){

                  if(_struct.id == structId) {
                    /** 块实例赋值 */
                    structInstance = _struct;

                    layui.each(_struct.source, function(k, _tile){

                      if(_tile.id == tileId) {

                        /**磁贴实例赋值 */
                        tileInstance = _tile;

                        return true;
                      }

                    });

                    return true;

                  }

                });

                /**实例对象校验 */
                if(!tileInstance || !structInstance) return layui.layer.msg("移除失败,信息不全!", {icon: 5});

                /**
                 * 这个磁贴从当前的块上面移除。
                 */
                self.logoutTile(structInstance, tileInstance);

                /**
                 * 移除之后需要清理空的地方
                 */
                self.matrixReduce(structInstance);

                /**
                 * 更新块的位置
                 */
                self.updateStructPosition(structInstance);

                /**
                 * 更新块下面的磁贴位置
                 */
                self.updateTilePosition(structInstance);

                /**
                 * 调用自动缓存信息
                 */
                if(self.cacheable && self.autocache) {

                  self.setData();

                }

              } else if (obj.menuType === "size") {

                if(!obj.w || !obj.h) return;

                /** 获取id信息 */
                let tileId = this.elem.attr("lay-tile-id");
                let structId = this.elem.parent().attr("lay-struct-id");

                /**参数校验 */
                if(!tileId || !structId) return layui.layer.msg("操作失败,信息不全!", {icon: 5});

                let tileInstance = null;
                let structInstance = null;
                /**
                 * 通过id查找实例对象
                 */
                layui.each(self.data, function(key, _struct){

                  if(_struct.id == structId) {
                    /** 块实例赋值 */
                    structInstance = _struct;

                    layui.each(_struct.source, function(k, _tile){

                      if(_tile.id == tileId) {

                        /**磁贴实例赋值 */
                        tileInstance = _tile;

                        return true;
                      }

                    });

                    return true;

                  }

                });

                /**实例对象校验 */
                if(!tileInstance || !structInstance) return layui.layer.msg("操作失败,信息不全!", {icon: 5});

                /**
                 * 这个磁贴从当前的块上面移除。
                 */
                self.logoutTile(structInstance, tileInstance);

                /**
                 * 修改宽和高
                 */
                tileInstance.w = obj.w;
                tileInstance.h = obj.h;

                /**
                 * 重新插入
                 */
                self.initTile(structInstance, tileInstance);

                /**
                 * 移除之后需要清理空的地方
                 */
                self.matrixReduce(structInstance);

                /**
                 * 更新块的位置
                 */
                self.updateStructPosition(structInstance);

                /**
                 * 更新块下面的磁贴位置
                 */
                self.updateTilePosition(structInstance);

                /**
                 * 调用自动缓存信息
                 */
                if(self.cacheable && self.autocache) {

                  self.setData();

                }
              } else {

                /**
                 * 留一个关闭的项,什么也不做
                 */
              }
            },
            align: 'right', // 右对齐弹出
            style: 'box-shadow: 1px 1px 10px rgb(0 0 0 / 12%);' // 设置额外样式
          });

        });

      });

    },


    /**
     * @inner
     *
     *  磁贴注销,将磁贴配置项从块结构中移除
     *
     * @param {*} structInstance  传入{@linkplain struct 块结构配置项}实例
     * @param {*} tileInstance    传入{@linkplain tile 磁贴结构配置项}实例
     * @param {*} flag            是否阻止操作磁贴DOM 默认 false
     *
     * @desc
     *    由于这个方法中会释放二维数组的空间，所以一般后面会针对这个块做下面的操作 [ 这里就不做处理了 ]
     *    1. {@linkplain windowsTile.matrixReduce 去除二维数组中的空向量}
     *    2. {@linkplain windowsTile.updateTilePosition 更新块下面磁贴的位置}
     */
    logoutTile: function(structInstance, tileInstance, flag = false){

      /**
       * 1. 移除磁贴的DOM
       */
      if (tileInstance.DOM && !flag) tileInstance.DOM.remove();

      /**
       * 2. 从块中的source列表中移除
       */
      layui.each(structInstance.source, function(key, value){

        if(value == tileInstance) {

          structInstance.source.splice(key, 1);

          /**
           * - layui.each 遍历时,若返回值为true,则不再继续向下遍历
           */
          return true;
        }

      });

      /**
       * 3. 释放二维数组的空间
       */
      layui.each(structInstance.matrix, function(key, vector){

        /**
         * 判断行数在范围内
         */
        if(tileInstance.y <= key && key < tileInstance.y + tileInstance.h) {

          /**
           * 遍历符合条件行数的 vector
           */
          layui.each(vector, function(k, v){

            /**
             * 判断列数在范围内
             */
            if (tileInstance.x <= k && k < tileInstance.x + tileInstance.w){

              /**
               * 将符合条件的位置设置为默认的0
               */
              vector[k] = 0;
            }

          })

        }

      });

    },

    /**
     * @inner
     *
     * 移除块, 将块配置项从整体中移除
     *
     * @param {*} structInstance  传入{@linkplain struct 块结构配置项}实例
     */
    logoutStruct: function(structInstance){

      /**
       * 这一步也忘了啥意思了
       *    - structInstance.h 和 structInstance.DOM.height() 这两个值应该相等 [一般都是这个块为空了才移除,这两个值为0才对]
       *    - constant.TITLE_HEIGHT 是标题长度,删除以后,下面的块也要上移这个高度
       * 即这个值应该是 - constant.TITLE_HEIGHT; 带入下面的计算,意思是下面的块都要上移标题的高度
       */
      let reduceHeight = structInstance.h - structInstance.DOM.height() - constant.TITLE_HEIGHT;

      /**
       * 获取当前块在快捷菜单资源列表中的下标
       */
      let index = this.data.indexOf(structInstance);

      /**
       * 从data中移除这一项
       */
      this.data.splice(index, 1);

      /**
       * 将dom也移除
       */
      structInstance.DOM.remove();

      /**
       * 遍历,调整处于下面的块
       */
      layui.each(this.data, function(key, struct){

        if(struct.y > structInstance.y) {

          struct.y += reduceHeight;
          struct.DOM.css({ top: struct.y + "px" });

        }

      });

    },

    /**
     * @inner
     *
     * 获取磁贴在二维数组中的位置集
     *
     * @param {*} matrix 二维数组
     * @param {*} tileInstance   传入{@linkplain tile 磁贴结构配置项}实例
     * @returns 带有 x, y 坐标的结果集 或者 null
     */
    getMatrixFillResult: function(matrix, tileInstance) {

      /**
       * 当二维数组为空的时候不进行下面的操作了,直接返回空
       */
      if (matrix.length == 0) return null;

      /**
       * 1. 获取当前实例里面设置的最大列数
       */
      let columns = this.columns;

      /**
       * 2. 对传入的 {@linkplain tileInstance 磁贴配置项参数} 进行[校准一]
       *
       *  > 这里对 x 轴 以及 列数进行校准
       *
       *  - (1)、首先 {@linkplain tileInstance.w 磁贴的宽度} 要大于0并且不能超过实例设置的 {@linkplain columns 最大列数}
       *            即  0 < tileInstance.w <= columns
       *            如果这个不符合要求,强制取值为 1
       *  - (2)、然后 {@linkplain tileInstance.x 磁贴的x轴偏移} 应当大于等于0,但是它和上面的宽度相加不能超过实例设置的 {@linkplain columns 最大列数}
       *            即  0 < tileInstance.x  && (tileInstance.x + tileInstance.w) <= columns
       *            如果这个不符合要求,强制取值为 0 [和第一条一起可以达到将磁贴约束在二维数组接受的范围]
       *  - (3)、不满足条件的,需要强制修改配置项,以保证接下来的操作能够进行
       *  - (4)、高度和y偏移由于可以通过将二维数组扩容进行兼容,这里暂不处理
       */

      /* 调整宽度最小取值 */
      if(tileInstance.w <= 0){
        tileInstance.w = 1;
      }

      /* 调整宽度最大取值 */
      if(tileInstance.w > columns){
        tileInstance.w = columns;
      }

      /* 调整x偏移最小取值 */
      if(tileInstance.x < 0){
        tileInstance.x = 0;
      }

      /* 调整x偏移最大取值 */
      if(tileInstance.x > columns - tileInstance.w){
        tileInstance.x = columns - tileInstance.w;
      }

      /**
       * 创建返回结果
       */
      let res = [];

      /**
       * 创建插入标志  true-成功失败;false-插入未见异常
       */
      let flag = false;

      /**
       * 将二维数组进行多重遍历,依次处理每个数据
       *   - layui.each 遍历时,若返回值为true,则不再继续向下遍历
       */
      layui.each(matrix, function(key, vector){


        /**
         *  ----------------     首先确定行数是否合适    -------------------
         *
         * 如果当前的{@linkplain key 二维数组下标} 是大于等于  {@linkplain tileInstance.y 磁贴的y轴偏移}
         * 并且当前的{@linkplain key 二维数组下标} 是小于 {@linkplain tileInstance.y 磁贴的y轴偏移} 加上 {@linkplain tileInstance.h 磁贴的高度}
         *
         * 说明这个下标处于一个待处理的区间里,需要进行处理
         *
         * 将这一项的 vector 再次遍历
         */
        if (tileInstance.y <= key && key < tileInstance.y + tileInstance.h){

          /**
           * 再次遍历这一项的vector
           * vector的长度应当是 {@linkplain columns 实例里面设置的最大列数}
           */
          layui.each(vector, function(k, v){

            /**
             *   --------------------   然后确定列数是否合适   ---------------------
             *
             * 如果当前的{@linkplain k vector下标} 是大于等于  {@linkplain tileInstance.x 磁贴的x轴偏移}
             * 并且当前的{@linkplain k vector下标} 是小于 {@linkplain tileInstance.x 磁贴的x轴偏移} 加上 {@linkplain tileInstance.w 磁贴的宽度}
             *
             * 说明这个下标处于一个待处理的区间里,需要进行处理
             */
            if (tileInstance.x <= k && k < tileInstance.x + tileInstance.w) {

              if(v == 0 || v == tileInstance.id) {
                /**
                 * 如果当前坐标是空位置[值为0] 或者 当前位置是原来就占到的位置 [值等于它的id]
                 * 就向结果中放入这个坐标
                 */
                res.push({
                  x: k,
                  y: key,
                });

              } else {
                /**
                 * 如果当前坐标被占用,就直接将结果清空,将标志反转。代表失败了
                 */
                res = []
                flag = true;
              }
            }

            /**
             * {@linkplain flag 插入标志} 一开始都是false,代表还没有发现异常,返回false不会中断接下来的遍历;
             *  如果插入成功就会赋值为true,代表已经有异常了,这时候返回true就不再往下继续遍历了。
             */
            return flag;

          });

        }

        /**
         * {@linkplain flag 插入标志} 一开始都是false,代表还没有发现异常,返回false不会中断接下来的遍历;
         *  如果插入成功就会赋值为true,代表已经有异常了,这时候返回true就不再往下继续遍历了。
         */
        return flag;
      });

      if(flag) {
        /**
         * 插入有异常,直接返回空
         */
        return null;
      }

      if(res.length == 0){
        /**
         * 没有获取到结果集,直接返回空
         */
        return null;
      }

      return  res;
    },

    /**
     * @inner
     *
     * 二维数组扩容(扩容的是空向量)
     *
     * @param {*} matrix 待扩容的二维数组
     * @param {*} start  扩容的起始位置
     * @param {*} size   扩容的大小
     */
    matrixCapacity: function(matrix, start, size){

      /**
       * 1. 获取当前实例里面设置的最大列数
       */
      let columns = this.columns;

      while (size > 0) {

        /**
         * 2. 创建一个容量为 columns 的空数组
         */
        let emptyVector = [];
        for (var i = 0; i < columns; i++) {
          emptyVector[i] = 0;
        }

        /**
         * 3. 将创建的空数组添加进去
         */
        matrix.splice(start, 0, emptyVector);
        size--;
      }
    },

    /**
     * @inner
     *
     * 二维数组删除(删除指定的向量)
     *
     * @param {*} matrix 待删除的二维数组
     * @param {*} start  删除的起始位置
     * @param {*} size   删除的大小
     */
    matrixReduceCapacity: function(matrix, start, size){
      while (size > 0) {
        matrix.splice(start, 1);
        size--;
      }
    },

    /**
     * @inner
     *
     * 去掉二维数组里面的空行,并更新块的高度
     *
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     */
    matrixReduce: function(structInstance){

      let self = this;

      /**
       * 1. 创建一个编辑日志，将接下来的改动记录在这个列表里面
       * 编辑日志的每一项包括:  y -> 二维数组开始更新的位置  o -> 二维数组更新的长度
       */
      let editLog = [];

      /**
       * 创建指针
       */
      let point = 0;

      /**
       * 2. 遍历并更新编辑日志 [后面根据编辑日志进行处理]
       */
      layui.each(structInstance.matrix, function(key, vector){

        /**
         * 先假定这个vector是空向量
         */
        let emptyFlag = true;

        layui.each(vector, function(k, v){

          /**
           * 只要有一项取值不为0,则说明这个vector不是空向量
           */
          if(v != 0) emptyFlag = false;

          /**
           * 判断出当前向量不是空向量就可以退出循环了
           */
          return !emptyFlag;

        });

        if(emptyFlag) {
          /**
           * 这一排是空向量,应该移除 [先用指针和编辑日志记录,在下面会详细处理]
           *    1. 移除这一排 还是不再这里移除了，会影响后面的遍历
           *    2. 指针后移
           */
          point++;
        } else {

          /**
           * 添加编辑日志[先用指针和编辑日志记录,在下面会详细处理]
           */
          point = self.doMatrixReduce(point, key, editLog);
        }

      });

      /**
       * 3. 最后如果指针没有归零，就将剩余的信息放入编辑日志中
       */
      self.doMatrixReduce(point, structInstance.matrix.length, editLog);


      /**
       * 4. 处理编辑日志
       *
       *    > 通过实验,出现空向量的位置可以是中间,可以有多个,而且不一定是连续的
       * 需要多次执行清理的操作;上面是将发现空向量的行数记为指针,以及连续的行数
       * 都放在编辑日志中,这里依次取出进行处理
       *
       *    > 这里选择从二维数组下方向上方更新, 上方的向量更新 仅 会影响它下方磁贴的值发生修改
       *        - 从下方更新，每次更新就方便定位哪些是受影响的。
       *        - 因为每次受影响的值发生修改 y 值不会大于下一次的值，下一次还能选到它
       *        - 同样的方式从上面更新，下方的磁贴 y值 一 修改，下一次的值就不能保证和 y 值的大小了
       *    eg:  1   **********       1   **********
       *         2   0000000000       6   **********
       *         3   0000000000  =>   9   **********
       *         4   0000000000
       *         5   0000000000
       *         6   **********
       *         7   0000000000
       *         8   0000000000
       *         9   **********
       *
       *    1. 从下往上变换: 第七列和第八列是空向量,下面的第九列当前的y值为9,比7大,需要上移2, 记做 y = 7
       *                   第二列到第五列这4列是空向量,则下面的第六列当前的y值为6,比2大,需要上移4,记做 y = 2;
       *                                            下面的第九列当前的y值为7,比2大,需要上移4, 记做 y = 3;
       *                    对比最后的结果 第九列跑到第3排,第六列跑到第2排。是合理的。
       *
       *    2. 从上往下变换: 第二列到第五列这4列是空向量,则下面的第六列当前的y值为6,比2大,需要上移4,记做 y = 2;
       *                                             下面的第九列当前的y值为9,比2大,需要上移4,记做 y = 5;
       *                   第七列和第八列是空向量,则下面的第九列当前的y值为5,比7小,不做调整,还是 y = 5;
       *                   对比最后的结果 第九列跑到第3排,第六列跑到第2排。是不合理的。
       *
       */
      while (editLog.length > 0) {

        /**
         * 获取编辑日志最新的一条更新日志来修改磁贴
         */
        let value = editLog.pop();

        /**
         * 从二维数组中移除空向量
         *    - y值是记录从二维数组的哪一项开始
         *    - 指针记录的是有多少个连续的空向量
         * 这里统一的一起删除
         */
        structInstance.matrix.splice(value.y, value.o);

        /**
         * 上面删除了空向量,应该把下面的磁贴统一往上面靠,填补空缺
         */
        layui.each(structInstance.source, function(key, tile){

          /**
           * 将y 值大于 起点的磁贴的全部y值上升 指针个个数
           */
          if (tile.y >= value.y) tile.y -= value.o;

        });

      }

      /**
       * 5. 更新块的高度
       * 块的高度 = {@linkplain this.capacity 当前的像素长度} * 二维数组的长度 + 标题的高度
       */
      structInstance.h = this.capacity * structInstance.matrix.length + constant.TITLE_HEIGHT;

    },

    /**
     * @inner
     *
     * 添加编辑日志
     *
     * @see 在 {@linkplain windowsTile.matrixReduce 去掉二维数组里面的空行 }操作中被调用
     *
     * @param {*} point 指针位置
     * @param {*} endPoint 二维数组结束位置
     * @param {*} editLog 编辑日志
     */
    doMatrixReduce: function(point, endPoint, editLog){
      if (point == 0) return point;
      editLog.push({
        y: endPoint - point,
        o: point,
      });
      return 0;
    },

    /**
     * @inner
     *
     * 更新块形状
     *
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     */
    updateStructShape: function(structInstance){

      /**
       * 1. 首先是计算当前块它应该所处的位置。
       *    [由于只有一列磁贴组(块)，所以这里简化了，只计算 y 坐标]
       *    - y 坐标的计算 是以上一个块的 y 值 加上 上一个块 h 值
       *    - 假定它是第一项
       */
      let y = 0;

      if (this.data.length > 0) {
        /**
         * 获取当前块在快捷菜单资源列表中的下标
         */
        let index = this.data.indexOf(structInstance);
        /**
         * 如果上面获取到的值是 -1 那么说明当前的块还没有加进来。
         * 这个块处于即将添加进入的状态，所以此时它的坐标取当前data的长度。
         * 这个坐标减一 刚好是data 最后一个元素的坐标
         */
        if (index < 0) index = this.data.length;
        /**
         * 修改了一个问题,当index = 0 时下面查找不到,所以条件需要是 index > 0
         */
        if (index > 0) {
          /**
           * y 坐标的计算 是以上一个块的 y 值 加上 上一个块 h 值
           */
          y += this.data[index - 1].y;
          y += this.data[index - 1].h;
        }
      }

      /**
       * 2. 设置块的y坐标
       */
      structInstance.y = y;

      /**
       * 3. 二维数组 {@linkplain windowsTile.matrixReduce 去空向量}
       *
       *  > 接下来是计算当前块的高度，但是在此之前需要去空向量
       *      - 二维数组中匹配上了空向量，说明在块上这一排没有任何内容
       *      - 这个样子是需要将它舍去的，待处理好之后再来计算块的高度
       *
       *    块高度 = 标题{@linkplain constant.TITLE_HEIGHT 块标题高度}
       *            + 二维数组从长度 * {@linkplain constant.CAPACITY 一个单位的像素长度} [取本身的capacity]
       */
      this.matrixReduce(structInstance);

    },

    /**
     * @inner
     *
     * 更新块结构的位置
     *
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     */
    updateStructPosition: function(structInstance){

      /**
       * 1. 首先检查块结构的高度是否需要修改
       */
      if (structInstance.h != structInstance.DOM.height()) {

        let self = this;

        /**
         * 2. 调整随后的块结构
         *    - 如果块DOM的高度和它配置项里面指定的高度不对等。
         *    - 那么应该将它随后的块的 offsetTop向上 or向下进行调整，为随后调整这个块的高度做准备
         *    - 这个向上调整还是向下调整是取决于 structInstance.h 与 structInstance.DOM.height() 谁更大
         */
        layui.each(self.data, function(key, struct){

          if(struct.y > structInstance.y){

            /**
             * 修改随后的块的 y 值 和它们 DOM的css样式
             */
            struct.y += structInstance.h - structInstance.DOM.height();
            struct.DOM.css({ top: struct.y + "px" });
          }

        });

      }

      /**
       * 3. 修改块对应的dom的样式
       */
      structInstance.DOM.css({
        top: structInstance.y + "px",
        height: structInstance.h + "px",
      });

    },

    /**
     * @inner
     *
     * 更新块下面磁贴的位置
     *
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     */
    updateTilePosition: function(structInstance){

      /**
       * 获取当前块的单位像素长度
       */
      let capacity = structInstance.capacity;

      layui.each(structInstance.source, function(key, tile){

        /**
         * 如果这个磁贴带有move属性，说明此时正在对它进行操作
         * 这个时候不能在这里修改它的位置
         */
        if(!tile.move){

          tile.DOM.css({
            top:
              constant.TITLE_HEIGHT +
              constant.TILE_PADDING +
              tile.y * capacity +
              "px",
            left: constant.TILE_PADDING + tile.x * capacity + "px",
            width:
              -2 * constant.TILE_PADDING + tile.w * capacity + "px",
            height:
              -2 * constant.TILE_PADDING + tile.h * capacity + "px",
            lineHeight:
              -2 * constant.TILE_PADDING + tile.h * capacity + "px",
          });

        }

      });

    },

    /**
     * @inner
     *
     * 根据id捕获对应的块
     *
     * @param {*} id  块的id
     */
    recordStructById: function(id){

      let self = this;

      /**
       * 遍历当前实例里面的块实例集合 [data], 挑选出id等于传入id的块
       *
       * - layui.each 遍历时,若返回值为true,则不再继续向下遍历
       */
      layui.each(self.data, function(key, data){

        if(data.id == id) {

          /**
           * 捕获当前块
           */
          self.recordStruct(data);

          return true;

        }

      });

    },

    /**
     * @inner
     *
     * 捕获块
     *
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     */
    recordStruct: function(structInstance){

      /**
       * 将传入的块实例设置成当前处理的块实例
       */
      this.currentStruct = structInstance;

      /**
       * 更新额外块的位置
       */
      this.updateExtraPosition();

      if(this.currentTile) {

        /**
         * 如果有捕获磁贴,说明是在操作磁贴,这里先缓存备份块的信息
         * 方便后面的回滚操作
         */

        /**
         * 保存当前操作块的二维数组
         */
        this.currentState = {
          matrix: utils.cloneMatrix(this.currentStruct.matrix),
        };

        /**
         * 保存当前操作块下面每个磁贴的y值
         *  - 在磁贴移动时，一般是将其它磁贴的y进行修改来达到为当前磁贴让位的操作。
         *  - 这里就只保存它的y值
         */
        let pos = {};

        layui.each(this.currentStruct.source, function(key, tileInstance){

          pos[tileInstance.id] = tileInstance.y;

        });

        this.currentState.pos = pos;

      } else {

        /**
         * 如果没有捕获磁贴,当前仅操作块对象
         */

        /**
         * 给这个块添加上选中的样式，确保它在移动的时候不被其它的磁贴所遮挡
         */
        this.currentStruct.DOM.removeClass(constant.STRUCT_SELECTED_CLASS).addClass(constant.STRUCT_SELECTED_CLASS);
      }


    },

    /**
     * @inner
     *
     * 更新额外块的位置
     *
     */
    updateExtraPosition: function(){

      /**
       * 定义一个中间变量,保存当前找到的最大的y值,并以此为标准继续往下比较
       * 直到找到极大值
       */
      let y = 0;

      /**
       * 缓存y取极大值时对应的块实例
       */
      let bottom = null;

      /**
       * 遍历所有的块实例,找到到最大y值时的块实例
       */
      layui.each(this.data, function(key, structInstance){

        if(structInstance.y >= y){
          y = structInstance.y;
          bottom = structInstance;
        }

      });

      /**
       * 如果有最大y值的块实例,需要将额外块调整到它的下方
       */
      if(bottom) {

        /**
         * 额外块的top值为块实例的top值加上它的高度
         */
        let h = bottom.y + bottom.h;

        /**
         * 设置额外块的样式
         */
        this.destination.find('.' + constant.STRUCT_EXTRA_CLASS).show().css({
          top: h + 'px',
        });

      }

    },

    /**
     * @inner
     *
     * 更新当前的鼠标位置信息
     *
     * @param {*} e  鼠标信息
     *
     * @desc
     *
     * 需要区分鼠标事件和移动端事件里面信息获取方式的不同
     */
    updatePointPosition: function(e){

      if(layui.device().mobile && !e.clientX){

        /**
         * 适应移动端的事件操作
         */
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }

      /**
       * 记录下当前的鼠标位置信息
       */
      this.currentPointX = e.clientX;
      this.currentPointY = e.clientY;

    },

    /**
     * @inner
     *
     * 记录鼠标按下时的鼠标位置信息
     *
     * @param {*} e  鼠标信息
     *
     * @desc
     *
     * 需要区分鼠标事件和移动端事件里面信息获取方式的不同
     */
    startPointPosition: function(e){

      if(layui.device().mobile && !e.clientX){

        /**
         * 适应移动端的事件操作
         */
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }

      /**
       * 记录下当前的鼠标位置信息
       */
      this.startPointX = e.clientX;
      this.startPointY = e.clientY;

    },

    /**
     * @inner
     *
     * 根据id捕获对应的磁贴
     *
     * @param {*} id  磁贴的id
     * @param {*} pid 磁贴所属的块的id
     */
    recordTileById: function(id, pid){

      let self = this;

      layui.each(self.data, function(key, structInstance){

        /**
         * 从所有的块实例中找到id等于传入pid的块实例
         */
        if(structInstance.id == pid){

          /**
           * 将这个块实例设置为当前正在操作的块实例
           */
          self.currentStruct = structInstance;

          layui.each(structInstance.source, function(k, tileInstance){

            /**
             * 从这个块对象的所有磁贴实例中,查找到id等于传入id的磁贴实例
             */
            if(tileInstance.id == id){

              /**
               * 将这个磁贴实例设置成当前正在操作的磁贴实例
               */
              self.currentTile = tileInstance;

              /**
               * 标记当前的磁贴正在被移动
               */
              self.currentTile.move = true;

              /**
               * 给这个磁贴添加上选中的样式，确保它在移动的时候不被其它的磁贴所遮挡
               */
              self.currentTile.DOM.removeClass(
                constant.STRUCT_SELECTED_CLASS
              ).addClass(constant.STRUCT_SELECTED_CLASS);

              /**
               * 接下来记录这个磁贴的位置信息
               *
               *  - 由于后面的计算是使用磁贴在快捷菜单的相对位置来计算的,所以快捷菜单的位置信息也要保存
               *  - 考虑到快捷菜单可以上下滚动,还要计算它的滚动值
               *  - 先记录位置信息是因为接下来磁贴需要在快捷菜单中移除,那之后在进行插入操作,
               * 这样能保证操作前后,磁贴的位置大致不会发生变动
               *
               */

              /** 当前磁贴的top值 */
              let tileTop = self.currentTile.DOM.get(0).getBoundingClientRect().top;
              /** 当前磁贴的left值 */
              let tileLeft = self.currentTile.DOM.get(0).getBoundingClientRect().left;

              /** 当前快捷菜单容器的top值 */
              let top = self.destination.get(0).getBoundingClientRect().top;
              /** 当前快捷菜单容器的滚动值 */
              let scroll = self.destination.get(0).scrollTop;
              /** 当前快捷菜单容器的left值 */
              let left = self.destination.get(0).getBoundingClientRect().left;

              /**
               * 将磁贴dom从原来的地方删除,直接插入快捷菜单上
               *
               *  > 这一步重要,是为了磁贴可以跨struct[块]进行交互,如果不删除重插入,就只是在原来的块上面移动
               *
               */
              /**
               * 移除当前磁贴的dom[从块中移除]
               */
              self.currentTile.DOM.remove();
              /**
               * 将当前操作的磁贴的dom添加进快捷菜单的dom中[直接加入,不放入下属的块中]
               */
              self.destination.append(self.currentTile.DOM);
              /**
               * 通过上面保存的位置信息,重新设置磁贴dom的位置,使操作前后的磁贴位置几乎不变
               */
              self.currentTile.DOM.css({
                top: parseFloat(tileTop - top + scroll) + "px",
                left: parseFloat(tileLeft - left) + "px",
              });

              /**
               * - layui.each 遍历时,若返回值为true,则不再继续向下遍历
               */
              return true;
            }

          });

          /**
           * - layui.each 遍历时,若返回值为true,则不再继续向下遍历
           */
          return true;
        }

      });

    },

    /**
     * @inner
     *
     * 创建一个动态的dom
     *
     * @desc
     *
     *  在块或磁贴移动的时候,由这个动态的dom移动到预定位置,方便移动时观察到结果
     */
    createDynamicDom: function(){
      this.dynamicDom = $(`
        <div class = "${constant.TILE_CLASS}-dynamic"></div>
      `);
      this.destination.append(this.dynamicDom);
    },

    /**
     * @inner
     *
     * 监听块的移动(移动中)
     *
     * @param {*} e
     */
    onMovingStruct: function(e){

      /**
       * 适应移动端的事件对象
       */
      if(layui.device().mobile && !e.clientX){
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }

      /**
       * 1. 首先判断是否可以进入这个监听事件中
       *
       *  - 捕获了块，但是没有捕获到磁贴。这种情况才能进入
       */
      if (!this.currentStruct || this.currentTile) return;

      /**
       * 2. 如果鼠标没有移动就不算
       *
       *  - 由于只有一列块，有不允许它拖动出去，所以这里仅对offsetTop值进行处理
       */
      if(e.clientY == this.currentPointY) return;

      /**
       * 3. 如果没有动态的DOM产生就自动创建一个
       *
       *  - 块操作中是将它直接放到 destination 里面 的
       */
      if (!this.dynamicDom) this.createDynamicDom();

      /**
       * 4. 移动当前的块所对应的DOM
       *
       *  - 由于只有一列块，有不允许它拖动出去，所以这里仅对offsetTop值进行处理
       */
      this.currentStruct.DOM.css({
        top:
          parseFloat(this.currentStruct.DOM.css("top")) +
          (e.clientY - this.currentPointY) +
          "px",
      });

      /**
       * 5. 计算这个块的移动
       *
       *  1）、计算它是和上一个块的位置发生交换还是和下一个块的位置发生交换
       *  2）、这里只考虑交换，所以不考虑对其它块的影响
       */


      /** 获取当前被捕获的块位于data里面的下标 */
      let index = this.data.indexOf(this.currentStruct);

      /**
       * 情况1:
       *
       *  - 鼠标是向上移动的
       *  - 当前这个块不是第一个块[第一块往上不管,不做任何更改]
       *  - 当前块的位置和它上一个块的位置相交超过50%
       *
       * 就将当前的块和它上一个块进行交换，并捕获它上一个块
       */
      if (
        e.clientY < this.currentPointY &&
        index > 0 &&
        utils.isCross(this.data[index - 1].DOM, this.currentStruct.DOM)
      )
        this.changeNearStruct(index, index - 1);

      /**
       * 情况2:
       *
       *  - 鼠标是向下移动的
       *  - 当前这个块不是最后一个块[最后一个块往下不管,不做任何更改]
       *  - 当前块的位置和它上一个块的位置相交超过50%
       *
       * 就将当前的块和它下一个块进行交换，并捕获它下一个块
       */
      if (
        e.clientY > this.currentPointY &&
        index < this.data.length - 1 &&
        utils.isCross(this.data[index + 1].DOM, this.currentStruct.DOM)
      )
        this.changeNearStruct(index, index + 1);

      /**
       * 6. 更新动态的DOM的位置
       *
       * 将动态dom移动到当前操作块的位置,代表操作结束后就是这个结果
       */
      this.dynamicDom.css({
        top: this.currentStruct.y + "px",
        width: this.currentStruct.DOM.width() + "px",
        height: this.currentStruct.h + "px",
      });

      /**
       * 7. 更新当前的鼠标位置
       */
      this.updatePointPosition(e);

    },

    /**
     * @inner
     *
     * 监听磁贴的移动(移动中)
     *
     * @param {*} e
     */
    onMovingTile: function(e){

      /**
       * 适应移动端的事件对象
       */
      if(layui.device().mobile && !e.clientX){
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }

      /**
       * 1. 首先判断是否可以进入这个监听事件中
       *
       *  - 捕获了块，又捕获到磁贴。这种情况才能进入
       */
      if (!this.currentStruct || !this.currentTile) return;

      /**
       * 2. 如果鼠标没有移动就不算
       */
      if(e.clientX == this.currentPointX && e.clientY == this.currentPointY ) return;

      /**
       * 3. 如果没有动态的DOM产生就自动创建一个
       *
       *  - 块操作中是将它直接放到 destination 里面 的
       */
      if (!this.dynamicDom) this.createDynamicDom();

      /**
       * 4. 移动当前的块里面磁贴对应的DOM
       *
       *  - 需要限制它的横坐标位置 0 <= x <= columns
       */

      /** 计算根据鼠标移动来算,当前磁贴应该移动后的left位置值 */
      let tileOffsetLeft = parseFloat(this.currentTile.DOM.css("left")) + (e.clientX - this.currentPointX);

      /**
       * 当前磁贴能向右移动的最远距离
       *
       *    > 这个距离是按照磁贴处于块的最左边计算的,理由:
       *
       *    上面也是按offsetLeft计算的,相对位置肯定是从0开始算的,这里算最大可以移动的距离
       * 就是指从最左边到最右边可以移动的距离,而不是磁贴当前位置还能往右边移多少。(不考虑磁贴的x)
       */
      let allmostOffsetLeft = (this.currentStruct.columns - this.currentTile.w) * this.currentStruct.capacity;

      /** 磁贴的left值不能超出(右边不能出去)  */
      if(tileOffsetLeft > allmostOffsetLeft) tileOffsetLeft = allmostOffsetLeft;

      /** 磁贴的left值不能小于0(左边不能出去) */
      if (tileOffsetLeft < 0) tileOffsetLeft = 0;

      /** 计算根据鼠标移动来算,当前磁贴应该移动后的top位置值 */
      let tileOffsetTop = parseFloat(this.currentTile.DOM.css("top")) + parseFloat(e.clientY - this.currentPointY);

      /** 磁贴的top值不能小于0,小于0就跑出快捷菜单区域了 */
      if (tileOffsetTop < 0) tileOffsetTop = 0;

      /**
       * 更新当前磁贴的位置
       */
      this.currentTile.DOM.css({
        top: tileOffsetTop + "px",
        left: tileOffsetLeft + "px",
      });


      /**
       * 5. 计算这个磁贴的移动
       *
       *  1）、这个磁贴移动到上一个块
       *  2）、这个磁贴移动到下一个块
       *  3）、这个磁贴就在当前块中移动
       */

      /** 获取当前被捕获的块位于data里面的下标 */
      let index = this.data.indexOf(this.currentStruct);

      /**
       * 情况1：
       *
       *    判断是否移动到上一块中去
       *
       *  - 鼠标向上滑动
       *  - 当前块不是第一块
       *  - 磁贴和上一块的交叉面积达到50%
       *
       */
      let beforeFlag =
        e.clientY < this.currentPointY &&
        index > 0 &&
        utils.isCross(this.data[index - 1].DOM, this.currentTile.DOM);
      /**
       * 将当前磁贴移动到上一块中去
       */
      if(beforeFlag) {
        return this.changeTileToStruct(this.data[index - 1], e);
      }


      /**
       * 情况2：
       *
       *    判断是否移动到下一块中去
       *
       *  - 鼠标向下滑动
       *  - 当前块不是最后一块
       *  - 磁贴和下一块的交叉面积达到50%
       *
       */
      let afterFlag =
        e.clientY > this.currentPointY &&
        index < this.data.length - 1 &&
        utils.isCross(this.data[index + 1].DOM, this.currentTile.DOM);

      /**
       * 将当前磁贴移动到下一块中去
       */
      if(afterFlag) {
        return this.changeTileToStruct(this.data[index + 1], e);
      }

      /**
       * 情况3：
       *
       *    判断是否需要在下方新增块
       *
       *  - 鼠标向下滑动
       *  - 当前块是最后一块
       *  - 当前块的子节点不止一个
       */
      let afterInsert =
        e.clientY > this.currentPointY &&
        index == this.data.length - 1 &&
        !utils.isCross(this.currentStruct.DOM, this.currentTile.DOM) &&
        this.currentStruct.source.length > 1;

      if(afterInsert) {

        /**
         * 新创建一个块,加到末尾
         */
        this.data.push(this.initStruct(new struct({
          name: '',
          capacity: this.capacity,
          columns: this.columns,
        })));

        /**
         * 执行向后一个块插入的方法
         */
        return this.changeTileToStruct(this.data[index + 1], e);

      }

      /**
       * 情况4: 以上都不属于,那说不定是在当前的磁贴里面移动
       */
      this.changeTileFromStruct(e);

    },

    /**
     * @inner
     *
     * 交换相邻的两个块
     *
     * @param {*} index  当前被捕获的块在data中的位置
     * @param {*} i      待交换的块在data中的位置
     */
    changeNearStruct: function(index, i){

      /**
       * 1. 获取两个位置之中的较大者，较小者。
       */
      let [min, max] = index > i ? [i, index] : [index, i];

      /**
       * 2. 交换两个块的y 值 [offsetTop值]
       *
       *  - 首先将下面的块的y值，替换成上面块的 y 值
       *  - 然后根据这个被提升上来块的 y值和 h值 计算出另一个的 y值
       *
       */
      this.data[max].y = this.data[min].y;
      this.data[min].y = this.data[max].y + this.data[max].h;

      /**
       *  3.从data里面移除当前被捕获的块
       */
      this.currentStruct = this.data.splice(index, 1)[0];

      /**
       * 4.将当前被捕获的块插入到刚刚交换的位置
       */
      this.data.splice(i, 0, this.currentStruct);

      /**
       * 5. 更新刚刚交换的块的DOM的offsetTop的值。
       *
       * 交换后，它的位置就变成了 index了
       */
      this.data[index].DOM.css({
        top: this.data[index].y + "px",
      });
    },

    /**
     * @inner
     *
     * 当前捕获的磁贴移动到指定的块中
     *
     * @param {*} structInstance
     * @param {*} e  鼠标信息
     */
    changeTileToStruct: function(structInstance, e){

      /**
       * 1. 记录下此时磁贴DOM的位置。
       *
       *  - 后面要插入别的块。位置会受到影响，现在记录下来方便后面处理。(让它就保持在当前的位置上)
       */
      let tileTop = this.currentTile.DOM.get(0).getBoundingClientRect().top;
      let tileLeft = this.currentTile.DOM.get(0).getBoundingClientRect().left;


      /**
       * 2. 将这个磁贴从当前的块上面移除。
       */
      this.logoutTile(this.currentStruct, this.currentTile, true);

      /**
       * 移除之后需要清理空的地方
       */
      this.matrixReduce(this.currentStruct);

      /**
       * 更新块的位置
       */
      this.updateStructPosition(this.currentStruct);

      /**
       * 更新块下面的磁贴位置
       */
      this.updateTilePosition(this.currentStruct);

      /**
       * 3. 将传入的块实例捕获
       *
       *  - 将当前操作的块改成这个传入的块实例
       */
      this.recordStruct(structInstance);


      /**
       * 4. 获取当前这个新捕获的块的位置
       */
      let [offsetTop, offsetLeft] = this.getPositionInStruct(tileTop, tileLeft, this.currentTile);

      this.currentTile.x = offsetLeft;
      this.currentTile.y = offsetTop;

      /**
       * 5. 将磁贴加入到这个新的块中
       */
      this.initTile(this.currentStruct, this.currentTile, true);

      /**
       * 6. 同上面的操作一样,更新块的属性
       *
       *  - 这次是新增了一个磁贴,不考虑空向量,直接换算高度即可
       *  - 更新块的位置
       *  - 更新块下面磁贴的位置
       */
      this.updateStructShape(this.currentStruct);


      /**
       * 更新块的高度
       * 块的高度 = {@linkplain this.capacity 当前的像素长度} * 二维数组的长度 + 标题的高度
       */
      this.currentStruct.h = this.currentStruct.capacity * this.currentStruct.matrix.length + constant.TITLE_HEIGHT;

      /**
       * 更新块的位置
       */
      this.updateStructPosition(this.currentStruct);

      /**
       * 更新块下面的磁贴位置
       */
      this.updateTilePosition(this.currentStruct);

      /**
       * 7. 更新动态DOM的位置
       */
      this.dynamicDom.css({
        top:
          this.currentStruct.y +
          constant.TITLE_HEIGHT +
          constant.TILE_PADDING +
          this.currentTile.y * this.currentStruct.capacity +
          "px",
        left:
          constant.TILE_PADDING + this.currentTile.x * this.currentStruct.capacity + "px",
        width: this.currentTile.DOM.width() + "px",
        height: this.currentTile.DOM.height() + "px",
      });

      /**
       * 8. 更新鼠标位置
       */
      this.updatePointPosition(e);

    },

    /**
     * @inner
     *
     * 当前捕获的磁贴在当前的块中移动
     *
     * @param {*} e  鼠标信息
     */
    changeTileFromStruct: function(e){

      /**
       * 1. 获取磁贴在当前块中的位置
       */
      let tileTop = this.currentTile.DOM.get(0).getBoundingClientRect().top;
      let tileLeft = this.currentTile.DOM.get(0).getBoundingClientRect().left;

      /**
       * 2. 获取当前捕获磁贴在当前的块新位置
       */
      let [offsetTop, offsetLeft] = this.getPositionInStruct(tileTop,tileLeft,this.currentTile);


      /**
       * 3. 如果位置有变动，就修改位置信息
       */
      if(this.currentTile.x == offsetLeft && this.currentTile.y == offsetTop) {
        /**
         * 位置没有发生改变就维持原状
         */
        this.dynamicDom.css({
          top:
            this.currentStruct.y +
            constant.TITLE_HEIGHT +
            constant.TILE_PADDING +
            this.currentTile.y * this.currentStruct.capacity +
            "px",
          left:
            constant.TILE_PADDING + this.currentTile.x * this.currentStruct.capacity + "px",
          width: this.currentTile.DOM.width() + "px",
          height: this.currentTile.DOM.height() + "px",
        });
        this.updatePointPosition(e);
        return;
      }

      /**
       * 4. 当前磁贴从当前的块中移除
       */
      this.logoutTile(this.currentStruct,this.currentTile,true);

      // 如果位置有变动，就修改位置信息
      this.currentTile.x = offsetLeft;
      this.currentTile.y = offsetTop;

      /**
       * 将缓存信息恢复
       */
      if(this.currentState) {

        let currentTileId = this.currentTile.id;

        /**
         * 将缓存的matrix里面的当前磁贴的信息去除
         * [下面要重新插入,不能让他自己的id误判为占位]
         */
        layui.each(this.currentState.matrix, function(key, vector){
          layui.each(vector, function(k, v){
            if (v === currentTileId) vector[k] = 0;
          });
        });

        /**
         * 将当前块中的matrix根据缓存的信息还原
         */
        this.currentStruct.matrix = utils.cloneMatrix(this.currentState.matrix);

        /**
         * 恢复缓存的pos信息
         */
        let self = this;
        layui.each(self.currentStruct.source, function(key, tile){
          if (self.currentState.pos[tile.id] !== undefined){
            tile.y = self.currentState.pos[tile.id];
          }
        });

      }

      /**
       * 5. 再次将磁贴加入到当前的块中
       *
       *  - 删除了再次插入,可以以当前移动后的位置进行插入操作
       */
      this.initTile(this.currentStruct,this.currentTile,true);

      /**
       * 6. 同上面的操作一样,更新块的属性
       *
       *  - 这次是新增了一个磁贴,不考虑空向量,直接换算高度即可
       *  - 更新块的位置
       *  - 更新块下面磁贴的位置
       */
      this.updateStructShape(this.currentStruct);

      /**
       * 更新块的高度
       * 块的高度 = {@linkplain this.capacity 当前的像素长度} * 二维数组的长度 + 标题的高度
       */
      this.currentStruct.h = this.currentStruct.capacity * this.currentStruct.matrix.length + constant.TITLE_HEIGHT;

      /**
       * 更新块的位置
       */
      this.updateStructPosition(this.currentStruct);

      /**
       * 更新块下面的磁贴位置
       */
      this.updateTilePosition(this.currentStruct);

      /**
       * 7. 更新动态DOM的位置
       */
      this.dynamicDom.css({
        top:
          this.currentStruct.y +
          constant.TITLE_HEIGHT +
          constant.TILE_PADDING +
          this.currentTile.y * this.currentStruct.capacity +
          "px",
        left:
          constant.TILE_PADDING + this.currentTile.x * this.currentStruct.capacity + "px",
        width: this.currentTile.DOM.width() + "px",
        height: this.currentTile.DOM.height() + "px",
      });

      /**
       * 8. 更新鼠标位置
       */
      this.updatePointPosition(e);

    },

    /**
     * @inner
     *
     * 返回 传入的磁贴 应该处于当前块中的位置
     *
     * @param {*} top     磁贴的当前top值
     * @param {*} left    磁贴的当前left值
     * @param {*} tileInstance 磁贴实例
     */
    getPositionInStruct: function(top, left, tileInstance){

      /**
       * 1. 获取当前捕获到的块的位置
       */
      let structTop = this.currentStruct.DOM.get(0).getBoundingClientRect().top;
      let structLeft = this.currentStruct.DOM.get(0).getBoundingClientRect().left;

      /**
       * 2. 计算现有条件磁贴应当处于块的相对位置  (x, y)
       */
      let offsetLeft = Math.round((left - structLeft) / this.currentStruct.capacity);
      let offsetTop = Math.round((top - structTop) / this.currentStruct.capacity);

      /**
       * 3. 调整 x 的取值范围
       *
       *   > 值得注意的是这个w在之前 {@linkplain windowsTile.getMatrixFillResult 获取磁贴在二维数组中的位置集} 里面已经校验过了
       *
       * 0 <= x <= columns - w
       */
      if (offsetLeft < 0) offsetLeft = 0;
      let maxOffsetLeft = this.currentStruct.columns - tileInstance.w;
      if (offsetLeft > maxOffsetLeft) offsetLeft = maxOffsetLeft;

      /**
       * 4. 调整 y 的取值范围 [不小于0即可]
       */
      if (offsetTop < 0) offsetTop = 0;
      return [offsetTop, offsetLeft];

    },

    /**
     * @inner
     *
     * 返回一个新的块的id
     */
    createStructId: function(){

      let self = this;
      let flag = true;

      while(flag) {

        constant.STRUCTID ++;

        flag = false;

        layui.each(self.data, function(key, struct){

          if(Number(struct.id) == constant.STRUCTID) {

            flag = true;

            return true;

          }

        });

      }

      return constant.STRUCTID;

    },

    /**
     * @inner
     *
     * 监听磁贴的移动(移动结束)
     *
     * @param {*} e
     */
    onMovedTile: function(e){

      /**
       * 适应移动端的事件对象
       */
      if(layui.device().mobile && !e.clientX){
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }

      /**
       * 1. 首先判断是否可以进入这个监听事件中
       *
       *  - 捕获了块，又捕获到磁贴。这种情况才能进入
       */
      if (!this.currentStruct || !this.currentTile) return;

      /**
       * 2. 处理点击事件
       *
       *  - 鼠标按下后松开,鼠标位置不变就视为点击事件
       */
      if(e.clientX == this.startPointX && e.clientY == this.startPointY){
        /** 磁贴点击事件 */
        layui.event.call(this, KEY + '_' + this.id, constant.EVENT.CLICK_TILE , { struct: this.currentStruct ,tile: this.currentTile });
      }

      /**
       * 意外的问题:当前磁贴对象消失
       */
      if (!this.currentStruct || !this.currentTile) return;

      /**
       * 3. 磁贴DOM移除移动中的样式
       */
      this.currentTile.DOM.removeClass(constant.STRUCT_SELECTED_CLASS);

      /**
       * 4. 将这个磁贴的DOM加入块中
       */
      this.currentStruct.DOM.append(this.currentTile.DOM);

      /**
       * 5. 更新磁贴位置样式
       */
      this.currentTile.DOM.css({
        top:
          constant.TITLE_HEIGHT +
          constant.TILE_PADDING +
          this.currentTile.y * this.currentStruct.capacity +
          "px",
        left:
          constant.TILE_PADDING + this.currentTile.x * this.currentStruct.capacity + "px",
      });

      /**
       * 6. 更新当前块的二维数组[清理以后重新写入]
       */
      /**记录当前二维数组的长度,马上要重置,这里先进行缓存 */
      let _len = this.currentStruct.matrix.length;
      this.currentStruct.matrix = [];
      /**重新扩容到之前的长度 */
      this.matrixCapacity(this.currentStruct.matrix, 0, _len );
      /**根据当前的磁贴块的配置项,向二维数组中补充信息 */
      let self = this;
      layui.each(self.currentStruct.source, function(key, tile){
        for(var i = 0; i < tile.w; i++) {
          for (var j = 0; j < tile.h; j++) {
            self.currentStruct.matrix[tile.y + j][tile.x + i] = tile.id;
          }
        }
      });

      /**
       * 7. 更新当前块的属性
       */
      /**
       * 去掉空行,并调整高度
       */
      //this.matrixReduce(this.currentStruct);

      /**
       * 更新块的位置
       */
      //this.updateStructPosition(this.currentStruct);

      /**
       * 更新块下面的磁贴位置
       */
      //this.updateTilePosition(this.currentStruct);

      /**
       * 8. 释放捕获的磁贴和块
       *
       *  - 需要连块一起释放，防止走到块的释放事件里面去了
       */
      this.currentTile.move = false;
      this.currentTile = null;
      this.currentStruct = null;

      /**
       * 9. 清理临时的DOM
       */
      if (this.dynamicDom) {
        this.dynamicDom.remove();
        this.dynamicDom = null;
      }

      /**
       * 10. 清除临时的状态缓存
       */
      if (this.currentState) {
        this.currentState = null;
      }

      /**
       * 11. 清理空块
       */
      layui.each(self.data, function(key, struct){
        if(struct.source.length == 0) self.logoutStruct(struct);
      });

      /**
       * 12. 调整额外块的位置,让它处于最下方
       */
      this.updateExtraPosition();

      /**
       * 缓存配置
       */
      if(this.cacheable && this.autocache) {

        this.setData();

      }

    },

    /**
     * @inner
     *
     * 监听块的移动(移动结束)
     *
     * @param {*} e
     */
    onMovedStruct: function(e){

      /**
       * 1. 首先判断是否可以进入这个监听事件中
       *
       *  - 捕获了块，但是没有捕获到磁贴。这种情况才能进入
       */
      if (!this.currentStruct || this.currentTile) return;

      /**
       * 2. 移除移动中的样式
       */
      this.currentStruct.DOM.removeClass(constant.STRUCT_SELECTED_CLASS);

      /**
       * 3. 更新样式
       */
      this.currentStruct.DOM.css({
        top: this.currentStruct.y + "px",
      });

      /**
       * 4. 释放捕获
       */
      this.currentStruct = null;

      /**
       * 5. 清除临时的DOM
       */
      if (this.dynamicDom) {
        this.dynamicDom.remove();
        this.dynamicDom = null;
      }

      /**下面两步好像没得必要进行 */

      /**
       * 6. 清理空块
       */
      layui.each(self.data, function(key, struct){
        if(struct.source.length == 0) self.logoutStruct(struct);
      });

      /**
       * 7. 调整额外块的位置,让它处于最下方
       */
      this.updateExtraPosition();

      /**
       * 缓存配置
       */
      if(this.cacheable && this.autocache) {

        this.setData();

      }
    },

    /**
     * @inner
     *
     * 修改块的名称[页面编辑触发]
     *
     * @param {*} e
     */
    onModifiedStructName: function(e){
      /**
       * 查找父节点，这个节点上面包含块 的 id信息
       */
      let $parent = $(e.target)
        .parents()
        .filter("." + constant.STRUCT_NAME_CLASS);

      /**
       * 移除这个块正在被编辑的样式
       */
      $parent.removeClass(constant.STRUCT_INPUT_CLASS);

      /**
       * 获取用户输入结果
       */
      let value = e.target.value;

      /**
       * 修改鼠标移上来展示的结果
       */
      $parent
        .find(".layui-layer-struct-label .layui-layer-struct-text")
        .text(value ? value : "命名组");

      /**
       * 修改平时展示的结果
       */
      $parent
        .find(".layui-layer-struct-title .layui-layer-struct-text")
        .text(value);

      /**
       * 获取块 id信息
       */
      let id = $parent.attr("struct-id");

      /**
       * 找到对应的块修改它的name属性
       */
      layui.each(this.data, function(key, struct){

        if(struct.id == id){
          struct.name = value;
          return true;
        }

      });

      /**
       * 调用是否自动更新缓存
       */
      if(this.cacheable && this.autocache){

        this.setData();

      }

    },

    /**
     * @public
     * @function
     *
     * 设置磁贴动画
     *
     * @param {Array[String]} animated_classes 磁贴样式集合
     * @param {Float} animated_liveness  动画系数
     */
    setAnimate: function(animated_classes, animated_liveness){

      let self = this;
      // if (!self.classes) self.classes = [];
      self.classes = [];
      if (layui.type(animated_classes) != 'array') animated_classes = [animated_classes];
      layui.each(animated_classes, function(key, value){
        self.classes.push("layui-windows-animated animate-" + value)
      });
      self.liveness = animated_liveness || 0;
      return this;
    },

    /**
     * @private
     * @inner
     *
     * 执行磁贴动画
     *
     */
    doAnimate: function(){
      let self = this;

      /**
       * @inner
       *
       * 动画标志(判断是否进去添加动画的方法)
       *
       * @type {Boolean}
       * @desc
       *
       *    > 这个参数为true,不进行动画;这个参数为false,进行动画
       *
       *    > 进入动画需要满足三个条件:
       *
       *      1. 设置的动画样式不能为空
       *      2. 设置的动画样式不能等于0(取值范围是 [0, 1] )
       *      3. 当前实例的dom没有添加上layui-hide样式对之进行隐藏
       */
      let flag = self.classes.length === 0 || self.liveness === 0 || self.destination.hasClass("layui-hide");

      if(!flag) {

        self.destination.find("." + constant.TILE_CLASS).each(function(){

          let $this = $(this);

          /**
           * 添加判断,这个tile有没有标记 “拒绝动画” 的样式
           */
          if(!$this.hasClass("refuseAnimate")){
            if (!$this.hasClass("onAnimate") && Math.random() <= self.liveness) {
              /**
               * 随机取一个动画样式
               */
              var class_animate =
                self.classes[Math.floor(Math.random() * self.classes.length)];
              /**
               * 给这个tile加上正在动画的样式,防止重复绑定动画
               */
              $this.addClass("onAnimate");
              /**
               * 两秒内开始动画
               */
              setTimeout(function () {
                /**
                 * 添加动画样式
                 */
                $this.addClass(class_animate);
                /**
                 * 三秒后停止动画
                 */
                setTimeout(function () {
                  /**
                   * 移除正在动画的样式
                   */
                  $this.removeClass("onAnimate");
                  /**
                   * 移除动画样式
                   */
                  $this.removeClass(class_animate);
                }, 3000);
              }, Math.random() * 2 * 1000);
            }

          }

        });

      }

      setTimeout(function () {
        self.doAnimate();
      }, 6 * 1000);
    },

    /**
     * @public
     * @function
     * 新增一个磁贴(到一个新的块中)
     * @param tileOption 磁贴配置项
     */
    addTile: function(tileOption){

      /**
       * 获取新的块的编号
       * @type {Number}
       */
      let structid = this.createStructId();
      /**
       * 创建新块
       */
      this.data.push(this.initStruct(new struct({
        id: structid,
        name: '',
      })));
      /**
       * 插入新块
       */
      this.insertTile(structid, tileOption);
    },

    /**
     * @public
     * @function
     * 新增一个磁贴(到一个指定id的块中)
     * @param structId  指定块的id
     * @param tileOption 磁贴配置项
     */
    insertTile: function (structId, tileOption) {
      let structInstance = null;
      /**
       * 根据id获取块实例
       */
      layui.each(this.data, function(key, _struct){

        if(_struct.id == structId) {
          /** 块实例赋值 */
          structInstance = _struct;
          return true;
        }

      });

      /* 2. 更新磁贴配置项 */
      let _tileOption = {
        id: tileOption.id || "",
        name: tileOption.name || "",
        img: tileOption.img || "",
        bgColor: tileOption.bgColor || "",
        color: tileOption.color || "",
        kv: tileOption.kv || {},
        x: tileOption.x || 0,
        y: tileOption.y || 0,
        w: tileOption.w || 1,
        h: tileOption.h || 1,
        refuseAnimate: tileOption.refuseAnimate || false,
      };

      /* 3. 将磁贴加入到块实例中 */
      this.initTile(structInstance, new tile(_tileOption));

      /* 4. 更新块位置，块下面的磁贴位置 */
      this.updateStructShape(structInstance);
      this.updateStructPosition(structInstance);
      this.updateTilePosition(structInstance);

      /* 5. 根据需要缓存配置项 */
      if(this.cacheable && this.autocache) {
        this.setData();
      }
    },

  };

  windowsTile.fn.build.prototype = windowsTile.fn;

  exports(KEY, windowsTile);

});
