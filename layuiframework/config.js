/**
 * layui首页配置
 * @license MIT
 * @Author Malphite
 * @Date 2023-09-23
 * @description
 *      一、 创建的自定义模块路由:
 *    一般的，自定义的layui模块需要让layui能发现这个模块。然后才能在调用use方法时顺利加载这个模块
 *            1)、 自定义模块需要使用layui的define方法来实现:  layui.define(["",""], function(){  XXXX    exports('moduleName', handler); });
 *                -   define方法 有两个参数：第一个参数类似与use方法的第一个参数，是指定它所依赖模块们的名称，第一个参数是可以省略的; 第二个参数是一个回调函数，接收一个对象 exports
 *           在函数体里面定义出模块对象  handler; 最后使用 exports 方法传入 模块名称和模板对象 将这个模块放入layui中。
 *                -   建议一个模块对应一个js文件，这样比较方便查找。
 *                -   这里的模块名称和js文件的名称一致。
 *            2)、 layui默认只能发现内置模块。自定义模块需要通过 扩展模块 的方式对layui暴露自己的路径
 *                -   可以修改一个全局的layui配置项，指定自定义模块仓库路径。在最后查找模块时会统一的添加上这个仓库路径。
 *           layui.config({base: '路径'});  【除了路径配置以 {/} 开头的不受影响】
 *                -   使用 扩展模块 的方式暴露自定义模块的路径 layui.extend({ moduleName: '路径' })  这个路径后面的 .js 是可以省略的
 *                -   建议 指定自定义模块仓库路径 否则layui会使用默认路径进行查找。 ( 需要重点注意不要多次调用互相影响了，否则还不如使用默认路径。需要注意的是layui 2.8+ 由于文件结构变化，默认路径可能也变了 )
 *                -   一般的， 扩展模块 中指定的都是对应 仓库路径的相对路径。如果需要配置绝对路径需要在路径前面添加 {/}
 *      二、 创建弹层配置项：
 *    在这里，集中的将弹出层的配置项确定下来，方便统一的生成和管理。(下面是部分配置 key - value的形式 )
 *                -   name 名称:建议是中文,这里取表格的中文注释。 作用: 除了是赋值 title属性,在首页的许多地方用作展示。
 *                -   url  路径:对应的html模板的相对地址,这里取生成的html相对路径。 作用: ajax请求html模板,为 content属性 赋值。
 *                -   area 高宽:为配置项 area 赋值, 这里取的是字符串数组的形式。
 *
 */
layui.config({base: './js/'})
     .extend({});
// TODO 后台地址，需要灵活配置 (这里取nginx里面配置的地址)
const LAYER_BASE_URL = "./layui";
// 公钥与KeyPair里面的公钥进行配对
const LAYER_PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCT7Qt2VckTa/GunTQlWT94X7VvW75Opa9ur88HSHtj5bSUjFq+mKtOsIvJTkoacCWMsCCe6+RQS4C8SG+kWwg0tjb+AIunSZfYu9PhFqsA+BiOMP5aMmoq44xpogQfmXP7kK2TAICj4ttmcY1Xz54t3uRq7/33u6VLE2RhXci9ywIDAQAB";
// 登录token缓存的key
const LAYUI_USER_FIELD = "layui-user-field";
// 弹出层配置参数
const LAYER_CONFIG = {
  formplus: {
    name: 'test',
    url: './html/formplusDemo.html',
    area: ["750px", "280px"],
  },
  formplus: {
    name: 'test1',
    url: './html/treetest.html',
    area: ["750px", "280px"],
  },
};

