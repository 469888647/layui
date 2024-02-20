/**
 * 图表信息 可编辑表格展示的js文件
 * @license MIT
 * @Author Malphite
 * @Date 2023-09-23
 */
("use strict");
layui.define(['jquery', 'layer', 'table' , 'laypage' , 'form', 'laydate', 'dropdown'], function (exports) {

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
            { type: "checkbox", fixed: "left" },
            {
                title: "序号",
                width: 60,
                align: "center",
                type: "numbers"
            },
            {
                field: "goal",
                title: "分析目标",
                /**
                 * 统一使用textarea来修改内容了
                 */
                edit: 'textarea',
                minWidth: 120,
            },
            {
                field: "name",
                title: "图表名称",
                /**
                 * 统一使用textarea来修改内容了
                 */
                edit: 'textarea',
                minWidth: 120,
            },
            {
                field: "chartdata",
                title: "图表数据",
                /**
                 * 统一使用textarea来修改内容了
                 */
                edit: 'textarea',
                minWidth: 120,
            },
            {
                field: "charttype",
                title: "图表类型",
                unresize: true,
                align: 'center',
                /**
                 * 这里使用使用模板的方式完成编辑
                 */
                templet: '#ChartPlus-edit-charttype',
                minWidth: 160,
            },
            {
                field: "genchart",
                title: "生成的图表数据",
                /**
                 * 统一使用textarea来修改内容了
                 */
                edit: 'textarea',
                minWidth: 120,
            },
            {
                field: "genresult",
                title: "生成的分析结论",
                /**
                 * 统一使用textarea来修改内容了
                 */
                edit: 'textarea',
                minWidth: 120,
            },
            {
                field: "status",
                title: "状态",
                unresize: true,
                align: 'center',
                /**
                 * 这里使用使用模板的方式完成编辑
                 */
                templet: '#ChartPlus-edit-status',
                minWidth: 160,
            },
            {
                field: "execmessage",
                title: "执行信息",
                /**
                 * 统一使用textarea来修改内容了
                 */
                edit: 'textarea',
                minWidth: 120,
            },
            {
                field: "userid",
                title: "创建用户账号",
                /**
                 * 统一使用textarea来修改内容了
                 */
                edit: 'textarea',
                minWidth: 120,
            },
            {
                field: "createtime",
                title: "创建时间",
                unresize: true,
                align: 'center',
                /**
                 * 这里使用使用模板的方式完成编辑
                 */
                templet: '#ChartPlus-edit-createtime',
                minWidth: 120,
            },
            {
                field: "updatetime",
                title: "更新时间",
                unresize: true,
                align: 'center',
                /**
                 * 这里使用使用模板的方式完成编辑
                 */
                templet: '#ChartPlus-edit-updatetime',
                minWidth: 120,
            },
            {
                field: "isdelete",
                title: "是否删除",
                unresize: true,
                align: 'center',
                /**
                 * 这里使用使用模板的方式完成编辑
                 */
                templet: '#ChartPlus-edit-isdelete',
                minWidth: 120,
            },
            {
                fixed: "right",
                title: "操作",
                toolbar: "#ChartPlus-table-toolbar",
                width: 130,
            },
        ],
    ];

    const KEY = "chartPlus";

    const ID = "ChartPlus";

    const URL = LAYER_IFRAME_URL + "/chart" + "/pageChart";
    const UPDATE_URL = LAYER_IFRAME_URL + "/chart" + "/updateChart";

    const DELETE_URL = LAYER_IFRAME_URL + "/chart" + "/deleteChart";

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
            // 获取当前行数据
            layui.table.getRowData = function(elem, id){
                var index = $(elem).closest('tr').data('index');
                return layui.table.cache[handler.tableId][index] || {};
            };
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
                css: '.layui-table-cell{height: 50px; line-height: 40px;}',
                /**
                 * 开启表格头部工具栏
                 */
                toolbar: "#" + ID + "-table-headToolbar",
                /**
                 * 设置头部工具栏右侧图标,filter,exports,print (分别代表:筛选图标,导出图标,打印图标)
                 */
                defaultToolbar: ["filter","exports","print",],
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
                    // layui.table 渲染时的 id 属性值
                    var id = this.id;
                    handler.tableId = id;
                    /**
                     * 绑定： 头按钮上面的下拉菜单
                     */
                    layui.dropdown.render({
                        elem: "#" + ID + "-table-dropdownButton", // 可绑定在任意元素中，此处以上述按钮为例
                        data: [
                            {
                                id: "add",
                                title: "添加",
                            },
                            {
                                id: "update",
                                title: "编辑",
                            },
                            {
                                id: "delete",
                                title: "删除",
                            },
                        ],
                        // 指定这个下拉菜单各项被（点击）的事件
                        click: function (obj) {
                            var checkStatus = layui.table.checkStatus(id);
                            var data = checkStatus.data; // 获取选中的数据
                            handler.tableEvent[obj.id] &&
                            handler.tableEvent[obj.id](data);
                        },
                    });
                    /**
                     * 绑定： 头按钮上面的切换模式按钮
                     */
                    layui.dropdown.render({
                        elem: "#" + ID + "-table-rowMode",
                        data: [
                            {
                                id: "defaultRow",
                                title: "单行模式（默认）",
                            },
                            {
                                id: "multiRow",
                                title: "多行模式",
                            },
                        ],
                        // 菜单被点击的事件
                        click: function (obj) {
                            handler.tableEvent[obj.id] &&
                            handler.tableEvent[obj.id](id);
                        },
                    });
                    //  指定列是一个单选框或者选择框,这里将dropdown下拉菜单渲染一下
                    layui.dropdown.render({
                        elem: '.dropdpwn-charttype',
                        data: [
                            {
                                title: "k线图",
                                id:"k"
                            },
                            {
                                title: "直方图",
                                id:"h"
                            },
                            {
                                title: "饼状图",
                                id:"p"
                            },
                        ],
                        click: function(obj){
                            var data = layui.table.getRowData(this.elem); // 获取当前行数据(如 id 等字段，以作为数据修改的索引)
                            this.elem.find('span').html(obj.title);
                            // 更新数据中对应的字段
                            data["charttype"] = obj.id;
                            // 显示 - 仅用于演示
                            layui.layer.msg('选中值: '+ obj.title +'<br>当前行数据：'+ JSON.stringify(data));
                        }
                    });
                    //  指定列是一个单选框或者选择框,这里将dropdown下拉菜单渲染一下
                    layui.dropdown.render({
                        elem: '.dropdpwn-status',
                        data: [
                            {
                                title: "等待",
                                id:"wait"
                            },
                            {
                                title: "执行中",
                                id:"running"
                            },
                            {
                                title: "成功",
                                id:"succeed"
                            },
                            {
                                title: "失败",
                                id:"failed"
                            },
                        ],
                        click: function(obj){
                            var data = layui.table.getRowData(this.elem); // 获取当前行数据(如 id 等字段，以作为数据修改的索引)
                            this.elem.find('span').html(obj.title);
                            // 更新数据中对应的字段
                            data["status"] = obj.id;
                            // 显示 - 仅用于演示
                            layui.layer.msg('选中值: '+ obj.title +'<br>当前行数据：'+ JSON.stringify(data));
                        }
                    });
                    // 指定列是一个时间列(这里时间格式统一为yyyy-MM-dd HH:mm:ss),这里使用laydate渲染时间选择框
                    layui.laydate.render({
                        elem: '.laydate-createtime',
                        format: 'yyyy-MM-dd HH:mm:ss',
                        type: 'datetime',
                        done: function(value, date, endDate){
                            var data = layui.table.getRowData(this.elem); // 获取当前行数据(如 id 等字段，以作为数据修改的索引)
                            // 更新数据中对应的字段
                            data["createtime"] = value;
                            // 显示 - 仅用于演示
                            layui.layer.msg('选中值: '+ value +'<br>当前行数据：'+ JSON.stringify(data));
                        }
                    });
                    // 指定列是一个时间列(这里时间格式统一为yyyy-MM-dd HH:mm:ss),这里使用laydate渲染时间选择框
                    layui.laydate.render({
                        elem: '.laydate-updatetime',
                        format: 'yyyy-MM-dd HH:mm:ss',
                        type: 'datetime',
                        done: function(value, date, endDate){
                            var data = layui.table.getRowData(this.elem); // 获取当前行数据(如 id 等字段，以作为数据修改的索引)
                            // 更新数据中对应的字段
                            data["updatetime"] = value;
                            // 显示 - 仅用于演示
                            layui.layer.msg('选中值: '+ value +'<br>当前行数据：'+ JSON.stringify(data));
                        }
                    });
                    //  指定列是一个单选框或者选择框,这里将dropdown下拉菜单渲染一下
                    layui.dropdown.render({
                        elem: '.dropdpwn-isdelete',
                        data: [
                            {
                                title: "否",
                                id:"0"
                            },
                            {
                                title: "是",
                                id:"1"
                            },
                        ],
                        click: function(obj){
                            var data = layui.table.getRowData(this.elem); // 获取当前行数据(如 id 等字段，以作为数据修改的索引)
                            this.elem.find('span').html(obj.title);
                            // 更新数据中对应的字段
                            data["isdelete"] = obj.id;
                            // 显示 - 仅用于演示
                            layui.layer.msg('选中值: '+ obj.title +'<br>当前行数据：'+ JSON.stringify(data));
                        }
                    });
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
                // handler.parentLayui.openPopup("chart" + "Add", { key: KEY});
                // 以frame管理的选项卡式iframe页面方式打开(打开的是iframe)
                handler.parentLayui.frame.setTop("chart" + "IframeAdd", { key: KEY});
            });
            /**
             *  表格操作栏点击事件集合
             */
            handler.tableEvent = {
                /**
                 *  表格头部工具栏上面的添加按钮点击事件
                 */
                "add": function(){
                    // 传入key让添加页面能够知道是哪个页面跳转过来的
                    // 以layui抽屉弹层的方式弹出(弹出的是窗口层)
                    // handler.parentLayui.openPopup("chart" + "Add", { key: KEY});
                    // 以frame管理的选项卡式iframe页面方式打开(打开的是iframe)
                    handler.parentLayui.frame.setTop("chart" + "IframeAdd", { key: KEY});
                },
                /**
                 *  表格头部工具栏上面的修改按钮点击事件
                 */
                "update": function(data){
                    if (data.length !== 1)
                        return layui.layer.msg("请选择一行", { icon: 5 });
                    // 传入key让添加页面能够知道是哪个页面跳转过来的
                    // 以layui抽屉弹层的方式弹出(弹出的是窗口层)
                    // handler.parentLayui.openPopup("chart" + "Update", { data: data[0], key: KEY });
                    // 以frame管理的选项卡式iframe页面方式打开(打开的是iframe)
                    handler.parentLayui.frame.setTop("chart" + "IframeUpdate", { data: data[0], key: KEY });
                },
                /**
                 *  表格头部工具栏上面的删除按钮点击事件
                 */
                "delete": function(data){
                    if (data.length !== 1)
                        return layui.layer.msg("请选择一行", { icon: 5 });
                    return handler.tableEvent.deleteByPid({data: data[0]});
                },
                "defaultRow": function (id) {
                    layui.table.reload(id, {
                        lineStyle: null, // 恢复单行
                    });
                    layui.layer.msg("已设为单行", { icon: 6 });
                },
                "multiRow": function (id) {
                    layui.table.reload(id, {
                        // 设置行样式，此处以设置多行高度为例。若为单行，则没必要设置改参数 - 注：v2.7.0 新增
                        lineStyle: "height: 95px;",
                    });
                    layui.layer.msg("即通过设置 lineStyle 参数可开启多行", { icon: 6 });
                },
                "batchDelete": function(id){
                    /**
                     *  批量删除,这里不实现,但是可以获取到勾选行的信息
                     */
                    var checkStatus = layui.table.checkStatus(id);
                    var data = checkStatus.data;
                    layer.alert(layui.util.escape(JSON.stringify(data)));
                },
                /**
                 *  表格行上面的修改按钮点击事件
                 */
                "updateRecord": function(obj){
                    if (window.event) window.event.stopPropagation();
                    // 获取到这一行上面的数据信息
                    let data = obj.data;
                    // 讲道理还需要对这个信息是否符合校验条件进行校验,这里暂时忽略,靠后端进行校验(后端采用Springboot Validated进行参数校验)
                    layui.layer.confirm('确认更新?',{ closeBtn: 0 }, function (index) {
                        layui.layer.close(index);
                        layui.layer.msg("更新成功！", { icon: 6 });
                        // layui.layer.load();
                        // $.ajax({
                        //     url: UPDATE_URL,
                        //     type: "POST",
                        //     dataType: "json",
                        //     contentType: "application/json",
                        //     data: JSON.stringify(data),
                        //     success: function (res) {
                        //         layui.layer.closeAll("loading");
                        //         if (res.code == 200) {
                        //             layui.layer.msg("更新成功！", { icon: 6 });
                        //             handler.searchTable(false);
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
                },
                /**
                 *  表格行上面的更多按钮点击事件
                 */
                "more": function(obj){
                    var data = obj.data;
                    layui.dropdown.render({
                        elem: this, // 触发事件的 DOM 对象
                        show: true, // 外部事件触发即显示
                        data: [
                            {
                                title: '查看',
                                id: 'detail'
                            },{
                                title: '删除',
                                id: 'del'
                            }
                        ],
                        click: function(menudata){
                            if(menudata.id === 'detail'){
                                layui.layer.msg('查看操作，当前行 ID:'+ data.id);
                            } else if(menudata.id === 'del'){
                                return handler.tableEvent.deleteByPid(obj);
                            }
                        },
                        align: 'right', // 右对齐弹出
                        style: 'box-shadow: 1px 1px 10px rgb(0 0 0 / 12%);' // 设置额外样式
                    })
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
             *  表格头部工具栏事件绑定
             */
            layui.table.on('toolbar(' + ID + '-table)', function(obj){
                var id = obj.config.id;
                handler.tableEvent[obj.event] && handler.tableEvent[obj.event](id);
            });
            /**
             *  表格行操作栏事件绑定
             */
            layui.table.on('tool(' + ID + '-table)', function (obj) {
                var evt = obj.event;
                handler.tableEvent[evt] && handler.tableEvent[evt].call(this, obj);
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
