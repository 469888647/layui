/**
 * 图表信息修改iframe页面信息的js文件
 * @license MIT
 * @Author Malphite
 * @Date 2023-09-23
 * @description
 *      修改图表信息基础信息
 *   需要初始化时间控件，初始化表格，将原有信息填充到表格中，再给页面添加一些事件
 *
 */
("use strict");
layui.define(['jquery', 'form', 'laydate', 'layer'],function (exports) {
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
    const KEY = "chartIframeUpdate";

    const ID = "ChartIframeUpdate";

    const URL = LAYER_IFRAME_URL + "/chart" + "/updateChart";

    let handler = {

        /**
         * @method  程序的入口
         */
        run: function (layero, index, layopt, option = {}, parentLayui){
            handler.layero = $(layero.contents()[0]);
            // handler.index = index;
            handler.parentLayui = parentLayui;
            handler.option = option;
            handler.initLayDate();
            handler.initForm(option.data);
            handler.keyProperty = option.data['id']
            handler.addListener();
        },
        /**
         * @method 渲染时间选择框插件
         * @description laydate 使用 rander 方法来创建一个时间控件
         */
        initLayDate: function(){
            layui.laydate.render({
                elem: "#" + ID + "-createtime",
                done: function done(value, date, endDate) {
                    // TODO 时间变化后的回调函数可以放这里
                }
            });
            layui.laydate.render({
                elem: "#" + ID + "-updatetime",
                done: function done(value, date, endDate) {
                    // TODO 时间变化后的回调函数可以放这里
                }
            });
        },
        /**
         * @method  初始化layui表单
         * @param {*} data 表单填充数据
         * @description layui表单里面的下拉选择框，单选框，多选框需要进行方法级的渲染
         */
        initForm: function(data = {}){
            layui.form.val(ID + "-form", data);
            layui.form.render(null, ID + "-form");
        },
        addListener: function(){
            /**
             * 添加提交按钮的点击事件
             */
            layui.form.on('submit(' + ID + '-submit)', function (obj) {
                /**
                 *  获取表单信息
                 */
                var field = obj.field;
                field.id = handler.keyProperty;
                layui.layer.confirm('确认修改?',{ closeBtn: 0 }, function (index) {
                    layui.layer.close(index);
                    layui.layer.msg("修改成功！", { icon: 6 });
                    handler.closePage();
                    handler.parentLayui.invokeIframeMethod(handler.option.key, 'searchTable');
                    // layui.layer.load();
                    // $.ajax({
                    //     url: URL,
                    //     type: "POST",
                    //     dataType: "json",
                    //     contentType: "application/json",
                    //     data: JSON.stringify(field),
                    //     success: function (res) {
                    //         layui.layer.closeAll("loading");
                    //         if (res.code == 200) {
                    //             layui.layer.msg("修改成功！", { icon: 6 });
                    //             handler.closePage();
                    //             // TODO 成功之后刷新列表,更新之后停在该页面,所以参数带false
                    //             handler.parentLayui.invokeIframeMethod(handler.option.key, 'searchTable');
                    //             // 或者调用iframe的resize回调
                    //             // handler.parentLayui.doResize(handler.option.key);
                    //         } else {
                    //             layui.layer.msg("操作失败！", { icon: 5 });
                    //         }
                    //         return;
                    //     },
                    //     error: function () {
                    //         layui.layer.closeAll("loading");
                    //         layui.layer.msg("修改失败！", { icon: 5 });
                    //         return;
                    //     },
                    // });
                },
                function (index) {
                    layui.layer.close(index);
                });
                return false;
            });
            /**
             *  点击关闭按钮时，{@linkplain handler#closePage 关闭弹出层}
             */
            $("#" + ID + "-close").off("click").on("click", function(){
                if (window.event) window.event.stopPropagation();
                handler.closePage();
            });
            $("#" + ID + "-goal").off("input propertychange").on("input propertychange", function(){
                var value = $(this).val();
                // TODO 输入框 分析目标 输入时监听事件
            });
            $("#" + ID + "-name").off("input propertychange").on("input propertychange", function(){
                var value = $(this).val();
                // TODO 输入框 图表名称 输入时监听事件
            });
            $("#" + ID + "-chartdata").off("input propertychange").on("input propertychange", function(){
                var value = $(this).val();
                // TODO 输入框 图表数据 输入时监听事件
            });
            $("#" + ID + "-genchart").off("input propertychange").on("input propertychange", function(){
                var value = $(this).val();
                // TODO 输入框 生成的图表数据 输入时监听事件
            });
            $("#" + ID + "-genresult").off("input propertychange").on("input propertychange", function(){
                var value = $(this).val();
                // TODO 输入框 生成的分析结论 输入时监听事件
            });
            $("#" + ID + "-execmessage").off("input propertychange").on("input propertychange", function(){
                var value = $(this).val();
                // TODO 输入框 执行信息 输入时监听事件
            });
            $("#" + ID + "-userid").off("input propertychange").on("input propertychange", function(){
                var value = $(this).val();
                // TODO 输入框 创建用户账号 输入时监听事件
            });
            layui.form.on('select(' + ID + '-charttype)',function(data){
                var value = data.value;
                // TODO 下拉选择框 图表类型 切换监听事件
            })
            layui.form.on('select(' + ID + '-status)',function(data){
                var value = data.value;
                // TODO 下拉选择框 状态 切换监听事件
            })
            layui.form.on('select(' + ID + '-isdelete)',function(data){
                var value = data.value;
                // TODO 下拉选择框 是否删除 切换监听事件
            })
        },
        closePage: function(){
            handler.parentLayui.frame.closeTabsPage(KEY);
        },
    };
    /**
     *  将模块放入layui中
     */
    exports(KEY, handler);
});
