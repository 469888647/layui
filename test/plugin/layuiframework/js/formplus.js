layui.define(["jquery", "form"], function (exports) {
  if (!window.$) window.$ = layui.$;
  /**
   * 记录下原始的render方法
   */
  const renderForever = layui.form.render;

  /**
   * 当前支持的所有时间规则
   *    年 选择  y  or  yyyy 其它的没有作为考虑
   *    日 这里简单的处理成每一月的最大日期都是31
   *    @prop {String} expression  当前规则对应的表达式
   *    @prop {Number} num  当前规则占据的最大位数(仅数字位数)
   *    @prop {Number} form  当前规则数字取值的最小值
   *    @prop {Number} to  当前规则数字取值的最大值
   *    @prop {String} separator  当前规则紧跟的分隔符
   *    @prop {*} hint  当前规则的推荐函数，可以根据当前时间获取一个默认值
   */
  const ruleMap = {
    y: {
      expression: "yyyy",
      num: 4,
      form: 0,
      to: 9999,
      separator: "",
      hint: function () {
        return new Date().getFullYear();
      },
    },
    M: {
      expression: "MM",
      num: 2,
      form: 1,
      to: 12,
      separator: "",
      hint: function () {
        let m = new Date().getMonth() + 1;
        m = m < 10 ? "0" + m : m;
        return m;
      },
    },
    d: {
      expression: "dd",
      num: 2,
      form: 1,
      to: 31,
      separator: "",
      hint: function () {
        let d = new Date().getDate();
        d = d < 10 ? "0" + d : d;
        return d;
      },
    },
    H: {
      expression: "HH",
      num: 2,
      form: 0,
      to: 23,
      separator: "",
      hint: function () {
        let h = new Date().getHours();
        h = h < 10 ? "0" + h : h;
        return h;
      },
    },
    m: {
      expression: "mm",
      num: 2,
      form: 0,
      to: 59,
      separator: "",
      hint: function () {
        let m = new Date().getMinutes();
        m = m < 10 ? "0" + m : m;
        return m;
      },
    },
    s: {
      expression: "ss",
      num: 2,
      form: 0,
      to: 59,
      separator: "",
      hint: function () {
        let s = new Date().getSeconds();
        s = s < 10 ? "0" + s : s;
        return s;
      },
    },
  };

  var formProxy;
  var recordSpan, completeSpan, timer;

  let laydateRule = function (keywords) {
    return _lodash.cloneDeep(ruleMap[keywords]);
  };

  /**
   * 定义一系列的公共常量
   */
  let constant = {
    /**
     * @var {*} 全局计数
     */
    INTERNAL_INDEX: 0,

    EVENT_SERIAL: 0,

    /**
     * @var {String} 字符串分隔符 -> .
     * @description
     *    主要用于拆分属性key的时候使用
     */
    separator: ".",

    /**
     * @var {String} layui里面过滤属性的名称
     */
    LAYUI_FILTER: "lay-filter",

    /**
     * @var {String} layui里面表单标志class名称
     */
    LAYUI_FORM: "layui-form",

    /**
     * @var {String} 数据放入表单里面的form位置
     */
    LAYUI_FORM_STR: "form",

    /**
     * @var {String} layui表单验证 是否懒校验的属性值
     * @desc
     *    不设置这个属性 input采用 input onporpertychange 事件监听
     *    设置这个属性值 input采用 onbulr 事件监听
     *    当这个值设置为true的时候，属性值修改时不进行校验，在表单提交时通过方法一起校验
     *    当这个值设置为false or 其它时，在属性值发生改变时校验
     */
    LAYUI_LAZY: "lay-lazy",

    /**
     * @var {String} layui表单验证的属性值
     */
    LAYUI_VERIFY: "lay-verify",

    /**
     * @var {String} layui表单形式的属性值
     */
    LAYUI_VERIFY_TYPE: "lay-verType",

    /**
     * @var {String} layui表单验证提示信息的属性值
     */
    LAYUI_VERIFY_TEXT: "lay-reqText",

    /**
     * @var {String} layui表单验证失败提醒的class
     */
    LAYUI_DANGER: "layui-form-danger",

    //lay-options="{}"
  };

  /**
   * 工具方法集合
   */
  let util = {
    /**
     * @method 获取表单元素的lay-filter属性值
     * @param {*} formItem
     */
    getFormFilterName(formItem) {
      let filter = formItem.getAttribute(constant.LAYUI_FILTER);
      if (filter) return filter;
      filter = "layui-form-vform-" + formItem.name;
      formItem.setAttribute(constant.LAYUI_FILTER, filter);
      return filter;
    },

    /**
     * @method 获取当前form表单的name,就是它的lay-filter属性值，如果没有就生成一个
     * @param {*} item 表单的dom
     * @return 表单名称
     */
    getFormName: function (item) {
      let name = item.getAttribute(constant.LAYUI_FILTER);
      if (!name) {
        name = "layui-form-vform" + constant.INTERNAL_INDEX++;
        item.setAttribute(constant.LAYUI_FILTER, name);
      }
      return name;
    },

    /**
     * @method 通过名称在form里面寻找合适的视图
     * @param {*} name form的名称
     */
    getFormByName: function (name) {
      let res = null;
      _lodash.every(layui.form.$children, (c) => {
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
     * @method 遍历子节点并执行回调函数
     * @param {*} children
     * @param {*} cb
     * @returns
     */
    findChildren: function (children, cb) {
      if (children.length == 0) return;
      _lodash.each(children, (child) => {
        cb && cb(child);
        util.findChildren(child.children, cb);
      });
    },

    bubble(s, fn) {
      if (_lodash.isString(s)) {
        let res = s;
        do {
          let k = res.lastIndexOf(constant.separator);
          if (k >= 0) res = res.substring(0, k);
          _lodash.isFunction(fn) && fn.call(this, res, s);
        } while (res.indexOf(constant.separator) > 0);
      }
    },

    getValue(k, v) {
      let [currentContext, flag, parent, key] = [this, true];
      _lodash.every(k.split(constant.separator), (v1) => {
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
    observe(o) {
      let self = this;
      if (_lodash.isArray(o.target)) {
        o.target.__self__ = self;
        o.target.__key__ = o.key;
        o.target.__proto__ = arrayMethods;
        _lodash.each(o.target, (v, k) => {
          v = util.doObserve.call(self, {
            target: o.target,
            value: v,
            name: k,
            key: o.key ? o.key : k,
          });
        });
        return o.target;
      }
      if (!o.target || !_lodash.isObject(o.target)) return o.target;
      _lodash.each(o.target, (v, k) => {
        util.doObserve.call(self, {
          target: o.target,
          value: v,
          name: k,
          key: o.key,
        });
      });
      return o.target;
    },
    doObserve(o) {
      let self = this,
        fKey = o.key ? o.key + constant.separator + o.name : o.name;
      let _proxy = util.observe.call(self, {
        target: o.value,
        key: fKey,
      });
      self.proxy.dispatcher.add(fKey);
      Object.defineProperty(o.target, o.name, {
        configurable: true,
        enumerable: true,
        get() {
          if (!self.proxy) console.log(self);
          self.proxy &&
            self.proxy.dispatcher.get.call(self, fKey, _proxy, o.name);
          return _proxy;
        },
        set(value) {
          if (value === _proxy) return;
          let oldValue = _proxy;
          self.proxy.dispatcher.before.call(
            self,
            fKey,
            value,
            oldValue,
            o.name
          );
          _proxy = util.observe.call(self, {
            target: value,
            key: fKey,
          });
          self.proxy.dispatcher.after.call(self, fKey, value, oldValue, o.name);
        },
      });
    },
  };

  let binder = function (options) {
    return new binder.fn.VM(options);
  };
  binder.prototype = binder.fn = {
    VM: function (options) {
      this.proxy = new proxy();
      this.proxy.initData.call(this, options.data, options.dataSource);
      this.proxy.initMethods.call(this, options.methods);
      this.proxy.initWatchs.call(this, options.watchs);
      this.isAlive = true;
      this.verifyItem = function (item) {
        return FormVerify.verifyItem.call(this, item);
      };
      this.verifyForm = function (filter) {
        return FormVerify.verifyForm.call(this, filter);
      };
      this.getFormValue = function (filter) {
        return FormVerify.getFormValue.call(this, filter);
      };
      options.created && options.created.apply(this);
      return this;
    },
    $set(obj, k, v) {
      return this.proxy.set.call(this, obj, k, v);
    },
    $watch(key, value) {
      return this.proxy.watch.call(this, key, value);
    },
    $destroy() {
      _lodash.each(this.$children, (v) => v.$destroy());
      this.isAlive = false;
      this.proxy = null;
    },
  };
  binder.fn.VM.prototype = binder.fn;
  let proxy = function () {
    this.dispatcher = new AOP.Dispatcher();
    this.getValue = function (k, v) {
      return util.getValue.call(this, k, v);
    };
    this.addListener = function (fn) {
      let res = null,
        serial = constant.EVENT_SERIAL++;
      const f = _lodash.isFunction(fn);
      if (f) this.proxy.dispatcher.enableAccess.push(serial);
      res = f ? fn.apply(this) : util.getValue.call(this, fn);
      if (f) this.proxy.dispatcher.addListener(fn, false, serial);
      return res;
    };
    this.set = function (obj, k, v) {
      let self = this;
      if (_lodash.isFunction(obj)) {
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
    };
    this.initData = function (dataOption = {}, dataSource = {}) {
      let self = this;
      let data = _lodash.isFunction(dataOption)
        ? dataOption.call(self, dataSource)
        : dataOption;
      self.$data = util.observe.call(self, { target: data });
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
    };
    this.initMethods = function (methods = {}) {
      let self = this;
      _lodash.each(methods, (v1, k1) => (self[k1] = v1));
    };
    this.initWatchs = function (watchs = {}) {
      let self = this;
      _lodash.each(watchs, (v, k) => self.proxy.watch.call(self, k, v));
    };
    this.watch = function (key, fn) {
      let self = this;
      if (_lodash.isFunction(fn)) {
        self.proxy.dispatcher.watch(self, key, fn);
      } else {
        self.proxy.dispatcher.watch(
          self,
          key,
          fn.handler,
          fn.deep,
          fn.immediate
        );
      }
    };
  };

  let AOP = {
    Dispatcher: function () {
      let self = this;
      this.enableAccess = [];
      this.coreMap = {};
      this.addListener = (fn, flag = false, serial, cb) => {
        _lodash.each(self.coreMap, (v) =>
          v.add(fn, flag ? "deep" : "bind", serial, cb)
        );
        self.enableAccess.splice(self.enableAccess.indexOf(serial), 1);
        if (self.enableAccess.length == 0)
          _lodash.each(self.coreMap, (v) => v.offline());
      };
      this.watch = (vm, key, fn, deep = false, immediate = false) => {
        if (!self.coreMap[key]) self.add(key);
        self.coreMap[key].add(fn, deep ? "deep" : "bind", null, null, true);
        if (immediate) fn.call(vm, util.getValue.call(vm, key), null, key);
      };
      this.add = (key) => {
        if (!self.coreMap[key]) self.coreMap[key] = new AOP.Aspect(key);
      };
      this.get = function (key, v, k) {
        self.enableAccess.length > 0 &&
          self.coreMap[key].online(self.enableAccess);
      };
      this.before = function (key, v, v1, k) {};
      this.after = function (key, v, v1, k) {
        let vm = this;
        self.coreMap[key].pool = _lodash.filter(
          self.coreMap[key].pool,
          function (event) {
            return false !== event.fn.call(vm, v, v1, k, key);
          }
        );
        util.bubble(key, (v) => {
          if (v !== key && self.coreMap[v])
            _lodash.each(
              self.coreMap[v].pool,
              (e) => "deep" === e.type && e.fn.call(vm, v, v1, k, key)
            );
        });
      };
    },
    Aspect: function (key) {
      let self = this;
      this.access = false;
      this.serial = [];
      this.pool = [];
      this.key = key;
      this.online = (serial) => {
        self.access = true;
        _lodash.each(serial, (s) => {
          if (self.serial.indexOf(s) < 0) self.serial.push(s);
        });
      };
      this.offline = () => {
        self.access = false;
        self.serial = [];
      };
      this.add = (fn, type, serial, cb, flag) => {
        if (flag) return self.pool.push(new AOP.Event(fn, type));
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
    Event: function (fn, type = "bind") {
      this.fn = fn;
      this.type = type;
    },
  };

  /**
   * @namespace FormVerify
   * @desc 表单取值与校验相关
   */
  let FormVerify = {
    /**
     * 检查判断一个表单元素当前的值是否正常 from  layui.form
     * @param {*} item
     * @returns
     */
    verifyItem(item) {
      // 表单校验基于layui的form模块，没有就返回true 跳过校验
      if (!layui || !layui.form) return true;
      // layui的form模块是需要使用jQuery的，所以这里暂时可以使用$
      let othis = $(item);
      let parent = othis.parents().filter(".layui-form");
      let filter = parent.attr("lay-filter");
      let verifys = [];
      const defaultText = "请完成表单!";
      // 获取校验规则
      if (othis.attr(constant.LAYUI_VERIFY))
        verifys = othis.attr(constant.LAYUI_VERIFY).split("|");
      // 单选框和多选框的非空校验
      const checkflag =
        ("radio" === item.type || "checkbox" === item.type) &&
        verifys.length > 0 &&
        verifys[0] == "required";
      if (checkflag) {
        let index = 0;
        parent.find('[name="' + item.name + '"]').each(function () {
          if ($(this).get(0).checked === true) index++;
        });
        if ("checkbox" === item.type && index > 0) return true;
        if ("radio" === item.type && index === 1) return true;
        layui.layer.msg(othis.attr(constant.LAYUI_VERIFY_TEXT) || defaultText, {
          icon: 5,
        });
        return false;
      }
      // 剩下的就只有下拉框和输入框了
      let verifyType = othis.attr(constant.LAYUI_VERIFY_TYPE);
      let value = othis.val();
      let verify = layui.form.config.verify;
      let flag = true;
      _lodash.every(verifys, function (v) {
        let isTrue = true,
          errorText = "",
          isFunction = _lodash.isFunction(verify[v]);
        if (verify[v]) {
          isTrue = isFunction
            ? (errorText = verify[v](value, item))
            : !verify[v][0].test(value);
          errorText = errorText || verify[v][1];
          if (v === "required")
            errorText = othis.attr(constant.LAYUI_VERIFY_TEXT) || errorText;
          if (isTrue) {
            let parentNode =
              othis.parents().filter(".layui-form-scrollNode").length == 1
                ? othis.parents().filter(".layui-form-scrollNode")
                : othis.parents().filter(".layui-layer-content");
            let scrollFlag =
              parentNode.length == 1 &&
              (parentNode.get(0).scrollHeight >
                parentNode.get(0).clientHeight ||
                parentNode.get(0).offsetHeight >
                  parentNode.get(0).clientHeight);
            let proxyOthis =
              othis.get(0).tagName.toLowerCase() === "select" ||
              /^checkbox|radio$/.test(othis.get(0).type)
                ? othis.next()
                : othis;
            if (verifyType === "tips") {
              !scrollFlag &&
                proxyOthis.get(0).getBoundingClientRect().height > 0 &&
                layui.layer.tips(
                  errorText,
                  (function () {
                    if (typeof othis.attr("lay-ignore") !== "string") {
                      if (
                        othis.get(0).tagName.toLowerCase() === "select" ||
                        /^checkbox|radio$/.test(othis.get(0).type)
                      ) {
                        return othis.next();
                      }
                    }
                    return othis;
                  })(),
                  { tips: 1, tipsMore: true }
                );
            } else if (verifyType === "alert") {
              layui.layer.alert(errorText, { title: "提示", shadeClose: true });
            } else {
              layui.layer.msg(errorText, { icon: 5, shift: 6 });
            }
            scrollFlag &&
              parentNode.animate(
                {
                  scrollTop:
                    othis.offset().top -
                    parentNode.offset().top +
                    parentNode.scrollTop(),
                },
                800,
                function () {
                  verifyType === "tips" &&
                    proxyOthis.get(0).getBoundingClientRect().height > 0 &&
                    layui.layer.tips(
                      errorText,
                      (function () {
                        if (typeof othis.attr("lay-ignore") !== "string") {
                          if (
                            othis.get(0).tagName.toLowerCase() === "select" ||
                            /^checkbox|radio$/.test(othis.get(0).type)
                          ) {
                            return othis.next();
                          }
                        }
                        return othis;
                      })(),
                      { tips: 1, tipsMore: true }
                    );
                }
              );
            if (!layui.device().android && !layui.device().ios) {
              setTimeout(function () {
                if (debounceFocus()) {
                  othis.get(0).focus();
                }
              }, 7);
            }
            othis.addClass(constant.LAYUI_DANGER);
            flag = !isTrue;
          }
        }
        return flag;
      });
      return flag;
    },

    /**
     * 检查一个表单里面的表单元素当前的值是否正常 from  layui.form
     * @param {*} filter
     * @returns
     */
    verifyForm(filter) {
      // 表单校验基于layui的form模块，没有就返回true 跳过校验
      if (!layui || !layui.form) return true;
      // layui的form模块是需要使用jQuery的，所以这里暂时可以使用$
      // 寻找parent 如果不传filter，这里需要将this指向VM
      let parent = filter ? $('[lay-filter="' + filter + '"]') : this.parent;
      // 获取表单dom
      let formItem = parent.hasClass("layui-form")
        ? parent
        : parent.find(".layui-form");
      // 获取表单元素集合
      let fieldElem = formItem.find("input,select,textarea");
      let flag = true;
      _lodash.every(fieldElem, function (item) {
        if (item instanceof HTMLElement) {
          flag = FormVerify.verifyItem(item);
          return flag;
        }
        return true;
      });
      return flag;
    },

    /**
     * 校验并获取一个表单的当前值 from  layui.form
     * @param {*} filter
     * @returns
     */
    getFormValue(filter) {
      // 表单校验基于layui的form模块，没有就返回空
      if (!layui || !layui.form) return null;
      // layui的form模块是需要使用jQuery的，所以这里暂时可以使用$
      // 校验,校验如果不通过就返回空
      if (!FormVerify.verifyForm.call(this, filter)) return null;
      // 寻找parent 如果不传filter，这里需要将this指向VM
      let parent = filter ? $('[lay-filter="' + filter + '"]') : this.parent;
      // 获取表单dom
      let formItem = parent.hasClass("layui-form")
        ? parent
        : parent.find(".layui-form");
      // 获取表单元素集合,这里是照搬form里面的 getValue 方法
      let fieldElem = formItem.find("input,select,textarea");
      let nameIndex = {};
      let field = {};
      layui.each(fieldElem, function (_, item) {
        item.name = (item.name || "").replace(/^\s*|\s*&/, "");
        if (!item.name) return;
        //用于支持数组 name
        if (/^.*\[\]$/.test(item.name)) {
          var key = item.name.match(/^(.*)\[\]$/g)[0];
          nameIndex[key] = nameIndex[key] | 0;
          item.name = item.name.replace(
            /^(.*)\[\]$/,
            "$1[" + nameIndex[key]++ + "]"
          );
        }
        if (/^checkbox|radio$/.test(item.type) && !item.checked) return;
        field[item.name] = item.value;
      });
      return field;
    },
  };

  /**
   * @namespace formProxy
   * 表单渲染方式
   */
  formProxy = {
    /**
     * 初始化方法
     */
    wakeUp: function () {
      // 在form下面防置一个空间变量，用来保存后面生成的视图对象
      if (!layui.form.$children) {
        layui.form.$children = [];
      } else {
        return false;
      }
      /**
       * 拦截render函数
       * @param {*} type    待渲染组件的类型
       * @param {*} filter  待渲染组件的form的filter
       * @param {*} deploy  是否使用vfrom进行处理,默认false
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
            /**
             * v2.0.1 添加渲染过一次之后添加上vform的属性防止重复渲染
             */
            if (ele.getAttribute("vform") == null) {
              ele.setAttribute("vform", "true");
              // 1. 获取当前表单的lay-filter 如果没有就自动生成一个，这个必须有，是作为表单的name存在的
              let name = util.getFormName(ele);
              // 2. 获取视图对象赋值给返回值
              res = util.getFormByName(name) || formProxy.render(ele);
            }
            // 最后调用原生的render方法渲染表单
            renderForever.call(layui.form, type, filter);
          }
        });
        return res;
      };
    },

    /**
     * @method 开启laydate时间选择框自动补全功能
     * @param {*} formItem laydate  时间选择框 输入框dom
     */
    enableLaydateHint(formItem) {
      /**
       * 获取输入框属性：
       *    layui-laydate-id 属性值可以帮助获取到laydate实例对象
       *    lay-hint 属性可以用来判断是否打开补全提示功能
       */
      const key = formItem.getAttribute("layui-laydate-id");
      const hintAttr = formItem.getAttribute("lay-hint");
      if (key === null || hintAttr === null) return;
      /**
       * 通过layui.laydate.getInst(key)来获取laydate实例对象
       *
       *    由于v2.6.6之后的版本已经有缓存laydate对象了。可以尝试 添加 getInst方法
       * 这里就不判断layui的版本，直接判断laydate.getInst方法是否存在
       */
      if (!layui.laydate.getInst) return;
      let laydateInst = layui.laydate.getInst(key);
      /**
       * 然后通过laydate实例里面的format规则，确定后面校验的规则
       * 1. 输入框的输入值的正则校验的正则表达式            inst.reg
       * 2. 输入时对输入的内容进行格式化校验的规则列表       inst.rules
       * 上面这两个放入laydate实例上面，方便后面调用.
       */
      // 这个正则生成方式参考的是2.8的laydate
      var EXP_IF = "";
      var dateType = "yyyy|y|MM|M|dd|d|HH|H|mm|m|ss|s";
      let formats =
        (laydateInst.config.format || "").match(
          new RegExp(dateType + "|.", "g")
        ) || [];
      Array.prototype.forEach.call(formats, function (format, i) {
        var EXP = new RegExp(dateType).test(format)
          ? "\\d{" +
            (function () {
              if (
                new RegExp(dateType).test(
                  formats[i === 0 ? i + 1 : i - 1] || ""
                )
              ) {
                if (/^yyyy|y$/.test(format)) return 4;
                return format.length;
              }
              if (/^yyyy$/.test(format)) return "1,4";
              if (/^y$/.test(format)) return "1,308";
              return "1,2";
            })() +
            "}"
          : "\\" + format;
        EXP_IF += EXP;
      });
      EXP_IF = new RegExp("^" + EXP_IF + "$");
      laydateInst.reg = EXP_IF;
      /**
       * separators 存放分隔符
       * rules 存放时间格式关键字
       */
      let separators,
        rules = [];
      separators = laydateInst.config.format
        .replaceAll(/[y|M|d|H|m|s]+/g, (v) => {
          rules.push(v);
          return "ss";
        })
        .split("ss");
      // 因为都是计算的后面的分隔符，这里去掉第一项
      separators.shift();
      /**
       * 根据上面声明的laydate规则（{@linkplain laydateRule}），生成当前实例的rules
       */
      let myRules = [];
      _lodash.each(rules, (v, k) => {
        let rule = laydateRule(v.substring(0, 1));
        rule.separator = separators[k];
        myRules.push(rule);
      });
      laydateInst.rules = myRules;
      /**
       * 这里顺便添加两个值，一个是记录当前输入框的输入值   inst.currentvalue
       * 另一个是记录当前laydate推荐输入的值             inst.computed
       */
      laydateInst.currentvalue = "";
      laydateInst.computed = "";
      /**
       * 添加事件:
       *    1. 添加监听输入框变化的事件
       *    2. 添加监听输入框输入上下左右键和回车键的事件
       *
       */
      formItem.addEventListener("input", function (e) {
        /**
         * 将当前输入框的值保存到laydate实例中
         */
        laydateInst.currentvalue = e.target.value;
        /**
         * 将当前的laydate的id切换成当前的id
         */
        layui.laydate.thisId = key;
        // 生成推荐信息
        formProxy.laydateComputed(e);
        // 生成提示信息
        formProxy.laydateHint(e);
      });

      formItem.addEventListener("keydown", function (e) {
        if (e.keyCode === 13) {
          /**
           * 当键入回车键时，判断
           * 1. 是否有当前的laydate弹层
           * 2. 当前的laydate的id是否是当前的id，如果是就重置
           * 3. 触发当前输入框的点击事件
           */
          if (!$("#layui-laydate" + key)[0]) {
            if (layui.laydate.thisId == laydateInst.config.id)
              layui.laydate.thisId = undefined;
            $(e.target).trigger("click");
          }
          /**
           * 按下回车键之后，需要将输入框失去焦点
           * 一方面是方法里面可能对光标进行了处理。
           * 另一方面是如果输入值完整并且完全正确，再次点击回车键 输入框会清空，弹出选框来选择。
           *      这是laydate对回车键是有特殊处理的，在v2.8的layui中laydate的回车键是指确认点击选中的日期。
           *
           * 这个时候失去焦点可以防止用户再次点击回车键触发layui默认的事件
           * 失去焦点可以提示他已经完成日期录入了
           */
          $(e.target).blur();
        }
        // if (e.keyCode === 37 || e.keyCode === 39) {
        //   /**
        //    * 当前键入左右键的时候，需要确定当前输入框的光标位置
        //    * 这个位置需要微调
        //    */
        //   let pos = e.target.selectionEnd;
        //   if (e.keyCode === 37) pos--;
        //   if (e.keyCode === 39) pos++;
        //   if (pos < 0) pos = 0;
        //   if (pos > e.target.value.length) pos = e.target.value.length;
        //   formProxy.laydateComputed(e, pos);
        // }
        if (e.keyCode == 38 || e.keyCode == 40) {
          /**
           * 当前键入上下键的时候，需要确定当前输入框的光标位置
           */
          let pos = e.target.selectionEnd;
          formProxy.laydateComputed(e, pos);
        }
      });

      // 修改laydate实例的done回调
      let done = laydateInst.config.done;
      let newDone = function (value, date, endDate, params) {
        // if (laydateInst.currentvalue) {
        // 有推荐值使用推荐值，推荐值应该更接近正确格式
        if (laydateInst.computed)
          laydateInst.currentvalue = laydateInst.computed;
        // 修改输入框的value
        formItem.value = laydateInst.currentvalue || value;
        /**
         * 如果输入值正则校验不通过，就触发点击回调，让laydate来提示错误
         */
        if (
          laydateInst.currentvalue &&
          !laydateInst.reg.test(laydateInst.currentvalue)
        ) {
          $(formItem).trigger("click");
        } else {
          params.value = laydateInst.currentvalue || value;
        }
        // 重置用户的输入信息
        laydateInst.currentvalue = "";
        laydateInst.computed = "";
        formProxy.cacelComplete();
        // 设置laydate参数
        layui.laydate.thisId = key;
        // }
        done && done(value, date, endDate, params);
      };
      laydateInst.config.done = newDone;
    },

    /**
     * 根据当前laydate 信息，为当前的laydate补充一个推荐值
     * @param {*} e
     * @param {*} pos  当前光标位置，是用来实现上下按键修改时间的功能
     * @return 返回的推荐值
     */
    laydateComputed(e, pos) {
      let p = 0,
        container = "",
        res = "";
      // 根据当前的元素属性获取laydate的实例
      const key = e.target.getAttribute("layui-laydate-id");
      let laydateInst = layui.laydate.getInst(key);
      // 遍历实例上面缓存的时间规则
      /**
       * 遍历实例上面缓存的时间规则:
       *  首先以p作为指针来扫描一遍输入框当前的输入值
       *
       *
       */
      _lodash.each(laydateInst.rules, (v, k) => {
        /**
         * 判断当前输入值，指针p以后的字符串中是包含数字的位置
         * 这样可以跳过非数字的部分
         */
        let p1 = e.target.value.substring(p).search(/\d/);
        if (p1 >= 0) p += p1;
        if (p >= e.target.value.length) {
          // 当输入的内容过少时，剩余的部分就直接使用时间规则里面的默认值
          res += v.hint();
          res += v.separator;
        } else {
          /**
           * 根据当前的时间规则生成一个正则校验表达式
           * 首先这里是仅匹配数字，对位数没得要求，因为这里可能用户输入不完整
           * 其次可以带上分隔符也可以不带上，因为用户可能并不懂分隔符
           */
          let reg = v.separator
            ? new RegExp("(\\d*\\" + v.separator + "?)")
            : new RegExp("(\\d*)");
          /**
           * 将输入框内容 p指针以后的字符串做正则匹配
           */
          let match = e.target.value.substring(p).match(reg);
          if (!match[0]) {
            // 没有匹配上就使用默认值
            res += v.hint();
            res += v.separator;
          } else {
            let index =
              e.target.value.substring(p).indexOf(match[0]) + match[0].length;
            // 指针移动到当前匹配到的值的后面
            p += index;
            /**
             * 位数处理：
             *  1. 首先要根据当前规则的num位数将当前的位数补齐
             *  2. 使用subValue记录下最后的value值，这个是要显示在输入框里面的值，是不能超过当前输入框内容的长度
             *      这个最后会向  {@linkplain container} 汇总
             *  3. 使用subComputed记录下最后的computed值，这个是一个完成的推荐值，每次变化都要记录
             *      这个最后会向  {@linkplain res} 汇总
             *  4. 创建一个步进值step，这个记录补齐消耗的次数
             */
            let matchs = match[0].split("");
            let _matchs = String(v.hint()).split("");
            let subValue = "",
              subComputed = "",
              step = 0;
            for (var i = 0; i < v.num; i++) {
              if (i < matchs.length && /^\d$/.test(matchs[i])) {
                // 当前皮配置对应的是数字，就直接将这个数字拼接进  subValue 和  subComputed 中
                subValue += matchs[i];
                subComputed += matchs[i];
                step++;
              } else {
                // 如果不是数字就使用 0 来补全，这一步不要修改 subValue 它是代表输入框当前值的，不能直接去影响用户当前的输入
                // subComputed += "0";
                // 不要用0来补全
                subComputed += _matchs[i];
              }
            }
            // 经过上面的处理，现在截取的不是 match[0] 了，而是只前进了 step 长度的字符，这里就进行指针回滚
            p -= match[0].length - step;
            // 对最后的 subComputed 的取值进行限制，要处理最大值和最小值之间
            if (parseInt(subComputed) > v.to) subComputed = v.to;
            if (parseInt(subComputed) < v.form) subComputed = v.form;
            res += subComputed;
            res += v.separator;
            /**
             * 用户输入的值可能不是完整的，但是能判断当前的规则说明上一个规则的输入值是完整的。
             * 为了保证输入的格式，在进行这一项结果拼接之前，可以尝试拼接上一个规则的分隔符，从而保证输入值的格式正确
             */
            let ends = k > 0 ? laydateInst.rules[k - 1].separator : "";
            if (ends && !container.endsWith(ends)) container += ends;
            container += subValue;
          }
        }
      });

      /**
       * 1.将上面得到的输入框值放入实例和输入框中
       * 2.将上面得到的推荐值放入实例中
       */
      laydateInst.currentvalue = container;
      e.target.value = container;
      laydateInst.computed = res;

      /**
       * 下面是带有 pos 光标位置的特殊处理
       * 这个是方便处理上下键修改时间
       *
       *
       */
      if (pos !== undefined) {
        /**
         * 首先根据当前光标的位置确定:
         *
         *    1. from           当前的内容从哪一处开始修改，开始的下标
         *    2. ruleObject     修改哪个时间规则
         */
        let from = 0,
          ruleObject = null;
        if (pos == 0) {
          // 这个没得啥子好说的，从头开始改，规则取第一个
          ruleObject = laydateInst.rules[0];
        } else {
          let templist = [];
          // 这里采用遍历规则，每次将pos的值拨动当前规则的num和分隔符的长度，直到它不能再被拨动。那这个规则就是当前的规则
          _lodash.every(laydateInst.rules, (obj) => {
            templist.push(obj);
            if (pos <= obj.num) {
              ruleObject = obj;
              return false;
            } else {
              let step = obj.num + obj.separator.length;
              pos -= step;
              return true;
            }
          });
          templist.pop();
          // 计算起始位置
          _lodash.each(templist, (l) => {
            let step = l.num + l.separator.length;
            from += step;
          });
        }
        /**
         * 获取在推荐值中，从起始位置往后数num位的字符串
         * 然后进行处理
         *  1. 根据键入的类型进行 ++ or -- 操作
         *  2. 修改进该规则的取值范围
         *  3. 修改后的值做位数对齐
         *  4. 将修改后的值放入 推荐值的同一位置
         */
        let old = res.substring(from, from + ruleObject.num);
        let oldNum = parseInt(old);
        if (e.keyCode == 38) oldNum++;
        if (e.keyCode == 40) oldNum--;
        if (oldNum < ruleObject.form) oldNum = ruleObject.to;
        if (oldNum > ruleObject.to) oldNum = ruleObject.form;
        let newStr = "" + oldNum;
        while (newStr.length < old.length) {
          newStr = "0" + newStr;
        }
        /**
         * 1. 这里的前半部分取推荐值来拆分是因为
         *    用户输入的当前规则的值可能不完整，或者不规范。导致可能拆分的内容不准。
         * 2. 这里的后半部分使用输入值也是因为输入值可能不全，后面的不全就保留
         */
        let modifyValue = res.substring(0, from);
        modifyValue += newStr;
        modifyValue += container.substring(
          from + ruleObject.num,
          container.length
        );
        if (laydateInst.computed) {
          let modifyComputed = laydateInst.computed.substring(0, from);
          modifyComputed += newStr;
          modifyComputed += laydateInst.computed.substring(
            from + ruleObject.num,
            laydateInst.computed.length
          );
          laydateInst.computed = modifyComputed;
        }
        laydateInst.currentvalue = modifyValue;
        e.target.value = modifyValue;

        /**
         * 如果是上下按键是修改了输入值的，这个时候要调用方法重新提示用户
         * 由于上下按键有默认的浏览器事件，会修改光标位置，这里需要将光标修改回来
         */
        if (e.keyCode == 38 || e.keyCode == 40) {
          formProxy.laydateHint(e);
          setTimeout(function () {
            e.target.selectionStart = from;
            e.target.selectionEnd = from + ruleObject.num;
          });
        }
      }
      return res;
    },

    /**
     * 根据当前laydate输入框的信息，生成提示信息，提示用户完成操作
     * @param {*} e
     */
    laydateHint(e) {
      let $self = $(e.target);
      // 1. 计算文本宽度
      // 输入框的x坐标
      let inputOffsetX = e.target.getBoundingClientRect().x;
      // 输入框开始文字距离框体的位置(text-indent),这里考虑可能是nomal之类的非数字，所以默认是0
      let indent = parseFloat($self.css("text-indent")) || 0;
      // 输入框的padding-left值,这里考虑可能是auto之类的非数字，所以默认是0
      let paddingLeft = parseFloat($self.css("padding-left")) || 0;
      // 将记录输入内容的span的font-size样式与当前输入框同步，以确保最后计算出的文字长度偏差不会太大
      // 这里忽略了比如letter-space等样式
      recordSpan.css("font-size", $self.css("font-size"));
      // 将记录输入内容的文本内容修改成当前输入框的内容，此时文字的长度就是当前span的长度
      recordSpan.get(0).textContent = e.target.value;
      // 最后计算出当前光标的位置,多加2防止光标被模糊
      let left =
        inputOffsetX +
        paddingLeft +
        indent +
        recordSpan.get(0).getBoundingClientRect().width +
        2;
      // 2. 获取推荐内容
      // 根据当前的元素属性获取laydate的实例
      const key = e.target.getAttribute("layui-laydate-id");
      let laydateInst = layui.laydate.getInst(key);
      let _value = laydateInst.computed;
      /**
       * 这里进行判断，如果推荐值是以输入值开头的，就将显示内容显示成除输入值外的剩余内容
       * 这样拼接起来比较好看
       */
      let content = "";
      if (_value.indexOf(e.target.value) == 0) {
        content = _value.substring(e.target.value.length, _value.length);
      } else {
        content = _value;
      }
      // 将补全信息放入推荐div中
      completeSpan.get(0).textContent = content;
      // 将提示信息拼接放入
      completeSpan.attr("data-content", "请按下Enter键确认选择：" + _value);
      completeSpan.css("font-size", $self.css("font-size"));
      completeSpan.css(
        "line-height",
        e.target.getBoundingClientRect().height + "px"
      );
      completeSpan.css(
        "height",
        e.target.getBoundingClientRect().height + "px"
      );
      completeSpan.css("top", e.target.getBoundingClientRect().y + "px");
      completeSpan.css("left", left + "px");
      completeSpan.css(
        "background-color",
        _value.indexOf(e.target.value) !== 0 ? "#FF0000" : "#5FB878"
      );
      completeSpan.css("display", "block");
      // 这个complate属性是一个标志
      // 设置为true说明当前的推荐系统生效，在按下->键的时候可以触发确认的回调
      completeSpan.attr("complete", "true");
    },

    /**
     * 取消补全状态
     * 重置推荐div的状态并把它隐藏
     *
     * ## 由于敲击回车键是layui内部操作，是触发选中区域的点击事件。
     *    这里根本没得办法去监听这个动作，所以只能间接的去监听 form.on
     *
     */
    cacelComplete() {
      completeSpan.get(0).textContent = "";
      completeSpan.attr("data-content", "");
      completeSpan.css("display", "none");
      completeSpan.attr("complete", "false");
    },

    /**
     * @method 处理layui的form创建并返回视图对象
     * @param {*} item 待处理的form表单
     */
    render: function (item) {
      // 1.获取form的名字
      let name = util.getFormName(item);
      // 3.创建一个视图对象
      let vm = binder({
        data: {},
        created() {
          /**
           * 由于这个对象不用挂载dom,所以在创建完毕的回调里面添加逻辑
           *
           * 1.从数据到dom，这里需要通过监视属性来实现
           * 2.从dom到数据，这里通过添加dom的监听事件来实现(由于layui会对表单进行美化，这里需要抢占layui的监听事件)
           */
          let self = this;
          // 将表单的name和dom带上
          self.$name = name;
          self.$ele = item;
          // 首先遍历表单元素
          let fieldElems = $(item).find("input,select,textarea");
          _lodash.each(fieldElems, (formItem) => {
            if (formItem instanceof HTMLElement) {
              if (formItem.getAttribute("lay-ignore") === null) {
                // 获取元素的name属性，作为它的key
                let _name = formItem.name;
                // 由于表单可能由layui渲染过了，生成了一些干扰表单元素， 有点干扰，这里尽量避免干扰
                // 这里就确定了，没得name属性的不进行渲染
                if (_name) {
                  // 获取元素的type属性，checkbox对应的是数组，其它的就直接是值
                  let _type =
                    formItem.type == "checkbox"
                      ? "checkbox"
                      : formItem.type == "radio"
                      ? "radio"
                      : formItem.tagName.toLowerCase() == "select"
                      ? "select"
                      : "input";
                  // 判断当前是否有以这个name为key的值，如果没有就添加一个
                  if (!self.$data[_name])
                    self.$set(self.$data, _name, "checkbox" == _type ? [] : "");
                  Array.prototype.every.call(
                    formProxy.getRenderers(),
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
        },
      });
      // 放入form中
      layui.form.$children.push(vm);
      // 返回这个新建的视图
      return vm;
    },

    /**
     * 表单元素处理器
     * @constructor
     * @param {*} condition
     * @param {*} action
     */
    renderer: function (condition, action) {
      this.canDeal = _lodash.isFunction(condition)
        ? (...param) => condition.apply(this, param)
        : (...param) => new Function(condition, param);
      this.deal = (...param) => action.apply(this, param);
    },

    getRenderers: function () {
      // 如果没有初始化就调用方法初始化
      if (!formProxy.renderers) formProxy.initRenderers();
      return formProxy.renderers;
    },

    initRenderers: function () {
      if (formProxy.renderers) return formProxy.renderers;
      formProxy.renderers = [];
      formProxy.renderers.push(MyRenderers.input);
      formProxy.renderers.push(MyRenderers.date);
      formProxy.renderers.push(MyRenderers.checkbox);
      formProxy.renderers.push(MyRenderers.radio);
      formProxy.renderers.push(MyRenderers.select);
      return formProxy.renderers;
    },
  };

  let MyRenderers = {
    // 普通输入框
    input: new formProxy.renderer(
      function (formItem, type) {
        return type == "input" && formItem.getAttribute("laydate") === null && formItem.getAttribute("layui-laydate-id") === null;
      },
      function (item, formItem, vm) {
        let eventKey = formItem.getAttribute(constant.LAYUI_LAZY) != null
            ? "blur"
            : "input propertychange";

        // 按照普通的input or textarea 处理
        // input 和textarea 不考虑页面美化带来的影响
        _lodash.each(eventKey.split(" "), (v) => {
          formItem.addEventListener(v, function () {
            vm.proxy.getValue.call(vm, formItem.name, this.value);
          });
        });

        /**
         * v2.0.2 新增文本域字数限制
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
          // 1. 获取最大限制字数
          let maxlength = formItem.getAttribute("maxlength");
          // 2. 创建一个变量
          let _tempName = formItem.name + "-limit";
          vm.$set(vm.$data, _tempName, "0/" + maxlength);
          // 4. 创建监视属性
          vm.$watch(formItem.name, {
            immediate: true,
            deep: false,
            handler: function (v) {
              let length = v ? v.length : 0;
              formItem.parentElement.setAttribute(
                "dataMaxlength",
                "" + length + "/" + maxlength
              );
            },
          });
        }

        /**
         * v2.0.3 新增输入框 lay-affix类型和number事件的监听
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
              vm.proxy.getValue.call(vm, formItem.name, elem.value);
            }
          );
        }

        // 添加监视属性
        vm.$watch(formItem.name, function (v) {
          formItem.value = v;
        });
      }
    ),
    // 时间选择框
    date: new formProxy.renderer(
      function (formItem, type) {
        let flag = (type == "input" && (formItem.getAttribute("laydate") !== null || formItem.getAttribute("layui-laydate-id") !== null));
        return flag;
      },
      function (item, formItem, vm) {
        if (formItem.getAttribute("layui-laydate-id") === null) {
          let optionsAttr = formItem.getAttribute("lay-options");
          let options = optionsAttr ? JSON.parse(optionsAttr) : {};
          options.elem = formItem;
          layui.laydate.render(options);
        }
        if (formItem.getAttribute("lay-hint") !== null)
          formProxy.enableLaydateHint(formItem);
        let laydateKey = formItem.getAttribute("layui-laydate-id");
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
          vm.proxy.getValue.call(vm, formItem.name, params.value);
        };
        laydateInstance.config.done = newDone;

        // 添加监视属性
        vm.$watch(formItem.name, function (v) {
          formItem.value = v;
        });
      }
    ),
    checkbox: new formProxy.renderer(
      function (formItem, type) {
        return type == "checkbox";
      },
      function (item, formItem, vm) {
        // 初始化数据
        item
          .querySelectorAll('[name="' + formItem.name + '"]')
          .forEach((checkbox) => {
            if (checkbox.checked) vm.$data[formItem.name].push(checkbox.value);
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
                let _data = vm.proxy.getValue.call(vm, formItem.name);
                // 如果元素被选中就添加上这一项，否则移除这一项
                if (checkbox.checked) {
                  if (_lodash.indexOf(_data, checkbox.value) < 0)
                    _data.push(checkbox.value);
                } else {
                  if (_lodash.indexOf(_data, checkbox.value) >= 0)
                    _data.splice(_lodash.indexOf(_data, checkbox.value), 1);
                }
              });
          }
        );

        // 添加监视属性
        vm.$watch(formItem.name, function (v) {
          item
            .querySelectorAll('[name="' + formItem.name + '"]')
            .forEach((checkbox) => {
              if (_lodash.indexOf(v, checkbox.value) >= 0) {
                checkbox.checked = true;
                checkbox.setAttribute("checked", "checked");
              } else {
                checkbox.checked = false;
                checkbox.removeAttribute("checked");
              }
            });
          layui.form.render('checkbox', item.getAttribute(constant.LAYUI_FILTER));
        });
      }
    ),
    radio: new formProxy.renderer(
      function (formItem, type) {
        return type == "radio";
      },
      function (item, formItem, vm) {
        // 初始化数据
        let value = "";
        item
          .querySelectorAll('[name="' + formItem.name + '"]')
          .forEach((radio) => {
            if (radio.checked) value = radio.value;
          });
        vm.$data[formItem.name] = value;
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
                  vm.proxy.getValue.call(vm, formItem.name, radio.value);
              });
          }
        );
        // 添加监视属性
        vm.$watch(formItem.name, function (v) {
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
          layui.form.render('radio', item.getAttribute(constant.LAYUI_FILTER));
        });
      }
    ),
    select: new formProxy.renderer(
      function (formItem, type) {
        return type == "select";
      },
      function (item, formItem, vm) {
        // 初始化数据
        vm.$data[formItem.name] = formItem.value;
        /**
         * 由于页面会被layui美化过，使用dom自带的change事件似乎不太行，
         * 这里使用layui提供的on事件进行监听，但是前提是需要对当前表单元素添加上了lay-filter属性
         * 如果没有lay-filter属性，这里为它根据name自动添加一个filter属性，保证可以正常的使用
         */
        layui.form.on(
          "select(" + util.getFormFilterName(formItem) + ")",
          function () {
            // 直接修改对应的值
            vm.proxy.getValue.call(vm, formItem.name, formItem.value);

            /**
             * layui下拉框值发生改变时隐藏推荐div
             */
            // if (
            //   formItem.getAttribute("lay-search") != null &&
            //   formItem.getAttribute("lay-hint") != null
            // ) {
            //   formProxy.cacelComplete();
            // }
          }
        );

        // 添加监视属性
        vm.$watch(formItem.name, function (v) {
          formItem.value = v;
          formItem.querySelectorAll("option").forEach((option) => {
            if (v == option.value) {
              option.setAttribute("selected", "selected");
            } else {
              option.removeAttribute("selected");
            }
          });
          layui.form.render('select', item.getAttribute(constant.LAYUI_FILTER));
        });
      }
    ),
  };
  recordSpan = $(
    '<span style="visibility: hidden;position: absolute;z-index: -1;"></span>'
  );
  $("body").append(recordSpan);
  completeSpan = $('<div class = "layui-form-autoSelect" ></div>');
  $("body").append(completeSpan);

  $(document).on("click", function () {
    if (completeSpan.attr("complete") == "true") formProxy.cacelComplete();
  });
  let css = document.createElement("style");
  css.type = "text/css";
  css.innerHTML = `
      .layui-form-autoSelect{
        position: fixed;
        z-index: 99999999;
        background-color: #5FB878;
        color: #fff;
        font-weight: blod;
      }

      .layui-form-autoSelect::before{
        content: attr(data-content);
        position: absolute;
        color: #F00;
        top: -10px;
        height: 15px;
        line-height: 15px;
        left: 0;
        width: auto;
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-all;
        white-space: nowrap;
      }

      [datamaxlength]:after {
        content: attr(datamaxlength);
        position: absolute;
        right: 10px;
        bottom: 10px;
        font-size: 12px;
        color: #666;
      }

      .layui-input-inline[datamaxlength] {
        border: 1px solid #eee;
        box-sizing: border-box;
        height: 38px;
      }

      .layui-input-inline[datamaxlength] .layui-input {
        width: 75%;
        border: none;
        height: 36px;
      }

    `;
  document.getElementsByTagName("HEAD").item(0).appendChild(css);
  var INTERVAL_FOCUS_TIME = new Date();
  function debounceFocus() {
    if (new Date() - INTERVAL_FOCUS_TIME > 2000) {
      INTERVAL_FOCUS_TIME = new Date();
      return true;
    }
    return false;
  }
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
        var vm = this.__self__;
        if (!vm) return original.apply(this, arguments);
        var key = this.__key__;
        var proxy = _lodash.cloneDeep(this);
        original.apply(proxy, arguments);
        return vm.proxy.getValue.call(vm, key, proxy);
      },
      enumerable: !!0,
      writable: true,
      configurable: true,
    });
  });
  formProxy.wakeUp();
  exports("formplus", {
    verifyItem: function (item) {
      return FormVerify.verifyItem(item);
    },
    verifyForm: function (filter) {
      return FormVerify.verifyForm(filter);
    },
    getFormValue: function (filter) {
      return FormVerify.getFormValue(filter);
    },
  });
});
