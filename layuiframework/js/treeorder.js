("use strict");
layui.define(["jquery", "tree"], function (exports) {

  /**
   * 记录下原始的render方法
   */
  const renderForever = layui.tree.render;

  let INTERVAL_ID = 0;

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
  };

  let wrapper = {
    listen: function(){

      layui.tree.render = function(options, deploy = false){
        if (!deploy) return renderForever.call(layui.tree, options);
        let customName = options.customName ? options.customName : {};
        wrapper.parentidKey = customName.parentid || layui.cache.parentidKey || 'parentid';
        wrapper.childrenKey = customName.children || layui.cache.childrenKey || 'children';
        wrapper.idKey = customName.id || layui.cache.idKey || 'id';
        wrapper.titleKey = customName.title || layui.cache.titleKey || 'title';
        let treeId = options.id || wrapper.getIntervalId();
        let data = wrapper.setSource(treeId, options.data);
        options.id = treeId;
        options.data = data;
        let res = renderForever.call(layui.tree, options);
        res.search = wrapper.searchData;
        let _reload = res.reload;
        res.reload = function (opt){
          if(opt.data)
            opt.data = wrapper.setSource(res.config.id, opt.data);
          _reload.call(this, opt);
        };
        return res;
      };

    },

    setSource: function(id, data){
      let _data = wrapper.baseDataFilter(data);
      wrapper.setData(id, _data);
      return _data;
    },

    /**
     * 初始化数据
     */
    initData: function(){
      if(!wrapper.cache) wrapper.cache = {};
    },

    /**
     * 缓存数据
     */
    setData: function(id, data){
      if(!wrapper.cache) wrapper.initData();
      wrapper.cache[id] = data;
    },

    /**
     * 取出缓存的数据
     */
    getData: function(id){
      if(!wrapper.cache) wrapper.initData();
      return wrapper.cache[id];
    },

    getIntervalId: () => 'layui-treeorder-' + INTERVAL_ID ++,

    /**
     * @method 对配置项里面的数据源进行处理
     * @param {*} data 传入的数据源
     * @returns 解析后的数据
     * @desc
     *    1. 调用{@linkplain wrapper.parseData } 解析配置项里面的数据源
     *    使用这个方法解析之后的结果就都是符合tree组件要求的数据源了
     */
    baseDataFilter: function(data){
      return wrapper.parseData(data);
    },

    /**
     * @method 解析配置项里面的数据源
     * @desc
     *    判断源数据中第一项是否带有parentid属性,如果有就解析并覆盖
     */
    parseData: function(list){
      if(list.length == 0) return list;
      if(list[0][wrapper.parentidKey] === undefined || list[0][wrapper.childrenKey] !== undefined) return list;
      return wrapper.doParseData(list);
    },

    /**
     * @method 实现解析配置项里面的数据源
     * @param {*} list  数据源列表
     * @desc
     *    解析数据源列表,这个列表是根据id和parentid将父子节点联系上的,比较符合数据库保存的风格;
     * 但是tree组件里面实际使用的不是这种数据,所以在这里将数据进行转换
     */
    doParseData: function(list){
      // 数据保存至hash表中,保证后面通过key查询信息比较方便
      wrapper._tempJson = {};
      // 创建一个临时的list保存信息,最后将它赋给 this.config.data
      wrapper._tempList = [];
      layui.each(list, function(key, value){
        // 修改,清除子节点,防止重复添加子节点
        delete value[wrapper.childrenKey];
        value[wrapper.parentidKey] && value[wrapper.parentidKey] != "0" ? wrapper.createSubTreeNode(value) : wrapper.createTopTreeNode(value);
      });
      return wrapper._tempList;
    },

    /**
     * @method 解析顶层节点数据源信息
     * @param {*} value
     */
    createTopTreeNode: function(value){
      let node = value;
      if(wrapper._tempJson[node[wrapper.idKey]]){
        // 如果已经声明过这个节点 (- 由子节点创建的),那就将它的信息补全
        layui.each(value, function(k, o){
          wrapper._tempJson[node[wrapper.idKey]][k] = o[k];
        });
      }else{
        // 如果没有声明过这个节点,就将它放入hash表
        wrapper._tempJson[node[wrapper.idKey]] = node;
      }
      // 将它的信息从hash表上面添加到临时的list中
      wrapper._tempList.push(wrapper._tempJson[node[wrapper.idKey]]);
    },

    /**
     * @method 解析普通节点数据源信息
     * @param {*} value
     */
    createSubTreeNode: function(value){
      let node = value;
      if(wrapper._tempJson[node[wrapper.idKey]]){
        // 如果已经声明过这个节点 (- 由子节点创建的),那就将它的信息补全
        layui.each(node, function(k, o){
          wrapper._tempJson[node[wrapper.idKey]][k] = o[k];
        });
      }else{
        // 如果没有声明过这个节点,就将它放入hash表并且添加到临时的list中
        wrapper._tempJson[node[wrapper.idKey]] = node;
      }
      // 接下来需要将它放入父节点里面
      if(wrapper._tempJson[node[wrapper.parentidKey]]){
        // 如果存在父节点就直接初始化它的children配置项
        if(!wrapper._tempJson[node[wrapper.parentidKey]][wrapper.childrenKey]) wrapper._tempJson[node[wrapper.parentidKey]][wrapper.childrenKey] = [];
      }else{
        // 如果不存在就先创建父节点,放入hash中
        let parentNode = {
          id: node[wrapper.parentidKey]
        };
        parentNode[wrapper.childrenKey] = [];
        wrapper._tempJson[node[wrapper.parentidKey]] = parentNode;
      }
      // 将该节点放入hash的父节点的children里面
      wrapper._tempJson[node[wrapper.parentidKey]][wrapper.childrenKey].push(node);
    },

    /**
     * @method 解析配置项里面的数据源
     * @desc
     *    判断源数据中第一项是否带有parentid属性,如果有就解析并覆盖
     */
    searchData: function(searchContent, values = []){
      let that = this;
      if(!util.isArray(values)) values = [values];
      let idKey = that.config.customName.id;
      let titleKey = that.config.customName.title;
      let childrenKey = that.config.customName.children;
      let tempData = util.cloneDeep(wrapper.getData(that.config.id));
      // 数据保存至hash表中,保证后面通过key查询信息比较方便
      wrapper._tempSortJson = {};
      layui.each(tempData, function(key, value){
        wrapper._tempSortJson[value[idKey]] = searchContent ? wrapper.doSortDataByContent.call(that, value[childrenKey], searchContent, values) : wrapper.doSortDataByLength.call(that, value[childrenKey], values);
        if(value[childrenKey])
          value[childrenKey].sort((a, b) => wrapper._tempSortJson[b[idKey]] - wrapper._tempSortJson[a[idKey]]);
        // 添加,对顶部节点也处理
        if(searchContent){
          value['*' + titleKey] = value[titleKey];
          value[titleKey] = String(value[titleKey]).replace(
            new RegExp(searchContent, "gim"),
            function (str) {
              wrapper._tempSortJson[value[idKey]]++;
              return "<span style = 'color:red'>" + str + "</span>";
            }
          );
          value.spread = wrapper._tempSortJson[value[idKey]] > 0;
        }
        if(values.includes(value[idKey])){
          wrapper._tempSortJson[value[idKey]] += searchContent ? 0.5 : 10;
          value.checked = true;
        } else {
          value.checked = false;
        }
      });
      tempData.sort((a, b) => wrapper._tempSortJson[b[idKey]] - wrapper._tempSortJson[a[idKey]]);
      layui.tree.reload(that.config.id, {data: tempData})
    },

    doSortDataByLength: function(list, values){
      let that = this;
      let idKey = that.config.customName.id;
      let titleKey = that.config.customName.title;
      let childrenKey = that.config.customName.children;
      let res = 1;
      layui.each(list, function(key, value){
        let subRes = 1;
        if(value[childrenKey] && value[childrenKey].length > 0)
          subRes += wrapper.doSortDataByLength.call(that, value[childrenKey], values);
        wrapper._tempSortJson[value[idKey]] = subRes;
        res += subRes;
        if(values.includes(value[idKey])){
          res += 10;
          value.checked = true;
        } else {
          value.checked = false;
        }
      });
      return res;
    },

    doSortDataByContent: function(list, searchContent, values){
      let that = this;
      let idKey = that.config.customName.id;
      let childrenKey = that.config.customName.children;
      let titleKey = that.config.customName.title;
      let res = 0;
      layui.each(list, function(key, value){
        let subRes = 0;
        if(value[childrenKey] && value[childrenKey].length > 0)
          subRes += wrapper.doSortDataByContent.call(that, value[childrenKey], searchContent, values);
        value['*' + titleKey] = value[titleKey];
        value[titleKey] = String(value[titleKey]).replace(
          new RegExp(searchContent, "gim"),
          function (str) {
            subRes++;
            return "<span style = 'color:red'>" + str + "</span>";
          }
        );
        value.spread = subRes > 0;
        wrapper._tempSortJson[value[idKey]] = subRes;
        res += subRes;
        if(values.includes(value[idKey])){
          res += 0.5;
          value.checked = true;
        } else {
          value.checked = false;
        }
      });
      return res;
    },

  };

  wrapper.listen();

  exports("treeorder", wrapper);
});
