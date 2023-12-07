layui.define(['form','laydate'],function (exports) {
 
  let handler = {
    run: function(layero){
      handler.layero = $('body');  
      handler.initDate();
      handler.initForm();
      handler.initPage(handler.layero);
      handler.addListener();
    },
    initDate: function(){
      // 提前渲染时间控件
      layui.laydate.render({
        elem: "#formplus-form-demo4-date",
      });

    },
    initForm: function(){
      // 表单01渲染
      handler.formHandler01 = layui.form.render(null, 'formplus-form-demo1', true);
      // 表单02渲染
      handler.formHandler02 = layui.form.render(null, 'formplus-form-demo2', true);
      // 表单03渲染
      handler.formHandler03 = layui.form.render(null, 'formplus-form-demo3', true);
      // 表单04渲染
      handler.formHandler04 = layui.form.render(null, 'formplus-form-demo4', true);
      // 表单05渲染
      handler.formHandler05 = layui.form.render(null, 'formplus-form-demo5', true);
    },
    initPage: function(layero){

      layui.use(['code'],function(){
        layui.code();
        let html = '<ul class="ws-dir-ul" style="max-height: 530px;">'; 
        let selectors = layero.get(0).querySelectorAll('.layui-elem-quote');
        let index = 0;
        Array.prototype.forEach.call(selectors, function(selector){
          let id = selector.getAttribute('id');
          let name = selector.getAttribute('title');
          if(id && name){
            html += `<li level="2" li-index="${index}" class=""><a href="#${id}">${name}</a></li>`;
            index++;
          }
        }); 
        html += '</ul>';
        layero.append($(html));
        layero.find('.ws-dir-ul').css('height', index * 30 + 'px');
        layero.on('click', '.ws-dir-ul li', function(){
          layero.find('.ws-dir-ul li.layui-this').removeClass('layui-this');
          $(this).addClass('layui-this');
        });
      });

    },

    addListener: function(){

      // 表单01事件监听
      layui.form.on('submit(formplus-bth-demo1)', function(obj){
        var field = obj.field;
        layui.layer.msg(JSON.stringify(field), {icon: 6});
      });

      handler.layero.on('click', '#formplus-bth-demo1-submit', function(){
        var field = handler.formHandler01.getFormValue('formplus-form-demo1');
        if(!field) return;
        layui.layer.msg(JSON.stringify(field), {icon: 6});
      });

      handler.layero.on('click', '#formplus-bth-demo1-select01', function(){
        handler.formHandler01.interest = '3';
      });

      handler.layero.on('click', '#formplus-bth-demo1-select02', function(){
        handler.formHandler01.sex = '女';
      });

      // 表单02事件监听
      layui.form.on('submit(formplus-bth-demo2)', function(obj){
        var field = obj.field;
        layui.layer.msg(JSON.stringify(field), {icon: 6});
      });

      handler.formHandler02.$watch('interest', function(value, oldValue){
        layui.layer.msg('选择框 - 旧值:{' + oldValue + '}, 新值: {' + value + '}', {icon: 6});
      });

      handler.formHandler02.$watch('sex1', function(value, oldValue){
        layui.layer.msg('单选框 - 旧值:{' + oldValue + '}, 新值: {' + value + '}', {icon: 6});
      });

      handler.formHandler02.$watch('remark', function(value, oldValue){
        layui.layer.msg('文本域 - 旧值:{' + oldValue + '}, 新值: {' + value + '}', {icon: 6});
      });

      // 表单03事件监听
      layui.form.on('submit(formplus-bth-demo3)', function(obj){
        var field = obj.field;
        layui.layer.msg(JSON.stringify(field), {icon: 6});
      });

      // 表单04事件监听
      layui.form.on('submit(formplus-bth-demo4)', function(obj){
        var field = obj.field;
        layui.layer.msg(JSON.stringify(field), {icon: 6});
      });

      handler.layero.on('click', '#formplus-bth-demo4-change', function(){
        handler.formHandler04.date1 = '2023-10-01';
      });

      // 表单05事件监听
      layui.form.on('submit(formplus-bth-demo5)', function(obj){
        var field = obj.field;
        layui.layer.msg(JSON.stringify(field), {icon: 6});
      });
    },
  };
  handler.run();
  exports("formplusDemo", handler);
});
