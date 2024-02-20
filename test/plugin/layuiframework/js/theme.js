layui.define(function (exports) {
  /**
   * 主题色集合
   */
  const themeConfig = {
    default: {
      alias: "默认配色",
      "--lay-framework-menu-main-bgColor": "32, 34, 42", //主题色
      "--lay-framework-main-bgColor": "0, 150, 136", //选中色
      "--lay-framework-logo-bgColor": "32, 34, 42",
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    darkBlue: {
      alias: "藏蓝",
      "--lay-framework-menu-main-bgColor": "3, 21, 42", //主题色
      "--lay-framework-main-bgColor": "59, 145, 255", //选中色
      "--lay-framework-logo-bgColor": "3, 21, 42",
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    coffee: {
      alias: "咖啡",
      "--lay-framework-menu-main-bgColor": "46, 36, 27", //主题色
      "--lay-framework-main-bgColor": "164, 133, 102", //选中色
      "--lay-framework-logo-bgColor": "46, 36, 27",
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    purpleRed: {
      alias: "紫红",
      "--lay-framework-menu-main-bgColor": "80, 49, 79", //主题色
      "--lay-framework-main-bgColor": "122, 77, 123", //选中色
      "--lay-framework-logo-bgColor": "80, 49, 79",
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    ocean: {
      alias: "海洋",
      "--lay-framework-menu-main-bgColor": "52, 64, 88", //主题色
      "--lay-framework-main-bgColor": "30, 159, 255", //选中色
      "--lay-framework-logo-bgColor": "30, 159, 255", // 标题
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    green: {
      alias: "墨绿",
      "--lay-framework-menu-main-bgColor": "58, 61, 73", //主题色
      "--lay-framework-main-bgColor": "95, 184, 120", //选中色
      "--lay-framework-logo-bgColor": "47, 150, 136", // 标题
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    red: {
      alias: "橙色？",
      "--lay-framework-menu-main-bgColor": "32, 34, 42", //主题色
      "--lay-framework-main-bgColor": "247, 132, 0", //选中色
      "--lay-framework-logo-bgColor": "247, 132, 0", // 标题
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    fashionRed: {
      alias: "时尚红",
      "--lay-framework-menu-main-bgColor": "40, 51, 62", //主题色
      "--lay-framework-main-bgColor": "170, 49, 48", //选中色
      "--lay-framework-logo-bgColor": "170, 49, 48", // 标题
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    classicBlack: {
      alias: "经典黑",
      "--lay-framework-menu-main-bgColor": "36, 38, 47", //主题色
      "--lay-framework-main-bgColor": "0, 150, 136", //选中色
      "--lay-framework-logo-bgColor": "58, 61, 73", // 标题
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
    },
    greenHeader: {
      alias: "墨绿头",
      "--lay-framework-menu-main-bgColor": "32, 34, 42",
      "--lay-framework-main-bgColor": "0, 150, 136",
      "--lay-framework-logo-bgColor": "34, 106, 98", // 标题
      "--lay-framework-header-main-bgColor": "47, 150, 136", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
    },
    oceanHeader: {
      alias: "海洋头",
      "--lay-framework-menu-main-bgColor": "52, 64, 88", //主题色
      "--lay-framework-main-bgColor": "30, 159, 255", //选中色
      "--lay-framework-logo-bgColor": "0, 133, 232", // 标题
      "--lay-framework-header-main-bgColor": "30, 159, 255", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
    },
    classicBlackHeader: {
      alias: "经典黑头",
      "--lay-framework-menu-main-bgColor": "32, 34, 42",
      "--lay-framework-main-bgColor": "0, 150, 136",
      "--lay-framework-logo-bgColor": "32, 34, 42",
      "--lay-framework-header-main-bgColor": "57, 61, 73", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
    },
    purpleRedHeader: {
      alias: "紫红头",
      "--lay-framework-menu-main-bgColor": "80, 49, 79", //主题色
      "--lay-framework-main-bgColor": "122, 77, 123", //选中色
      "--lay-framework-logo-bgColor": "80, 49, 79", // 标题
      "--lay-framework-header-main-bgColor": "80, 49, 79", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
    },
    fashionRedHeader: {
      alias: "时尚红头",
      "--lay-framework-menu-main-bgColor": "40, 51, 62", //主题色
      "--lay-framework-main-bgColor": "170, 49, 48", //选中色
      "--lay-framework-logo-bgColor": "40, 51, 62", // 标题
      "--lay-framework-header-main-bgColor": "170, 49, 48", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
    },
  };
  let handler = {
    // 缓存layui.data的key值
    cacheKey: "layui-framework-theme",
    /**
     * 获取主题色的key
     * @param {*} key 如果没有缓存就是返回这个传入的key
     * @returns
     */
    getTheme: function (key = "default") {
      return layui.data(handler.cacheKey).key || key;
    },
    /**
     * 设置主题色,并缓存起来
     * @param {*} key 主题色的key
     */
    setTheme: function (key) {
      let _config = themeConfig[key || handler.getTheme()];
      _lodash.each(_config, (v, k) => {
        if (k != "alias") document.documentElement.style.setProperty(k, v);
      });
      layui.data(handler.cacheKey, {
        key: "key",
        value: key,
      });
    },
    /**
     * 重置缓存将主题色,成新传入的这个key
     * @param {*} key
     */
    resetTheme: function (key) {
      layui.data(handler.cacheKey, {
        key: "key",
        remove: true,
      });
      handler.setTheme(key);
    },
    popup: function () {
      let selectKey = handler.getTheme();
      let htmlStr = `
      <div class = "layui-fluid">
        <div class="layui-card-header">配色方案</div>
        <div class="layui-card-body layui-framework-setTheme">
          <ul class="layui-framework-setTheme-color">
          ${_lodash.join(
            _lodash.map(
              themeConfig,
              (v, k) => `
            <li class="layui-framework-setTheme-color-li${
              k == selectKey ? " layui-this" : ""
            }" themekey = "${k}"  title = "${v.alias}">
              <div class="layui-framework-setTheme-header" style="background-color: rgba(${
                  v["--lay-framework-header-main-bgColor"]
              }, 1);border: none;"></div>
              <div class="layui-framework-setTheme-side" style="background-color: rgba(${
                v["--lay-framework-menu-main-bgColor"]
              }, 1);">
                <div class="layui-framework-setTheme-logo" style="background-color: rgba(${
                  v["--lay-framework-logo-bgColor"]
                }, 1);"></div>
              </div>
            </li>
            `
            ),
            ""
          )}
          </ul>
        </div>
      </div>
      `;
      layui.layer.open({
        type: 1,
        title: "主题设置",
        offset: "r",
        anim: "slideLeft", // 从右往左
        area: ["320px", "100%"],
        shade: 0.1,
        shadeClose: true,
        id: "layui-framework-setTheme",
        content: htmlStr,
        success: function(layero){
          /**
           * 添加点击事件
           */
          layero.on('click','*[themekey]',function(){
            let _themekey = $(this).attr('themekey');
            // 修改主题
            handler.setTheme(_themekey);
            // 修改样式
            layero.find('*[themekey]').removeClass("layui-this");
            layero.find('[themekey="'+_themekey+'"]').addClass("layui-this");
          });
        },
      });
    },
  };
  exports("theme", handler);
});
