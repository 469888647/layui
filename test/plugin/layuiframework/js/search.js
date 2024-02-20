layui.define(function (exports) {
  const THIS = "layui-this";
  const SHOW = "layui-show";
  let SEAR_MAP = {};

  let index = 1;

  let handler = {
    run: function () {
      handler.initData();
      handler.initFrame();
      handler.addListener();
    },

    initData: function () {
      handler.index = 1;
      handler.shiftCount = 0;
      handler.shiftTimer = 0;
      handler.checkflag = false;
      handler.showflag = false;
      handler.searchText = "";
      handler.pointer = "";
      handler.list = [
        {
          id: index++,
          mark: "全部",
          entry: "",
          querys: [],
          selectQuery: [],
        },
      ];
      _lodash.each(MAP, (value, key) => {
        handler.list.push({
          id: index++,
          mark: value.mark,
          entry: key,
          querys: [],
          selectQuery: [],
        });
        SEAR_MAP[key] = value;
      });
    },

    initFrame: function () {
      handler.$dom = $(`
        <div id = "layui-search">
          <div class="layui-windows-search-dashboard layui-hide-xs" >
            <div class="layui-tab" lay-filter="layui-search-page">
              <ul class="layui-tab-title">
                ${_lodash.join(
                  _lodash.map(handler.list, (v, k) => {
                    return `
                <li class = "${v.id == 1 ? "layui-this" : ""}"  lay-id = "${
                      v.id
                    }">${v.mark}
                  <div class = "layui-windows-search-titleBar"></div>
                </li>
                    `;
                  }),
                  ""
                )}
              </ul>
              <div class="layui-tab-content" >
                ${_lodash.join(
                  _lodash.map(handler.list, (v, k) => {
                    return `
                <div id = "layui-windows-search-${v.id}" class="layui-tab-item${
                      v.id == 1 ? " layui-show" : ""
                    }" >
                  <div class = "layui-search-list-bar" >
                    ${_lodash.join(
                      _lodash.map(v.querys, (v1, k1) => {
                        return `
                    <div class = "layui-search-list-nav" querytype = "${
                      v1.type
                    }" >
                      <div class = "layui-search-list-title">${v1.mark}</div>
                      <div class = "layui-search-parts" >
                        ${_lodash.join(
                          _lodash.map(v1.list, (v2, k2) => {
                            return `
                        <div class = "layui-search-part">${v2.elasticsearchHintcontent}</div>
                            `;
                          }),
                          ""
                        )}
                      </div>
                    </div>
                        `;
                      }),
                      ""
                    )}
                  </div>
                  <div class = "layui-search-detail-bar layui-windows-desk-scroll">
                    ${_lodash.join(
                      _lodash.map(v.selectQuery, (v1, k1) => {
                        return `
                    <div class = "layui-search-detail-parts">
                      ${_lodash.join(
                        _lodash.map(v1.list, (v2, k2) => {
                          return `
                      <div class = "layui-search-detail-part">
                        ${_lodash.join(
                          _lodash.map(v2.template, (v3, k3) => {
                            return `
                        <div>
                          <div class = "layui-search-detail-left">${v3.name}</div>
                          <div class = "layui-search-detail-right">${v3.value}</div>
                        </div>
                            `;
                          }),
                          ""
                        )}
                      </div>
                          `;
                        }),
                        ""
                      )}
                    </div>
                        `;
                      }),
                      ""
                    )}
                  </div>
                </div>
                    `;
                  }),
                  ""
                )}
              </div>
            </div>
          </div>
        </div>
      `);

      $("#lay-framework").append(handler.$dom);
    },

    start: function (searchText = "") {
      if (handler.checkflag) return;
      handler._show();
      handler.searchText = searchText;
      if (!!handler.pointer) {
        handler.search();
      } else {
        layui.element.tabChange("layui-search-page", 1);
      }
    },

    _show: function () {
      handler.showflag = true;
      handler.$dom
        .find(".layui-windows-search-dashboard")
        .removeClass(SHOW)
        .addClass(SHOW);
    },

    stop: function () {
      if (!handler.checkflag) {
        handler._hide();
        return true;
      } else {
        return false;
      }
    },

    _hide: function () {
      handler.showflag = false;
      handler.$dom.find(".layui-windows-search-dashboard").removeClass(SHOW);
    },

    search: function () {
      // 初始化参数
      _lodash.each(handler.list, (v) => {
        v.querys = [];
        v.selectQuery = [{ list: [] }];
      });
      let pointer = handler.pointer || "";
      let searchText = handler.searchText || "";
      $.ajax({
        url: LAYER_BASE_URL + "/index/search",
        type: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify({ name: searchText, type: pointer }),
        success: function (res) {
          if (res.code == 200) {
            var map = handler.feature(res.data, 3);
            var list = [];
            _lodash.each(map, (v) => {
              if (v.list && v.list.length > 0) list.push(v);
            });

            /**
             * 筛选第一个分组作为当前查看的分组
             */
            _lodash.each(handler.list, (value) => {
              if (value.entry == pointer) {
                value.querys = list;
                /**
                 * 更新列表的dom
                 */
                handler.refreshList(value);
                if (list.length > 0) {
                  if (handler.group == list[0].type) {
                    // 值如果没有变化就手动触发一次
                    handler.changeGroup();
                  } else {
                    handler.group = list[0].type;
                    handler.changeGroup();
                  }
                } else {
                  // 渲染一个空的提示
                  handler.$dom
                    .find("#layui-windows-search-" + value.id)
                    .find(".layui-search-detail-bar")
                    .empty()
                    .append($(` <div>暂无匹配项!</div> `));
                }
              }
            });
            $(".layui-search-part").each(function () {
              var html = $(this).html();
              $(this).html(handler.transformElasticsearchHint(html));
            });
          }
        },
      });
    },

    invokeSearch: function (value) {
      handler.searchText = value;
      handler.search();
    },

    feature: function (input, total, count = 0, wheel = 0, output = {}) {
      _lodash.each(input, (list, type) => {
        if (!output[type])
          output[type] = {
            type: type,
            mark: SEAR_MAP[type].mark,
            list: [],
          };
        if (count < total && list[wheel]) {
          count++;
          // 如果没有高亮信息，就使用对应的参数生成一个展示的信息
          if (!list[wheel].elasticsearchHintcontent)
            list[wheel].elasticsearchHintcontent = SEAR_MAP[type].title(
              list[wheel]
            );
          output[type].list.push(list[wheel]);
        }
      });
      if (count >= total || wheel > total) return output;
      return handler.feature(input, total, count, ++wheel, output);
    },

    change: function (value) {
      handler.searchText = value;
      handler.search();
    },

    refreshList: function (entry) {
      handler.$dom
        .find("#layui-windows-search-" + entry.id)
        .find(".layui-search-list-bar")
        .empty()
        .append(
          $(`
        ${_lodash.join(
          _lodash.map(entry.querys, (v1, k1) => {
            return `
          <div class = "layui-search-list-nav" querytype = "${v1.type}" >
            <div class = "layui-search-list-title">${v1.mark}</div>
            <div class = "layui-search-parts" v-each = "query.list" mark = "part">
              ${_lodash.join(
                _lodash.map(v1.list, (v2, k2) => {
                  return `
              <div class = "layui-search-part">${
                v2.elasticsearchHintcontent || v2.name
              }</div>
                  `;
                }),
                ""
              )}
            </div>
          </div>
            `;
          }),
          ""
        )}
      `)
        );
    },

    changeGroup: function () {
      _lodash.each(handler.list, (value) => {
        if (value.entry == handler.pointer) {
          if (value.querys.length > 0) {
            _lodash.each(value.querys, (query) => {
              if (query.type == handler.group) {
                let selectList = [];
                let fn = SEAR_MAP[query.type].parse;
                _lodash.each(query.list, (v) => {
                  selectList.push({
                    template: fn(v),
                  });
                });
                value.selectQuery[0].list = selectList;
              }
            });
          }
          handler.$dom
            .find("#layui-windows-search-" + value.id)
            .find(".layui-search-detail-bar")
            .empty()
            .append(
              $(`
          ${_lodash.join(
            _lodash.map(value.selectQuery, (v1, k1) => {
              return `
            <div class = "layui-search-detail-parts">
              ${_lodash.join(
                _lodash.map(v1.list, (v2, k2) => {
                  return `
              <div class = "layui-search-detail-part">
                ${_lodash.join(
                  _lodash.map(v2.template, (v3, k3) => {
                    return `
                <div>
                  <div class = "layui-search-detail-left">${v3.name}</div>
                  <div class = "layui-search-detail-right">${handler.escape(v3.value)}</div>
                </div>
                    `;
                  }),
                  ""
                )}
              </div>
                  `;
                }),
                ""
              )}
            </div>
              `;
            }),
            ""
          )}
          `)
            )
            .animate({ scrollTop: 0 }, 1);
        }
      });
    },

    addListener: function () {
      layui.element.on("tab(layui-search-page)", function (data) {
        handler.searchVisable = true;
        handler.pointer = handler.list[data.index].entry;
        handler.search();
      });

      handler.$dom.on("click", ".layui-tab-content", function (e) {
        e.stopPropagation();
        e.preventDefault();
        handler.searchVisable = true;
      });

      handler.$dom.on("mouseup", ".layui-tab-title", function (e) {
        handler.checkflag = true;
        setTimeout(function () {
          handler.checkflag = false;
        }, 500);
      });

      handler.$dom.on("click", ".layui-search-part", function (e) {
        e.stopPropagation();
        e.preventDefault();
        var parent = $(this).parents().filter(".layui-search-list-nav");
        var type = parent.attr("querytype");
        if (handler.group != type) {
          handler.group = type;
          handler.changeGroup();
        }
        var index = $(this).parent().find(".layui-search-part").index(this);
        var parentNode = $(this)
          .parents()
          .filter(".layui-tab-item.layui-show")
          .find(".layui-search-detail-bar.layui-windows-desk-scroll");
        var othis = parentNode
          .find(".layui-search-detail-parts")
          .find(".layui-search-detail-part")
          .eq(index);
        parentNode.animate(
          {
            scrollTop:
              othis.offset().top -
              parentNode.offset().top +
              parentNode.scrollTop(),
          },
          300
        );
      });

      $(".layui-input.layui-input-search")
        .on("focus", function () {
          handler.start($(this).val());
          setTimeout(function () {
            handler.focusflag = true;
          }, 500);
        })
        .on("blur", function () {
          setTimeout(function () {
            handler.focusflag = false;
          }, 500);
        })
        .on("input propertychange", function () {
          _lodash.debounce(handler.invokeSearch, { args: [$(this).val()] });
        })
        .on("click", function (e) {
          e.stopPropagation();
          e.preventDefault();
          handler.searchVisable = true;
          if (handler.focusflag)
            return handler.showflag
              ? handler.stop()
              : handler.start($(this).val());
        });

      $("body")
        .on("click", function () {
          if (handler.showflag) handler.stop();
        })
        .on("keydown", function (e) {
          if (e.keyCode == 16) {
            if (handler.shiftTimer) {
              clearTimeout(handler.shiftTimer);
              handler.shiftTimer = 0;
            }
            if (handler.shiftCount == 0) {
              handler.shiftCount = 1;
            } else {
              if(handler.showflag){
                handler.stop();
              }else{
                $(".layui-input.layui-input-search").focus();
              }
            }
            handler.shiftTimer = setTimeout(function () {
              handler.shiftCount = 0;
            }, 800);
          }
        });
    },

    /**
     * @method 聚合搜索hint题词转换
     * @param {*} hint  hint题词
     * @desc
     *    主要是将hint题词由带有html标签的字符串转化成可信任的带html标签的字符串
     * @returns
     */
    transformElasticsearchHint: function (hint) {
      if (!hint) return "";
      hint = hint.substring(hint.indexOf("<"), hint.length);
      var p = 0,
        p0 = 0,
        len = hint.length,
        res = "";
      while (p < len) {
        var s = "",
          sub = hint.substring(p);
        if (
          /^\s*<([A-z]+[0-9]?)(\s(\s*[^=<>]*\-?[^=<>\s]+\s*(=\s*(\"[^\"]*\"|\'[^\']*\'))?\s*)*)?\s*\/?>/.test(
            sub
          )
        ) {
          res += hint.substring(p0, p);
          let matchRes = sub.match(
            /^\s*(<([A-z]+[0-9]?)(\s(\s*[^=<>]*\-?[^=<>\s]+\s*(=\s*(\"[^\"]*\"|\'[^\']*\'))?\s*)*)?\s*\/?>)/
          );
          res += '<span style = "color: red">';
          s = matchRes[1];
          p0 = p + s.length;
        } else if (/^\s*<\/([A-z]+[0-9]?)>/.test(sub)) {
          res += hint.substring(p0, p);
          let matchRes = sub.match(/^\s*(<\/([A-z]+[0-9]?)>)/);
          res += "</span>";
          s = matchRes[1];
          p0 = p + s.length;
        }
        p += s ? s.length : 1;
      }
      res += hint.substring(p0, p);
      return res;
    },

    /**
     * 转义html内容
     * @param {*} html 
     * @returns 
     */
    escape: function(html){
      return String(html || '').replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
          .replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    },
  };

  exports("search", handler);
});
