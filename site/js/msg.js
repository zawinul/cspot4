(function(){
	var start = $.Deferred();

	function msg(html, css) {
		console.log('msg '+html);
		const time = 5000;
		var m = $('<div/>').addClass('msg-item').html(html).css({
			padding:"2px 3px",
			margin:2,
			fontFamily:'arial',
			fontSize:15,
			width:'100%',
			border:'1px solid #505050',
			backgroundColor: "rgba(255,255,220,1)"
		});
		
		if (css)
			m.css(css);
			
		m.click(function() { 
			$('.msg-item').remove();
		});
		
		function chiudi(){
			m.animate({height:0, padding:0}, 500, null, cancella);
		}
		function cancella() {
			m.remove();
		}
		var t = setTimeout(chiudi,time, 'msg 1');
		m.delay = function(tt) {
			tt = tt || time;
			clearTimeout(t);
			t = setTimeout(chiudi,tt, 'msg 2');
		};
		container().then(function(c) { m.appendTo(c);});
		return m;
	}
	window.msg = msg;
	
	function container() {
		return start.then(()=>{
			if (!container.c) {
				container.c = $('<div/>').attr('id','_msg_container_').appendTo('body').css({
					position:'absolute',
					zIndex:10000,
					top:5,
					right:5,
					//backgroundColor: "rgba(128,128,128,.25)",
					padding:0,
					overflow:'hidden',
					maxWidth:400
				});
			}
			return container.c;	
		});
	}

	$(function() {
		start.resolve();
	})
})();

