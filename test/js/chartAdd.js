/**
 * 图表信息添加页面信息的js文件
 * @license MIT
 * @Author Malphite
 * @Date 2023-09-23
 * @description
 *      新增图表信息基础信息
 *   需要初始化时间控件，初始化表格，再给页面添加一些事件
 *
 */
("use strict");
layui.define(function (exports) {
    const KEY = "chartAdd";

    const ID = "ChartAdd";

    const URL = LAYER_BASE_URL + "/chart" + "/addChart";

    let handler = {

        /**
         * @method  程序的入口
         */
        run: function (layero, index, layopt, option){
            handler.index = index;
            handler.option = option;
            handler.initLayDate();
            handler.initForm();
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
         * @description layui表单里面的下拉选择框，单选框，多选框需要进行方法级的渲染
         */
        initForm: function(){
            layui.form.render(null, ID + "-form");
        },
        /**
         * @method 添加监听事件
         * @description 需要添加 提交按钮和关闭按钮点击事件
         */
        addListener: function(){
            /**
             * 添加提交按钮的点击事件
             */
            layui.form.on('submit(' + ID + '-submit)', function (obj) {
                /**
                 *  获取表单信息
                 */
                var field = obj.field;
                layui.layer.confirm('确认添加?',{ closeBtn: 0 }, function (index) {
                    layui.layer.close(index);
                    layui.layer.msg("添加成功！", { icon: 6 });
                    handler.closePage();
                    layui.frame.invokeIframeMethod(handler.option.key, 'searchTable');
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
                    //             layui.layer.msg("添加成功！", { icon: 6 });
                    //             handler.closePage();
                    //             // TODO 成功之后刷新列表
                    //             layui.frame.invokeIframeMethod(handler.option.key, 'searchTable');
                    //             // 或者调用iframe的resize回调
                    //             // layui.frame.doResize(handler.option.key);
                    //         } else {
                    //             layui.layer.msg("操作失败！", { icon: 5 });
                    //         }
                    //         return;
                    //     },
                    //     error: function () {
                    //         layui.layer.closeAll("loading");
                    //         layui.layer.msg("添加失败！", { icon: 5 });
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
        /**
         * @method 关闭弹出层
         */
        closePage: function(){
            layui.layer.close(handler.index);
        },
    };
    /**
     *  将模块放入layui中
     */
    exports(KEY, handler);
});
