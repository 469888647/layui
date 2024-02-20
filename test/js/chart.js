/**
 * 图表信息 表格展示的js文件
 * @license MIT
 * @Author Malphite
 * @Date 2023-09-23
 */
("use strict");
layui.define(['jquery', 'layer', 'table' , 'laypage' , 'form', 'laydate', 'upload'], function (exports) {

    // 初始化jQuery对象
    var $ = layui.jquery;
    if (!window.$) window.$ = layui.$;
    /**
     * ajax请求设置,比如和header添加token
     */
    $.ajaxSetup({
        xhrFields: {
            withCredentials: true,
        },
        crossDomain: true,
        beforeSend: function (xhr, obj) {
            let users = layui.sessionData(LAYUI_USER_FIELD);
            xhr.setRequestHeader(
                "Authorization",
                (users.data && users.data.token) || ""
            );
        },
        error: function (e) {
            if (e.status == 401) layui.layer.msg("您已离线,请重新登录!", { icon: 5 });
            if (e.status == 403) layui.layer.msg("您没有操作权限", { icon: 5 });
        },
    });
    const cols = [
        [
            {
                title: "序号",
                width: 60,
                align: "center",
                type: "numbers"
            },
            {
                field: "goal",
                title: "分析目标",
                templet: function(d){
                    if(!d.goal) return '/';
                    return d.goal;
                },
                minWidth: 120,
            },
            {
                field: "name",
                title: "图表名称",
                templet: function(d){
                    if(!d.name) return '/';
                    return d.name;
                },
                minWidth: 120,
            },
            {
                field: "chartdata",
                title: "图表数据",
                templet: function(d){
                    if(!d.chartdata) return '/';
                    return d.chartdata;
                },
                minWidth: 120,
            },
            {
                field: "charttype",
                title: "图表类型",
                templet: function(d){
                    let map = {
                        "k":"k线图",
                        "h":"直方图",
                        "p":"饼状图",
                    };
                    return map[d.charttype] || d.charttype;
                },
                minWidth: 120,
            },
            {
                field: "genchart",
                title: "生成的图表数据",
                templet: function(d){
                    if(!d.genchart) return '/';
                    return d.genchart;
                },
                minWidth: 120,
            },
            {
                field: "genresult",
                title: "生成的分析结论",
                templet: function(d){
                    if(!d.genresult) return '/';
                    return d.genresult;
                },
                minWidth: 120,
            },
            {
                field: "status",
                title: "状态",
                templet: function(d){
                    let map = {
                        "wait":"等待",
                        "running":"执行中",
                        "succeed":"成功",
                        "failed":"失败",
                    };
                    return map[d.status] || d.status;
                },
                minWidth: 120,
            },
            {
                field: "execmessage",
                title: "执行信息",
                templet: function(d){
                    if(!d.execmessage) return '/';
                    return d.execmessage;
                },
                minWidth: 120,
            },
            {
                field: "userid",
                title: "创建用户账号",
                templet: function(d){
                    if(!d.userid) return '/';
                    return d.userid;
                },
                minWidth: 120,
            },
            {
                field: "createtime",
                title: "创建时间",
                templet: function(d){
                    if(!d.createtime) return '/';
                    return d.createtime;
                },
                minWidth: 120,
            },
            {
                field: "updatetime",
                title: "更新时间",
                templet: function(d){
                    if(!d.updatetime) return '/';
                    return d.updatetime;
                },
                minWidth: 120,
            },
            {
                field: "isdelete",
                title: "是否删除",
                templet: function(d){
                    let map = {
                        "0":"否",
                        "1":"是",
                    };
                    return map[d.isdelete] || d.isdelete;
                },
                minWidth: 120,
            },
            {
                fixed: "right",
                title: "操作",
                toolbar: "#Chart-table-toolbar",
                width: 130,
            },
        ],
    ];

    const KEY = "chart";

    const ID = "Chart";

    const URL = LAYER_IFRAME_URL + "/chart" + "/pageChart";

    const DELETE_URL = LAYER_IFRAME_URL + "/chart" + "/deleteChart";

    const EXPORT_URL = LAYER_IFRAME_URL + "/chart" + "/exportChart";

    const EXCEL_URL = LAYER_IFRAME_URL + "/chart" + "/excelChart";

    /**
     * @namespace  chart 模块对象
     * @description  创建一个对象，用来将所有的操作最后放到layui中
     *  建议定义下面几个方法
     *  - run 方法是入口方法,一般会在页面初始化完毕之后调用
     *  - resize 方法是监听窗口resize操作的回调方法
     *  - destroy 方法是监听窗口销毁操作的回调方法
     */
    let handler = {
        /**
         * @method  程序的入口
         */
        run: function (layero, index, layopt, option, parentLayui){
            handler.layero = $(layero.contents()[0]);
            // handler.index = index;
            handler.parentLayui = parentLayui;

            handler.initLayDate();
            handler.initForm();
            handler.initTable();
            handler.addListener();
        },
        /**
         * @method 渲染时间选择框插件
         */
        initLayDate: function(){
            layui.laydate.render({
                elem: "#" + ID + "-startTime",
                done: function done(value, date, endDate) {
                    // TODO 开始时间变化后的回调函数可以放这里
                    handler.searchTable(true);
                }
            });
            layui.laydate.render({
                elem: "#" + ID + "-endTime",
                done: function done(value, date, endDate) {
                    // TODO 结束时间变化后的回调函数可以放这里
                    handler.searchTable(true);
                }
            });
        },
        /**
         * @method  初始化layui表单
         * @description layui表单里面的下拉选择框，单选框，多选框需要进行方法级的渲染
         */
        initForm: function(){
            layui.form.render(null, ID + "-form");
        },
        /**
         * @method  初始化该弹层里面的table组件
         * @description 先创建一个新的table实例，然后查询数据更新表格信息
         */
        initTable: function(){
            // 创建新的table实例
            handler.createTable(cols);
            // 查询数据，更新表格信息
            handler.searchTable(true);
        },
        /**
         * @method  创建一个新的table实例
         * @param {*} cols {@linkplain cols 表头配置项}
         * @description 先创建一个新的table实例，将一些固定的配置项先放入实例中
         */
        createTable: function(cols){
            handler.tableInst = layui.table.render({
                elem: "#" + ID + "-table",
                // request: { pageName: "pageNo", limitName: "pageSize" },
                text: {
                    none: "暂无图表信息信息！"
                },
                data: [],
                cols: cols,
                height: 'full-80',
                limit: 10,
                page: {
                    groups: 3,
                    layout: ["prev", "page", "next", "skip", "count"],
                    jump: function jump(obj, first) {
                        if (!first) {
                        }
                    },
                },
                done: function (res, curr, count) {
                    handler.tableCurr = curr;
                    // TODO 表格渲染完毕的回调函数
                },
            });
        },
        /**
         * @method 刷新表格信息
         * @param {*} flag 是否回到第一页 (true:回到第一页; false:保持当前页)
         * @description 将这个方法抽取出来,会在多处调用
         */
        searchTable: function(flag = true){
            let param = {
                // url: URL,
                url: "../plugin/layuiframework/json/table/chartdemo.json",
                // method: "post",
                contentType: "application/json",
                loading: true,
                where: {
                    name: $("#" + ID + "-name").val(),
                    startTime: $("#" + ID + "-startTime").val(),
                    endTime: $("#" + ID + "-endTime").val(),
                },
                height: 'full-80',
                limit: 10,
                page: {
                    curr: flag ? 1 : handler.tableCurr,
                },
            };
            layui.table.reload(ID + "-table", param);
        },

        /**
         * @method 添加监听事件
         * @description 需要添加 搜索按钮和添加按钮点击事件，表单修改时刷新表格，表格操作栏点击事件
         */
        addListener: function(){

            /**
             * 添加搜索按钮的点击事件
             * @description 搜索按钮点击时，需要根据当前的表单信息 {@linkplain handler#searchTable 刷新表格实例}
             */
            layui.form.on('submit(' + ID + '-submit)', function (obj) {
                // var field = obj.field;
                handler.searchTable(true);
                return false;
            });
            /**
             *  在输入名称的时候，根据表单信息刷新表格
             */
            $("#" + ID + "-name").off("input propertychange").on("input propertychange", function(){
                handler.searchTable(true);
            });
            /**
             *  点击添加按钮时，弹出添加图表信息的添加页面
             */
            $("#" + ID + "-add").off("click").on("click", function(){
                if (window.event) window.event.stopPropagation();
                // 传入key让添加页面能够知道是哪个页面跳转过来的
                // 以layui抽屉弹层的方式弹出(弹出的是窗口层)
                handler.parentLayui.openPopup(KEY + "Add", { key: KEY});
                // 以frame管理的选项卡式iframe页面方式打开(打开的是iframe)
                // handler.parentLayui.frame.setTop(KEY + "IframeAdd", { key: KEY});
            });
            /**
            * 添加导出按钮的点击事件
            * @description 导出按钮点击时，需要根据当前的表单信息 导出excel文件
            */
            layui.form.on('submit(' + ID + '-export)', function (obj) {
                /**
                 *  获取表单信息,执行接下来的操作
                 */
                var field = obj.field;
                // TODO  文件导出有更好的实现形式，下面仅为测试
                let exportUrl = EXPORT_URL + '?';
                exportUrl += 'name=' + $("#" + ID + "-name").val() + '&';
                exportUrl += 'startTime=' + $("#" + ID + "-startTime").val() + '&';
                exportUrl += 'endTime=' + $("#" + ID + "-endTime").val() + '&';
                let users = layui.sessionData(LAYUI_USER_FIELD);
                let request = new XMLHttpRequest();
                request.open('POST', exportUrl , true);
                request.responseType = 'arraybuffer';
                request.setRequestHeader(
                    "Authorization",
                    (users.data && users.data.token) || ""
                );
                request.onload = function(){
                    let _data = request.response;
                    if(_data && 'byteLength' in _data && _data.byteLength == 0) return layui.layer.msg("下载失败!",{icon: 5});
                    let _url = window.URL.createObjectURL(new Blob([_data]));
                    var link = document.createElement("a");
                    link.href = _url
                    link.style.display='none';
                    // TODO 文件名称,需要由java生成,这里也可以指定
                    link.download = "excel.xlsx";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(_url);
                }
                request.send();
                return false;
            });
            /**
             * @method 文件上传渲染
             */
            layui.upload.render({
                elem: $("#" + ID + "-import"),
                url: EXCEL_URL,
                method: "POST",
                multiple: false,
                auto: true,
                accept: 'file',
                choose: function (obj) {
                    let files = (this.files = obj.pushFile());
                },
                done: function (res, index, upload) {
                    if (res.code == "200") {
                        layui.layer.msg("导入成功!",{icon: 6});
                        handler.searchTable(true);
                        return delete this.files[index];
                    } else {
                        this.error(index, upload);
                    }
                },
                error: function (index, upload) {
                    layui.layer.msg("导入失败!",{icon: 6});
                    return delete this.files[index];
                },
            });
            /**
             *  表格操作栏点击事件集合
             */
            handler.fn = {
                /**
                 *  表格行上面的修改按钮点击事件
                 */
                "updateRecord": function(obj){
                    if (window.event) window.event.stopPropagation();
                    // 获取到这一行上面的数据信息
                    let data = obj.data;
                    // 传入key让添加页面能够知道是哪个页面跳转过来的
                    // 以layui抽屉弹层的方式弹出(弹出的是窗口层)
                    handler.parentLayui.openPopup(KEY + "Update", { data: data, key: KEY });
                    // 以frame管理的选项卡式iframe页面方式打开(打开的是iframe)
                    // handler.parentLayui.frame.setTop(KEY + "IframeUpdate", { data: data, key: KEY });
                },
                /**
                 *  表格行上面的删除按钮点击事件
                 */
                "deleteByPid": function(obj){
                    if (window.event) window.event.stopPropagation();
                    // 获取到这一行上面的数据信息
                    let data = obj.data;
                    let _objName = data['name']
                    layui.layer.confirm(
                        _objName ? "您确认删除图表信息: " + _objName + " 吗？" : "您确认删除吗？",
                        function (index) {
                            layui.layer.close(index);
                            layui.layer.msg("删除成功！", { icon: 6 });
                            obj.del();
                            // layui.layer.load();
                            // $.ajax({
                            //     url: DELETE_URL,
                            //     data: JSON.stringify(data),
                            //     type: "POST",
                            //     dataType: "json",
                            //     contentType: "application/json",
                            //     success: function (res) {
                            //         layui.layer.closeAll("loading");
                            //         if(res.code == 200) {
                            //             layui.layer.msg("删除成功！", { icon: 6 });
                            //             handler.searchTable(true);
                            //         }else{
                            //             layui.layer.msg("删除失败！", { icon: 5 });
                            //         }
                            //         return;
                            //     },
                            //     error: function () {
                            //         layui.layer.closeAll("loading");
                            //         layui.layer.msg("删除失败！", { icon: 5 });
                            //         return;
                            //     },
                            // });
                        },
                        function (index) {
                            layui.layer.close(index);
                        }
                    );
                },
            };

            /**
             *  表格行操作栏事件绑定
             */
            layui.table.on('tool(' + ID + '-table)', function (obj) {
                var evt = obj.event;
                handler.fn[evt] && handler.fn[evt](obj);
            });
        },
        /**
         *  监听窗口resize操作的回调方法
         */
        resize: function(){
            handler.searchTable(false);
        },
        /**
         *  监听窗口销毁操作的回调方法(这里应该用不到)
         */
        // destroy: function(){},
    };
    /**
     *  将模块放入layui中
     */
    exports(KEY, handler);
});
