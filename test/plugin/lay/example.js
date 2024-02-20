/**
 * example通过扫描特定的pre里面的内容形成左边示例右边代码风格的页面样式
 */
("use strict");
layui.define(['jquery', 'element', 'code'], function(exports){
  
  let handler = {

    render: function(){
      document.querySelectorAll('.layui-tab[lay-pre-code]').forEach(function(e){
        let $self = $(e);
        let title = $self.attr('lay-pre-code');
        let options = $self.attr('lay-options');
        let pre = $self.find('pre');
        let preHtml = pre.html();
        preHtml = preHtml.replace(/x3cscript/g,'script');
        // let reg = /\x3Cscript[\s|\S]+>([\s|\S]+)\x3C\/script>/;
        // let matchRes = preHtml.match(reg);
        // let scriptStr = matchRes[1];
        let reg = /{{[^{|^}]+}}/g;
        let showHtml = preHtml.replace(reg, (s) => "");
        let codeHtml = preHtml.replace(reg, function(str){
          let m = str.match(/{{\s*(\S+)\s*}}/);
          return handler.replaceTemplate(m[1]);
        });
        $self.empty();
        $self.append($(`
        <div class="layui-tab-title">
          <li class="layui-this">${title}</li>
          <li>＜/＞</li>
        </div>
        `));
        $self.append($(`
        <div class="layui-tab-content">
          <div class="layui-tab-item layui-show">
          ${showHtml}
          </div>
          <div class="layui-tab-item">
            <pre class="layui-code" lay-options="${options}">
            </pre>
          </div>
        </div>
        `));
        layui.code({
          elem: $self.find('pre'),
          code: codeHtml,
        });
      });
    },

    initTemplate: function(key){
      handler.template = {};
      handler.template['layui_html_head'] = `
<!DOCTYPE html>
  <html>
    <head>
      <title>layui测试</title>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="referrer" content="strict-origin-when-cross-origin">
      <!--  大致起完美适配的作用,试开发者不管像素比,只需按照css像素编写代码即可     -->
      <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=0">
      <!--  请使用特殊版本的layui进行打包 -- https://gitee.com/giteetcj/layui/tree/layuiframework/     -->
      <link href="../plugin/layui/css/layui.css" rel="stylesheet">
      <!--  以下功能在这类测试版本中有效  -->
    </head>
    <body>
      `;
      handler.template['layui_js_area'] = `
    <!--  请使用特殊版本的layui进行打包 -- https://gitee.com/giteetcj/layui/tree/layuiframework/     -->
    <script type="text/javascript" src="../plugin/layui/layui.js"></script>
    <!--  以上功能在这类测试版本中有效  -->
      `;
      handler.template['layui_html_tail'] = `
  </body>
</html>
      `;
      return handler.template[key];
    },

    replaceTemplate: function(key){
      if(!handler.template) return handler.initTemplate(key);
      return handler.template[key];
    },

  };
  
  /**
   *  将模块放入layui中
   */
  exports('example', handler);
});