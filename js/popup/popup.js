var popup = (function(){
	function alert(txt) {
		var ret = $.Deferred();
		var div = $('<div class="popup alert"><div class="text"/><div class="ok">OK</div></div>');
		$('.text', div).text(txt);
		$('.ok', div).click(()=>{
			div.remove();
			ret.resolve();
		});
		$('body').append(div);
		return ret;
	}

	function confirm(txt) {
		var ret = $.Deferred();
		var div = $(`
<div class="popup confirm">
	<div class="text"/>
	<div class="bottom">
		<div class="yes">YES</div>
		<div class="no">NO</div>
	</div>
</div>`);

		$('.text', div).text(txt);
		$('.yes', div).click(()=>{
			div.remove();
			ret.resolve(true);
		});
		$('.no', div).click(()=>{
			div.remove();
			ret.resolve(false);
		});
		$('body').append(div);
		return ret;
	}
	
	return {
		alert:alert,
		confirm:confirm
	}
})()