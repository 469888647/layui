/**
 * @function 快捷菜单
 * @since v0.0.1
 * @author Malphite
 * @desc
 *
 *  <p>快捷菜单是将win10UI中的磁贴菜单进行复刻</p>
 *  <p>简单原理:</p>
 *  <ul>
 *    <li>使用一个三维数组来代替菜单进行运算</li>
 *  </ul>
 */
("use strict");
layui.define("jquery", function (exports) {
  if (!window.$) window.$ = layui.$;

  // 兼容旧版本ie
  /**
   * 定义touchStart事件名称
   * @type {string}
   */
  var touchStart = "touchstart";
  /**
   * 定义touchMove事件名称
   * @type {string}
   */
  var touchMove = "touchmove";
  // 兼容旧版本ie
  if (window.navigator.msPointerEnabled) {
    touchStart = "MSPointerDown";
    touchMove = "MSPointerMove";
  }else if (window.navigator.pointerEnabled) {
    touchStart = "pointerdown";
    touchMove = "pointermove";
  }

  /**
   * 定义一系列的公共常量
   * @namespace  公共常量
   * @constant
   */
  const constant = {

    /**
     * @inner {Boolean} 是否启用layui.data缓存信息  true 启用 false 禁用
     */
    ENABLE_CACHE: true,

    /**
     * @inner {Boolean} 在配置项改变时自动调用layui.data缓存信息  true 启用 false 禁用
     */
    AUTO_CACHE: true,

    /**
     * @inner {String} 默认颜色的rgb值
     */
    DEFAULT_COLOR: "0, 149, 135",
    // DEFAULT_COLOR: "23, 119, 200",

    /**
     * @inner {String} 块结构最外层的class选择器名称
     */
    STRUCT_CLASS: "layui-layer-struct",

    /**
     * @inner {String} 磁贴结构最外层的class选择器名称
     */
    TILE_CLASS: "layui-layer-tile",

    /**
     * @inner {String} 块结构标题区域的class选择器名称
     */
    STRUCT_NAME_CLASS: "layui-layer-struct-name",

    /**
     * @inner {String} 块结构被选中，移动时的选择器名称
     * @desc
     *  为了保证能点选到磁贴，块结构的样式被默认的调小了
     * 在移动时会发生其它块中的磁贴遮挡移动中的块结构。
     *  为了防止这个情况，在移动时给块添加一个class，临时的提高它的zIndex
     */
    STRUCT_SELECTED_CLASS: "layui-layer-moving",

    /**
     * @inner {String} 块结构被选中，正在修改和输入块的名称
     */
    STRUCT_INPUT_CLASS: "layui-layer-struct-select",

    /**
     * @inner {String} 占位块的classname
     * @desc
     *  最下面留个位置占空间,不然难以滑倒最下面去
     */
    STRUCT_EXTRA_CLASS: "layui-layer-extra",

    /**
     * @inner {Array} 标准空向量值
     * @desc
     *    在做二维数组填充的时候，需要将这个空向量深拷贝填充
     *    在做二维数组去空值的时候，需要和这个空向量进行判断
     */
    EMPTY_VECTOR: [0, 0, 0],

    /**
     * @inner {Number} 向量空值
     */
    EMPTY_VALUE: 0,

    /**
     * @inner {Number} 一个单位的像素长度
     */
    CAPACITY: 100,

    /**
     * @inner {Number} 磁贴之间的最小间隔像素点
     */
    TILE_PADDING: 5,

    /**
     * @inner {Number} 块标题高度
     * @desc
     *  在计算块的高度时候需要加上这个。
     *  每个磁贴的top值也要顺便加上这个高度
     */
    TITLE_HEIGHT: 30,

    /**
     * @inner {Number} 鼠标位置 - X
     * @desc
     *  在块标题的按下事件里面记录下当前鼠标的位置
     * 在鼠标抬起时进行判断，两个坐标不相等就不触发点击事件
     */
    EVENTX: 0,

    /**
     * @inner {Number} 鼠标位置 - Y
     * @desc
     *  在块标题的按下事件里面记录下当前鼠标的位置
     * 在鼠标抬起时进行判断，两个坐标不相等就不触发点击事件
     */
    EVENTY: 0,

    /**
     * @inner {Number} 自增块id
     */
    STRUCTID: 0,

    /**
     * @inner 块点击的默认事件
     * @param {*} id 磁贴块id
     * @param {*} e
     */
    TILE_CLICK_EVENT: function (id,e) {
      if (layui.windows) {
        layui.windows.open(id);
        layui.windows.instance().toggleMenu(e);
      } else {
        layui.layer.open(id);
      }
    },
    /**
     * @inner {String} 鼠标按下事件名称
     * @desc
     *    通过layui.device().mobile判断是否是移动设备,从而决定是鼠标事件还是触摸事件
     */
    EVENT_DOWN: layui.device().mobile ? 'touchstart' : 'mousedown',
    /**
     * @inner {String} 鼠标抬起事件名称
     * @desc
     *    通过layui.device().mobile判断是否是移动设备,从而决定是鼠标事件还是触摸事件
     */
    EVENT_UP:layui.device().mobile ? 'touchend' : 'mouseup',
    /**
     * @inner {String} 鼠标移动事件名称
     * @desc
     *    通过layui.device().mobile判断是否是移动设备,从而决定是鼠标事件还是触摸事件
     */
    EVENT_MOVE:layui.device().mobile ? 'touchmove' : 'mousemove',
  };

  /**
   * 缓存回调函数
   */
  var callBackMap = {};

  /**
   * @global
   * @description
   *     一些工具方法的集合
   */
  function buildLodash() {
    const handler = {
      /**
       * @function  类型判断： 判断传入的参数是不是数组类型
       * @param {*} o    待判断的对象
       * @returns  true  是数组对象   false  不是数组对象
       */
      isArray: (o) => Object.prototype.toString.call(o) === "[object Array]",
      /**
       * @function  类型判断： 判断传入的参数是不是String类型
       * @param {*} o 待判断的对象
       * @returns  true  是String对象   false  不是String对象
       */
      isString: (o) => Object.prototype.toString.call(o) === "[object String]",
      /**
       * @function  类型判断： 判断传入的参数是不是Boolean类型
       * @param {*} o 待判断的对象
       * @returns  true  是Boolean对象   false  不是Boolean对象
       */
      isBoolean: (o) =>
        Object.prototype.toString.call(o) === "[object Boolean]",
      /**
       * @function  类型判断： 判断传入的参数是不是Function类型
       * @param {*} o 待判断的对象
       * @returns  true  是Function对象   false  不是Function对象
       */
      isFunction: (o) =>
        Object.prototype.toString.call(o) === "[object Function]",
      /**
       * @function  类型判断： 判断传入的参数是不是Date类型
       * @param {*} o 待判断的对象
       * @returns  true  是Date对象   false  不是Date对象
       */
      isDate: (o) => Object.prototype.toString.call(o) === "[object Date]",
      /**
       * @function  类型判断： 判断传入的参数是不是Object类型
       * @param {*} o 待判断的对象
       * @returns  true  是Date对象   false  不是Date对象
       */
      isObject: (o) => Object.prototype.toString.call(o) === "[object Object]",
      /**
       * @function  类型判断： 判断传入的参数是不是RegExp类型
       * @param {*} o 待判断的对象
       * @returns  true  是RegExp对象   false  不是RegExp对象
       */
      isRegExp: (o) => Object.prototype.toString.call(o) === "[object RegExp]",
      /**
       * @function  深拷贝
       * @param {*} o
       */
      cloneDeep: function (o) {
        var res;
        switch (typeof o) {
          case "undefined":
            break;
          case "string":
            res = o + "";
            break;
          case "boolean":
            res = !!o;
            break;
          case "number":
            res = o + 0;
            break;
          case "object":
            if (o == null) {
              res = null;
            } else {
              if (handler.isArray(o)) {
                res = [];
                handler.each(o, (v) => res.push(handler.cloneDeep(v)));
              } else if (handler.isDate(o)) {
                res = new Date();
                res.setTime(o.getTime());
              } else if (handler.isObject(o)) {
                res = {};
                handler.each(o, (v, k) => {
                  res[k] = handler.cloneDeep(v);
                });
              } else if (handler.isRegExp(o)) {
                res = new RegExp(o);
              } else {
                res = o;
              }
            }
            break;
          default:
            res = o;
            break;
        }
        return res;
      },
      /**
       * @function 返回传入值位于数组or字符串 的下标
       * @param {*} a  数组 or 字符串
       * @param {*} v  待判断的值, 可以是单个字符，也可以是一个字符串
       * @returns      下标
       */
      indexOf: (a, v) => {
        let index = -1;
        handler.every(a, (a1, i) => {
          if (a1 == v) {
            index = i;
            return false;
          }
        });
        return index;
      },
      /**
       * @function 遍历数组 or 对象(这个回调函数的返回值对遍历没得影响)
       * @param {*} o   数组 or 对象
       * @param {*} cb  回调函数
       *   arg0   遍历值
       *   arg1   下标
       *   arg2   数组or对象
       */
      each: (o, cb) => {
        let key;
        //优先处理数组结构
        if (handler.isArray(o)) {
          for (key = 0; key < o.length; key++) {
            cb && handler.isFunction(cb) && cb(o[key], key, o);
          }
        } else {
          for (key in o) {
            cb && handler.isFunction(cb) && cb(o[key], key, o);
          }
        }
      },
      /**
       * @function 遍历数组 or 对象 直到迭代回调函数返回false 或者 迭代结束
       * 与上面的遍历不同
       * @param {*} o
       * @param {*} cb
       * @returns
       */
      every: (o, cb) => {
        let key;
        //优先处理数组结构
        if (handler.isArray(o)) {
          for (key = 0; key < o.length; key++) {
            if (cb && handler.isFunction(cb)) {
              if (cb(o[key], key, o) === false) break;
            }
          }
        } else {
          for (key in o) {
            if (cb && handler.isFunction(cb)) {
              if (cb(o[key], key, o) === false) break;
            }
          }
        }
      },
      /**
       * @function 字符串前后去空格
       * @param {*} s
       * @returns
       */
      trim: (s) => $.trim(s),
      /**
       * @function 参数合并
       * @desc
       *   值得注意的是 jq的后面的参数没有值 它就不以最后一个为准了。所以后面的值必须给出默认值''
       */
      assign: (...params) => $.extend.call(this, ...params),
      /**
       * @function 用标点符号将数组拼接成字符串
       * @param {*} a  数组
       * @param {*} m  拼接字符
       * @returns 拼接好的字符串
       */
      join: (a, m) => {
        var res = "";
        handler.each(a, (v) => {
          res += String(v) + m;
        });
        if (res != "") res = res.substring(0, res.length - m.length);
        return res;
      },
      /**
       * @function 数组过滤，返回回调为true的数组。 返回的是一个全新的数组
       * @param {*} o   数组对象
       * @param {*} cb  回调函数
       * @returns
       */
      filter: (o, cb) => {
        var res = [];
        _lodash.each(o, function (v, k) {
          if (cb && handler.isFunction(cb)) {
            if (cb(v, k, o)) res.push(v);
          }
        });
        return res;
      },
      /**
       * @function 字符串小驼峰,  这里简单处理成全部转成小写字符了
       * @param {*} s  待转化字符
       * @returns      转化后的字符
       */
      camelCase: (s) => String(s).toLowerCase(),
      /**
       * @function 反转数组,这里只好用原生的代替了
       */
      reverse: (a) => a.reverse(),
      /**
       * @function  数组排序
       * @param {*} array  待排序数组
       * @param {*} cb     回调函数
       * @returns
       */
      sortBy: (array, cb) => {
        if (!handler.isArray(array)) {
          let temp = [];
          handler.each(array, (v) => temp.push(v));
          array = temp;
        }
        return array.sort(function (a, b) {
          return cb(b) - cb(a);
        });
      },
      /**
       * @function 遍历数组, 移除回调函数返回为true的项，并将被移除的项返回
       * @param {*} o
       * @param {*} cb
       * @desc
       *     也就是说它会修改原来的数组，只保留返回值不为true的。
       *     哪些返回值为true的会封装到一个新的数组里面返回
       */
      remove: function (o, cb) {
        let res = [];
        handler.each(o, function (v, k, a) {
          if (cb && handler.isFunction(cb)) {
            if (!!cb(v, k, o)) {
              res.push(v);
              a.splice(k, 1);
            }
          }
        });
        return res;
      },
      /**
       * @function 获取对象的所有key
       */
      keys: (o) => Object.keys(o),
      /**
       * @function 检查字符串s是否以字符 t 打头
       * @param {*} s
       * @param {*} t
       * @returns
       */
      startsWith: (s, t) => String(s).startsWith(t),
      /**
       * @function 判断两个对象是否相等
       * @param {*} o0
       * @param {*} o1
       */
      isEqual: (o0, o1) => {
        // 参数有一个不是对象 直接判断值是否相等就行
        if (!handler.isObject(o0) || !handler.isObject(o1)) return o0 === o1;
        // 先比较keys的个数，如果个数不相同 直接就不相等了
        if (handler.keys(o0).length !== handler.keys(o1).length) return false;
        // 以o0为基准 和 o1依次递归比较
        for (let key in o0) {
          const res = handler.isEqual(o0[key], o1[key]);
          if (!res) return false;
        }
        return true;
      },
    };
    return handler;
  }

  // 修改这个变量不再对外提供
  let _lodash = buildLodash();

  /**
   * 设置默认颜色(主题颜色)
   */
  $(function () {
    var mainColor = getComputedStyle(document.documentElement).getPropertyValue(
      "--tile-main-color"
    );
    document.documentElement.style.setProperty(
      "--tile-main-color",
      constant.DEFAULT_COLOR
    );
  });

  /**
   * @constructor windowsTile块构造函数
   * @param {*} object 传入的配置参数
   * @desc
   *
   *  一、属性
   *  1. id {String} (必填) 这个是块的唯一编号，
   *  2. name {String} (选填) 块的名称，展示在title上面，可以为空。因为是允许用户去输入框里面进行修改的
   *  3. tileSource {Array} (选填) 初始化的时候从配置项中读取的tile配置参数，后面转换成 source
   *  4. source {Array} 块中各个 {@linkplain tile 磁贴配置项} 的配置内容,这是块在处理过程中生成的一个配置项
   *  5. matrix {Array} 块对应的二维数组，这个可以简单描述为tile在块上面的分布情况，
   *                  在后面计算tile移动的时候需要用到,这是块在处理过程中生成的一个配置项
   *  6. DOM 块所对应的jQuery对象,这是块在初始化过程中生成的对象
   *  7. x   块配置项的offsetLeft系数。由于当前只设计了一列，这个值统一取0
   *  8. w   块配置项的宽度(像素点),由于磁贴只设计最多三列，所以这个宽度取3倍的{@linkplain constant.CAPACITY 标准长度}
   *  9. y   块配置项的offsetTop像素值。这个是在处理块的过程中计算出来的。
   *      计算方式，它前一个块的y值 加 高度
   *  10. h  块配置项的高度像素值。这个是在处理块的过程中计算出来的。
   *      计算方式, 二维数组的长度 * {@linkplain constant.CAPACITY 标准长度} 加上 {@linkplain constant.TITLE_HEIGHT 块标题高度}
   *
   */
  let struct = function (object = {}) {
    this.id = object.id || "";
    this.name = object.name || "";
    this.x = 0;
    this.y = 0;
    this.w = constant.CAPACITY * 3;
    this.h = 0;
    this.source = [];
    this.matrix = [];
    const flag = object.source && object.source instanceof Array;
    this.tileSource = flag ? object.source : [];
  };

  /**
   * @constructor windowsTile磁贴描述对象构造函数
   * @param {*} object
   * @desc
   *
   *  一、属性
   *  1. id  {String} (必填) 这个是块的唯一编号
   *  2. name {String} (选填) 这个是磁贴的名称，一般会作为这个的title ,如果没有给出img配置项，这个内容会和 color配置项组成DOM的主体
   *  3. img {String} (选填) 引用图片路径
   *  4. color {String} (选填) rgba、hex等颜色字符串
   *  ** 磁贴主体优先级 ： img > name + color > name
   *
   *  5. x {Number} (必填) 磁贴的横坐标
   *  6. y {Number} (必填) 磁贴的纵坐标
   *  7. w {Number} (必填) 磁贴的宽度系数
   *  8. h {Number} (必填) 磁贴的高度系数
   *  9. DOM 磁贴所对应的jQuery对象，这是磁贴在初始化过程中生成的对象
   *  10. move  这个磁贴是否正在移动，(true 正在移动，默认false)
   *    在移动磁贴块时加上这个标记可以方式在块刷新磁贴位置时影响到这个磁贴
   *  10. cb  这个磁贴点击后的回调方法，一般的默认是调用layui.layer.open(id)
   */
  let tile = function (object = {}) {
    this.id = object.id;
    this.name = object.name || "";
    this.img = object.img || "";
    this.color = object.color || "";
    this.x = object.x || 0;
    this.y = object.y || 0;
    this.w = object.w || 1;
    this.h = object.h || 1;
    this.move = false;
    this.cb = object.cb || callBackMap[object.id];
  };

  /**
   * 判断两个数组的各项值是否相等
   * @param {*} a
   * @param {*} b
   * @returns
   * @desc
   *
   *    由于{@linkplain _lodash.isEqual 判断两个值是否相等} 这个方法是重新写的
   * 在判断两个数组是否相等这样的情况不理想。这个在网上找了一个方法来专门判断二维数组当中的
   * 向量是否和空向量相等
   *
   */
  let isEqual = function (a, b) {
    const classNameA = toString.call(a);
    const classNameB = toString.call(b);
    // 如果数据类型不相等，则返回false
    if (classNameA !== classNameB) {
      return false;
    } else {
      // 如果数据类型相等，再根据不同数据类型分别判断
      if (classNameA === "[object Object]") {
        for (let key in a) {
          if (!isEqual(a[key], b[key])) return false;
        }
        for (let key in b) {
          if (!isEqual(a[key], b[key])) return false;
        }
        return true;
      } else if (classNameA === "[object Array]") {
        if (a.length !== b.length) {
          return false;
        } else {
          for (let i = 0, len = a.length; i < len; i++) {
            if (!isEqual(a[i], b[i])) return false;
          }
          return true;
        }
      } else if (classNameA === "[object Function]") {
        return a.toString() === b.toString();
      } else {
        return Object.is(a, b);
      }
    }
  };

  /**
   * 计算目标的dom与当前移动的dom交叉面积是否大于移动dom面积的一半
   * @param {*} targetDom 目标dom
   * @param {*} moveDom   移动dom
   * @returns 是否大于
   * @desc
   *
   *    网上是直接用两个dom的left() top() 比较的
   * 这里存在跨块的比较: 磁贴和其它块比较不再一个div中的位置没有对比性。
   * 这个改成了从 getBoundingClientRect() 里面取绝对位置
   */
  let isCross = function (targetDom, moveDom) {
    if (targetDom === moveDom) return false;
    let targetOffsetLeft = parseInt(
      targetDom.get(0).getBoundingClientRect().left
    );
    let targetOffsetTop = parseInt(
      targetDom.get(0).getBoundingClientRect().top
    );
    let targetCrossLeft = targetOffsetLeft + parseInt(targetDom.width());
    let targetCrossTop = targetOffsetTop + parseInt(targetDom.height());
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
    return stackArea >= moveArea * 0.3;
  };

  /**
   * @namespace 方法集合
   */
  const tileProxy = {
    /**
     * @function 创建一个{@linkplain windowsTile 磁贴管理对象}
     * @param {*} destination 需要被渲染的目的地  jq对象
     * @param {*} options 配置参数，现在仅支持data配置项是描述各个块和磁贴的配置项
     * @returns 返回一个 {@linkplain windowsTile 磁贴管理对象}
     * @desc
     *
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     *
     *    根据传入的配置项参数(options)主要是磁贴属性，将它们保存在管理对象的data中
     * 并将生成的dom插入 destination
     * 创建管理对象的必要属性，最后还要对dom添加监听事件
     */
    build(destination, options = {}) {
      /**
       * 1. 确定渲染的目的地。
       * 为了方便后面的添加事件监听，磁贴里面的dom是动态变化的
       * 所以这里采用的是jq里面的代理监听模式。
       * 基于上面的原因，这个目的地，是一个jq对象
       */
      this.destination = $(destination);

      /**
       * 2. 初始化管理对象使用过程中需要使用到的临时参数
       */
      tileProxy.initTemporary.call(this);

      // 由于layui.data不能缓存function 这里提前将配置项里面的回调函数做一个缓存
      tileProxy.setCallBack.call(this, options.data);

      // 设置缓存的key
      this.cacheKey = options.cacheKey || layui.cache.tileKey || "windowsTile";

      // 首先尝试从缓存中读取
      let cache = null;
      if (constant.ENABLE_CACHE) cache = tileProxy.getData.call(this);

      /**
       * 3. 初始化磁贴块配置项，将结果全部放入 this.data 中
       */
      tileProxy.initData.call(this, cache || options.data);

      // 初始化额外块的位置
      tileProxy.updateExtraPosition.call(this);

      /**
       * 4. 添加事件监听
       */
      tileProxy.addListener.call(this);

      /**
       * 5.执行动画任务
       */
      tileProxy.doAnimate.call(this);

      return this;
    },

    /**
     * @method 设置回调函数
     * @desc
     *
     *  这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    setCallBack(source) {
      if (!_lodash.isArray(source)) source = [source];
      _lodash.each(source, (value) =>
        _lodash.each(value.source, (s) => {
          if (s.cb && _lodash.isFunction(s.cb)) callBackMap[s.id] = s.cb;
        })
      );
    },

    /**
     * @inner 从layui.data里面获取之前缓存的数据
     */
    getData() {
      return layui.data(this.cacheKey).build
        ? layui.data(this.cacheKey).build
        : null;
    },

    /**
     * @inner 将配置信息缓存进layui.data中
     * @description
     *
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    setData() {
      let self = this,
        data = [];
      _lodash.each(self.data, (s) => {
        let structConfig = {
          id: s.id,
          name: s.name || "",
          source: [],
        };
        _lodash.each(s.source, (t) => {
          structConfig.source.push({
            id: t.id,
            name: t.name || "",
            img: t.img || "",
            color: t.color || "",
            x: t.x || 0,
            y: t.y || 0,
            w: t.w || 1,
            h: t.h || 1,
            cb: t.cb,
          });
        });
        data.push(structConfig);
      });
      layui.data(this.cacheKey, {
        key: "build",
        value: data,
      });
    },

    /**
     * 清空缓存信息
     */
    resetData(){
      layui.data(this.cacheKey, {
        key: "build",
        remove: true,
      });
    },

    /**
     * @function 为{@linkplain windowsTile 磁贴管理对象}初始化临时参数
     * @this 这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     * @desc
     *
     *    currentStruct 当前选中的 {@linkplain struct 块结构对象}
     *    currentState  当前缓存的块状态，内含二维数组和磁贴的y坐标信息
     *    currentTile   当前选中的 {@linkplain tile 磁贴对象}
     *    currentPointX 当前鼠标的X位置
     *    currentPointY 当前鼠标的Y位置
     */
    initTemporary() {
      /**
       * @inner {*} 当前选中的{@linkplain struct 块结构对象}
       * @desc
       *
       *    在鼠标移动块或者磁贴时(移动磁贴就取它当前所属的块)，将这个块的信息记录下来
       * 代表当前就对这个块进行操作。
       *
       *    相关变量: {@linkplain this.currentTile 磁贴对象}
       */
      this.currentStruct = null;

      /**
       * @inner {*} 当前选中的{@linkplain tile 磁贴对象}
       * @desc
       *
       *    在鼠标移动磁贴时，将这个磁贴的信息记录下来,代表当前就对这个磁贴进行操作。
       *  1. 在选中磁贴的时候即有磁贴被选中，又有块被选中。
       *  2. 在选中块时，只有块被选中。
       *  通过上面两点，可以来判断当前是块被选中还是磁贴被选中
       */
      this.currentTile = null;

      /**
       * @inner {Number} 当前鼠标的X位置
       */
      this.currentPointX = 0;

      /**
       * @inner {Number} 当前鼠标的Y位置
       */
      this.currentPointY = 0;

      /**
       * @inner {Number} 当前
       */
      this.currentScrollY = 0;

      /**
       * @inner {*} 当前缓存的块信息
       * @desc
       *
       *    在修改磁贴的位置信息时，由于一些操作会大幅度的修改当前的块信息
       * 在每一次修改块信息之前，都应该将它这个时刻的重要信息备份一遍，方便后面来还原
       * 由于块信息里面包含DOM的jq对象，这里就不直接缓存块对象了。仅记录可能被修改的信息
       *    1. matrix 二维数组。块信息中是以它来作为磁贴块之间碰撞检测的依据，
       *  所以在磁贴移动时，这个二维数组不可避免的会被修改。
       *    2. pos 每个磁贴的 y 坐标信息。在磁贴移动时，一般是将其它磁贴的y进行修改来达到为当前磁贴让位的操作。
       *  磁贴配置项里面也有DOM信息。所以单单缓存它的y值
       */
      this.currentState = null;

      /**
       * @inner {*} 磁贴动画样式集合
       */
      this.classes = [];

      /**
       * @inner {*} 磁贴动画系数(为0不参与动画)
       */
      this.liveness = 0;
    },

    /**
     * @inner 为{@linkplain windowsTile 磁贴管理对象}初始化磁贴块配置项 data
     * @param {*} source 磁贴块配置项 Object  or  [Object] 数组
     * @desc
     *
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
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
     *                  color: {String}(选填) rgba、hex等颜色字符串
     *                  x: {Number} (选填) 磁贴的横坐标,默认是0
     *                  y: {Number} (选填) 磁贴的纵坐标,默认是0
     *                  w: {Number} (选填) 磁贴的宽度系数,默认是1
     *                  h: {Number} (选填) 磁贴的高度系数,默认是1
     *                  cb：{Function} (选填) 磁贴点击后的回调方法,一般的默认是调用layui.layer.open(id)
     *              }
     *          ]
     *    }
     */
    initData(source) {
      /**
       * 1. 参数处理:
       *    接下来使用方法来对传入的参数进行遍历。由于这个遍历方法对Object也有特殊处理:
       * 会转而遍历Object的key-value。
       *    为了避免上面的情况发生，保证遍历的都是磁贴块配置项。所以这里对参数进行判断：
       * 如果它不是数组就将它转化成数组。
       */
      if (!_lodash.isArray(source)) source = [source];

      /**
       * 2. 初始化data
       * 在 {@linkplain windowsTile 磁贴管理对象} 中是以名为 data 的变量保存所有的磁贴块信息的
       * 这里需要对它进行初始化。它是一个数组
       */
      if (!this.data) this.data = [];

      // 新增，添加一个占位置的div
      this.destination.append(
        $(`<div class = "${constant.STRUCT_EXTRA_CLASS}"></div>`)
      );

      /**
       * 3. 遍历  source  参数。将结果放入 data中
       * 这里在放入之前要将 参数先转化成 {@linkplain struct 块结构对象} 。
       * 还要将这个 {@linkplain tileProxy.initStruct 块对象初始化}。 完成它和它下属的磁贴配置项初始化
       */
      let self = this;
      _lodash.each(source, (value) =>
        self.data.push(tileProxy.initStruct.call(self, new struct(value)))
      );
    },

    /**
     * @method 添加事件监听
     * @desc
     *    这里添加的事件有:
     *
     *  一、 点击类事件
     *
     *    1.1 点击
     *
     *  二、 移动类事件: 移动类事件分为鼠标按下进行捕获，鼠标移动触发移动事件，鼠标抬起释放捕获。
     *  其中鼠标移动和抬起这两个事件放在body上面进行触发，这样如果移动出磁贴区域的范围也不会断掉事件的触发
     *  在鼠标按下的时候根据按下的不同内容(磁贴 or 块)。如果是按下磁贴
     *
     *
     *
     *
     *
     */
    addListener() {
      let self = this,
        $body = $("body");

      /**
       * 块结构的鼠标按下事件
       */
      self.destination.on(
        constant.EVENT_DOWN,
        // "mousedown",  修改,适应移动端的事件操作
        "." + constant.STRUCT_CLASS,
        function (e) {
          // 首先获取块的唯一标识  id
          let id = e.target.getAttribute("lay-struct-id");
          if (!id) return;
          /**
           * 记录下当前的块结构(通过id)
           */
          tileProxy.recordStructById.call(self, id);
          /**
           * 记录下当前的鼠标位置
           */
          tileProxy.updatePointPosition.call(self, e);
        }
      );

      self.destination.on(
        constant.EVENT_DOWN,
        // "mousedown", 修改,适应移动端的事件操作
        ".layui-layer-struct-name",
        function (e) {
          // 修改,适应移动端的事件操作,防止在移动端出现点击不能输入的问题
          if(!layui.device().mobile){
            e.stopPropagation();
            e.preventDefault();
          }
          // 修改,适应移动端的事件操作
          if(layui.device().mobile && !e.clientX){
            e.clientX = event.changedTouches[0].clientX;
            e.clientY = event.changedTouches[0].clientY;
          }
          // 首先获取块的唯一标识  id
          let $parent = $(e.target);
          let id = $parent.attr("struct-id");
          if (!id) {
            // 不清楚什么情况，定位到子 div中了，所以从父节点里面再尝试获取一次
            $parent = $parent
              .parents()
              .filter("." + constant.STRUCT_NAME_CLASS);
            id = $parent.attr("struct-id");
          }
          if (!id) return;
          /**
           * 记录下当前的块结构(通过id)
           */
          tileProxy.recordStructById.call(self, id);
          /**
           * 记录下当前的鼠标位置
           */
          tileProxy.updatePointPosition.call(self, e);

          /**
           * 记录待比较的鼠标位置
           */
          constant.EVENTX = e.clientX;
          constant.EVENTY = e.clientY;
        }
      );

      self.destination.on(/*"mousedown" 修改,适应移动端的事件操作*/ constant.EVENT_DOWN, "." + constant.TILE_CLASS, function (e) {
        // 修改,适应移动端的事件操作
        if(layui.device().mobile && !e.clientX){
          e.clientX = event.changedTouches[0].clientX;
          e.clientY = event.changedTouches[0].clientY;
        }

        /**
         * 获取当前的磁贴id和磁贴所属的块id
         * 两者缺一不可
         */
        let id = e.target.getAttribute("lay-tile-id");
        let pid = e.target.parentElement.getAttribute("lay-struct-id");
        if (!id || !pid) return;
        /**
         * 记录下当前的磁贴结构(通过id)
         * 这里不顺便记录块信息是因为：
         *    在这个点击触发之后会触发上面的块点击事件，为了避免重复捕获，这里就不处理块了
         *    还是要在这个随后处理块，因为这里的操作会把磁贴的dom转移到外层容器去
         */
        tileProxy.recordTileById.call(self, id, pid);

        /**
         * 记录下当前的块结构(通过id)
         */
        tileProxy.recordStructById.call(self, pid);

        /**
         * 记录下当前的鼠标位置
         */
        tileProxy.updatePointPosition.call(self, e);
        /**
         * 记录待比较的鼠标位置
         */
        constant.EVENTX = e.clientX;
        constant.EVENTY = e.clientY;
      });

      $body.on(/*"mousemove" 修改,适应移动端的事件操作*/ constant.EVENT_MOVE, function (e) {
        /**
         * 触发块移动监测
         */
        tileProxy.onMovingStruct.call(self, e);
        /**
         * 触发磁贴移动监测
         */
        tileProxy.onMovingTile.call(self, e);
      });

      /**
       * 添加tile区域禁用移动端滑动事件
       */
      self.destination.on(constant.EVENT_MOVE, function (e) {
          // 修改,适应移动端的事件操作
          if(layui.device().mobile && e.scale !== 1){
            e.preventDefault();
          }
        }
      );

      // if(layui.device().mobile)
      //   self.destination.get(0).addEventListener(constant.EVENT_MOVE, function(e){
      //     // 修改,适应移动端的事件操作
      //     if(layui.device().mobile && !e.clientX){
      //       e.clientX = event.changedTouches[0].clientX;
      //       e.clientY = event.changedTouches[0].clientY;
      //     }
      //     // 阻止移动端上滑和下滑出现的滚动屏幕事件
      //     if(constant.EVENTY != e.clientY || constant.EVENTX != e.clientX) e.preventDefault();
      //   }, {passive: false});

      $body.on(/*"mouseup" 修改,适应移动端的事件操作*/ constant.EVENT_UP, function (e) {
        /**
         * 结束磁贴移动监测
         */
        tileProxy.onMovedTile.call(self, e);
        /**
         * 结束块移动监测
         */
        tileProxy.onMovedStruct.call(self, e);

        /**
         * 更新鼠标位置
         */
        tileProxy.updatePointPosition.call(self, e);
      });

      /**
       * 块名称点击事件
       * 修改点击事件不用吧click事件
       */
      self.destination.on(
        constant.EVENT_UP,
        "." + constant.STRUCT_NAME_CLASS,
        function (e) {

          // 修改,适应移动端的事件操作
          if(layui.device().mobile && !e.clientX){
            e.clientX = event.changedTouches[0].clientX;
            e.clientY = event.changedTouches[0].clientY;
          }
          // 判断是触发的点击事件还是移动事件
          if (constant.EVENTX != e.clientX || constant.EVENTY != e.clientY)
            return;
          // 修改,防止点击修改名称列时,块移动事件没有正确结束
          // e.stopPropagation();
          e.preventDefault();
          // 首先获取块的唯一标识  id
          let $parent = $(e.target);
          let id = $parent.attr("struct-id");
          if (!id) {
            // 不清楚什么情况，定位到子 div中了，所以从父节点里面再尝试获取一次
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
          // 输入框获得焦点
          let $input = $parent.find(".layui-layer-struct-input");
          $input.focus();
          // 将焦点暂时调整到末尾
          $input.get(0).selectionStart = $input.val().length;
          $input.get(0).selectionEnd = $input.val().length;
        }
      );

      /**
       * 输入框失去焦点事件，输入完毕
       */
      self.destination.on("blur", ".layui-layer-struct-input", function (e) {
        tileProxy.onModifiedStructName.call(self, e);
        constant.ENABLE_CACHE &&
          constant.AUTO_CACHE &&
          tileProxy.setData.call(self, e);
      });

      /**
       * 输入框输入回车键，输入完毕
       */
      self.destination.on("keydown", ".layui-layer-struct-input", function (e) {
        if (e.keyCode === 13) {
          tileProxy.onModifiedStructName.call(self, e);
          constant.ENABLE_CACHE &&
            constant.AUTO_CACHE &&
            tileProxy.setData.call(self, e);
        }
      });
    },

    /**
     * @method 在新增块的时候获取块id
     */
    createStructId() {
      let self = this,
        flag = true;
      while (flag) {
        constant.STRUCTID++;
        _lodash.every(self.data, (data) => {
          if (Number(data.id) == constant.STRUCTID) flag = false;
          return flag;
        });
        flag = !flag;
      }
      return constant.STRUCTID;
    },

    /**
     * @method 根据id捕获对应的块
     * @param {*} id 块的id
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    recordStructById(id) {
      let self = this;
      _lodash.every(self.data, (data) => {
        if (data.id == id) {
          tileProxy.recordStruct.call(self, data);
          return false;
        }
        return true;
      });
    },

    /**
     * @method 捕获块
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    recordStruct(structInstance) {
      this.currentStruct = structInstance;
      // 更新额外块的位置
      tileProxy.updateExtraPosition.call(this);
      if (this.currentTile) {
        // 如果捕获到了磁贴，说明是在操作磁贴
        // 记录下当前块的信息，方便后期的回滚
        this.currentState = {
          matrix: _lodash.cloneDeep(this.currentStruct.matrix),
        };
        let pos = {};
        _lodash.each(this.currentStruct.source, (d) => (pos[d.id] = d.y));
        this.currentState.pos = pos;
      } else {
        // 如果没有捕获到磁贴，当前仅操作块
        // 给这个块添加上选中的样式，确保它在移动的时候不被其它的磁贴所遮挡
        this.currentStruct.DOM.removeClass(
          constant.STRUCT_SELECTED_CLASS
        ).addClass(constant.STRUCT_SELECTED_CLASS);
      }
    },

    /**
     * @method 根据id捕获对应的磁贴
     * @param {*} id 磁贴的id
     * @param {*} pid 磁贴所属的块的id
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    recordTileById(id, pid) {
      let self = this;
      _lodash.every(self.data, (data) => {
        if (data.id == pid) {
          self.currentStruct = data;
          _lodash.every(data.source, (source) => {
            if (source.id == id) {
              self.currentTile = source;
              self.currentTile.move = true;
              // 给这个磁贴添加上选中的样式，确保它在移动的时候不被其它的磁贴所遮挡
              this.currentTile.DOM.removeClass(
                constant.STRUCT_SELECTED_CLASS
              ).addClass(constant.STRUCT_SELECTED_CLASS);
              // 将磁贴DOM放入 destination 中
              let tileTop =
                self.currentTile.DOM.get(0).getBoundingClientRect().top;
              let tileLeft =
                self.currentTile.DOM.get(0).getBoundingClientRect().left;
              let top = self.destination.get(0).getBoundingClientRect().top;
              let scroll = self.destination.get(0).scrollTop;
              let left = self.destination.get(0).getBoundingClientRect().left;
              self.currentTile.DOM.remove();
              self.destination.append(self.currentTile.DOM);
              self.currentTile.DOM.css({
                top: parseFloat(tileTop - top + scroll) + "px",
                left: parseFloat(tileLeft - left) + "px",
              });
              return false;
            }
            return true;
          });
          return false;
        }
        return true;
      });
    },

    /**
     * @method 更新当前的鼠标位置
     * @param {*} e
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    updatePointPosition(e) {
      // 修改,适应移动端的事件操作
      if(layui.device().mobile && !e.clientX){
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }
      this.currentPointX = e.clientX;
      this.currentPointY = e.clientY;
    },

    /**
     * @inner 初始化块结构
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @returns 返回{@linkplain struct 块结构配置项}初始化结束的实例
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    initStruct(structInstance) {
      let self = this;
      /**
       * 1. 首先将这个块对应的jQuery对象创建出来
       */
      if (!structInstance.DOM)
        structInstance.DOM = $(`
          <div class = "layui-layer-struct" lay-struct-id = "${
            structInstance.id
          }">
            <div class = "layui-layer-struct-name" struct-id = "${
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
                  <input type = "text" class = "layui-layer-struct-input" value = "${
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
      /**
       * 2.根据配置项 tileSource 将它所属的 {@linkplain tileProxy.initTile 磁贴配置项初始化} 并放入它的 source 列表中
       */
      _lodash.each(structInstance.tileSource, function (tileDesc) {
        tileProxy.initTile.call(self, structInstance, new tile(tileDesc));
      });

      /**
       * 3. 由于加入了磁贴配置项，这个操作会更新它下面的二维数组。
       * 所以这里需要 {@linkplain tileProxy.updateStructShape 更新块形状}
       */
      tileProxy.updateStructShape.call(self, structInstance);

      /**
       * 3. 将当前的块对应的dom加入到 destination 渲染目的地里面去
       * 但是这个块在此时还并没有加入到 this.data 中
       */
      this.destination.append(structInstance.DOM);

      /**
       * 4. 更新块的dom的位置
       * 在上面是将它加入到页面上，紧接着应该微调它的位置，
       * 在这一步可能会改变这个块和它随后的块的位置
       */
      tileProxy.updateStructPosition.call(this, structInstance);

      /**
       * 5. 更新块所属的磁贴的位置
       */
      tileProxy.updateTilePosition.call(this, structInstance);

      /**
       * 6. 返回这个实例
       */
      return structInstance;
    },

    /**
     * @method 更新块形状
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    updateStructShape(structInstance) {
      /**
       * 1. 首先是计算当前块它应该所处的位置。
       * 由于只有一排磁贴组，所以这里简化了，只计算 y 坐标
       * y 坐标的计算 是以上一个块的 y 值 加上 上一个块 h 值
       */
      // 假定它是第一项
      let y = 0;
      if (this.data.length > 0) {
        // 获取它的坐标
        let index = _lodash.indexOf(this.data, structInstance);
        /**
         * 如果上面获取到的值是 -1 那么说明当前的块还没有加进来。
         * 这个块处于即将添加进入的状态，所以此时它的坐标取当前data的长度。
         * 这个坐标减一 刚好是data 最后一个元素的坐标
         */
        if (index < 0) index = this.data.length;
        /**
         * 修改了一个问题,当index = 0 时下面查找不到
         */
        if (index > 0) {
          y += this.data[index - 1].y;
          y += this.data[index - 1].h;
        }
      }
      // 现在就可以将它的y坐标设置进去了
      structInstance.y = y;

      /**
       * 2. 二维数组 {@linkplain tileProxy.matrixReduce 去空向量}
       *
       *    接下来是计算当前块的高度，但是在此之前需要去空向量
       *    二维数组中匹配上了空向量，说明在块上这一排没有任何内容
       * 这个样子是需要将它舍去的，待处理好之后再来计算块的高度
       *    块高度 = 标题{@linkplain constant.TITLE_HEIGHT 块标题高度}
       *            + 二维数组从长度 * {@linkplain constant.CAPACITY 一个单位的像素长度}
       */
      tileProxy.matrixReduce.call(this, structInstance);
    },

    /**
     * @method 去掉二维数组里面的空行,并更新块的高度
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     */
    matrixReduce(structInstance) {
      /**
       * 1. 创建一个编辑日志，将接下来的改动记录在这个列表里面
       * 编辑日志的每一项包括:  y -> 二维数组开始更新的位置  o -> 二维数组更细的长度
       */
      let editLog = [];
      // 创建指针
      let point = 0;
      _lodash.each(structInstance.matrix, (v, k) => {
        if (isEqual(v, constant.EMPTY_VECTOR)) {
          // 这一排都是空的，应该移除
          // 1. 移除这一排 还是不再这里移除了，会影响后面的遍历
          // arr.splice(k, 1);
          // 2. 指针后移
          point++;
        } else {
          point = tileProxy.doMatrixReduce.call(this, point, k, editLog);
        }
      });
      // 最后如果指针没有归零，如果没有就将剩余的信息放入编辑日志中
      tileProxy.doMatrixReduce.call(
        this,
        point,
        structInstance.matrix.length,
        editLog
      );

      /**
       * 3. 根据编辑日志来修改二维数组
       * 新增，在这里更新 块里面的磁贴配置项的 y 值
       *
       *  这里选择从二维数组下方向上方更新
       * ( 这种更新方式和上面的编辑日志设计模式是匹配的:
       *    1. 上方的向量更新 仅 会影响它下方磁贴的值发生修改
       *    2. 从下方更新，每次更新就方便定位哪些是受影响的。
       *  因为每次受影响的值发生修改 y 值不会大于下一次的值，下一次还能选到它
       *    3. 同样的方式从上面更新，下方的磁贴 y值 一 修改，下一次的值就不能保证和 y 值的大小了
       *
       *    从下往上：
       *      每次受影响的磁贴 y 值大于 编辑日志里面记录的 y值即可 ，
       *    它们的 y 值经过这一次的修改之后。不会小于下一次更新的 y 值
       *    从上往下：
       *      一次修改，所有磁贴的y值一变化。下次修改就没法判断了
       *  )
       */
      while (editLog.length > 0) {
        /**
         * 获取编辑日志最新的一条更新日志来修改磁贴
         */
        let value = editLog.pop();
        /**
         * 从二维数组中移除空向量
         *  - y值是记录从二维数组的哪一项开始
         *  - 指针记录的是有多少个连续的空向量
         * 这里统一的一起删除
         */
        structInstance.matrix.splice(value.y, value.o);
        _lodash.each(structInstance.source, (tile) => {
          /**
           * 将y 值大于 起点的磁贴的全部y值上升 指针个个数
           */
          if (tile.y >= value.y) tile.y -= value.o;
        });
      }

      /**
       * 4. 更新块的高度
       */
      structInstance.h =
        constant.CAPACITY * structInstance.matrix.length +
        constant.TITLE_HEIGHT;
    },

    /**
     * @method 添加编辑日志
     * @see 在 {@linkplain tileProxy.matrixReduce 去掉二维数组里面的空行 }操作中被调用
     * @param {Number} point 指针位置
     * @param {Number} endPoint 二维数组结束位置
     * @param {Array} editLog 编辑日志
     */
    doMatrixReduce(point, endPoint, editLog) {
      if (point == 0) return point;
      editLog.push({
        y: endPoint - point,
        o: point,
      });
      return 0;
    },

    /**
     * @method 更新额外块的位置
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    updateExtraPosition() {
      let _y = 0,
        _bottom = null;
      _lodash.each(this.data, (data) => {
        if (data.y >= _y) {
          _y = data.y;
          _bottom = data;
        }
      });
      if (_bottom) {
        let _h = _bottom.y + _bottom.h;
        this.destination
          .find("." + constant.STRUCT_EXTRA_CLASS)
          .show()
          .css({
            top: _h + "px",
          });
      }
    },

    /**
     * @method 更新块结构的位置
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    updateStructPosition(structInstance) {
      /**
       * 1. 首先检查块结构的高度是否需要修改
       */
      if (structInstance.h != structInstance.DOM.height()) {
        /**
         * 2. 调整随后的块结构
         * 如果块DOM的高度和它配置项里面指定的高度不对等。
         * 那么应该将它随后的块的 offsetTop向上 or向下进行调整，为随后调整这个块的高度做准备
         */
        _lodash.each(this.data, (data) => {
          if (data.y > structInstance.y) {
            /**
             * 修改随后的块的 y 值 和它们 DOM的css样式
             */
            data.y += structInstance.h - structInstance.DOM.height();
            data.DOM.css({ top: data.y + "px" });
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
     * @method 更新块下面磁贴的位置
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    updateTilePosition(structInstance) {
      _lodash.each(structInstance.source, (tile) => {
        /**
         * 如果这个磁贴带有move属性，说明此时正在对它进行操作
         * 这个时候不能在这里修改它的位置
         */
        if (!tile.move)
          tile.DOM.css({
            top:
              constant.TITLE_HEIGHT +
              constant.TILE_PADDING +
              tile.y * constant.CAPACITY +
              "px",
            left: constant.TILE_PADDING + tile.x * constant.CAPACITY + "px",
            width:
              -2 * constant.TILE_PADDING + tile.w * constant.CAPACITY + "px",
            height:
              -2 * constant.TILE_PADDING + tile.h * constant.CAPACITY + "px",
            lineHeight:
              -2 * constant.TILE_PADDING + tile.h * constant.CAPACITY + "px",
          });
      });
    },

    /**
     * 磁贴注册
     * @method 初始化tile结构,并将它放入 {@linkplain struct 块实例} 中
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @param {*} tileInstance   传入{@linkplain tile 磁贴结构配置项}实例
     * @param {*} flag   是否阻止磁贴DOM加入块(true  是) 在移动操作中需要这样，防止动画不自然
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    initTile(structInstance, tileInstance, flag = false) {
      let self = this;
      /**
       * 1. 首先将这个块对应的jQuery对象创建出来
       */
      if (!tileInstance.DOM)
        tileInstance.DOM = $(`
          <div class = "layui-layer-tile" lay-tile-id = "${tileInstance.id}">
            <div class = "layui-layer-tile-name" style = "background-color:${
              tileInstance.color
                ? tileInstance.color
                : "rgba(" + constant.DEFAULT_COLOR + ", 1)"
            }">${
          !tileInstance.img
            ? tileInstance.name
            : `<img src = "${tileInstance.img}" />`
        }
            </div>
          </div>
        `);

      /**
       * 2. 将磁贴放入块中
       *
       * 首先在二维数组中做测试，返回可以放入的二维数组位置
       * 然后将这些位置上面填充进这个磁贴的id
       */
      if (structInstance.matrix.length < tileInstance.y + tileInstance.h)
        // 如果当前的二维数组长度不足就需要将它扩容到满足的大小
        tileProxy.matrixCapacity(
          structInstance.matrix,
          structInstance.matrix.length,
          tileInstance.y + tileInstance.h - structInstance.matrix.length
        );
      // 尝试获取二维数组的位置集
      let points = tileProxy.getMatrixFillResult(
        structInstance.matrix,
        tileInstance
      );
      if (!points) {
        /**
         * 如果这个tile不能顺利的插入到结构体的二维数组中
         * 那么在它即将插入的地方。二维数组插入一段能保证它顺利插入的空向量
         * 这个时候它必然可以顺利插入。但是这个时候 y 值小于等于它的必须被迫增加它的h高度这样的数值
         */
        tileProxy.matrixCapacity(
          structInstance.matrix,
          tileInstance.y,
          tileInstance.h
        );

        /**
         * 这个时候动了二维数组，上面的磁贴没得影响，但是下面的磁贴 y值应该进行修改一致。
         * 正是由于这一步的操作，
         * 后面才需要在初始化块结构之后 {@linkplain tileProxy.updateTilePosition 更新它下面的磁贴位置}
         *
         * 修改了一个bug,在判断时没有考虑到不同规格磁贴的重叠的问题
         */
        var fixLength = tileInstance.h;
        var fixFlag = false;
        _lodash.each(structInstance.source.sort((a, b) => a.y - b.y), (value) => {
          if (value.y  >= tileInstance.y){
            value.y += fixLength;
          } else if(value.y + value.h > tileInstance.y){
            fixLength = tileInstance.y - value.y + tileInstance.h;
            if(fixLength > tileInstance.h){
              fixFlag = true;
              // 删除原来的
              tileProxy.matrixReduceCapacity(structInstance.matrix,tileInstance.y,tileInstance.h)
              // 重新插入
              tileProxy.matrixCapacity(
                structInstance.matrix,
                value.y,
                fixLength,
              );
            }
            value.y += fixLength;
            // structInstance.h = structInstance.matrix.length * constant.CAPACITY
          }
          // if (value.y >= tileInstance.y) value.y += tileInstance.h;
        });
        // if(fixFlag){
        //   // 由于有不少插入操作导致坐标更新,这里再来更新一下坐标
        //   var _len = structInstance.matrix.length;
        //   structInstance.matrix = [];
        //   tileProxy.matrixCapacity(
        //     structInstance.matrix,
        //     structInstance.matrix.length,
        //     _len
        //   );
        //   _lodash.each(structInstance.source, (point) => {
        //     for(var i = point.x; i <= point.x + point.w; i ++){
        //       for(var j = point.y; j <= point.y + point.h; j ++){
        //         structInstance.matrix[j][i] = point.id;
        //       }
        //     }
        //   });
        // }
        /**
         * 重新获取待修改的二维数组坐标
         * 由于刚刚扩容了足够的空向量，这一步必然成功
         */
        points = tileProxy.getMatrixFillResult(
          structInstance.matrix,
          tileInstance
        );
      }

      /**
       * 根据上面获取到的位置集合，将当前磁贴的id填充入二维数组中占位置
       */
      _lodash.each(points, (point) => {
        structInstance.matrix[point.y][point.x] = tileInstance.id;
      });

      /**
       * 3. 将这个tile配置项加入到struct资源列表中
       */
      structInstance.source.push(tileInstance);

      /**
       * 4. 将dom放入块里面去
       */
      !flag && structInstance.DOM.append(tileInstance.DOM);
    },

    /**
     * 磁贴注销
     * @method 将磁贴配置项从块结构中移除
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @param {*} tileInstance   传入{@linkplain tile 磁贴结构配置项}实例
     * @param {*} flag   是否阻止操作磁贴DOM 默认 false
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     *    由于这个方法中会释放二维数组的空间，所以一般后面会针对这个块做下面的操作
     *    1. {@linkplain tileProxy.matrixReduce 去除二维数组中的空向量}
     *    2. {@linkplain tileProxy.updateTilePosition 更新块下面磁贴的位置}
     */
    logoutTile(structInstance, tileInstance, flag = false) {
      /**
       * 1. 移除磁贴的DOM
       */
      if (tileInstance.DOM && !flag) tileInstance.DOM.remove();
      /**
       * 2. 从块中的source列表中移除
       */
      _lodash.every(structInstance.source, (v, k, arr) => {
        if (v == tileInstance) {
          arr.splice(k, 1);
          return false;
        }
        return true;
      });

      /**
       * 3. 释放二维数组的空间
       * 这边还是修改成使用id释放吧
       */
      _lodash.each(structInstance.matrix, (vector, k1) => {
        if (tileInstance.y <= k1 && k1 < tileInstance.y + tileInstance.h) {
          _lodash.each(vector, (v, k, arr) => {
            if (tileInstance.x <= k && k < tileInstance.x + tileInstance.w)
              arr[k] = 0;
          });
        }
      });
    },

    /**
     * 移除块
     * @method 将块配置项从整体中移除
     * @param {*} structInstance 传入{@linkplain struct 块结构配置项}实例
     * @desc
     *
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    logoutStruct(structInstance) {
      let reduceHeight = structInstance.h - structInstance.DOM.height() - 30;
      let index = _lodash.indexOf(this.data, structInstance);
      this.data.splice(index, 1);
      structInstance.DOM.remove();
      _lodash.each(this.data, (data, k, arr) => {
        if (data.y > structInstance.y) {
          /**
           * 修改随后的块的 y 值 和它们 DOM的css样式
           */
          data.y += reduceHeight;
          data.DOM.css({ top: data.y + "px" });
        }
      });
    },

    /**
     * 获取磁贴在二维数组中的位置集
     * @param {*} matrix 二维数组
     * @param {*} tileInstance   传入{@linkplain tile 磁贴结构配置项}实例
     * @returns 带有 x, y 坐标的结果集 或者 null
     */
    getMatrixFillResult(matrix, tileInstance) {
      if (matrix.length == 0) return null;
      /**
       * 这里新增一个处理，磁贴系数 x, w 的合法性
       * 0 < w <= 向量长度
       * 0 <= x <= 向量长度 - w
       */
      if (tileInstance.w <= 0) tileInstance.w = 1;
      if (tileInstance.w > constant.EMPTY_VECTOR.length)
        tileInstance.w = constant.EMPTY_VECTOR.length;

      if (tileInstance.x < 0) tileInstance.x = 0;
      if (tileInstance.x > constant.EMPTY_VECTOR.length - tileInstance.w)
        tileInstance.x = constant.EMPTY_VECTOR.length - tileInstance.w;

      // res 结果集  flag + 默认是 false
      let res = [],
        flag = false;
      _lodash.every(matrix, (vector, k1) => {
        if (tileInstance.y <= k1 && k1 < tileInstance.y + tileInstance.h)
          // 继续遍历目标行的向量
          _lodash.each(vector, (v, k) => {
            if (tileInstance.x <= k && k < tileInstance.x + tileInstance.w) {
              /**
               * 符合条件的二维数组区域内的文字如果有一个不是 0
               * 就认为是有其它的tile占位置了，这个时候应该要将flag设置为true
               * 如果是符合条件的就将二维坐标放入res中
               */
              if (v == constant.EMPTY_VALUE) {
                res.push({
                  x: k,
                  y: k1,
                });
              } else {
                // 增加判断,可以利用自己原来的位置
                var _flag = false;
                _lodash.each(v, _v => {
                  if(_v != 0 && _v != tileInstance.id) _flag = true;
                })
                if(_flag){
                  flag = true;
                }else{
                  res.push({
                    x: k,
                    y: k1,
                  });
                }
              }
            }
          });
        return !flag;
      });
      // 如果没有找到位置 res为空 或者发现非空值 flag = true 都应该返回 null
      return !flag && res.length != 0 ? res : null;
    },

    /**
     * 二维数组扩容(扩容的是空向量)
     * @param {*} matrix 待扩容的二维数组
     * @param {*} start  扩容的起始位置
     * @param {*} size   扩容的大小
     */
    matrixCapacity(matrix, start, size) {
      while (size > 0) {
        matrix.splice(start, 0, _lodash.cloneDeep(constant.EMPTY_VECTOR));
        size--;
      }
    },

    /**
     * 二维数组删除(删除指定的向量)
     * @param {*} matrix 待删除的二维数组
     * @param {*} start  删除的起始位置
     * @param {*} size   删除的大小
     */
    matrixReduceCapacity(matrix, start, size){
      while (size > 0) {
        matrix.splice(start, 1);
        size--;
      }
    },

    /**
     * @method 监听块的移动(移动中)
     * @param {*} e
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    onMovingStruct(e) {
      // 修改,适应移动端的事件操作
      if(layui.device().mobile && !e.clientX){
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }
      /**
       * 1. 首先判断是否可以进入这个监听事件中
       * 捕获了块，但是没有捕获到磁贴。这种情况才能进入
       */
      if (!this.currentStruct || this.currentTile) return;
      /**
       * 2. 如果鼠标没有移动就不算
       * 由于只有一列块，有不允许它拖动出去，所以这里仅对offsetTop值进行处理
       */
      if (e.clientY == this.currentPointY) return;
      /**
       * 3. 如果没有动态的DOM产生就自动创建一个
       * 块操作中是将它直接放到 destination 里面 的
       */
      if (!this.dynamicDom) tileProxy.createDynamicDom.call(this);
      /**
       * 4. 移动当前的块所对应的DOM
       * 由于只有一列块，有不允许它拖动出去，所以这里仅对offsetTop值进行处理
       */
      this.currentStruct.DOM.css({
        top:
          parseFloat(this.currentStruct.DOM.css("top")) +
          (e.clientY - this.currentPointY) +
          "px",
      });
      /**
       * 5. 计算这个块的移动
       * 计算它是和上一个块的位置发生交换还是和下一个块的位置发生交换
       * 这里只考虑交换，所以不考虑对其它块的影响
       */
      // 获取当前被捕获的块位于data里面的坐标
      let index = _lodash.indexOf(this.data, this.currentStruct);
      /**
       * 满足条件:
       *  1. 鼠标是向上移动的
       *  2. 当前这个块不是第一个块
       *  3. 当前块的位置和它上一个块的位置相交超过50%
       * 就将当前的块和它上一个块进行交换，并捕获它上一个块
       */
      if (
        e.clientY < this.currentPointY &&
        index > 0 &&
        isCross(this.data[index - 1].DOM, this.currentStruct.DOM)
      )
        tileProxy.changeNearStruct.call(this, index, index - 1);
      /**
       * 满足条件:
       *  1. 鼠标是向下移动的
       *  2. 当前这个块不是最后一个块
       *  3. 当前块的位置和它下一个块的位置相交超过50%
       * 就将当前的块和它下一个块进行交换，并捕获它下一个块
       */
      if (
        e.clientY > this.currentPointY &&
        index < this.data.length - 1 &&
        isCross(this.data[index + 1].DOM, this.currentStruct.DOM)
      )
        tileProxy.changeNearStruct.call(this, index, index + 1);

      /**
       * 6. 更新动态的DOM的位置
       */
      this.dynamicDom.css({
        top: this.currentStruct.y + "px",
        width: this.currentStruct.DOM.width() + "px",
        height: this.currentStruct.h + "px",
      });

      /**
       * 7. 更新鼠标位置
       */
      tileProxy.updatePointPosition.call(this, e);
    },

    /**
     * @method 监听磁贴的移动(移动中)
     * @param {*} e
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    onMovingTile(e) {
      // 修改,适应移动端的事件操作
      if(layui.device().mobile && !e.clientX){
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }
      /**
       * 1. 首先判断是否可以进入这个监听事件中
       * 捕获了块，又捕获到磁贴。这种情况才能进入
       */
      if (!this.currentStruct || !this.currentTile) return;

      /**
       * 2. 如果没有动态的DOM产生就自动创建一个
       * 磁贴操作中是将它放到 对应的块里面
       */
      if (!this.dynamicDom) tileProxy.createDynamicDom.call(this);

      /**
       * 3. 移动当前的块磁贴对应的DOM
       * (新增)需要限制它的横坐标位置  0 <= x <= 最高的宽度
       */

      let tileOffsetLeft =
        parseFloat(this.currentTile.DOM.css("left")) +
        (e.clientX - this.currentPointX);
      if (tileOffsetLeft >= (3 - this.currentTile.w) * constant.CAPACITY)
        tileOffsetLeft = (3 - this.currentTile.w) * constant.CAPACITY;
      if (tileOffsetLeft < 0) tileOffsetLeft = 0;

      this.currentTile.DOM.css({
        top:
          parseFloat(this.currentTile.DOM.css("top")) +
          parseFloat(e.clientY - this.currentPointY) +
          "px",
        left: tileOffsetLeft + "px",
      });

      /**
       * 4. 计算这个磁贴的移动
       *   1 这个磁贴移动到上一个块
       *   2 这个磁贴移动到下一个块
       *   3 这个磁贴就在当前块中移动
       */
      // 获取当前被捕获的块位于data里面的坐标
      let index = _lodash.indexOf(this.data, this.currentStruct);
      /**
       * 判断是否移动到上一块中去
       *    - 鼠标向上滑动
       *    - 当前块不是第一块
       *    - 磁贴和上一块的交叉面积达到50%
       */
      let beforeFlag =
        e.clientY < this.currentPointY &&
        index > 0 &&
        isCross(this.data[index - 1].DOM, this.currentTile.DOM);
      /**
       * 判断是否移动到下一块中去
       *    - 鼠标向下滑动
       *    - 当前块不是最后一块
       *    - 磁贴和下一块的交叉面积达到50%
       */
      let afterFlag =
        e.clientY > this.currentPointY &&
        index < this.data.length - 1 &&
        isCross(this.data[index + 1].DOM, this.currentTile.DOM);

      /**
       * 判断是否移动到上面
       *    - 鼠标向上滑动
       *    - 当前块是第一块
       *    - 当前块的子节点不止一个
       */
      // let beforeInsert =
      //   e.clientY < this.currentPointY &&
      //   index == 0 &&
      //   this.currentStruct.source.length > 1;

      /**
       * 判断是否移动到下面
       *    - 鼠标向下滑动
       *    - 当前块是最后一块
       *    - 当前块的子节点不止一个
       */
      let afterInsert =
        e.clientY > this.currentPointY &&
        index == this.data.length - 1 &&
        !isCross(this.currentStruct.DOM, this.currentTile.DOM) &&
        this.currentStruct.source.length > 1;

      if (beforeFlag)
        tileProxy.changeTileToStruct.call(this, this.data[index - 1]);
      if (afterFlag)
        tileProxy.changeTileToStruct.call(this, this.data[index + 1]);

      // 在上面添加组还有问题，先添加往下面添加组
      // if (beforeInsert){
      //   let structid = tileProxy.createStructId.call(this);
      //   let value = {
      //     id: structid,
      //     name: '',
      //   };
      //   this.data.unshift(tileProxy.initStruct.call(this, new struct(value)));
      //   tileProxy.changeTileToStruct.call(this, this.data[0]);
      //   beforeFlag = true;
      // }

      if (afterInsert) {
        let structid = tileProxy.createStructId.call(this);
        let value = {
          id: structid,
          name: "",
        };
        this.data.push(tileProxy.initStruct.call(this, new struct(value)));
        tileProxy.changeTileToStruct.call(
          this,
          this.data[this.data.length - 1]
        );
        afterFlag = true;
      }

      if (!beforeFlag && !afterFlag) {
        /**
         * 获取磁贴在当前块中的位置
         */
        let tileTop = this.currentTile.DOM.get(0).getBoundingClientRect().top;
        let tileLeft = this.currentTile.DOM.get(0).getBoundingClientRect().left;
        let [offsetTop, offsetLeft] = tileProxy.getPositionInStruct.call(
          this,
          tileTop,
          tileLeft,
          this.currentTile
        );

        if (
          this.currentTile.x != offsetLeft ||
          this.currentTile.y != offsetTop
        ) {
          // 如果位置有变动，就修改位置信息
          this.currentTile.x = offsetLeft;
          this.currentTile.y = offsetTop;
        }
        // 当前磁贴从当前的块中移除
        tileProxy.logoutTile.call(
          this,
          this.currentStruct,
          this.currentTile,
          true
        );

        // 清除信息
        if (this.currentState) {
          _lodash.each(this.currentState.matrix, (vector) => {
            _lodash.each(vector, (v, k, arr) => {
              if (v === this.currentTile.id) arr[k] = 0;
            });
          });

          // 二维数组和其它磁贴位置还原
          this.currentStruct.matrix = _lodash.cloneDeep(
            this.currentState.matrix
          );
          let self = this;
          _lodash.each(this.currentStruct.source, (data) => {
            if (self.currentState.pos[data.id] !== undefined)
              data.y = self.currentState.pos[data.id];
          });
        }

        // tileProxy.matrixReduce.call(this, this.currentStruct);
        // 再次加入磁贴当中

        tileProxy.initTile.call(
          this,
          this.currentStruct,
          this.currentTile,
          true
        );
        // 这里还需要更新它的高度
        this.currentStruct.h =
          constant.CAPACITY * this.currentStruct.matrix.length +
          constant.TITLE_HEIGHT;
        // 更新块
        tileProxy.matrixReduce.call(this, this.currentStruct);
        tileProxy.updateStructPosition.call(this, this.currentStruct);
        tileProxy.updateTilePosition.call(this, this.currentStruct);
      }

      /**
       * 6. 更新动态的DOM的位置
       */
      this.dynamicDom.css({
        top:
          this.currentStruct.y +
          constant.TITLE_HEIGHT +
          constant.TILE_PADDING +
          this.currentTile.y * constant.CAPACITY +
          "px",
        left:
          constant.TILE_PADDING + this.currentTile.x * constant.CAPACITY + "px",
        width: this.currentTile.DOM.width() + "px",
        height: this.currentTile.DOM.height() + "px",
      });

      /**
       * 7. 更新鼠标位置
       */
      tileProxy.updatePointPosition.call(this, e);
    },

    /**
     * @method 监听块的移动(移动结束)
     * @param {*} e
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    onMovedStruct(e) {
      /**
       * 1. 首先判断是否可以进入这个监听事件中
       * 捕获了块，但是没有捕获到磁贴。这种情况才能进入
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

      /**
       * 6. 清除空块
       */
      let self = this;
      _lodash.each(self.data, (data) => {
        if (data.source.length == 0) tileProxy.logoutStruct.call(self, data);
      });

      // 隐藏额外块
      tileProxy.updateExtraPosition.call(this);

      /**
       * 7.缓存配置
       */
      constant.ENABLE_CACHE &&
        constant.AUTO_CACHE &&
        tileProxy.setData.call(self, e);
    },

    onTileClick(id, cb, e) {
      if (cb && _lodash.isFunction(cb)) {
        cb.call(this, id);
      } else {
        constant.TILE_CLICK_EVENT.call(this, id, e);
        // if(!layui.windows) return alert('未查找到windows组件!');
        // if (layui.windows) {
        //   layui.windows.open(id);
        //   layui.windows.instance().toggleMenu(e);
        // }
      }
    },

    /**
     * @method 监听磁贴的移动(移动结束)
     * @param {*} e
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    onMovedTile(e) {
      // 修改,适应移动端的事件操作
      if(layui.device().mobile && !e.clientX){
        e.clientX = event.changedTouches[0].clientX;
        e.clientY = event.changedTouches[0].clientY;
      }
      /**
       * 1. 首先判断是否可以进入这个监听事件中
       * 捕获了块，又捕获到磁贴。这种情况才能进入
       */
      if (!this.currentStruct || !this.currentTile) return;
      let openid = this.currentTile.id,
        openFunction = this.currentTile.cb;
      /**
       * 新增在移动前后鼠标位置的变化
       * 如果没有变化就认为是点击事件
       * 由于在移动的时候特殊处理过dom点击事件的绑定不太好使，所以这样进行判断触发点击事件
       */
      if (constant.EVENTX == e.clientX && constant.EVENTY == e.clientY)
        // {
        //   // 执行点击事件
        //   const openid = this.currentTile.id, openFunction = this.currentTile.cb
        //   if(openFunction && _lodash.isFunction(openFunction)){
        //     openFunction.call(this, openid);
        //   }else{
        //     layui.layer.open(openid);
        //   }
        // }
        tileProxy.onTileClick.call(this, openid, openFunction, e);

      // 未知原因导致 this.currentTile 消失，接下来如果没有就不处理了
      if (!this.currentStruct || !this.currentTile) {
        console.warn("意外的问题:当前磁贴对象消失");
        return;
      }

      /**
       * 2. 移除移动中的样式
       */
      this.currentTile.DOM.removeClass(constant.STRUCT_SELECTED_CLASS);

      /**
       * 2.1 将这个磁贴的DOM加入块中
       */
      this.currentStruct.DOM.append(this.currentTile.DOM);

      /**
       * 3. 更新样式
       */
      this.currentTile.DOM.css({
        top:
          constant.TITLE_HEIGHT +
          constant.TILE_PADDING +
          this.currentTile.y * constant.CAPACITY +
          "px",
        left:
          constant.TILE_PADDING + this.currentTile.x * constant.CAPACITY + "px",
      });

      let _len = this.currentStruct.matrix.length;
      this.currentStruct.matrix = [];
      tileProxy.matrixCapacity(
        this.currentStruct.matrix,
        this.currentStruct.matrix.length,
        _len
      );
      _lodash.each(this.currentStruct.source, (source) => {
        for(var i = 0; i < source.w; i++) {
          for (var j = 0; j < source.h; j++) {
            this.currentStruct.matrix[source.y + j][source.x + i] = source.id;
          }
        }
      });
      tileProxy.matrixReduce.call(this, this.currentStruct);
      tileProxy.updateStructPosition.call(this, this.currentStruct);
      tileProxy.updateTilePosition.call(this, this.currentStruct);

      /**
       * 4. 释放捕获
       */
      this.currentTile.move = false;
      this.currentTile = null;
      this.currentStruct = null;
      /**
       * 5. 清除临时的DOM
       */
      if (this.dynamicDom) {
        this.dynamicDom.remove();
        this.dynamicDom = null;
      }
      /**
       * 6. 清除临时的状态缓存
       */
      if (this.currentState) {
        this.currentState = null;
      }

      /**
       * 6. 清除空块
       */
      let self = this;
      _lodash.each(self.data, (data) => {
        if (data.source.length == 0) tileProxy.logoutStruct.call(self, data);
      });

      // 隐藏额外块
      tileProxy.updateExtraPosition.call(this);

      /**
       * 7.缓存配置
       */
      constant.ENABLE_CACHE &&
        constant.AUTO_CACHE &&
        tileProxy.setData.call(self, e);
    },

    /**
     * @method 用户通过输入框修改块名称(修改结束)
     * @param {*} e
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    onModifiedStructName(e) {
      /**
       * 1. 查找父节点，这个节点上面包含块 的 id信息
       */
      let $parent = $(e.target)
        .parents()
        .filter("." + constant.STRUCT_NAME_CLASS);
      // 移除这个块正在被编辑的样式
      $parent.removeClass(constant.STRUCT_INPUT_CLASS);
      // 获取用户输入结果
      let value = e.target.value;
      /**
       * 修改鼠标移上来展示的结果
       */
      $parent
        .find(".layui-layer-struct-label .layui-layer-struct-text")
        .text(value ? value : "命名组");
      // 修改平时展示的结果
      $parent
        .find(".layui-layer-struct-title .layui-layer-struct-text")
        .text(value);
      // 获取块 id信息，找到对应的块修改它的name属性
      let id = $parent.attr("struct-id");
      _lodash.every(this.data, (data) => {
        if (data.id == id) {
          data.name = value;
          return false;
        }
        return true;
      });
    },

    /**
     * @method 创建一个临时的dom
     * @param {*} destination 这个临时的dom需要被插入的位置(去掉。统一加在 this.destination)保证动画的流畅
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     *    这个临时的dom为移动中的dom占地方
     *    对用户起提示作用，表明这个地方是将要防置的位置
     */
    createDynamicDom() {
      this.dynamicDom = $(`
        <div class = "layui-layer-tile-dynamic"></div>
      `);
      this.destination.append(this.dynamicDom);
    },

    /**
     * @method 交换相邻的两个块
     * @param {*} index 当前被捕获的块在data中的位置
     * @param {*} i     待交换的块在data中的位置
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    changeNearStruct(index, i) {
      /**
       * 1. 获取两个位置之中的较大者，较小者。
       */
      let [min, max] = index > i ? [i, index] : [index, i];
      /**
       * 2. 交换两个块的y 值 offsetTop值
       * 首先将下面的块的y值，替换成上面块的 y 值
       * 然后根据这个被提升上来块的 y值和 h值 计算出另一个的 y值
       */
      this.data[max].y = this.data[min].y;
      this.data[min].y = this.data[max].y + this.data[max].h;
      /**
       * 3.从data里面移除当前被捕获的块
       */
      this.currentStruct = this.data.splice(index, 1)[0];
      /**
       * 4.将当前被捕获的块插入到刚刚交换的位置
       */
      this.data.splice(i, 0, this.currentStruct);
      /**
       * 5. 更新刚刚交换的块的DOM的offsetTop的值。
       * 交换后，它的位置就变成了 index了
       */
      this.data[index].DOM.css({
        top: this.data[index].y + "px",
      });
    },

    /**
     * @method 当前捕获的磁贴移动到指定的块中
     * @param {*} structInstance  指定的块
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    changeTileToStruct(structInstance) {
      /**
       * 1. 记录下此时磁贴DOM的位置。
       * 后面要插入别的块。位置会受到影响，现在记录下来方便后面处理。(让它就保持在当前的位置上)
       */
      let tileTop = this.currentTile.DOM.get(0).getBoundingClientRect().top;
      let tileLeft = this.currentTile.DOM.get(0).getBoundingClientRect().left;

      /**
       * 2. 将这个磁贴从当前的块上面移除。
       * 根据描述，还需要顺便还原这个块
       */
      tileProxy.logoutTile.call(
        this,
        this.currentStruct,
        this.currentTile,
        true
      );
      tileProxy.matrixReduce.call(this, this.currentStruct);
      tileProxy.updateStructPosition.call(this, this.currentStruct);
      tileProxy.updateTilePosition.call(this, this.currentStruct);

      /**
       * 3. 将传入的新的块捕获
       */
      tileProxy.recordStruct.call(this, structInstance);

      /**
       * 4. 将临时DOM加入这个新块中
       *
       *  后面是直接把这个动态的dom加在  this.destination 不需要这样移除再加入了
       */
      // this.dynamicDom.remove();
      // this.currentStruct.DOM.append(this.dynamicDom);

      /**
       * 5. 获取这个新块的位置信息
       */
      let [offsetTop, offsetLeft] = tileProxy.getPositionInStruct.call(
        this,
        tileTop,
        tileLeft,
        this.currentTile
      );

      this.currentTile.x = offsetLeft;
      this.currentTile.y = offsetTop;

      /**
       * 7. 将磁贴加入到这个新的块中
       */
      tileProxy.initTile.call(this, this.currentStruct, this.currentTile, true);

      // 这里还需要更新它的高度
      this.currentStruct.h =
        constant.CAPACITY * this.currentStruct.matrix.length +
        constant.TITLE_HEIGHT;
      tileProxy.updateStructPosition.call(this, this.currentStruct);
      tileProxy.updateTilePosition.call(this, this.currentStruct);
    },

    /**
     * @method 返回处于当前块中的位置
     * @param {*} top
     * @param {*} left
     * @param {*} tileInstance   传入{@linkplain tile 磁贴结构配置项}实例
     * @returns [offsetTop, offsetLeft]
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    getPositionInStruct(top, left, tileInstance) {
      /**
       * 1. 获取当前捕获块的位置
       */
      let structTop = this.currentStruct.DOM.get(0).getBoundingClientRect().top;
      let structLeft =
        this.currentStruct.DOM.get(0).getBoundingClientRect().left;

      /**
       * 2. 根据捕获块的位置和传入位置的关系确定位置系数
       * 推断出磁贴在 块中的位置系数 x, y。大抵就是两者的差值除以 {@linkplain constant.CAPACITY 单位长度}
       */
      let offsetLeft = Math.round((left - structLeft) / constant.CAPACITY);
      let offsetTop = Math.round((top - structTop) / constant.CAPACITY);

      /**
       * 3. x 值调整为合理值
       *  !值得注意的是这个w在之前 {@linkplain tileProxy.getMatrixFillResult 获取磁贴在二维数组中的位置集} 里面已经校验过了
       * 根据 0 <= x <= 向量长度 - w
       */
      if (offsetLeft < 0) offsetLeft = 0;
      if (offsetLeft > constant.EMPTY_VECTOR.length - tileInstance.w)
        offsetLeft = constant.EMPTY_VECTOR.length - tileInstance.w;

      /**
       * 4. y值不小于0 即可
       */
      if (offsetTop < 0) offsetTop = 0;
      return [offsetTop, offsetLeft];
    },

    /**
     * @method 设置磁贴动画
     * @param {Array} classes 磁贴样式集合  String 的 css样式
     * @param {Float} liveness 动画系数
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    setAnimate(classes, liveness) {
      let self = this;
      if (!self.classes) self.classes = [];
      if (!_lodash.isArray(classes)) classes = [classes];
      _lodash.each(classes, (c) =>
        self.classes.push("layui-windows-animated animate-" + c)
      );
      self.liveness = liveness || 0;
      return this;
    },

    /**
     * @method 执行磁贴动画
     * @desc
     *    这个函数当中的this指向  {@linkplain windowsTile 磁贴管理对象}
     */
    doAnimate() {
      let self = this;
      let flag = self.classes.length === 0 || self.liveness === 0;
      /**
       * -动画列表为空
       * -动画系数为0
       * -菜单没有弹出
       * 三种情况满足一种就不执行动画
       */
      if (!flag) {
        self.destination.find("." + constant.TILE_CLASS).each(function () {
          let $this = $(this);
          if (!$this.hasClass("onAnimate") && Math.random() <= self.liveness) {
            var class_animate =
              self.classes[Math.floor(Math.random() * self.classes.length)];
            $this.addClass("onAnimate");
            setTimeout(function () {
              $this.addClass(class_animate);
              setTimeout(function () {
                $this.removeClass("onAnimate");
                $this.removeClass(class_animate);
              }, 3000);
            }, Math.random() * 2 * 1000);
          }
        });
      }
      setTimeout(function () {
        tileProxy.doAnimate.call(self);
      }, 6 * 1000);
    },
  };

  /**
   * @constructor 磁贴管理的构造函数
   * @param {*} destination 需要被渲染的目的地  jq对象
   * @param {*} options 配置参数，现在仅支持data配置项是描述各个块和磁贴的配置项
   * @returns
   */
  let windowsTile = function (destination, options) {
    return new windowsTile.fn.build(destination, options);
  };

  windowsTile.prototype = windowsTile.fn = {
    /**
     * @constructor
     * @param {*} destination
     * @param {*} options
     * @desc
     *
     */
    build: function (destination, options) {
      return tileProxy.build.call(this, destination, options);
    },

    setAnimate: function (animated_classes, animated_liveness) {
      return tileProxy.setAnimate.call(
        this,
        animated_classes,
        animated_liveness
      );
    },

    getData: function () {
      return constant.ENABLE_CACHE ? tileProxy.getData.call(this) : null;
    },

    setData: function () {
      return constant.ENABLE_CACHE ? tileProxy.setData.call(this) : null;
    },

    resetData: function(){
      return  tileProxy.resetData.call(this);
    },

    /**
     * 设置tile块点击事件
     * @param {*} cb (id, e)
     */
    setClickEvent: function(cb){
      constant.TILE_CLICK_EVENT = cb;
    },

    addTile: function(tileOption){
      let structid = tileProxy.createStructId.call(this);
      this.data.push(tileProxy.initStruct.call(this, new struct({
        id: structid,
        name: '',
      })));
      this.insertTile(structid, tileOption);
    },

    insertTile: function (structId, tileOption) {
      // 1. 根据块的id查找实例
      let structInstance = null;
      _lodash.every(this.data, (data) => {
        if (data.id == structId) {
          structInstance = data;
          return false;
        }
        return true;
      });

      // 2. 更新磁贴配置项
      let _tileOption = {
        id: tileOption.id,
        name: tileOption.name || "",
        img: tileOption.img || "",
        color: tileOption.color || "",
        x: tileOption.x || 0,
        y: tileOption.y || 0,
        w: tileOption.w || 1,
        h: tileOption.h || 1,
        cb: tileOption.cb,
      };

      // 3. 将磁贴加入到块实例中
      tileProxy.initTile.call(this, structInstance, new tile(_tileOption));

      // 4. 更新块位置，块下面的磁贴位置
      tileProxy.updateStructShape.call(this, structInstance);
      tileProxy.updateStructPosition.call(this, structInstance);
      tileProxy.updateTilePosition.call(this, structInstance);

      // 5. 根据需要缓存配置项
      constant.ENABLE_CACHE && constant.AUTO_CACHE && this.setData();
    },
  };
  windowsTile.fn.build.prototype = windowsTile.fn;
  exports("tile", windowsTile);
});
