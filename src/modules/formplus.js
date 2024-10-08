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
layui.define(["jquery", "form"], function (exports) {

  // jquery的初始化
  if (!window.$) window.$ = layui.$;

  /**
   * 记录下原始的render方法
   */
  const renderForever = layui.form.render;

  const TREE_SELECTED_CSS = 'layui-form-selecttree-selected';

  // 有无绑定windows事件
  var SELECT_TREE_EVENT = false;

  /**  formplus 额外样式设置  --  start  */
  /**  formplus暂时只需要较少的css样式支撑,所以并不需要新开css文件引用  */
  let css = document.createElement("style");
  css.type = "text/css";
  css.innerHTML = `
      [datamaxlength]:after {
        content: attr(datamaxlength);
        position: absolute;
        right: 10px;
        bottom: 10px;
        font-size: 12px;
        line-height: 38px;
        color: #666;
        user-select: none;
        pointer-events: none;
      }
      .layui-input-wrap[datamaxlength]:after{
        right: 27px;
      }

      .${TREE_SELECTED_CSS},
      .${TREE_SELECTED_CSS}:hover{
        color: rgba(var(--lay-framework-main-bgColor), 1) !important
      }
    `;
  // document.getElementsByTagName("HEAD").item(0).appendChild(css);
  /**  formplus 额外样式设置  --  end  */

  /**
   * 定义一系列的公共常量
   * @namespace  公共常量
   * @constant
   */
  let constant = {

    /**
     * @inner {Number} 全局计数
     */
    INTERNAL_INDEX: 0,

    /**
     * @inner {Number} 事件序列号
     */
    EVENT_SERIAL: 0,

    /**
     * @inner {String} 字符串分隔符 -> .
     * @description
     *    主要用于拆分属性key的时候使用
     */
    separator: ".",

    /**
     * @inner {String} 数组前缀标志 -> [
     * @description
     *    主要用于拆分属性key的时候使用，数组是用[] 里面加下标来调用的
     */
    ARRAY_SEPARATOR_PREFIX: "[",

    /**
     * @inner {String} 数组后缀标志 -> ]
     * @description
     *    主要用于拆分属性key的时候使用，数组是用[] 里面加下标来调用的
     */
    ARRAY_SEPARATOR_SUFFIX: "]",

    /**
     * @inner {String} layui里面过滤属性的名称
     */
    LAYUI_FILTER: "lay-filter",

    /**
     * @inner {String} layui里面表单标志class名称
     */
    LAYUI_FORM: "layui-form",

    /**
     * @inner {String} layui表单验证 是否懒校验的属性值
     * @desc
     *
     *    <ul>
     *      <li>不设置这个属性 input采用 input onporpertychange 事件监听</li>
     *      <li>设置这个属性值 input采用 onbulr 事件监听</li>
     *    </ul>
     *
     */
    LAYUI_LAZY: "lay-lazy",
  };

  /**
   * @namespace 工具方法集合
   * @static
   */
  let util = {

    /**
     * @function util~isArray 类型判断： 判断传入的参数是不是数组类型
     * @param o {*} 传入的对象
     * @returns {boolean} true for yes; false for no
     */
    isArray: function(o){
      return Object.prototype.toString.call(o) === "[object Array]";
    },

    /**
     * @function util~isArray 类型判断： 判断传入的参数是不是String类型
     * @param o {*} 传入的对象
     * @returns {boolean} true for yes; false for no
     */
    isString: function(o){
      return Object.prototype.toString.call(o) === "[object String]";
    },

    /**
     * @function util~isArray 类型判断： 判断传入的参数是不是Function类型
     * @param o {*} 传入的对象
     * @returns {boolean} true for yes; false for no
     */
    isFunction: function(o){
      return Object.prototype.toString.call(o) === "[object Function]";
    },

    /**
     * @function util~isArray 类型判断： 判断传入的参数是不是Date类型
     * @param o {*} 传入的对象
     * @returns {boolean} true for yes; false for no
     */
    isDate: function(o) {
      return Object.prototype.toString.call(o) === "[object Date]";
    },

    /**
     * @function util~isArray 类型判断： 判断传入的参数是不是Object类型
     * @param o {*} 传入的对象
     * @returns {boolean} true for yes; false for no
     */
    isObject: function(o){
      return Object.prototype.toString.call(o) === "[object Object]";
    },

    /**
     * @function util~isArray 类型判断： 判断传入的参数是不是RegExp类型
     * @param o {*} 传入的对象
     * @returns {boolean} true for yes; false for no
     */
    isRegExp: function(o){
      return Object.prototype.toString.call(o) === "[object RegExp]";
    },

    /**
     * @function util~each 遍历数组或对象
     * @param {Object} o  传入数组或对象
     * @param {Function} cb 回调函数
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">遍历数组或对象</p>
     *    <ul>
     *      <li>这个方法类似于{@linkplain layui.each layui的遍历方法},都是对传入对象进行遍历,只是在回调函数的参数上有所区别
     *        <ol>
     *          <li>回调函数的第一个参数是遍历的值,即value</li>
     *          <li>回调函数的第二个参数是遍历的下标或key,即key</li>
     *          <li>回调函数的第三个参数是遍历的原始对象,即o</li>
     *        </ol>
     *      </li>
     *      <li>这个方法会对传入的对象进行类型判断,优先使用数组的形式进行遍历</li>
     *      <li>在以object的方式进行遍历时采用for ...  in...的形式,需要留意的是:遍历顺序不是从左到右的,数字key优先于字符串key</li>
     *      <li>这个方法本身不会去修改原来传入的对象,也不会有新的对象返回</li>
     *    </ul>
     */
    each: function(o, cb){
      let key;
      //优先处理数组结构
      if (util.isArray(o)) {
        for (key = 0; key < o.length; key++) {
          cb && util.isFunction(cb) && cb(o[key], key, o);
        }
      } else {
        /**
         * for ...  in...
         * 遍历顺序不是从左到右的,数字key优先于字符串key
         * -- 来自知识星球球友的提醒
         */
        for (key in o) {
          cb && util.isFunction(cb) && cb(o[key], key, o);
        }
      }
    },

    /**
     * @function util~join 将数组拼接成一个字符串
     * @param {Array} a 需要被遍历的数组
     * @param {String} m 连接作用的标点符号
     * @returns {String} 拼接起来的字符串结果
     */
    join: function(a, m){
      if(!m) m = "";
      var res = "";
      util.each(a, function(v){
        res += String(v) + m;
      });
      // 去掉末尾的标点
      if (res != "" && m) res = res.substring(0, res.length - m.length);
      return res;
    },

    /**
     * @function util~map 数组转换
     * @param {*} a 需要被遍历的数组或对象
     * @param {Function} cb 回调函数
     * @returns {Array} 一个新的数组
     * @desc
     *
     *    <p style = "color: #16b777;text-indent: 10px;">数组转换,返回由回调函数结果的数组</p>
     *    <ul>
     *      <li>使用{@linkplain util~each 遍历方法}来遍历传入值,可以接收数组或object对象,其回调函数的参数与之一致</li>
     *      <li>返回的是新的数组,本身不会修改传入的对象或数组</li>
     *      <li>返回的数组里面的元素是遍历传入值时,执行回调函数的返回值</li>
     *    </ul>
     */
    map: function(a, cb){
      var res = [];
      util.each(a, function (v, k) {
        if (cb && util.isFunction(cb)) {
          res.push(cb(v, k, a));
        }
      });
      return res;
    },

    /**
     * @function util~every 迭代数组
     * @param {*} o   需要被迭代的数组或对象
     * @param {Function} cb 回调函数
     * @desc
     *
     *    <p style = "color: #16b777;text-indent: 10px;">遍历数组,直到回调函数返回false或遍历结束</p>
     *    <ul>
     *      <li>使用{@linkplain util~each 遍历方法}来遍历传入值,可以接收数组或object对象,其回调函数的参数与之一致</li>
     *      <li>回调函数一旦返回false则遍历结束</li>
     *      <li>这个方法本身不会去修改原来传入的对象,也不会有新的对象返回</li>
     *    </ul>
     */
    every: function(o, cb) {
      let key;
      //优先处理数组结构
      if (util.isArray(o)) {
        for (key = 0; key < o.length; key++) {
          if (cb && util.isFunction(cb)) {
            if (cb(o[key], key, o) === false) break;
          }
        }
      } else {
        for (key in o) {
          if (cb && util.isFunction(cb)) {
            if (cb(o[key], key, o) === false) break;
          }
        }
      }
    },

    /**
     * @function util~every 数组过滤
     *  数组过滤，返回回调为true的数组。 返回的是一个全新的数组
     * @param {*} o   需要被过滤的数组或对象
     * @param {Function} cb  回调函数
     * @returns {Array} 一个新的数组
     * @desc
     *
     *    <p style = "color: #16b777;text-indent: 10px;">数组过滤,返回回调函数执行为true的项</p>
     *    <ul>
     *      <li>使用{@linkplain util~each 遍历方法}来遍历传入值,可以接收数组或object对象,其回调函数的参数与之一致</li>
     *      <li>返回的数组只包括执行回调函数为true的项</li>
     *      <li>这个方法本身不会去修改原来传入的对象,返回的数组元素也是和原来的项相同(仅进行过滤,不改变项)</li>
     *    </ul>
     */
    filter: function(o, cb){
      var res = [];
      util.each(o, function (v, k) {
        if (cb && util.isFunction(cb)) {
          if (cb(v, k, o)) res.push(v);
        }
      });
      return res;
    },

    /**
     * @function util~indexOf 返回特定值在数组的下标或object的key
     * @param {*} a  需要被判断的数组或对象
     * @param {*} v  待判断的值
     * @returns {*}  数组下标或者key,如果没有检索到这个特定值,则返回 -1
     */
    indexOf: function(a, v){
      let index = -1;
      util.every(a, (a1, i) => {
        if (a1 == v) {
          index = i;
          return false;
        }
      });
      return index;
    },

    /**
     * @function util~cloneDeep 深拷贝
     * @method  深拷贝
     * @param {*} o 待深拷贝的对象
     * @returns {*} 深拷贝后新产生的对象
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
            if (util.isArray(o)) {
              res = [];
              util.each(o, (v) => res.push(util.cloneDeep(v)));
            } else if (util.isDate(o)) {
              res = new Date();
              res.setTime(o.getTime());
            } else if (util.isObject(o)) {
              res = {};
              util.each(o, (v, k) => {
                res[k] = util.cloneDeep(v);
              });
            } else if (util.isRegExp(o)) {
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
     * @function util~getFormFilterName 获取表单元素的lay-filter属性值
     * @param {HTMLElement} formItem  表单元素
     * @returns {String} 表单元素的{@linkplain constant~LAYUI_FILTER lay-filter 属性值}
     * @description
     *    <p style = "color: #16b777;text-indent: 10px;">获取表单元素的lay-filter属性值</p>
     *    <ul>
     *      <li>该方法是返回指定的表单元素上面的{@linkplain constant~LAYUI_FILTER lay-filter 属性值}</li>
     *      <li>如果该属性指已经被指定,则直接返回</li>
     *      <li>如果该属性没有被指定则根据当前元素的name属性,按照下面的规则生成被返回 `layui-formplus-{@name}` </li>
     *      <li>生成的属性会设置在表单元素上面,在该方法不会移除</li>
     *      <li>该方法基于下面几点
     *        <ol>
     *          <li>layui表单里面的事件绑定需要加入lay-filter来精确绑定,所以需要获取到该属性方便后面使用这个属性对表单元素进行绑定</li>
     *          <li>依据w3cschool关于表单的name属性的描述:设置了name属性才能保证表单的正确传值,所以这里认为有效的表单元素都应该标注自己的name属性</li>
     *          <li>如果元素暂未指定lay-filter属性就使用它的name的属性值根据固定格式生成一个来返回,从而保证后面处理的正确开展</li>
     *        </ol>
     *      </li>
     *    <ul>
     */
    getFormFilterName(formItem) {
      let filter = formItem.getAttribute(constant.LAYUI_FILTER);
      if (filter) return filter;
      filter = "layui-formplus-" + formItem.name;
      formItem.setAttribute(constant.LAYUI_FILTER, filter);
      return filter;
    },

    /**
     * @function util~getFormName 获取当前layui表单对象的name,就是它的lay-filter属性值，如果没有就生成一个
     * @param {HTMLElement} item  layui表单对象
     * @return {String} layui表单对象的{@linkplain constant~LAYUI_FILTER lay-filter 属性值}
     */
    getFormName: function (item) {
      let name = item.getAttribute(constant.LAYUI_FILTER);
      if (!name) {
        name = "layui-formplus" + constant.INTERNAL_INDEX++;
        item.setAttribute(constant.LAYUI_FILTER, name);
      }
      return name;
    },

    /**
     * @function util~getFormByName 通过name获取formProxy实例对象
     * @param {String} name lay-filter 属性值
     * @return {*} formProxy实例对象
     * @desc
     *
     *    <p style = "color: #16b777;text-indent: 10px;">通过layui表单对象的{@linkplain constant~LAYUI_FILTER lay-filter 属性值}获取formProxy实例对象</p>
     *    <p>设计思路如下:</p>
     *    <ol>
     *      <li>layui表单对象的{@linkplain constant~LAYUI_FILTER lay-filter 属性值}作为layui表单的重要指标,同一页面应该具有唯一性</li>
     *      <li>使用该模块对layui表单对象创建的formProxy实例对象,会缓存起来,避免重复创建浪费资源</li>
     *      <li>通过判断layui表单对象 {@linkplain document#contains 是否还存在于DOM树上}来移除对应的缓存</li>
     *    </ol>
     */
    getFormByName: function (name) {
      let res = null;
      util.every(layui.form.$children, (c) => {
        // 移除已经失效的
        if (!document.contains(c.$ele)) {
          c.$destroy();
          if (layui.form.$children.indexOf(c) >= 0)
            layui.form.$children.splice(layui.form.$children.indexOf(c), 1);
          return;
        }
        if (c.$name == name) {
          res = c;
          return false;
        }
        return true;
      });
      return res;
    },

    /**
     * @function util~findChildren 深遍历children节点执行回调
     * @param {Array} children 待遍历的数组
     * @param {Function} cb 调用的回调函数,回调函数的参数为遍历出的value
     */
    findChildren: function (children, cb) {
      if (children.length == 0) return;
      util.each(children, (child) => {
        cb && cb(child);
        util.findChildren(child.children, cb);
      });
    },

    /**
     * @function util~findChildren 冒泡执行回调函数
     * @param {String} s XXX.YYY.ZZZ 格式的属性key
     * @param {Function} fn 回调函数
     * @this formProxy实例对象
     * @desc
     *
     *    <p style = "color: #16b777;text-indent: 10px;">对传入的属性key(eg. XXX.YYY.ZZZ),按照下面的顺序执行回调函数:</p>
     *    <ol>
     *      <li>XXX.YYY.ZZZ</li>
     *      <li>XXX.YYY</li>
     *      <li>XXX</li>
     *    </ol>
     */
    bubble(s, fn) {
      if (util.isString(s)) {
        let res = s;
        do {
          let k = res.lastIndexOf(constant.separator);
          if (k >= 0) res = res.substring(0, k);
          util.isFunction(fn) && fn.call(this, res, s);
        } while (res.indexOf(constant.separator) > 0);
      }
    },

    /**
     * @function util~getValue 通过属性key获取formProxy实例对象中对应的值
     * @this formProxy实例对象
     * @param {String} k XXX.YYY.ZZZ 格式的属性key
     * @param {*} v 设置的新值
     * @returns {*} formProxy实例对象中对应的值
     * @desc
     *    <ol>
     *      <li>通过属性key获取formProxy实例对象中对应的值</li>
     *      <li>如果第二个参数传入了一个新值,则设置为新值</li>
     *      <li>这种设置并没有特殊处理,所以只能设置字符串或者数字等简单值</li>
     *    </ol>
     */
    getValue(k, v) {
      let [currentContext, flag, parent, key] = [this, true];
      util.every(k.split(constant.separator), (v1) => {
        let r = currentContext[v1];
        parent = currentContext;
        key = v1;
        // 数组特殊处理
        if (/\[\d+\]/.test(v1))
          r =
            currentContext[
              v1.substring(0, v1.indexOf(constant.ARRAY_SEPARATOR_PREFIX))
              ][
              v1.substring(
                v1.indexOf(constant.ARRAY_SEPARATOR_PREFIX) + 1,
                v1.indexOf(constant.ARRAY_SEPARATOR_SUFFIX)
              )
              ];
        if (r === undefined) {
          flag = false;
          return false;
        }
        currentContext = r;
        return true;
      });
      // 赋值
      if (flag && v !== undefined) {
        parent[key] = v;
        return v;
      }
      return flag ? currentContext : null;
    },
    /**
     * @function util~observe 监视某个数据
     * @this  formProxy实例对象
     * @param {*} o  一个配置项
     * @return {*} 已经被封装监视的对象
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">将一个对象转化处理成被当前模块监视的对象,其传入的参数包含下面几项</p>
     *    <ol>
     *      <li>target: 准备监视的数据</li>
     *      <li>key: 当前target对象的唯一标志字符串,举例为'a.b.c[d]' </li>
     *    </ol>
     *    <p style = "color: #16b777;text-indent: 10px;">此方法仅做前置的参数处理,是方法{@linkplain util~doObserve 监视对象}的前置方法</p>
     */
    observe(o) {
      let self = this;
      // 数组对象特殊处理
      if (util.isArray(o.target)) {
        o.target.__self__ = self;
        o.target.__key__ = o.key;
        o.target.__proto__ = arrayMethods;
        util.each(o.target, (v, k) => {
          v = util.doObserve.call(self, {
            target: o.target,
            value: v,
            name: k,
            key: o.key ? o.key : k,
          });
        });
        return o.target;
      }
      if (!o.target || !util.isObject(o.target)) return o.target;
      // 普通对象的处理
      util.each(o.target, (v, k) => {
        util.doObserve.call(self, {
          target: o.target,
          value: v,
          name: k,
          key: o.key,
        });
      });
      return o.target;
    },
    /**
     * @function util~doObserve 监视某个数据
     * @this  formProxy实例对象
     * @param {*} o 一个配置项
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">当前模块监视的某个对象,其传入的参数包含下面几项</p>
     *    <ol>
     *      <li>target: 属性被添加的目标</li>
     *      <li>value: 待添加的属性值</li>
     *      <li>name: 待添加的属性对应目标的key</li>
     *      <li>key: 当前属性的唯一标志字符串,举例为'a.b.c[d]' </li>
     *    </ol>
     */
    doObserve(o) {
      // 根据传入的属性name，生成全新的索引值
      let self = this,
        fKey = o.key ? o.key + constant.separator + o.name : o.name;
      // 创建代理对象,将待监听的对象也创建为响应式数据
      let _proxy = util.observe.call(self, {
        target: o.value,
        key: fKey,
      });
      // 创建事件描述对象
      self.dispatcher.add(fKey);
      Object.defineProperty(o.target, o.name, {
        configurable: true,
        enumerable: true,
        get() {
          self.dispatcher &&
          self.dispatcher.get.call(self, fKey, _proxy, o.name);
          return _proxy;
        },
        set(value) {
          if (value === _proxy) return;
          let oldValue = _proxy;
          self.dispatcher.before.call(self, fKey, value, oldValue, o.name);
          _proxy = util.observe.call(self, {
            target: value,
            key: fKey,
          });
          self.dispatcher.after.call(self, fKey, value, oldValue, o.name);
        },
      });
    },

    /**
     * @function util~assign 参数合并
     * @desc 调用的是jQuery里面的参数合并方法
     */
    assign: (...params) => $.extend.call(this, ...params),

    /**
     * @function util~debounce 防抖
     * @param {Boolean|Function} isClear  传入一个函数,则第二个参数是一个配置项;传入一个boolean,则代表阻止第二个参数(函数)的执行
     * @param {Object|Function} fn 配置项 or 执行函数
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">传入的配置项:</p>
     *    <ol>
     *      <li>context: 指定函数执行的this指向</li>
     *      <li>args: 指定函数调用时的参数列表</li>
     *      <li>time: 防抖时间,默认300毫秒</li>
     *    </ol>
     */
    debounce(isClear, fn) {
      if (!util.isFunction(isClear)) {
        fn._throttleID && clearTimeout(fn._throttleID);
      } else {
        util.debounce(true, isClear);
        var param = util.assign({ context: null, args: [], time: 300 }, fn);
        isClear._throttleID = setTimeout(function () {
          isClear.apply(param.context, param.args);
        }, param.time);
      }
    },

    /**
     * @function util~enableComplate 开启layui下拉选择框自动补全功能
     * @param {HTMLElement} formItem layui下拉框select的document
     */
    enableComplate(formItem){
      /**
       * 判断是否有lay-search属性
       */
      let laySearch = formItem.getAttribute("lay-search");
      if(laySearch == null) return;

      /**
       * 需要给input输入框添加输入的监听事件,
       * 这里不能保证layui的form组件已经渲染完毕,
       * 所以放在父节点上面用jQuery来托管事件
       */
      let $patent = $(formItem.parentElement);
      $patent.on("input propertychange", "input", function (e) {
        // 输入框在输入的时候就进行匹配补全的操作
        util.debounce(function (){
          util.autoComplete(formItem, e);
        });
      });

      $patent.on("blur", "input", function (e) {
        util.cacelComplete(e);
      });

      $patent.on("keydown", "input", function (e) {

        if (e.keyCode == 38 || e.keyCode == 40) {
          /**
           * 在键入上下方向键。layui默认是切换下拉选项
           * 这个时候要重新进行自动匹配
           * 这个时候是用户选择选项，所以要关掉一些自动推荐的判断环节
           */
          util.autoComplete(formItem, e, false);
        }

        if (e.keyCode == 9) {
          /**
           * 在键入tab键，就认为用户接受当前的推荐项
           * 调用选中的dd的点击方法确认选择
           * 最后还是要隐藏推荐的div
           */
          util.cacelComplete(e);
        }
      });

      if(!formProxy.recordSpan){
        formProxy.recordSpan = $(
          '<span style="visibility: hidden;position: absolute;z-index: -1;"></span>'
        );
        $("body").append(formProxy.recordSpan);
      }

      if(!formProxy.completeSpan){
        formProxy.completeSpan = $('<div class = "layui-form-autoSelect" ></div>');
        $("body").append(formProxy.completeSpan);
      }

    },

    /**
     * @function util~autoComplete 更新补全状态
     * @param {HTMLElement} formItem layui下拉框select的document
     * @param {Event} e 鼠标事件对象
     * @param {Boolean} auto  是否自动判断推荐选项,默认为true
     */
    autoComplete(formItem, e, auto = true){
      // 去掉前后空格的影响
      let _v = String(e.target.value).trim();
      if(!_v) return util.cacelComplete(e);
      // 每次调用的时候清除之前的延时任务
      formProxy.timer && clearTimeout(formProxy.timer);
      let $self = $(e.target);
      /**
       * 声明几个参数变量
       *
       *
       * eleFlag 判断当前是否有dd选项被选中,初始化假定为false
       */
      let eleFirst = null,eleSelect = null,eleMatch = null,eleFlag = false;
      e.target.parentElement.parentElement
        .querySelectorAll("dd")
        .forEach((dd) => {
          let $dd = $(dd);
          // 1.判断有value值，证明是由值的选项，默认值项被剔除
          if ($dd.attr("lay-value") || $dd.attr("lay-value") === 0) {
            // 2. 判断没得layui-hide 类, 说明当前项是可视的选项
            if (!$(dd).hasClass("layui-hide")) {
              // 当前eleFirst没有被赋值，并且是推荐状态，就将当前dd项作为 eleFirst
              if (!eleFirst && auto) eleFirst = dd;
              // 3. 判断有layui-this 类, 说明这个瞬间layui选中了这一项
              if ($(dd).hasClass("layui-this")) {
                // 如果是非推荐状态，或者推荐状态再次校验成功，将当前dd项作为 eleSelect
                if (!eleSelect && (dd.textContent.indexOf(_v) >= 0 || !auto))
                  eleSelect = dd;
              }
            }
            /**
             * 在输入中文字的过程中，没有匹配到会隐藏所有项，导致输入结束的瞬间也匹配不到选项。这里手动匹配第一个适合的选项
             */
            if (!eleMatch && dd.textContent && dd.textContent.indexOf(_v) >= 0)
              eleMatch = dd;
          } else {
            // 如果这个项有被选中的class样式,并且是可选的状态(没有layui-hide)那就判断当前有dd项被选中
            eleFlag = $dd.hasClass("layui-this") && !$dd.hasClass("layui-hide");
          }
        });
      // 默认项被选中
      if (eleFlag) return util.cacelComplete();
      /**
       * 因为 eleMatch 优先级高于 eleFirst
       * 所以这里使用 eleMatch 替换 eleFirst
       * 后面统一使用 eleFirst 处理
       */
      if (!!eleMatch) eleFirst = eleMatch;

      /**
       * 如果处在推荐状态下，没有捕获到layui选中的选项，但是在刚才的过程中有推荐的选项
       * 将这个推荐项选中(将其它项的layui-this移除，单独给它添加layui-this)
       * 然后将 推荐的项赋值给 eleSelect
       * 后面统一使用 eleSelect 处理
       */
      if (!eleSelect && !!eleFirst && auto === true) {
        e.target.parentElement.parentElement
          .querySelectorAll("dd")
          .forEach((dd) => $(dd).removeClass("layui-this"));
        $(eleFirst).addClass("layui-this");
        eleSelect = eleFirst;
      }

      // 没有找到任何一项可以继续，就关闭推荐的div，然后结束
      if (!eleSelect) return util.cacelComplete(e);

      // 当前推荐项的展示内容
      let _value = eleSelect.textContent;
      // 记录补全信息
      let content = "";
      if (_value.indexOf(_v) == 0) {
        content = _value.substring(_v.length, _value.length);
      } else {
        return util.cacelComplete(e);
      }

      // 输入框的x坐标
      let inputOffsetX = e.target.getBoundingClientRect().x;
      // 输入框开始文字距离框体的位置(text-indent),这里考虑可能是nomal之类的非数字，所以默认是0
      let indent = parseFloat($self.css("text-indent")) || 0;
      let paddingLeft = parseFloat($self.css("padding-left")) || 0;
      /**
       * 将记录输入内容的span的font-size样式与当前输入框同步，以确保最后计算出的文字长度偏差不会太大
       * 这里忽略了比如letter-space等样式
       */
      formProxy.recordSpan.css("font-size", $self.css("font-size"));
      // 将记录输入内容的文本内容修改成当前输入框的内容，此时文字的长度就是当前span的长度
      formProxy.recordSpan.get(0).textContent = e.target.value;
      // 最后计算出当前光标的位置,多加2防止光标被模糊
      let left = inputOffsetX + paddingLeft + indent + formProxy.recordSpan.get(0).getBoundingClientRect().width + 2;

      // 将补全信息放入推荐div中
      formProxy.completeSpan.get(0).textContent = content;
      formProxy.completeSpan.css("font-size", $self.css("font-size"));
      formProxy.completeSpan.css(
        "line-height",
        e.target.getBoundingClientRect().height + "px"
      );
      formProxy.completeSpan.css(
        "height",
        e.target.getBoundingClientRect().height + "px"
      );

      // 获取当前窗口水平滚动条的位置
      var scrollX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;

      // 获取当前窗口垂直滚动条的位置
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;

      formProxy.completeSpan.css("top", scrollY + e.target.getBoundingClientRect().y + "px");
      formProxy.completeSpan.css("left", scrollX + left + "px");
      formProxy.completeSpan.css("display", "block");
      // 这个complate属性是一个标志
      // 设置为true说明当前的推荐系统生效，在按下->键的时候可以触发确认的回调
      formProxy.completeSpan.attr("complete", "true");

    },

    /**
     * @function util~cacelComplete 清除提示
     */
    cacelComplete() {
      formProxy.completeSpan.get(0).textContent = "";
      formProxy.completeSpan.css("display", "none");
      formProxy.completeSpan.attr("complete", "false");
    },
  };

  /**
   * @namespace AOP 事件监听
   * @static
   */
  let AOP = {
    /**
     * @constructor
     * @function AOP~Dispatcher 事件分发器
     */
    Dispatcher: function () {

      let self = this;

      /**
       * @inner 序列号栈
       * @desc
       *
       *    里面存放的是{@linkplain constant.EVENT_SERIAL 事件序列号};
       * 如果它的length是0，代表当前没有需要捕获的工作，否则它的最后一项代表当前捕获任务的序列号
       */
      this.enableAccess = [];

      /**
       * @inner 事件切面容器池
       * @desc
       *    存放 {@linkplain AOP.Aspect 事件切面} ,以属性的key为值
       */
      this.coreMap = {};

      /**
       * @function Dispatcher~addListener 添加事件监听
       * @param {Function} fn    待加入的监听回调函数
       * @param {Boolean} flag   是否深监听 true 是  false 否
       * @param {Number} serial  当前捕获序列号
       * @param {Function} cb    每次添加后执行的回调函数
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">添加事件监听 -- 触发原理:</p>
       *    <ol>
       *      <li>在响应式数据触发后，会带上某些标记，为这些已标记的数据添加监听回调函数</li>
       *      <li>在数据的setted回调函数里面去依次调用所有已加入的回调函数</li>
       *    </ol>
       */
      this.addListener = (fn, flag = false, serial, cb) => {
        // 添加回调函数
        util.each(self.coreMap, (v) =>
          v.add(fn, flag ? "deep" : "bind", serial, cb)
        );
        // 移除事件序列号
        self.enableAccess.splice(self.enableAccess.indexOf(serial), 1);
        // 如果没有捕获任务了,将所有的切面释放
        if (self.enableAccess.length == 0)
          util.each(self.coreMap, (v) => v.offline());
      };
      /**
       * @function Dispatcher~watch 添加监视属性
       * @param {*} obj     指定对象，
       * @param {String} key    数据的唯一key
       * @param {Function} fn     触发回调函数
       * @param {Boolean} deep   是否是深监视
       * @param {Boolean} immediate  回调函数是否立即执行
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">添加监视属性</p>
       *    <ul>
       *      <li>这个方法绕过了事件触发 {@linkplain AOP.Dispatcher.addListener 类似于这种形式}是直接向事件集合里面添加回调函数</li>
       *      <li>这个方法可以用在创建对象的时候添加监视属性,或单独为一个属性添加一个监视属性</li>
       *    </ul>
       */
      this.watch = (obj, key, fn, deep = false, immediate = false) => {
        // 没有就添加一个
        if (!self.coreMap[key]) self.add(key);
        self.coreMap[key].add(fn, deep ? "deep" : "bind", null, null, true);
        // 需要立即执行
        if (immediate) fn.call(obj, util.getValue.call(obj, key), null, key);
      };

      /**
       * @function Dispatcher~add 添加一个事件切面
       * @param {String} key 属性的唯一key
       */
      this.add = (key) => {
        if (!self.coreMap[key]) self.coreMap[key] = new AOP.Aspect(key);
      };

      /**
       * @function Dispatcher~get 属性值被调用前的回调函数
       * @this formProxy实例对象
       * @param {String} key 该属性值的唯一key
       * @param {*} v   当前属性值
       * @param {*} k   当前属性的key(对应父属性,短key)
       */
      this.get = function (key, v, k) {
        // 开启添加事件的监听
        self.enableAccess.length > 0 &&
        self.coreMap[key].online(self.enableAccess);
      };

      /**
       * @function Dispatcher~before 属性值被修改前的回调函数
       * @deprecated
       * @this formProxy实例对象
       * @param {*} key  该属性值的唯一key
       * @param {*} v    当前属性值
       * @param {*} v1   属性旧值
       * @param {*} k    当前属性的key(对应父属性)
       */
      this.before = function (key, v, v1, k) {};

      /**
       * @function Dispatcher~after 属性值被修改后的回调函数
       * @this formProxy实例对象
       * @param {String} key  该属性值的唯一key
       * @param {*} v    当前属性值
       * @param {*} v1   属性旧值
       * @param {*} k    当前属性的key(对应父属性,短key)
       */
      this.after = function (key, v, v1, k) {
        let _this = this;
        // 1. 执行直接监听回调,  如果回调函数返回值为 false 那么在执行之后会被移除列表
        self.coreMap[key].pool = util.filter(
          self.coreMap[key].pool,
          function (event) {
            return false !== event.fn.call(_this, v, v1, k, key);
          }
        );
        // 2.冒泡触发
        util.bubble(key, (v) => {
          if (v !== key && self.coreMap[v])
            util.each(
              self.coreMap[v].pool,
              (e) => "deep" === e.type && e.fn.call(_this, v, v1, k, key)
            );
        });
      };
    },
    /**
     * @constructor
     * @function AOP~Aspect 事件切面
     */
    Aspect: function (key) {

      let self = this;

      /**
       * @inner 当前切面的唯一编号
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">当前切面的唯一编号,一般为XXX.YYY.ZZZ格式的属性key</p>
       */
      this.key = key;

      /**
       * @inner 捕获标志
       * @type {boolean}
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">捕获标志:true代表已捕获;false代表未捕获</p>
       */
      this.access = false;

      /**
       * @inner 事件序列号列表
       * @type {Number[]}
       * @see constant~EVENT_SERIAL
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">保存被捕获时的事件序列编号</p>
       */
      this.serial = [];

      /**
       * @inner  事件{@linkplain AOP~Event 监听对象}集合
       * @type {AOP~Event[]}
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">特指当前切面对象下已经添加了的{@linkplain AOP~Event 监听对象}的列表</p>
       */
      this.pool = [];

      /**
       * @function Aspect~online 开启添加事件捕获
       * @param {Number[]} serial 当前事件序列号
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">开启添加事件捕获</p>
       *    <ol>
       *      <li>将{@linkplain Aspect~access 捕获标志}设置为true</li>
       *      <li>如果{@linkplain Aspect~serial 事件序列号列表}中没有该序列号,就将这个序列号加入列表中</li>
       *    </ol>
       *
       */
      this.online = (serial) => {
        self.access = true;
        util.each(serial, (s) => {
          if (self.serial.indexOf(s) < 0) self.serial.push(s);
        });
      };

      /**
       *  @function Aspect~online 关闭事件捕获
       *  @desc
       *    <p style = "color: #16b777;text-indent: 10px;">关闭事件捕获</p>
       *    <ol>
       *      <li>将{@linkplain Aspect~access 捕获标志}设置为false</li>
       *      <li>将{@linkplain Aspect~serial 事件序列号列表}清空</li>
       *    </ol>
       */
      this.offline = () => {
        self.access = false;
        self.serial = [];
      };

      /**
       * @function Aspect~add 将回调函数添加到{@linkplain Aspect~pool 集合}中
       * @param {Function} fn  回调函数
       * @param {String} type  回调类型 (deep|bind)
       * @param {Number} serial  当前事件序列号
       * @param {Function} cb  每次添加后执行的回调函数
       * @param {Function} flag  标志,是否绕过事件触发进行添加
       */
      this.add = (fn, type, serial, cb, flag) => {
        // 判断:如果绕过事件触发(比如用watch方法加入)就直接加入
        if (flag) return self.pool.push(new AOP.Event(fn, type));
        // 当前切面不处在捕获阶段就直接返回
        if (!self.access) return false;
        if (!!serial && self.serial.indexOf(serial) >= 0) {
          self.pool.push(new AOP.Event(fn, type));
          cb && cb(self.key);
        } else if (!serial) {
          self.pool.push(new AOP.Event(fn, type));
          cb && cb(self.key);
        }
      };
    },
    /**
     * @constructor
     * @function AOP~Event 事件监听对象
     * @param {Function} fn 回调函数
     * @param {String} type 回调类型 (deep|bind) deep标志的回调会冒泡触发
     */
    Event: function (fn, type = "bind") {
      this.fn = fn;
      this.type = type;
    },
  };

  /**
   * @constructor  表单实例对象
   * @param {*} options 配置项
   * @returns {formProxy} formProxy实例对象
   * @desc
   *    <p style = "color: #16b777;text-indent: 10px;">表单实例对象</p>
   *    <ul>
   *      <li style = "color: #ff5722;">这个模块(formplus)的目标是在渲染表单的同时返回一个表单实例对象,通过这个对象来操作更多功能</li>
   *      <li>表单实例对象创建是有当前模块完成</li>
   *      <li>表单实例对象提供的属性和方法有这些:
   *        <ol>
   *          <li>formProxy.$data - 这个是一个object对象,它以表单的name为key;表单的值为value</li>
   *          <li>formProxy.$watch - 这个方法可以添加事件监听</li>
   *          <li>formProxy.$destroy - 销毁这个表单实例对象</li>
   *        </ol>
   *      </li>
   *    </ul>
   */
  let formProxy = function (options) {
    return new formProxy.fn.newInstance(options);
  };

  formProxy.prototype = formProxy.fn = {

    /**
     * 创建{@linkplain formProxy 表单实例对象}
     * @param options
     * @returns {formProxy} 表单实例对象
     */
    newInstance: function (options) {
      // 创建一个事件监听管理分发对象
      this.dispatcher = new AOP.Dispatcher();
      // 初始化数据
      this._initData(options.data, options.dataSource);
      // 初始化方法
      this._initMethods(options.methods);
      // 初始化监视属性
      this._initWatchs(options.watchs);
      // 标志当前表单实例对象正在被使用
      this.isAlive = true;
      /**
       * @method 获取(更新)表单实例对象的值
       * @see util~getValue
       * @param k
       * @param v
       * @returns {*}
       */
      this.getValue = function (k, v) {
        return util.getValue.call(this, k, v);
      };
      /**
       * @method 添加事件监听
       * @param {*} fn 待执行的事件，也是监听改变时调用的事件，如果是函数，就需要率先封装好
       * @desc
       *    <p style = "color: #16b777;text-indent: 10px;">添加事件监听,这个方法根据传入的参数是否是一个函数分两种情况</p>
       *    <ul>
       *      <li>传入的参数不是函数,就按照传入的是XXX.YYY.ZZZ形式的key调用{@linkplain util~getValue} 获取对应的值进行返回</li>
       *      <li>传入的参数是函数,将会通知事件分发器做好捕获的准备,然后执行这个函数获取到函数的返回值,最后根据捕获情况将这个回调函数{@linkplain Dispatcher~addListener}添加到事件监听中</li>
       *    </ul>
       */
      this.addListener = function (fn) {
        let res = null,
          serial = constant.EVENT_SERIAL++;
        const f = util.isFunction(fn);
        if (f) this.dispatcher.enableAccess.push(serial);
        res = f ? fn.apply(this) : util.getValue.call(this, fn);
        if (f) this.dispatcher.addListener(fn, false, serial);
        return res;
      };
      // 执行created事件回调
      options.created && options.created.apply(this);
      return this;
    },

    /**
     * @method 给obj下面设置属性
     * @param {*} obj
     * @param {*} k
     * @param {*} v
     * @returns
     */
    $set(obj, k, v) {
      return this._set.call(this, obj, k, v);
    },

    /**
     * 添加监视属性
     * @param {*} key
     * @param {*} value
     * @returns
     */
    $watch(key, value) {
      return this._watch.call(this, key, value);
    },

    /**
     * 销毁实例
     */
    $destroy() {
      util.each(this.$children, (v) => v.$destroy());
      // 标记这个实例失效
      this.isAlive = false;
    },

    /**
     * @function formProxy.fn~_initData 初始化表单实例对象的data数据
     * @see util~observe
     * @param dataOption
     * @param dataSource
     * @private
     */
    _initData(dataOption = {}, dataSource = {}) {
      let self = this;
      // 如果数据项不是给的object而是一个回调函数,这里特殊处理
      let data = util.isFunction(dataOption)
        ? dataOption.call(self, dataSource)
        : dataOption;
      // 调用方法进行数据监视
      self.$data = util.observe.call(self, { target: data });
      // 将数据放到表单实例对象上
      Object.keys(self.$data).forEach((key) => {
        Object.defineProperty(self, key, {
          configurable: true,
          enumerable: true,
          get() {
            return self.$data[key];
          },
          set(value) {
            if (value == self.$data[key]) return;
            self.$data[key] = value;
          },
        });
      });
    },

    /**
     * @function formProxy.fn~_initMethods 初始化表单实例对象的方法
     * @param methods
     * @private
     */
    _initMethods(methods = {}) {
      let self = this;
      util.each(methods, (v1, k1) => (self[k1] = v1));
    },

    /**
     * @function formProxy.fn~_initMethods 初始化表单实例对象的监视回调
     * @param watchs
     * @private
     */
    _initWatchs(watchs = {}) {
      let self = this;
      util.each(watchs, (v, k) => self._watch.call(self, k, v));
    },

    _watch(key, fn) {
      let self = this;
      if (util.isFunction(fn)) {
        self.dispatcher.watch(self, key, fn);
      } else {
        self.dispatcher.watch(self, key, fn.handler, fn.deep, fn.immediate);
      }
    },

    _set(obj, k, v) {
      let self = this;
      if (util.isFunction(obj)) {
        obj.apply(self);
      } else {
        let o = {};
        o[k] = v;
        obj = Object.assign(obj, o);
      }
      self.$data = util.observe.call(self, { target: self.$data });
      Object.keys(self.$data).forEach((key) => {
        Object.defineProperty(self, key, {
          configurable: true,
          enumerable: true,
          get() {
            return self.$data[key];
          },
          set(value) {
            if (value == self.$data[key]) return;
            self.$data[key] = value;
          },
        });
      });
    },
  };

  formProxy.fn.newInstance.prototype = formProxy.fn;

  /**
   * @namespace formRenderer  表单渲染方法
   */
  let formRenderer = {
    /**
     * @function formRenderer~listen 初始化方法
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">初始化方法</p>
     *    <ul>
     *      <li>在{@linkplain layui.form}下面创建一个$children的数组,用来缓存后面创建的{@linkplain formProxy 表单实例对象}</li>
     *      <li>代理{@linkplain layui.form.render}方法,在执行方法前做出如下操作:
     *        <ol>
     *          <li>这里是将方法的第三个参数作为标志,一般的方法调用是不会传入的,它就是undefined,这个判断如果不传入就直接执行原来的渲染方法了</li>
     *          <li>通过传入的第二个参数filter确定需要渲染的表单(表单与表单之间通过这个属性来区分)</li>
     *          <li>执行{@linkplain formRenderer.render 渲染方法},并添加formplus属性防止后面重复渲染</li>
     *          <li>执行原来的渲染方法</li>
     *          <li>返回{@linkplain formProxy 表单实例对象},如果多个表单一起被渲染,则返回的是最后一个</li>
     *        </ol>
     *      </li>
     *    </ul>
     */
    listen: function () {
      /**
       * 在form下面防置一个空间变量，用来保存后面生成的{@linkplain formProxy 对象}
       */
      if (!layui.form.$children) {
        layui.form.$children = [];
      } else {
        // 如果存在说明初始化过了,不用重复调用
        return false;
      }
      /**
       * 拦截render函数
       * @param {*} type    待渲染组件的类型
       * @param {*} filter  待渲染组件的form的filter
       * @param {*} deploy  是否使用formplus进行处理,默认false
       * @returns 原来返回的是layui.form对象;现在返回的是 {@linkplain formProxy 对象}
       */
      layui.form.render = function (type, filter, deploy = false) {
        if (!deploy) return renderForever.call(layui.form, type, filter);
        // 获取表单选择器
        let selector = filter
          ? `.${constant.LAYUI_FORM}[${constant.LAYUI_FILTER}="${filter}"]`
          : `.${constant.LAYUI_FORM}`;
        let res = null;
        document.querySelectorAll(selector).forEach((ele) => {
          if (ele instanceof HTMLElement) {
            // 修改调用顺序,防止属性formplus影响第二次进入方法不能返回缓存中的对象的问题
            // 1. 获取当前表单的lay-filter 如果没有就自动生成一个，这个必须有，是作为表单的name存在的
            let name = util.getFormName(ele);
            // 2. 获取视图对象赋值给返回值
            res = util.getFormByName(name)
            // 渲染过一次之后添加上vform的属性防止重复渲染
            if (ele.getAttribute("formplus") == null) {
              ele.setAttribute("formplus", "true");
              res = formRenderer.render(ele);
            }
            // 有必要同步一下selectTree的状态是否正确
            if(formRenderer.fixValue && formRenderer.$tree) formRenderer.fixValue($(ele));
            // 最后调用原生的render方法渲染表单
            renderForever.call(layui.form, type, filter);
          }
        });
        return res;
      };
    },

    /**
     * @function formRenderer~render 渲染方法
     * @param {HTMLElement} item 待处理的form表单
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">处理layui的form创建并返回{@linkplain formProxy 表单实例对象}</p>
     *    <ol>
     *      <li>获取表单元素的lay-filter属性作为唯一的标志key</li>
     *      <li>针对这个表单元素创建一个{@linkplain formProxy 表单实例对象}</li>
     *      <li>将创建的对象放入缓存中,并返回</li>
     *    </ol>
     */
    render: function (item) {
      // 1.获取form的名字 - lay-filter 属性值
      let name = util.getFormName(item);
      // 3.创建一个{@linkplain formProxy 对象}
      let proxy = new formProxy({
        data: {},
        /**
         * @method 创建完成回调
         * @this formProxy 表单实例对象
         * @desc
         *    <p style = "color: #16b777;text-indent: 10px;">由于这个对象不用挂载dom,所以在创建完毕的回调里面添加逻辑</p>
         *    <ol>
         *      <li>从数据到dom,这里需要通过监视属性来实现</li>
         *      <li>从dom到数据,这里通过添加dom的监听事件来实现(由于layui会对表单进行美化,这里需要抢占layui的监听事件)</li>
         *    </ol>
         *
         */
        created() {
          let self = this;
          // 将表单的name和dom带上,name方便下一次找到这个formProxy对象;ele方便判断dom是否下树,释放对象
          self.$name = name;
          self.$ele = item;
          // 首先遍历表单元素
          let fieldElems = $(item).find("input,select,textarea");
          util.each(fieldElems, (formItem) => {
            if (formItem instanceof HTMLElement) {
              // lay-ignore标注后不会对这个进行美化,这里就放弃渲染它
              if (formItem.getAttribute("lay-ignore") === null && formItem.getAttribute("lay-formplus-ignore") === null) {
                // 获取元素的name属性，作为它的key
                let _name = formItem.name;
                // 由于表单可能由layui渲染过了，生成了一些干扰表单元素， 有点干扰，这里尽量避免干扰, 没得name属性的不进行渲染
                if (_name) {
                  // 获取元素的type属性，checkbox对应的是数组，其它的就直接就是值
                  let _type =
                    formItem.type == "checkbox" ? "checkbox" : formItem.type == "radio" ? "radio" : formItem.tagName.toLowerCase() == "select" ? "select" : "input";
                  // switch 特殊判断
                  if (
                    formItem.type == "checkbox" &&
                    formItem.getAttribute("lay-skin") == "switch"
                  )
                    _type = "switch";
                  // 判断当前是否有以这个name为key的值，如果没有就添加一个
                  if (!self.$data[_name])
                    self.$set(self.$data, _name, "checkbox" == _type ? [] : "");
                  // 挑选合适的方法继续渲染
                  Array.prototype.every.call(
                    formRenderer.getRenderers(),
                    function (r) {
                      if (r.canDeal(formItem, _type)) {
                        r.deal(item, formItem, self);
                        return false;
                      }
                      return true;
                    }
                  );
                }
              }
            }
          });
          // 渲染波纹按钮
          let waveElems = $(item).find(".layui-water-ripples-container");
          if(waveElems.length > 0){
            util.each(waveElems, (waveItem) => {
              if (waveItem instanceof HTMLElement) {
                // lay-ignore标注后不会对这个进行美化,这里就放弃渲染它
                if (waveItem.getAttribute("lay-ignore") === null && waveItem.getAttribute("lay-formplus-ignore") === null) {
                  if($(waveItem).hasClass('layui-water-ripples-container'))
                    // 调用渲染方法
                    formRenderer.wave($(waveItem));
                }
              }
            });
          }

        },
      });
      // 放入form中
      layui.form.$children.push(proxy);
      // 返回这个新建的对象
      return proxy;
    },

    /**
     * @constructor
     * @function formRenderer~renderer 表单元素处理器
     * @param {*} condition 渲染条件,达到这个条件才能用这个处理器进行渲染
     * @param {*} action   渲染方法
     */
    renderer: function (condition, action) {
      // 这里简单处理,如果传入的condition不是这个函数,就封装成一个函数
      this.canDeal = util.isFunction(condition)
        ? (...param) => condition.apply(this, param)
        : (...param) => new Function(condition, param);
      this.deal = (...param) => action.apply(this, param);
    },

    /**
     * @function formRenderer~getRenderers 获取当前全部注册的处理器
     * @returns {formRenderer~renderer []}
     */
    getRenderers: function () {
      // 如果没有初始化就调用方法初始化
      if (!formRenderer.renderers) formRenderer.initRenderers();
      return formRenderer.renderers;
    },

    /**
     * @function formRenderer~initRenderers 初始化处理器
     * @returns {formRenderer~renderer []}
     */
    initRenderers: function () {
      if (formRenderer.renderers) return formRenderer.renderers;
      formRenderer.renderers = [];
      formRenderer.renderers.push(MyRenderers.input);
      formRenderer.renderers.push(MyRenderers.date);
      formRenderer.renderers.push(MyRenderers.switch);
      formRenderer.renderers.push(MyRenderers.checkbox);
      formRenderer.renderers.push(MyRenderers.radio);
      formRenderer.renderers.push(MyRenderers.select);
      return formRenderer.renderers;
    },

    /**
     * @function formRenderer~val 表单赋值/取值
     * @param {*} filter 表单的filter属性
     * @param {*} value 赋值内容
     * @returns obj 表单信息
     */
    val: function(filter, value){
      if(!filter) return null;
      if(!value) return layui.form.val(filter);
      let _formProxy = layui.form.render(null, filter, true);
      if(!_formProxy) return;
      // 赋值
      layui.each(value, function (k, v){
        // 新增 - 数组类型的特殊处理
        if(util.isArray(v) && util.isArray(_formProxy.$data[k])){
          // 清空值
          _formProxy.$data[k].splice(0, _formProxy.$data[k].length);
          // 依次赋值
          layui.each(v, function (key, value){
            _formProxy.$data[k].push(value);
          });
        } else {
          _formProxy.$data[k] = v;
        }
      });
      return layui.form.val(filter);
    },

    /**
     * @function formRenderer~getValue formplus表单取值
     * @param {*} filter 表单的filter属性
     * @param {*} key 需要取值表单元素的name属性值
     * @returns obj 表单元素的值
     */
    getValue(filter, key) {
      if(!filter) return null;
      let _formProxy = layui.form.render(null, filter, true);
      if(!_formProxy) return null;
      return _formProxy.$data[key] || null;
    },

    /**
     * @function formRenderer~on 表单事件绑定
     * @param {*} filter 表单的filter属性
     * @param {*} key 需要绑定change事件的表单元素的name属性值
     * @param {*} fn 回调函数
     */
    on: function(filter, key, fn){
      if(!filter) return null;
      let _formProxy = layui.form.render(null, filter, true);
      if(!_formProxy) return;
      // 监听事件
      _formProxy.$watch(key, fn);
    },

    /**
     * @function formRenderer~wave 为按钮添加水波纹动画
     * @param destination 按钮外层的div对应的jq对象
     * @param option  配置参数
     * @desc
     *    要想达到效果,dom结构需要如下(外面套一层class为layui-water-ripples-container的div需要注意的是这个div display是inline-block):
     *
     *    <div class = "layui-water-ripples-container">
     *       <button class="layui-btn" >按钮</button>
     *    </div>
     */
    wave: function(destination, option = {}){
      // 渲染过一次之后防止重复渲染
      if(destination.attr("lay-wave")){
        return;
      }
      // 处理配置项参数
      let optionsAttr = destination.attr("lay-options");
      let options = {};
      if(optionsAttr){
        options = optionsAttr
          ? JSON.parse(String(optionsAttr).replace(/\'/g, () => '"'))
          : {};
      }
      let opt = {
        type: option.type || options.type || 'inset', // or out
        color: option.color || options.color || '#000000', // or rgba
        borderRadius: option.borderRadius || options.borderRadius || '2px', // 仅 out 类型生效,需要带上px 或者直接是填百分比
        spreadWidth: option.spreadWidth || options.spreadWidth || '6px',// 仅 out 类型生效
        spreadSize: option.spreadSize || options.spreadSize,// 仅 inset 类型生效
        trigger: option.trigger || options.trigger || 'click', // 触发方式 click always mouseenter
        center: option.center || options.center || false,// 仅 inset 类型生效  true or false
      };

      let btnWidth = destination.find('button').outerWidth(true);
      let btnHeight = destination.find('button').outerHeight(true);
      let style = '';
      if(opt.type == 'inset'){
        style = 'left: '+ btnWidth/2 +'px; top: '+ btnHeight/2 +'px;'
      }else{
        style = 'width: '+ btnWidth +'px;';
      }
      if(!opt.spreadSize){
        opt.spreadSize = (Math.max(btnWidth, btnHeight) + 20) + 'px';
      }
      let waveArea = `
        <div class="${opt.type == 'inset' ? 'layui-inset-ripples' : 'layui-out-ripples'}${opt.trigger == 'always' ? ` layui-animate-always--${opt.type == 'inset' ? 'inset' : 'out'}` : ''}" style="border-radius: ${opt.type == 'inset' ? '50%' : opt.borderRadius}; --layui-ripple-color: ${opt.color}; --layui-spread-width: ${opt.spreadWidth}; --layui-spread-size: ${opt.spreadSize}; ${style} "></div>
      `;
      destination.append($(waveArea));
      destination.attr("lay-wave", true);
      if(opt.type == 'inset'){
        destination.css({
          'overflow': 'hidden',
        });
      }
      // 绑定点击事件
      if(opt.trigger == 'click'){
        destination.find('button').on('click', function(e){
          if(opt.type == 'out'){
            if(!destination.find('.layui-out-ripples').hasClass('layui-animate-once--out'))
              destination.find('.layui-out-ripples').addClass('layui-animate-once--out');
            setTimeout(function(){
              destination.find('.layui-out-ripples').removeClass('layui-animate-once--out')
            }, 1000);
          }else{
            if(!opt.center){
              let rect = destination.find('button').get(0).getBoundingClientRect();
              let offsetX = e.clientX - rect.x;
              let x = Math.max(offsetX, btnWidth - offsetX);
              let offsetY = e.clientY - rect.y;
              let y = Math.max(offsetY, btnHeight - offsetY);
              let spreadSize = Math.sqrt(x * x + y * y) * 2 + 20;
              destination.find('.layui-inset-ripples').css({
                'left': offsetX + 'px',
                'top': offsetY + 'px',
                '--layui-spread-size': spreadSize + 'px',
              });
              destination.find('.layui-inset-ripples').get(0).style.setProperty('--layui-spread-size', spreadSize + 'px');
            }
            if(!destination.find('.layui-inset-ripples').hasClass('layui-animate-once--inset'))
              destination.find('.layui-inset-ripples').addClass('layui-animate-once--inset');
            setTimeout(function(){
              destination.find('.layui-inset-ripples').removeClass('layui-animate-once--inset')
            }, 1000);
          }
        });
      }

      // 鼠标移入事件
      if(opt.trigger == 'mouseenter'){
        destination.on('mouseenter', 'button', function(e){
          if(opt.type == 'out'){
            if(!destination.find('.layui-out-ripples').hasClass('layui-animate-once--out'))
              destination.find('.layui-out-ripples').addClass('layui-animate-once--out');
          }else{
            if(!destination.find('.layui-inset-ripples').hasClass('layui-animate-once--inset'))
              destination.find('.layui-inset-ripples').addClass('layui-animate-once--inset');
          }
        }).on('mouseleave', 'button', function(){
          if(opt.type == 'out'){
            destination.find('.layui-out-ripples').removeClass('layui-animate-once--out')
          }else{
            destination.find('.layui-inset-ripples').removeClass('layui-animate-once--inset')
          }
        });
      }
    },


  };

  /**
   * @namespace MyRenderers  表单渲染处理器集合
   */
  let MyRenderers = {
    /**
     * @inner MyRenderers~input 普通输入框处理器
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">普通输入框处理器</p>
     *    <ul>
     *      <li style = "color: #ff5722;">判定条件:
     *        <ol>
     *          <li>传入的type是input证明它确实是一个输入框</li>
     *          <li>没有被laydate属性标注,说明formplus不会把它当作时间选择框来处理</li>
     *          <li>没有被lay-laydate-id | lay-key属性标注,说明它没有被laydate组件渲染</li>
     *        </ol>
     *      </li>
     *      <li>处理步骤:
     *        <ol>
     *          <li>调用方法将实例里面对应的值,设置成表单元素当前的真实值</li>
     *          <li>为它添加表单input改变事件监听,同步修改实例里面对应的值</li>
     *          <li>添加实例监视事件,在修改实例对应的值的同时修改表单的值</li>
     *          <li>2和3来保证页面表单元素的值和实例里面对应的值同步</li>
     *        </ol>
     *      </li>
     *    </ul>
     */
    input: new formRenderer.renderer(
      function (formItem, type) {
        // 是输入框,但是没有被标注是时间选择框以及没有被laydate渲染
        return (
          type == "input" &&
          formItem.getAttribute("laydate") === null &&
          formItem.getAttribute("lay-key") === null &&
          formItem.getAttribute("lay-laydate-id") === null // 更正属性值 layui-laydate-id => lay-laydate-id
        );
      },
      function (item, formItem, formProxy) {
        // 初始化数据
        formProxy.getValue(formItem.name, formItem.value);

        var othis = $(formItem);
        var oparent = othis.parent();
        var oroot = othis.parent().parent();
        // 判断是否拥有下拉树的结构
        var selectTreeFlag = oparent.hasClass("layui-select-title") && oroot.hasClass("layui-form-select");
        let eventKey =
          formItem.getAttribute(constant.LAYUI_LAZY) != null
            ? "blur"
            : "input propertychange";
        // 按照普通的input or textarea 处理
        // input 和textarea 不考虑页面美化带来的影响
        util.each(eventKey.split(" "), (v) => {
          formItem.addEventListener(v, function () {
            if(selectTreeFlag){
              // 下拉树有单选和多选的形式,多选使用数组储存
              formProxy.getValue(formItem.name, this.value.split ? this.value.split(',') : this.value);
            }else{
              formProxy.getValue(formItem.name, this.value);
            }
          });
        });

        /**
         * 新增文本域字数限制
         *  首先判断这个文本域是否带有 属性 maxlength 这样可以限制它的输入字数
         *
         *  1. 获取最大限制字数
         *  2. 创建一个变量 这个变量需要依托当前的属性值，直接放在视图对象下面
         *  3. 创建一个属性，
         *  4. 创建一个监视属性，在当前文本域录入的时候，更新上面的属性值
         *  5. 利用伪标签读取属性值的特性将这个结果动态的展示出来
         *
         *  为了保证实时更新，建议不要添加lay-lazy属性。
         */
        if (formItem.getAttribute("maxlength") != undefined) {
          // lay-affix="number" input的结构会发生改变,先定向渲染它,然后再进行事件绑定
          if(formItem.getAttribute("lay-affix") == "number")
            renderForever.call(layui.form, $(formItem));
          // 1. 获取最大限制字数
          let maxlength = formItem.getAttribute("maxlength");
          // 2. 创建一个变量
          let _tempName = formItem.name + "-limit";
          formProxy.$set(formProxy.$data, _tempName, "0/" + maxlength);
          // 4. 创建监视属性
          formProxy.$watch(formItem.name, {
            immediate: true,
            deep: false,
            handler: function (v) {
              let length = v ? v.length : 0;
              // 设置在父标签上面,因为输入框这类标签不支持:after
              formItem.parentElement.setAttribute(
                "dataMaxlength",
                "" + length + "/" + maxlength
              );
            },
          });
        }

        /**
         * 新增输入框 lay-affix类型和number事件的监听
         *  首先判断这个文本域是否带有 属性  lay-affix
         *  然后在事件中获取值进行处理
         */
        if (
          formItem.getAttribute("lay-affix") == "number" ||
          formItem.getAttribute("lay-affix") == "clear"
        ) {
          layui.form.on(
            "input-affix(" + util.getFormFilterName(formItem) + ")",
            function (data) {
              var elem = data.elem; // 获取输入框 DOM 对象
              formProxy.getValue(formItem.name, elem.value);
            }
          );
        }

        /**
         * @method  展开select-tree的树下拉区域
         * @param {*} ele
         * @desc
         *   2024/01/22 添加下拉树功能时新增
         */
        var openSelectTree = function(ele){
          // 模拟下拉列表的下拉显隐的原理
          $(".layui-form-select").not(ele.parents(".layui-form-select")).removeClass("layui-form-selected");
          ele.parents(".layui-form-select").toggleClass("layui-form-selected");
          // 将滚动条调整到最上面
          ele.parents(".layui-form-select").find("dl").scrollTop(0);
        }

        /**
         * @method  点击select-tree的选择框事件
         * @param {*} e
         * @desc
         *   2024/01/22 添加下拉树功能时新增
         */
        var onClickTreeInput = function(e){
          // 展开下拉选项
          openSelectTree($(e.target));
          // 阻止事件
          layui.stope(e);
        }

        /**
         * @method  模拟在下拉选择框 隐藏 之后的回调
         * @param {*} e
         * @param {*} clear
         * @desc
         *   2024/01/22 添加下拉树功能时新增
         */
        var hide = function(e, clear){
          if(!$(e.target).parent().hasClass("layui-select-title") || clear){
            $(".layui-select-title").removeClass("layui-form-selected");
            // 添加上settimeout让下面的select的事件先触发
            setTimeout(fixValue, 200);
          }
        };

        /**
         * @method 让下拉树的 layui-select-tree-value 和 layui-select-tree-title 值保持一致的做法
         * @param {*} dom
         * @desc
         *   2024/01/22 添加下拉树功能时新增
         */
        var fixValue = formRenderer.fixValue = function(dom){
          var $dom = dom || $('.layui-form-select');
          if(!$dom.get(0)) return;
          if($dom.hasClass("layui-form-select")) {
            // 判断下拉的部分已经收起,并且是渲染出了layui-select-tree-value这个输入框的
            if(!$dom.hasClass('layui-form-selected') && !$dom.hasClass('layui-form-selectup') && $dom.find('.layui-select-tree-value').get(0)){
              // 2024/01/22 修改成each循环,防止多个下拉树的相互影响
              $dom.each(function(){
                doFixValue(this);
              });
            }
          }else{
            $dom.find(".layui-form-select").each(function(){
              var $this = $(this);
              // 判断下拉的部分已经收起,并且是渲染出了layui-select-tree-value这个输入框的
              if(!$this.hasClass('layui-form-selected') && !$this.hasClass('layui-form-selectup') && $this.find('.layui-select-tree-value').get(0)){
                doFixValue(this);
              }
            });
          }
        };

        /**
         * 上面的方法是要判断必须隐藏时才同步信息，这个方法绕过了校验
         * 但是传入的dom必须是一个确定的dom才行
         * @param dom
         */
        var doFixValue = formRenderer.doFixValue = function(dom){
          var $this = $(dom);
          // 获取值,并以这个值为准查找出匹配的文字 newValue
          var oldValue = $this.find('.layui-select-tree-value').val();
          // 查询树的id
          var treeId = $this.find('[lay-tree-id]').attr('lay-tree-id');
          // 获取树实例
          var treeInst = cacheSelectTree(treeId);
          if(treeInst){
            var values = [];
            if(treeInst.mutiple){
              // 多选就拆分字符串
              values = oldValue.split(",");
              var newValue = '';
              // 在树里面找到对应的名称,并拼接结果
              layui.each(values, function(key, value){
                var node = $this.find('[data-id="'+value+'"] .layui-tree-txt').get(0);
                var _newValue = node ? node.textContent : '';
                newValue += _newValue + ',';
              });
              // 去掉最后的逗号
              if(newValue) newValue = newValue.substr(0, newValue.length - 1);
              // 设置匹配的文字 newValue
              $this.find('.layui-select-tree-title').val(newValue);
            }else{
              values = [oldValue];
              var node = $this.find('[data-id="'+oldValue+'"] .layui-tree-txt').get(0);
              var newValue = node ? node.textContent : '';
              // 设置匹配的文字 newValue
              $this.find('.layui-select-tree-title').val(newValue);
            }
            //  树匹配上新的values值
            //  (作废,与设置选中样式不可避免耦合,主要是treedata不对外开放)页面优化调整,如果是阻止了关闭下拉区域,此时去重载树会导致树的位置与改变前不一致,不利于进一步的修改,所以这里添加一个判断
            // if(!treeInst.checkbox){
              treeInst.search(null, values);
            // }
            // TODO 设置选中的样式
            selectedOption(treeInst, values);
          }
        };

        /**
         * 设置树的选中样式,对于选中的选项添加layui-form-selecttree-selected
         * @param inst
         * @param values
         */
        var selectedOption = function(inst, values){
          if(!util.isArray(values)) values = [values];
          layui.each(values, function(key, value){
            inst.config.elem.find('[data-id="'+value+'"]').find('.layui-tree-txt').eq(0).addClass(TREE_SELECTED_CSS);
          });
          // includes 好像数字 123 和字符串 '123' 不能匹配
          // inst.config.elem.find('[data-id]').each(function(e){
          //   let id = $(this).attr('data-id');
          //   if(values.includes(id)) $(this).find('.layui-tree-txt').addClass(TREE_SELECTED_CSS)
          // });
        };

        /**
         * @method 缓存or取出树的实例
         * @param id  树的id
         * @param treeInst 树的实例
         * @returns {*} 树的实例
         */
        var cacheSelectTree = function(id, treeInst){
          if(!formRenderer.$tree) formRenderer.$tree = {};
          if(treeInst) formRenderer.$tree[id] = treeInst;
          return formRenderer.$tree[id];
        };

        //重新渲染下拉树,将值同步
        $(item).find('.layui-select-tree-value').each(function(){
          var _othis = $(this);
          var _oparent = _othis.parent();
          var _oroot = _othis.parent().parent();
          if(_oparent.hasClass("layui-select-title") && _oroot.hasClass("layui-form-select")){
            fixValue(_oroot);
          }
        });

        // 当前环境是设置了lay-options 但是没有laydate的可能被判断为下拉树 - 下面还要查看结构
        let optionsAttr = formItem.getAttribute("lay-options");
        if(optionsAttr != undefined){
          var CLASS = 'layui-form-select';
          var name = othis.attr('name');
          var filter = othis.attr('lay-filter');
          /**
           * 为了下面的功能保障(其实是在模拟下拉框被渲染后的dom),这个选择框的格式如下:
           *       <div class="layui-unselect layui-form-select">
           *          <div class="layui-select-title"  >
           *              <input type="text" placeholder="placeholder" name="name" class="layui-input" />
           *          </div>
           *       </div>
           */
          if(selectTreeFlag){
            // 隐藏当前的input表单元素,这个元素记录的应该是类似id的信息，前端展示的是名称信息,这两个是分开的dom
            othis.addClass('layui-hide');
            // 区分当前保存值的class
            othis.addClass('layui-select-tree-value');
            // 创建一个 * + name 的输入框,作为后面展示的输入框,单独将它拎出来方便后面绑定事件
            let nameDom = $('<input type = "text" autocomplete="off" class="layui-input layui-unselect layui-input-name layui-select-tree-title"  name = "*'+name+'"  placeholder = "'+othis.attr("placeholder")+'">');
            oparent.append(nameDom).append('<i class="layui-edge"></i>');
            /**
             * 这里都是js赋值,不会触发input propertychange事件,为了方便就去掉这个
             * 在layui.form.val(filter)方法依然可以将带*的值取出来的,因为这个输入框是有name属性的
             */
            // // 保存这个title的值
            // formProxy.$set(formProxy.$data, '*' + name, '');
            // // 监听这个输入框在改变时修改上面的值
            // nameDom.on('input propertychange', function(){
            //   formProxy.$data['*' + name] = this.value;
            // })
            oparent.on('click', function(e){
              // 点击parent节点调用方法展开树
              onClickTreeInput(e);
              // 将input框上面的信息赋给tree
              // 获取tree的id
              let _treeId = oroot.find('[lay-tree-id]').attr('lay-tree-id');
              // 刷新树实例
              cacheSelectTree(_treeId).search(null, formProxy.$data[name]);
              // TODO 设置选中的样式
              selectedOption(cacheSelectTree(_treeId), formProxy.$data[name]);
            });
            // dl dd节点模拟select下拉节点
            var dlDom = $('<dl class="layui-anim layui-anim-upbit" ></dl>');
            var ddDom = $('<dd ></dd>');
            dlDom.append(ddDom);
            oroot.append(dlDom);
            // 添加一个隐藏的空的下拉框
            var selectContainer = $('<div class = "layui-hide" style = "display:none" ></div>');
            var selectDom = $('<select></select>');
            selectContainer.append(selectDom);
            oroot.append(selectContainer);
            /**
             * 使用定向渲染渲染一个空的下拉框出来,这里很多的事件是依赖下拉框事件的,所以这里添加一个空的下拉框来初始化这些事件
             * 2023/11/13 如果异步加载form,会卡在这一步，因为form.render方法在模块加载之前就会执行,这里直接用内部属性方法放方式调用更稳妥
             */
            layui.form.render(selectDom);
            dlDom.on('click',function(e){
              // 去掉默认的事件，点击这里只来触发点击树的事件
              layui.stope(e);
            });
            let options = optionsAttr
              ? JSON.parse(String(optionsAttr).replace(/\'/g, () => '"'))
              : {};
            if(!options.customName) options.customName = {};
            if(!options.customName.id) options.customName.id = 'id';
            if(!options.customName.title) options.customName.title = 'title';
            if(options.showCheckbox == true){
              // 多选则重新赋值
              if(formProxy.$data[name]){
                formProxy.$set(formProxy.$data, name, formProxy.$data[name].split(','));
              }else{
                formProxy.$set(formProxy.$data, name, []);
              }
            }
            layui.use(['tree','treeorder'], function(){
              // 根据配置项渲染树
              var treeInst = layui.tree.render({
                elem: ddDom,
                id: options.id,
                onlyIconControl: options.onlyIconControl || true, // 节点只用来触发点击事件
                data: options.data || [],
                customName: options.customName,
                showCheckbox: false,
                click: function(obj){
                  // 点击事件时回去触发 layui.form.on('selectTree(filter)', fn) 事件,事件返回false时不会触发下面的赋值操作,返回不是false触发赋值操作
                  if(layui.event.call(layui.form, "form", 'selectTree('+ filter +')', { elem: othis.get(0) ,value: obj.data ,othis: oroot }) !== false){
                    var values = [];
                    // 赋值
                    if(options.showCheckbox == true){
                      var _id = obj.data[options.customName.id];
                      var _title = obj.data['*' + options.customName.title] ? obj.data['*' + options.customName.title] : obj.data[options.customName.title];
                      values = formProxy.$data[name];
                      if(util.indexOf(values, _id) < 0) {
                        values.push(_id);
                      }else{
                        values.splice(util.indexOf(values, _id), 1);
                      }
                      // indexof  includes 会区分数字和字符串
                      // if(values.includes(_id)){
                      //   values.splice(values.indexOf(_id), 1);
                      // }else{
                      //   values.push(_id);
                      // }
                    }else{
                      let _realTitle = obj.data['*' + options.customName.title] ? obj.data['*' + options.customName.title] : obj.data[options.customName.title];
                      othis.val(obj.data[options.customName.id]);
                      nameDom.val(_realTitle);
                      // 赋值
                      formProxy.$data[name] = obj.data[options.customName.id];
                      values = [obj.data[options.customName.id]];
                    }
                    // 获取树的id
                    var treeId = othis.parent().parent().find('[lay-tree-id]').attr('lay-tree-id');
                    // 获取树的实例并重载
                    // (作废,与设置选中样式不可避免耦合,主要是treedata不对外开放)页面优化调整,如果是阻止了关闭下拉区域,此时去重载树会导致树的位置与改变前不一致,不利于进一步的修改,所以这里添加一个判断
                    // if(!options.checkbox) cacheSelectTree(treeId).search(null, values);
                    // TODO 设置选中的样式
                    selectedOption(cacheSelectTree(treeId), values);
                    // 隐藏下拉选择框 添加一个限制,多选时设置参数是checkbox不关闭下拉框,做复选,关闭是点击空白处
                    if(options.showCheckbox == true && options.checkbox == true){
                      doFixValue(oroot);
                    } else {
                      oroot.removeClass(CLASS+'ed ' + CLASS+'up');
                      // 隐藏时同步文本好像不好使,这里再次调用同步的方法
                      setTimeout(fixValue, 200);
                    }
                  }
                },
                /**
                 * 添加后与上面的点击事件形成出人意料的调用溢出
                 */
                // oncheck: function(obj){
                //   // 点击事件时回去触发 layui.form.on('selectTree(filter)', fn) 事件,事件返回false时不会触发下面的赋值操作,返回不是false触发赋值操作
                //   if(layui.event.call(layui.form, "form", 'selectTree('+ filter +')', { elem: othis.get(0) ,value: obj.data ,othis: oroot }) !== false){
                //     var values = [];
                //     // 赋值
                //     var _id = obj.data[options.customName.id];
                //     values = formProxy.$data[name];
                //     if(values.includes(_id) && !obj.checked){
                //       // 包括且未选中
                //       values.splice(values.indexOf(_id), 1);
                //     }else if(!values.includes(_id) && obj.checked){
                //       // 不包括且选中
                //       values.push(_id);
                //     }
                //     // 获取树的id
                //     var treeId = othis.parent().parent().find('[lay-tree-id]').attr('lay-tree-id');
                //     // 获取树的实例并重载
                //     cacheSelectTree(treeId).search(null, values);
                //     // 隐藏下拉选择框
                //     oroot.removeClass(CLASS+'ed ' + CLASS+'up');
                //     // 隐藏时同步文本好像不好使,这里再次调用同步的方法
                //     setTimeout(fixValue, 200);
                //   }
                // },
              }, true);
              // dom上面添加tree的id属性方便查找调用
              ddDom.attr('lay-tree-id',treeInst.config.id);
              // 缓存实例
              treeInst.mutiple = options.showCheckbox == true;
              treeInst.checkbox = options.checkbox == true;
              cacheSelectTree(treeInst.config.id, treeInst);
              // 添加搜索
              nameDom.on("input propertychange", function(){
                // 展开
                if(!oroot.hasClass('layui-form-selected') && !oroot.hasClass('layui-form-selectup')){
                  nameDom.trigger('click');
                }
                var values = formProxy.$data[name];
                // 重载树
                cacheSelectTree(treeInst.config.id).search($(this).val(), values);
                // TODO 设置选中的样式
                selectedOption(cacheSelectTree(treeInst.config.id), values);
              });
              othis.on("input propertychange", function(){
                // 对当前属性赋值时，同步显示
                fixValue(oroot);
              });
              // 在配置项上面添加了数据源时,使用ajax请求更新树的数据源
              if(options.url){
                var param = options.where || {};
                $.ajax({
                  url: options.url,
                  type: options.type || 'GET',
                  headers: options.headers || {},
                  data: options.dataType != 'json' ? param : JSON.stringify(param),
                  success: function (res) {
                    if (res[options.statusName || 'code'] == (options.statusCode || 200)) {
                      let list = res[options.dataName || 'data'];
                      // 重载树
                      var values = formProxy.$data[name];
                      let _data = layui.treeorder.setSource(treeInst.config.id, list);
                      cacheSelectTree(treeInst.config.id).search(null, values);
                      // TODO 设置选中的样式
                      // 同步一下当前的tree
                      doFixValue(oroot);
                    }
                  },
                });
              }else{
                // 同步一下当前的tree
                doFixValue(oroot);
              }
            });
            // 绑定windows事件
            if(!SELECT_TREE_EVENT){
              SELECT_TREE_EVENT = true;
              $(document).on('click', hide);
            }
          }
          // 去掉lay-options属性,防止重复绑定
          othis.removeAttr('lay-options');
        }

        // 添加监视属性
        formProxy.$watch(formItem.name, function (v) {
          if(selectTreeFlag){
            formItem.value = v.join ? v.join(',') : v;
            //
            fixValue(oroot);
          }else{
            formItem.value = v;
          }
        });
      }
    ),
    /**
     * @inner MyRenderers~date 时间选择框处理器
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">时间选择框处理器</p>
     *    <ul>
     *      <li style = "color: #ff5722;">判定条件:
     *        <ol>
     *          <li>传入的type是input证明它是一个输入框</li>
     *          <li>被laydate属性标注,说明formplus把它当作时间选择框来处理</li>
     *          <li>被lay-laydate-id标注,说明它已经被laydate组件渲染</li>
     *        </ol>
     *      </li>
     *      <li>处理步骤:
     *        <ol>
     *          <li>如果输入框还没有被laydate渲染,就根据它上面的lay-options属性值来进行渲染时间选择框</li>
     *          <li>通过获取lay-laydate-id|lay-key属性获取时间组件的key,从而得到时间控件对象</li>
     *          <li>在时间控件对象的done回调函数的末尾添加上修改实例里面对应的值这一操作</li>
     *          <li>添加实例监视事件,在修改实例对应的值的同时修改表单的值</li>
     *          <li>3和4来保证页面表单元素的值和实例里面对应的值同步</li>
     *          <li>调用方法将实例里面对应的值,设置成表单元素当前的真实值</li>
     *        </ol>
     *      </li>
     *    </ul>
     */
    date: new formRenderer.renderer(
      function (formItem, type) {
        let flag =
          type == "input" &&
          (formItem.getAttribute("laydate") !== null ||
            formItem.getAttribute("lay-laydate-id") !== null); // 更正属性值 layui-laydate-id => lay-laydate-id
        return flag;
      },
      function (item, formItem, formProxy) {
        if (
          formItem.getAttribute("lay-laydate-id") === null && // 更正属性值 layui-laydate-id => lay-laydate-id
          formItem.getAttribute("lay-key") === null
        ) {
          let optionsAttr = formItem.getAttribute("lay-options");
          let options = optionsAttr ? JSON.parse(String(optionsAttr).replace(/\'/g, () => '"')) : {};
          options.elem = formItem;
          /**
           * 新增 lunar 插件特殊处理
           * 参考地址 https://layui.dev/docs/2/laydate/#demo-custom-cell
           */
          if(window.Lunar && options.theme && options.theme == "lunar"){
            // 阻止下方直接预览信息,这里是需要通过事件特殊处理的
            options.isPreview = false;
            // 限制button数量,太多会遮挡
            options.btns = ['clear','now'];
            // 初始化填充 - 当前日期的详情
            options.ready = function (date) {
              if (!this._previewEl) {
                var key = this.elem.attr('lay-key');
                var panelEl = $('#layui-laydate' + key);
                this._previewEl = panelEl.find('.layui-laydate-preview');
                this.cellRender(date);
              }
            };
            // 在切换时间时更新 - 当前日期的详情
            options.change = function(value, date) {
              this.cellRender(date);
            };
            options.onNow = function(value, date) {
              this.cellRender(date);
            };

            // 时间格子更新事件,要把对应的农历信息更新上去 - 当前日期的详情也要更新
            options.cellRender = function (ymd, render, info) {
              var that = this;
              var y = ymd.year;
              var m = ymd.month;
              var d = ymd.date;
              var lunarDate = Solar.fromYmd(y, m, d).getLunar();
              var lunar = lunarDate.getDayInChinese();
              var jieQi = lunarDate.getJieQi();
              var holiday = HolidayUtil.getHoliday(y, m, d);
              var displayHoliday = holiday && holiday.getTarget() === holiday.getDay() ? holiday.getName() : undefined;
              var displayHolidayBadge = holiday && holiday.getTarget() ? (holiday.isWork() ? '班' : '休') : undefined;
              var isHoliday = holiday && holiday.getTarget() && !holiday.isWork();
              // 在预览区显示自定义农历相关信息
              if (that._previewEl && (!info || (info && info.type === "date"))) {
                var holidayBadgeStyle = [
                  'color:#fff',
                  'background-color:' + (isHoliday ? '#eb3333' : '#333'),
                  'display:' + (displayHolidayBadge ? 'inline-block' : 'none')
                ].join(';')
                var festivalBadgeStyle = [
                  'color:#fff',
                  'background-color:#1e9fff',
                  'display:' + (displayHoliday || jieQi ? 'inline-block' : 'none')
                ].join(';')
                var tipsText = [
                  '<div class="preview-inner">',
                  '<div style="color:#333;">农历' + lunarDate.getMonthInChinese() + '月' + lunarDate.getDayInChinese() + '</div>',
                  '<div style="font-size:10px">' + lunarDate.getYearInGanZhi() + lunarDate.getYearShengXiao() + '年</div>',
                  '<div style="font-size:10px">' + lunarDate.getMonthInGanZhi() + '月 ' + lunarDate.getDayInGanZhi() + '日</div>',
                  '<div class="badge" style="' + holidayBadgeStyle  +'">' + displayHolidayBadge + '</div>',
                  '<div class="badge" style="'+ festivalBadgeStyle +'">' + (displayHoliday || jieQi) + '</div>',
                  '</div>'
                ].join('');
                // 切换dom,弹出层重复打开后,之前保存的dom会失效
                that._previewEl.destination = document.contains(that._previewEl.get(0)) ? that._previewEl.get(0) : ( that._previewEl.destination && document.contains(that._previewEl.destination) ? that._previewEl.destination : $(that._previewEl.selector).get(0));
                that._previewEl.destination.innerHTML = tipsText;
              };
              if (!render) return;
              // 面板类型
              if (info.type === 'date') {
                var clazz = [
                  'date-cell-inner',
                  isHoliday ? 'holiday' : '',
                  displayHoliday || jieQi ? 'hightlight' : '',
                ].join(' ');
                var content = [
                  '<div class="' + clazz + '">',
                  '<b>' + d + '</b>',
                  '<i>' + (displayHoliday || jieQi || lunar) + '</i>',
                  displayHolidayBadge ? '<u class="badge">' + displayHolidayBadge + '</u>' : '',
                  '</div>',
                ].join('');
                var contentEl = $(content);
                contentEl.on('contextmenu', function (e) {
                  e.preventDefault();
                  layer.tips(lunarDate.toString(), this, {
                    tips: [1, '#16baaa'],
                    zIndex: 999999999,
                  });
                });
                render(contentEl);
              } else if (info.type === 'year') {
                var lunarDate = Lunar.fromDate(new Date(y + 1, 0));
                var lunar = lunarDate.getYearInGanZhi() + lunarDate.getYearShengXiao();
                render([
                  y + '年',
                  '<div style="font-size:12px">' + lunar + '年</div>',
                ].join(''));
              } else if (info.type === 'month') {
                var lunar = lunarDate.getMonthInChinese();
                render([m + '月(' + lunar + '月)'].join(''));
              }
            };
          }
          layui.laydate.render(options);
        }
        let laydateKey =
          formItem.getAttribute("lay-laydate-id") ||
          formItem.getAttribute("lay-key"); // 更正属性值 layui-laydate-id => lay-laydate-id
        // 获取laydate对象
        let laydateInstance = layui.laydate.getInst(laydateKey);
        /**
         * 修改它的done回调，使值发生改变时修改对应的属性值
         */
        let done = laydateInstance.config.done;
        let newDone = function (value, date, endDate, p) {
          if (p) value = p.value;
          let params = {
            value: value,
            date: date,
            endDate: endDate,
          };
          done && done(value, date, endDate, params);
          formProxy.getValue(formItem.name, params.value);
        };
        laydateInstance.config.done = newDone;

        // 初始化数据
        formProxy.getValue(formItem.name, formItem.value);

        // 添加监视属性
        formProxy.$watch(formItem.name, function (v) {
          formItem.value = v;
        });
      }
    ),
    /**
     * @inner MyRenderers~checkbox 多选框处理器
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">多选框处理器</p>
     *    <ul>
     *      <li style = "color: #ff5722;">判定条件: 唯一需要做的是和switch的区别 </li>
     *      <li>处理步骤:
     *        <ol>
     *          <li>初始化数据,checkbox多选框采用Array来保存数据,保存的是作用chacked的元素对应的值的集合</li>
     *          <li>通过覆盖form里面对checkbox的监听事件,每次触发时对应的更新实例里面对应的值</li>
     *          <li>添加实例监视事件,在修改实例对应的值的同时修改表单的值,同时调用方法重新渲染表单</li>
     *          <li>2和3来保证页面表单元素的值和实例里面对应的值同步</li>
     *        </ol>
     *      </li>
     *    </ul>
     */
    checkbox: new formRenderer.renderer(
      function (formItem, type) {
        return (
          type == "checkbox" && formItem.getAttribute("lay-skin") != "switch"
        );
      },
      function (item, formItem, formProxy) {
        // 初始化数据
        item
          .querySelectorAll('[name="' + formItem.name + '"]')
          .forEach((checkbox) => {
            if (checkbox.checked)
              formProxy.$data[formItem.name].push(checkbox.value);
          });
        /**
         * 由于页面会被layui美化过，使用dom自带的change事件似乎不太行，
         * 这里使用layui提供的on事件进行监听，但是前提是需要对当前表单元素添加上了lay-filter属性
         * 如果没有lay-filter属性，这里为它根据name自动添加一个filter属性，保证可以正常的使用
         *
         * 由于checkbox或者radio可能触发多次绑定，但是layui事件管理都是一对一的不会重复
         */
        layui.form.on(
          "checkbox(" + util.getFormFilterName(formItem) + ")",
          function () {
            formItem.parentElement
              .querySelectorAll('[name="' + formItem.name + '"]')
              .forEach((checkbox) => {
                // 首先获取对应的多项数据值，每次都要重新获取
                let _data = formProxy.getValue(formItem.name);
                // 如果元素被选中就添加上这一项，否则移除这一项
                if (checkbox.checked) {
                  if (util.indexOf(_data, checkbox.value) < 0)
                    _data.push(checkbox.value);
                } else {
                  if (util.indexOf(_data, checkbox.value) >= 0)
                    _data.splice(util.indexOf(_data, checkbox.value), 1);
                }
              });
          }
        );

        // 添加监视属性
        formProxy.$watch(formItem.name, function (v) {
          item
            .querySelectorAll('[name="' + formItem.name + '"]')
            .forEach((checkbox) => {
              if (util.indexOf(v, checkbox.value) >= 0) {
                checkbox.checked = true;
                checkbox.setAttribute("checked", "checked");
              } else {
                checkbox.checked = false;
                checkbox.removeAttribute("checked");
              }
            });
          layui.form.render(
            "checkbox",
            item.getAttribute(constant.LAYUI_FILTER)
          );
        });
      }
    ),
    /**
     * @inner MyRenderers~radio 单选框处理器
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">单选框处理器</p>
     *    <ul>
     *      <li style = "color: #ff5722;">判定条件: type = "radio" </li>
     *      <li>处理步骤:
     *        <ol>
     *          <li>调用方法将实例里面对应的值,设置成表单chacked的元素当前的真实值</li>
     *          <li>通过覆盖form里面对radio的监听事件,每次触发时对应的更新实例里面对应的值</li>
     *          <li>添加实例监视事件,在修改实例对应的值的同时修改表单的值,同时调用方法重新渲染表单</li>
     *          <li>2和3来保证页面表单元素的值和实例里面对应的值同步</li>
     *        </ol>
     *      </li>
     *    </ul>
     */
    radio: new formRenderer.renderer(
      function (formItem, type) {
        return type == "radio";
      },
      function (item, formItem, formProxy) {
        // 初始化数据
        let value = "";
        item
          .querySelectorAll('[name="' + formItem.name + '"]')
          .forEach((radio) => {
            if (radio.checked) value = radio.value;
          });
        formProxy.$data[formItem.name] = value;
        /**
         * 由于页面会被layui美化过，使用dom自带的change事件似乎不太行，
         * 这里使用layui提供的on事件进行监听，但是前提是需要对当前表单元素添加上了lay-filter属性
         * 如果没有lay-filter属性，这里为它根据name自动添加一个filter属性，保证可以正常的使用
         *
         * 由于checkbox或者radio可能触发多次绑定，但是layui事件管理都是一对一的不会重复
         */
        layui.form.on(
          "radio(" + util.getFormFilterName(formItem) + ")",
          function () {
            formItem.parentElement
              .querySelectorAll('[name="' + formItem.name + '"]')
              .forEach((radio) => {
                // 如果元素被选中就直接修改对应的值
                if (radio.checked)
                  formProxy.getValue(formItem.name, radio.value);
              });
          }
        );
        // 添加监视属性
        formProxy.$watch(formItem.name, function (v) {
          item
            .querySelectorAll('[name="' + formItem.name + '"]')
            .forEach((radio) => {
              if (v == radio.value) {
                radio.checked = true;
                radio.setAttribute("checked", "checked");
              } else {
                radio.checked = false;
                radio.removeAttribute("checked");
              }
            });
          layui.form.render("radio", item.getAttribute(constant.LAYUI_FILTER));
        });
      }
    ),
    /**
     * @inner MyRenderers~select 下拉框处理器
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">下拉框处理器</p>
     *    <ul>
     *      <li style = "color: #ff5722;">判定条件: type = "select" </li>
     *      <li>处理步骤:
     *        <ol>
     *          <li>调用方法将实例里面对应的值,设置成表单元素当前的真实值</li>
     *          <li>通过覆盖form里面对select的监听事件,每次触发时对应的更新实例里面对应的值</li>
     *          <li>添加实例监视事件,在修改实例对应的值的同时修改表单的值,同时调用方法重新渲染表单</li>
     *          <li>2和3来保证页面表单元素的值和实例里面对应的值同步</li>
     *        </ol>
     *      </li>
     *    </ul>
     */
    select: new formRenderer.renderer(
      function (formItem, type) {
        return type == "select";
      },
      function (item, formItem, formProxy) {
        // 初始化数据
        formProxy.$data[formItem.name] = formItem.value;
        /**
         * 由于页面会被layui美化过，使用dom自带的change事件似乎不太行，
         * 这里使用layui提供的on事件进行监听，但是前提是需要对当前表单元素添加上了lay-filter属性
         * 如果没有lay-filter属性，这里为它根据name自动添加一个filter属性，保证可以正常的使用
         */
        layui.form.on(
          "select(" + util.getFormFilterName(formItem) + ")",
          function () {
            // 直接修改对应的值
            formProxy.getValue(formItem.name, formItem.value);
          }
        );

        // 添加监视属性
        formProxy.$watch(formItem.name, function (v) {
          formItem.value = v;
          formItem.querySelectorAll("option").forEach((option) => {
            if (v == option.value) {
              option.setAttribute("selected", "selected");
            } else {
              option.removeAttribute("selected");
            }
          });
          layui.form.render("select", item.getAttribute(constant.LAYUI_FILTER));
        });

        // 添加提示
        let layHint = formItem.getAttribute("lay-hint");
        if(layHint != null) util.enableComplate(formItem);

      }
    ),
    /**
     * @inner MyRenderers~switch switch开关处理器
     * @desc
     *    <p style = "color: #16b777;text-indent: 10px;">switch开关处理器</p>
     *    <ul>
     *      <li style = "color: #ff5722;">判定条件: 需要与checkbox之间的区别</li>
     *      <li>处理步骤:
     *        <ol>
     *          <li>调用方法将实例里面对应的值,设置成表单元素当前的checked值</li>
     *          <li>通过覆盖form里面对switch的监听事件,每次触发时对应的更新实例里面对应的值</li>
     *          <li>添加实例监视事件,在修改实例对应的值的同时修改表单的值,同时调用方法重新渲染表单</li>
     *          <li>2和3来保证页面表单元素的值和实例里面对应的值同步</li>
     *        </ol>
     *      </li>
     *    </ul>
     */
    switch: new formRenderer.renderer(
      function (formItem, type) {
        return (
          type == "switch" && formItem.getAttribute("lay-skin") == "switch"
        );
      },
      function (item, formItem, formProxy) {
        // 初始化数据
        item
          .querySelectorAll('[name="' + formItem.name + '"]')
          .forEach((checkbox) => {
            formProxy.$data[formItem.name] = checkbox.checked;
          });
        /**
         * 由于页面会被layui美化过，使用dom自带的change事件似乎不太行，
         * 这里使用layui提供的on事件进行监听，但是前提是需要对当前表单元素添加上了lay-filter属性
         * 如果没有lay-filter属性，这里为它根据name自动添加一个filter属性，保证可以正常的使用
         *
         * 由于checkbox或者radio可能触发多次绑定，但是layui事件管理都是一对一的不会重复
         */
        layui.form.on(
          "switch(" + util.getFormFilterName(formItem) + ")",
          function () {
            formProxy.getValue(formItem.name, this.checked);
          }
        );

        // 添加监视属性
        formProxy.$watch(formItem.name, function (v) {
          item
            .querySelectorAll('[name="' + formItem.name + '"]')
            .forEach((checkbox) => {
              if (formProxy.getValue(formItem.name) == true) {
                checkbox.checked = true;
                checkbox.setAttribute("checked", "checked");
              } else {
                checkbox.checked = false;
                checkbox.removeAttribute("checked");
              }
            });
          layui.form.render(
            "checkbox",
            item.getAttribute(constant.LAYUI_FILTER)
          );
        });
      }
    ),
  };

  /**   数组对象特殊处理 -- start ---   */
  /**
   * <p style = "color: #ff5722;" >warning:下面是一段互联网上面特殊处理数组的方法,其目的是让数组型数据也能被当前模块监视</p>
   */
  var arrayProto = Array.prototype;
  var arrayMethods = Object.create(arrayProto);
  var methodsToPatch = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
  ];
  methodsToPatch.forEach(function (method) {
    var original = arrayProto[method];
    Object.defineProperty(arrayMethods, method, {
      value: function () {
        var formProxy = this.__self__;
        if (!formProxy) return original.apply(this, arguments);
        var key = this.__key__;
        // TODO
        var proxy = util.cloneDeep(this);
        original.apply(proxy, arguments);
        return formProxy.getValue(key, proxy);
      },
      enumerable: !!0,
      writable: true,
      configurable: true,
    });
  });
  /**   数组对象特殊处理 -- end ---   */

  // 开启
  formRenderer.listen();

  // 在formRenderer上面添加了formRenderer.$tree的对象用treeId与实例的缓存,方便页面上能够调用到这个实例对象来修改tree实例
  exports("formplus", formRenderer);
});
