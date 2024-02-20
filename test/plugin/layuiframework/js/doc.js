layui.define(function (exports) {
 
  let handler = {
    run: function(layero){
      handler.initPage(layero);
      handler.addListener();
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
      layui.element.on("tab(test-doc1)", function (data) {
        if(data.index == 0) $('#test-doc1').css({height: '220px'});
        if(data.index == 1) $('#test-doc1').css({height: '860px'});
      });

      layui.element.on("tab(test-doc3)", function (data) {
        if(data.index == 0) $('#test-doc3').css({height: '260px'});
        if(data.index == 1) $('#test-doc3').css({height: '1500px'});
      });
    },
  };
  exports("doc", handler);
});
