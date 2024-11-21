/**
 * @function 主题设置
 * @since v0.2.1
 * @author Malphite
 *
 *  <p>在原有的css上面进行归并,将其中带颜色的css使用css变量表示出来(需要colortheme.css文件配合).在这里提供一些简单方法来改变这些css变量,从而达到主题设置的效果</p>
 *  <p>方法:</p>
 *  <ul>
 *    <li>使用run方法开启配置:随着layui版本的迭代，这套样式也并不是尽善尽美的,这里提供一个run方法来开启,从而避免不必要的麻烦</li>
 *    <li>使用popup方法弹出一个可视化的页面,方便管理与设置主题</li>
 *  </ul>
 */
layui.define(["jquery", "util", "layer"],function (exports) {

  // 初始化jQuery
  if (!window.$) window.$ = layui.$;

  /**
   * 初始化 colortheme 使用 layui.data 存储时的key值
   * 后期可以通过
   * layui.config({themeKey:'XXX'});layui.config({themeConfigKey:'XXX'});
   * 进行自定义,这里就不执行了,防止覆盖用户自定义的配置
   */
  // layui.config({themeKey:'layui-framework-theme'});
  // layui.config({themeConfigKey:'layui-framework-theme-config'});

  /**
   * 颜色配置项,生成弹层的时候调用展示颜色的名称
   * key - 是css变量的名称
   * name - 是这个颜色的名称,作为表单的label
   * desc - 详细信息,展示在每个表单行上面,作为名称的补充说明
   */
  const COLOR_OPTION = {
    "--lay-framework-main-bgColor": {
      name: "主色",
      desc: "layui主题颜色(清新绿).广泛用于多个样式中",
    },
    "--lay-framework-secondary-bgColor": {
      name: "辅色",
      desc: "layui主题次色(蓝绿色).与主题色相辅相承",
    },
    "--lay-framework-main-body-bgColor": {
      name: "背景",
      desc: "layui普通背景颜色,白色.用于一般页面的背景颜色少数情况作为边框色",
    },
    "--lay-framework-main-body-fontColor": {
      name: "字体",
      desc: "layui普通字体颜色,用于大多数区域的字体颜色",
    },
    "--lay-framework-main-nomal-borderColor": {
      name: "边框",
      desc: "layui主题边框色01,这个颜色广泛用于背景色文字和边框的颜色当中,与字体1和背景1最好一致",
    },
    "--lay-framework-main-nomal-fontColor": {
      name: "字体01",
      desc: "layui主题字体颜色01,这个颜色广泛用于背景色文字和边框的颜色当中,与边框1和背景1最好一致",
    },
    "--lay-framework-main-nomal-bgColor": {
      name: "背景01",
      desc: "layui主题背景颜色01,这个颜色广泛用于背景色文字和边框的颜色当中,与字体1和边框1最好一致",
    },
    "--lay-framework-main-secondary-fontColor": {
      name: "字体02",
      desc: "layui主题字体颜色02(许多场合的字体颜色,也做为部分三角的边框色)",
    },
    "--lay-framework-main-hover-fontColor": {
      name: "字体hover",
      desc: "layui主题字体颜色03(许多场合的字体颜色,layui-table-tips-c的背景色)",
    },
    "--lay-framework-main-disabled-fontColor": {
      name: "字体disabled",
      desc: "layui主题字体颜色04(许多场合的字体颜色,disabled场景里面会用到)",
    },
    "--lay-framework-main-disabled-borderColor": {
      name: "边框disabled",
      desc: "layui主题边框颜色02(颜色同上,disabled场景里面会用到)",
    },
    "--lay-framework-main-highlight-fontColor": {
      name: "字体高亮",
      desc: "layui主题字体颜色05(亮色,白色字体应该比较显眼)",
    },
    "--lay-framework-dark-bgColor": {
      name: "主题暗色",
      desc: "layui主题暗色(黑色打底,在多处用作字体边框和背景色,以及阴影的颜色)",
    },
    "--lay-framework-main-title-bgColor": {
      name: "标题",
      desc: "layui主题标题色(部分标题如label的背景色)",
    },
    "--lay-framework-main-form-fontColor": {
      name: "字体06",
      desc: "layui主题字体颜色06(表单或者表格里面的文字颜色)",
    },
    "--lay-framework-main-hover-bgColor": {
      name: "背景hover",
      desc: "layui主题背景颜色03(hover或者选中时的背景色)",
    },
    "--lay-framework-main-disabled-bgColor": {
      name: "背景disabled",
      desc: "layui主题背景颜色04(disabled场景里面会用到的背景色)",
    },
    "--lay-framework-main-dangerColor": {
      name: "危险",
      desc: "layui主题危险颜色(危险,一般是指红色)",
    },
    "--lay-framework-main-checkbox-fontColor": {
      name: "选项文字",
      desc: "layui主题字体颜色07(单选多选里面的部分文字颜色)",
    },
    "--lay-framework-main-secondary-borderColor": {
      name: "边框03",
      desc: "layui主题边框颜色03(部分边框颜色)",
    },
    "--lay-framework-main-six-borderColor": {
      name: "树边框",
      desc: "layui主题边框颜色04(layui的树边框颜色)",
    },
    "--lay-framework-main-h-fontColor": {
      name: "HX文字",
      desc: "layui主题字体颜色08(h1到h6标签的字体颜色)",
    },
    "--lay-framework-table-link-fontColor": {
      name: "table-link",
      desc: "layui主题字体颜色09(table里面的link的字体颜色)",
    },
    "--lay-framework-flow-more-fontColor": {
      name: "flow-more",
      desc: "layui主题字体颜色10(flow-more的字体颜色)",
    },
    "--lay-framework-table-checked-bgColor": {
      name: "table-checked",
      desc: "layui主题背景颜色06(table-checked背景颜色)",
    },
    "--lay-framework-table-checked-hover-bgColor": {
      name: "背景07",
      desc: "layui主题背景颜色07(table-checked-hover背景颜色)",
    },
    "--lay-framework-table-tool-bgColor": {
      name: "背景08",
      desc: "layui主题背景颜色08(table-tool背景颜色)",
    },
    "--lay-framework-table-sort-borderColor": {
      name: "边框07",
      desc: "layui主题边框颜色07(table-sort边框颜色)",
    },
    "--lay-framework-color-picker-bgColor": {
      name: "背景09",
      desc: "layui主题背景颜色09(color-picker阴影颜色)",
    },
    "--lay-framework-color-picker-borderColor": {
      name: "边框08",
      desc: "layui主题边框颜色08(color-picker边框颜色)",
    },
    "--lay-framework-main-nav-bgColor": {
      name: "nav背景",
      desc: "layui主题背景颜色10(nav背景颜色)",
    },
    "--lay-framework-main-fixbar-bgColor": {
      name: "fixbar背景",
      desc: "layui主题背景颜色11(fixbar背景颜色)",
    },
    "--lay-framework-util-face-bgColor": {
      name: "背景12",
      desc: "layui主题背景颜色12(util-face背景颜色)",
    },
    "--lay-framework-util-face-borderColor": {
      name: "边框09",
      desc: "layui主题边框颜色09(util-face边框颜色)",
    },
    "--lay-framework-util-face-hover-bgColor": {
      name: "背景13",
      desc: "layui主题背景颜色13(util-face-hover背景颜色)",
    },
    "--lay-framework-util-face-hover-borderColor": {
      name: "边框10",
      desc: "layui主题边框颜色10(util-face-hover边框颜色)",
    },
    "--lay-framework-rate-fontColor": {
      name: "rate字体",
      desc: "layui主题字体颜色11(rate的字体颜色)",
    },
    "--lay-framework-tree-fontColor": {
      name: "tree字体",
      desc: "layui主题字体颜色12(tree的字体颜色)",
    },
    "--lay-framework-footer-span-borderColor": {
      name: "边框11",
      desc: "layui主题边框颜色11(laydate的footer-span边框颜色)",
    },
    "--lay-framework-laydate-selected-bgColor": {
      name: "背景14",
      desc: "layui主题背景颜色14(laydate选中时间段背景颜色)",
    },
    "--lay-framework-laydate-header-fontColor": {
      name: "字体13",
      desc: "layui主题字体颜色13(laydate-header的字体颜色)",
    },
    "--lay-framework-laydate-grid-selected-bgColor": {
      name: "背景15",
      desc: "layui主题背景颜色15(laydate中grid-selected背景颜色 )",
    },
    "--lay-framework-layer-hover-bgColor": {
      name: "背景16",
      desc: "layer主题背景颜色1",
    },
    "--lay-framework-layer-nomal-bgColor": {
      name: "背景17",
      desc: "layer主题背景颜色2",
    },
    "--lay-framework-layer-secondary-bgColor": {
      name: "背景18",
      desc: "layer主题背景颜色3",
    },
    "--lay-framework-layer-close-bgColor": {
      name: "背景19",
      desc: "layer主题背景颜色4",
    },
    "--lay-framework-layer-close-hover-bgColor": {
      name: "背景20",
      desc: "layer主题背景颜色5",
    },
    "--lay-framework-layer-hover-fontColor": {
      name: "layer-hover",
      desc: "layer字体颜色01",
    },
    "--lay-framework-layer-img-fontColor": {
      name: "layer-image",
      desc: "layer字体颜色02",
    },
    "--lay-framework-layer-nomal-borderColor": {
      name: "边框12",
      desc: "layer边框颜色01",
    },
    "--lay-framework-layer-secondary-borderColor": {
      name: "边框13",
      desc: "layer边框颜色02",
    },
    "--lay-framework-menu-main-bgColor": {
      name: "layout",
      desc: "layout主题颜色,指的是菜单背景色",
    },
    "--lay-framework-logo-bgColor": {
      name: "logo",
      desc: "logo背景颜色",
    },
    "--lay-framework-header-main-bgColor": {
      name: "快捷菜单",
      desc: "快捷菜单背景颜色",
    },
    "--lay-framework-header-main-fontColor": {
      name: "字体01",
      desc: "快捷菜单文字颜色",
    },
    "--lay-framework-header-secondary-fontColor": {
      name: "字体02",
      desc: "快捷菜单文字次色",
    },
    "--lay-framework-header-more-color": {
      name: "字体03",
      desc: "用户下拉菜单文字颜色",
    },
    "--lay-framework-body-grey-bgColor": {
      name: "hover背景",
      desc: "菜单选项卡选中时的背景颜色",
    },
    "--lay-framework-main-btn-fontColor": {
      name: "按钮文字颜色",
      desc: "按钮文字颜色",
    },
    "--lay-framework-nav-tree-fontColor": {
      name: "导航菜单文字颜色",
      desc: "导航菜单文字颜色",
    }
  };

  /**
   * layui的默认颜色,如果传入的配置项里面没有覆盖的,就使用这个默认的
   */
  const LAYUI_DEFAULT_COLOR = {
    "--lay-framework-main-bgColor": "22, 183, 119",
    "--lay-framework-secondary-bgColor": "22, 186, 170",
    "--lay-framework-main-body-bgColor": "255, 255, 255",
    "--lay-framework-main-body-fontColor": "51, 51, 51",
    "--lay-framework-main-nomal-borderColor": "238, 238, 238",
    "--lay-framework-main-nomal-fontColor": "238, 238, 238",
    "--lay-framework-main-nomal-bgColor": "238, 238, 238",
    "--lay-framework-main-secondary-fontColor": "153, 153, 153",
    "--lay-framework-main-hover-fontColor": "119, 119, 119",
    "--lay-framework-main-disabled-fontColor": "210, 210, 210",
    "--lay-framework-main-disabled-borderColor": "210, 210, 210",
    "--lay-framework-main-highlight-fontColor": "255, 255, 255",
    "--lay-framework-dark-bgColor": "0, 0, 0",
    "--lay-framework-main-title-bgColor": "250, 250, 250",
    "--lay-framework-main-form-fontColor": "95, 95, 95",
    "--lay-framework-main-hover-bgColor": "248, 248, 248",
    "--lay-framework-main-disabled-bgColor": "251, 251, 251",
    "--lay-framework-main-dangerColor": "255, 87, 34",
    "--lay-framework-main-checkbox-fontColor": "194, 194, 194",
    "--lay-framework-main-secondary-borderColor": "226, 226, 226",
    "--lay-framework-main-six-borderColor": "192, 196, 204",
    "--lay-framework-main-h-fontColor": "58, 58, 58",
    "--lay-framework-table-link-fontColor": "1, 170, 237",
    "--lay-framework-flow-more-fontColor": "115, 115, 131",
    "--lay-framework-table-checked-bgColor": "219, 251, 240",
    "--lay-framework-table-checked-hover-bgColor": "171, 248, 221",
    "--lay-framework-table-tool-bgColor": "204, 204, 204",
    "--lay-framework-table-sort-borderColor": "178, 178, 178",
    "--lay-framework-color-picker-bgColor": "136, 136, 136",
    "--lay-framework-color-picker-borderColor": "240, 240, 240",
    "--lay-framework-main-nav-bgColor": "47, 54, 60",
    "--lay-framework-main-fixbar-bgColor": "159, 159, 159",
    "--lay-framework-util-face-bgColor": "217, 217, 217",
    "--lay-framework-util-face-borderColor": "232, 232, 232",
    "--lay-framework-util-face-hover-bgColor": "255, 249, 236",
    "--lay-framework-util-face-hover-borderColor": "235, 115, 80",
    "--lay-framework-rate-fontColor": "255, 184, 0",
    "--lay-framework-tree-fontColor": "85, 85, 85",
    "--lay-framework-footer-span-borderColor": "201, 201, 201",
    "--lay-framework-laydate-selected-bgColor": "0, 247, 222",
    "--lay-framework-laydate-header-fontColor": "246, 246, 246",
    "--lay-framework-laydate-grid-selected-bgColor": "242, 242, 242",
    "--lay-framework-layer-hover-bgColor": "45, 147, 202",
    "--lay-framework-layer-nomal-bgColor": "30, 159, 255",
    "--lay-framework-layer-secondary-bgColor": "46, 45, 60",
    "--lay-framework-layer-close-bgColor": "120, 120, 120",
    "--lay-framework-layer-close-hover-bgColor": "246, 246, 246",
    "--lay-framework-layer-hover-fontColor": "149, 149, 149",
    "--lay-framework-layer-img-fontColor": "113, 113, 113",
    "--lay-framework-layer-nomal-borderColor": "222, 222, 222",
    "--lay-framework-layer-secondary-borderColor": "211, 212, 211",
    "--lay-framework-main-btn-fontColor":"255, 255, 255",
    "--lay-framework-nav-tree-fontColor":"255, 255, 255",
  };

  /**
   * 主题色集合(classicBlackHeader 黑色的主题重新配置了layui默认的颜色,其它的会保留 {@linkplain LAYUI_DEFAULT_COLOR 默认配置})
   */
  const themeConfig = {
    default: {
      alias: "默认配色",
      // "--lay-framework-main-bgColor": "0, 150, 136", //选中色

      "--lay-framework-menu-main-bgColor": "32, 34, 42", //主题色
      "--lay-framework-main-bgColor": "0, 150, 136", //选中色
      "--lay-framework-logo-bgColor": "32, 34, 42",
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",
    },
    classicBlackHeader: {
      alias: "经典黑头",

      "--lay-framework-menu-main-bgColor": "32, 34, 42",
      "--lay-framework-logo-bgColor": "32, 34, 42",
      "--lay-framework-header-main-bgColor": "57, 61, 73", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",

      "--lay-framework-main-bgColor": "0, 150, 136",
      "--lay-framework-secondary-bgColor": "22, 186, 170",
      "--lay-framework-main-body-bgColor": "0, 0, 0",
      "--lay-framework-main-body-fontColor": "214, 214, 214",
      "--lay-framework-main-nomal-borderColor": "214, 214, 214",
      "--lay-framework-main-nomal-fontColor": "214, 214, 214",
      "--lay-framework-main-nomal-bgColor": "31, 31, 31",
      "--lay-framework-main-secondary-fontColor": "112, 112, 112",
      "--lay-framework-main-hover-fontColor": "190, 190, 190",
      "--lay-framework-main-disabled-fontColor": "89, 89, 89",
      "--lay-framework-main-disabled-borderColor": "89, 89, 89",
      "--lay-framework-main-highlight-fontColor": "0, 0, 0",
      "--lay-framework-dark-bgColor": "255, 255, 255",
      "--lay-framework-main-title-bgColor": "20, 20, 20",
      "--lay-framework-main-form-fontColor": "166, 166, 166",
      "--lay-framework-main-hover-bgColor": "35, 35, 35",
      "--lay-framework-main-disabled-bgColor": "17, 17, 17",
      "--lay-framework-main-dangerColor": "255, 87, 34",
      "--lay-framework-main-checkbox-fontColor": "89, 89, 89",
      "--lay-framework-main-secondary-borderColor": "44, 44, 44",
      "--lay-framework-main-six-borderColor": "83, 84, 88",
      "--lay-framework-main-h-fontColor": "193, 193, 193",
      "--lay-framework-table-link-fontColor": "1, 170, 237",
      "--lay-framework-flow-more-fontColor": "115, 115, 131",
      "--lay-framework-table-checked-bgColor": "63, 71, 68",
      "--lay-framework-table-checked-hover-bgColor": "171, 248, 221",
      "--lay-framework-table-tool-bgColor": "72, 72, 72",
      "--lay-framework-table-sort-borderColor": "105, 105, 105",
      "--lay-framework-color-picker-bgColor": "136, 136, 136",
      "--lay-framework-color-picker-borderColor": "51, 51, 51",
      "--lay-framework-main-nav-bgColor": "47, 54, 60",
      "--lay-framework-main-fixbar-bgColor": "159, 159, 159",
      "--lay-framework-util-face-bgColor": "217, 217, 217",
      "--lay-framework-util-face-borderColor": "232, 232, 232",
      "--lay-framework-util-face-hover-bgColor": "255, 249, 236",
      "--lay-framework-util-face-hover-borderColor": "235, 115, 80",
      "--lay-framework-rate-fontColor": "255, 184, 0",
      "--lay-framework-tree-fontColor": "85, 85, 85",
      "--lay-framework-footer-span-borderColor": "201, 201, 201",
      "--lay-framework-laydate-selected-bgColor": "0, 247, 222",
      "--lay-framework-laydate-header-fontColor": "246, 246, 246",
      "--lay-framework-laydate-grid-selected-bgColor": "242, 242, 242",
      "--lay-framework-body-grey-bgColor": "102, 102, 102",
      "--lay-framework-body-secondary-fontColor": "255, 255, 255",
    },
    darkBlue: {
      alias: "藏蓝",
      // "--lay-framework-main-bgColor": "59, 145, 255", //选中色
      // "--lay-framework-secondary-bgColor": "30, 159, 255", // 主题次色

      "--lay-framework-menu-main-bgColor": "3, 21, 42", //主题色
      "--lay-framework-main-bgColor": "59, 145, 255", //选中色
      "--lay-framework-secondary-bgColor": "30, 159, 255",// 主题次色
      "--lay-framework-logo-bgColor": "3, 21, 42",
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",
    },
    coffee: {
      alias: "咖啡",
      // "--lay-framework-main-bgColor": "164, 133, 102", //选中色
      // "--lay-framework-secondary-bgColor": "207, 175, 15", // 主题次色

      "--lay-framework-menu-main-bgColor": "46, 36, 27", //主题色
      "--lay-framework-main-bgColor": "164, 133, 102", //选中色
      "--lay-framework-secondary-bgColor": "207, 175, 15",// 主题次色
      "--lay-framework-logo-bgColor": "46, 36, 27",
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",
    },
    purpleRed: {
      alias: "紫红",
      // "--lay-framework-main-bgColor": "122, 77, 123", //选中色
      // "--lay-framework-secondary-bgColor": "162, 51, 198", // 主题次色

      "--lay-framework-menu-main-bgColor": "80, 49, 79", //主题色
      "--lay-framework-main-bgColor": "122, 77, 123", //选中色
      "--lay-framework-secondary-bgColor": "162, 51, 198",// 主题次色
      "--lay-framework-logo-bgColor": "80, 49, 79",
      "--lay-framework-header-main-bgColor": "80, 49, 79", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",

    },
    ocean: {
      alias: "海洋",
      // "--lay-framework-main-bgColor": "30, 159, 255", //选中色
      // "--lay-framework-secondary-bgColor": "59, 145, 255", // 主题次色

      "--lay-framework-menu-main-bgColor": "52, 64, 88", //主题色
      "--lay-framework-main-bgColor": "30, 159, 255", //选中色
      "--lay-framework-secondary-bgColor": "59, 145, 255",// 主题次色
      "--lay-framework-logo-bgColor": "0, 133, 232", // 标题
      "--lay-framework-header-main-bgColor": "30, 159, 255", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",
    },
    green: {
      alias: "墨绿",
      // "--lay-framework-main-bgColor": "95, 184, 120", //选中色
      // "--lay-framework-secondary-bgColor": "0, 149, 135", // 主题次色

      "--lay-framework-menu-main-bgColor": "58, 61, 73", //主题色
      "--lay-framework-main-bgColor": "95, 184, 120", //选中色
      "--lay-framework-secondary-bgColor": "0, 149, 135",// 主题次色
      "--lay-framework-logo-bgColor": "34, 106, 98", // 标题
      "--lay-framework-header-main-bgColor": "47, 150, 136",
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",
    },
    red: {
      alias: "橙色？",
      // "--lay-framework-main-bgColor": "247, 132, 0", //选中色
      // "--lay-framework-secondary-bgColor": "255, 184, 0", // 主题次色

      "--lay-framework-menu-main-bgColor": "32, 34, 42", //主题色
      "--lay-framework-main-bgColor": "247, 132, 0", //选中色
      "--lay-framework-secondary-bgColor": "255, 184, 0",// 主题次色
      "--lay-framework-logo-bgColor": "247, 132, 0", // 标题
      "--lay-framework-header-main-bgColor": "255, 255, 255",
      "--lay-framework-header-main-fontColor": "51, 3, 0",
      "--lay-framework-header-secondary-fontColor": "0, 0, 0",
      "--lay-framework-header-more-color": "102, 6, 0",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",
    },
    fashionRed: {
      alias: "时尚红",
      // "--lay-framework-main-bgColor": "170, 49, 48", //选中色
      // "--lay-framework-secondary-bgColor": "255, 87, 34", // 主题次色

      "--lay-framework-menu-main-bgColor": "40, 51, 62", //主题色
      "--lay-framework-main-bgColor": "170, 49, 48", //选中色
      "--lay-framework-secondary-bgColor": "255, 87, 34",// 主题次色
      "--lay-framework-logo-bgColor": "40, 51, 62", // 标题
      "--lay-framework-header-main-bgColor": "170, 49, 48", //头部导航
      "--lay-framework-header-main-fontColor": "248, 248, 248",
      "--lay-framework-header-secondary-fontColor": "255, 255, 255",
      "--lay-framework-header-more-color": "251, 251, 251",
      "--lay-framework-body-grey-bgColor": "246, 246, 246",
      "--lay-framework-body-secondary-fontColor": "102, 102, 102",
    },
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
  };


  /**
   * 创建最后exports到layui中的对象
   */
  let handler = {
    // 缓存layui.data的key值
    cacheKey: layui.cache.themeKey || "layui-framework-theme",
    configKey: layui.cache.themeConfigKey || "layui-framework-theme-config",
    /**
     * 获取缓存配置信息
     */
    getConfig: function () {
      return layui.data(handler.configKey).config;
    },
    /**
     * 保存用户自定义的颜色配置方案
     * @param {*} name   方案中文名称
     * @param {*} cnname 方案英文名称
     * @param {*} config 方案的颜色配置
     */
    setConfig: function (name, cnname, config) {
      config.alias = name;
      handler.themeConfig[cnname] = config;
      layui.data(handler.configKey, {
        key: "config",
        value: handler.themeConfig,
      });
    },
    /**
     * 从缓存中取出配色方案
     */
    initConfig: function () {
      handler.themeConfig = handler.getConfig() || themeConfig;
      // 补全和替换成layui默认的颜色配置
      util.each(handler.themeConfig, (v) => {
        util.each(LAYUI_DEFAULT_COLOR, (value, key) => {
          if (v[key] == undefined) v[key] = value;
        });
      });
    },
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
     * 修改,在设置之前先判断,没有初始化先触发下初始化,防止出现不必要的错误
     */
    setTheme: function (key) {
      if(!handler.themeConfig) handler.initConfig();
      let _config = handler.themeConfig[key || handler.getTheme()];
      util.each(_config, (v, k) => {
        // 遍历时 alias 属性不能用来设置css变量,简单判断下
        if (k != "alias") document.documentElement.style.setProperty(k, v);
      });
      // 如果是设置主题,将这个设置的key缓存起来
      if (key)
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
    /**
     * 重置主题配置项
     */
    resetConfig: function () {
      layui.data(handler.configKey, {
        key: "config",
        remove: true,
      });
      handler.initConfig();
    },
    /**
     * 启用主题设置的入口方法(这个需要手动开启)
     */
    run: function(){
      // 引入css
      // var cssname = 'colortheme',path = 'modules/colortheme.css';
      // layui.addcss(path, cssname);
      // 初始化配置
      // handler.initConfig();
      // 初始化主题
      handler.setTheme();
    },
    /**
     * 弹出选择主题的面板
     */
    popup: function () {
      // 获取当前选中的主题key值
      let selectKey = handler.getTheme();
      let htmlStr = `
      <div class = "layui-fluid">
        <div class="layui-card-header">配色方案</div>
        <div class="layui-card-body layui-framework-setTheme">
          <ul class="layui-framework-setTheme-color">
          ${util.join(
            util.map(
              handler.themeConfig,
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
              <div class="layui-framework-setTheme-body">
                <div class="layui-framework-setTheme-body-1" style="background-color: rgba(${
                  v["--lay-framework-main-bgColor"]
                }, 1);border: none;"></div>
                <div class="layui-framework-setTheme-body-2" style="background-color: rgba(${
                  v["--lay-framework-secondary-bgColor"]
                }, 1);border: none;"></div>
                <div class="layui-framework-setTheme-body-3" style="background-color: rgba(${
                  v["--lay-framework-main-highlight-fontColor"]
                }, 1);border: none;"></div>
                <div class="layui-framework-setTheme-body-4" style="background-color: rgba(${
                  v["--lay-framework-dark-bgColor"]
                }, 1);border: none;"></div>
              </div>
            </li>
            `
            ),
            ""
          )}
          </ul>
          <div style="width: 12px;height: 80px;">
          <div class="layui-form-item" style="position: fixed;bottom: 0;right: 100px;">
            <div class="layui-inline">
              <button class="layui-btn" type="button"  title="添加" id = "layui-framework-setTheme-add">
                <i class="layui-icon layui-icon-add-circle-fine"></i>添加
              </button>
            </div>
          </div>
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
        success: function (layero) {
          /**
           * 添加点击事件
           */
          layero.on("click", "*[themekey]", function () {
            let _themekey = $(this).attr("themekey");
            // 修改主题
            handler.setTheme(_themekey);
            // 修改样式
            layero.find("*[themekey]").removeClass("layui-this");
            // 当前选中的主题项选中展示
            layero
              .find('[themekey="' + _themekey + '"]')
              .addClass("layui-this");
          });
          // 点击添加按钮弹出编辑面板
          layero.on("click", "#layui-framework-setTheme-add", function () {
            handler.popupEdit();
          });
        },
      });
    },

    /**
     * 弹出添加or修改面板
     * 参数会复用当前选择的主题
     * 如果修改了名字就创建新的主题,否则是修改当前的主题
     */
    popupEdit: function () {
      // 获取当前选中的主题key和主题配置项
      let selectKey = handler.getTheme();
      let selectConfig = handler.themeConfig[selectKey];
      let htmlStr = `
      <div class = "layui-fluid">
        <div class="layui-card-header">自定义配色</div>
        <div class="layui-card-body">
          <div class="layui-form layui-form-pane" lay-filter="layui-framework-theme-form" >
            <div class="layui-form-item" style="margin: 0;">
              <div class="layui-inline">
                <label class="layui-form-label"><span style = "color:red">*</span>名称:</label>
                <div class="layui-input-inline" >
                  <input type="text" class="layui-input" value = "${selectKey}" lay-verify = "required" name="name" placeholder="请输入名称"   />
                </div>
              </div>
            </div>
            <div class="layui-form-item" style="margin: 0;">
              <div class="layui-inline">
                <label class="layui-form-label"><span style = "color:red">*</span>别称:</label>
                <div class="layui-input-inline" >
                  <input type="text" class="layui-input" lay-verify = "required" name="alias" placeholder="请输入别称"   />
                </div>
              </div>
            </div>
            ${util.join(
              util.map(
                COLOR_OPTION,
                (v, k) => `
            <blockquote class="layui-elem-quote">${v.desc}</blockquote>
            <div class="layui-form-item" style="margin: 0;">
              <div class="layui-inline">
                <label class="layui-form-label"><span style = "color:red">*</span>${v.name}:</label>
                <div class="layui-input-inline" >
                  <input type="text" class="layui-input" lay-verify = "required" name="${k}" id = "form-${k}"  />
                </div>
                <div class="layui-inline" style="left: -11px;">
                  <div id="theme-${k}"></div>
                </div>
              </div>
            </div>
            `
              ),
              ""
            )}
            <div style="width: 12px;height: 80px;">
            <div class="layui-form-item" style="position: fixed;bottom: 0;right: 200px;">
              <div class="layui-inline">
                <button class="layui-btn" type="button" lay-submit lay-filter="layui-framework-theme-submit" title="确认添加">
                  <i class="layui-icon layui-icon-add-circle-fine"></i>确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      `;
      layui.layer.open({
        type: 1,
        title: "设置",
        offset: "r",
        anim: "slideLeft", // 从右往左
        area: ["460px", "100%"],
        shade: 0.1,
        shadeClose: true,
        id: "layui-framework-createTheme",
        content: htmlStr,
        success: function (layero, index) {
          layui.use(["form", "colorpicker"], function () {
            // 将当前主题配置项反填入表单中,方便修改
            layui.form.val("layui-framework-theme-form", selectConfig);
            layui.form.render(null, "layui-framework-theme-form");
            // 初始化各个颜色选择器
            util.each(COLOR_OPTION, (v, k) => {
              layui.colorpicker.render({
                elem: "#theme-" + k,
                color: "rgb(" + selectConfig[k] + ")",
                format: "rgb",
                done: function (color) {
                  // 选择颜色后将值反填到输入框中,因为最后上传的是表单中输入框里面的信息
                  $("#form-" + k).val(color.substring(4, color.length - 1));
                },
              });
            });

            layui.form.on(
              "submit(layui-framework-theme-submit)",
              function (obj) {
                var field = obj.field;
                handler.setConfig(field.alias, field.name, field);
                layui.layer.msg("添加成功,请重新打开!");
                layui.layer.close(index);
              }
            );
          });
        },
      });
    },
  };

  exports("colortheme", handler);
});