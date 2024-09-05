

let rotatingLabelTemplate = document.createElement('template');
rotatingLabelTemplate.innerHTML = `
<style>

	#container {
		width:100%;
		padding:0;
		margin:0;
		overflow: hidden;
		position: relative;
	}

	#container .sub {
		position: absolute;
		white-space: nowrap;
		top: 0;
	}
</style>
<div id="container">
</div>`;

class RotatingLabel extends HTMLElement {
	constructor() {
		super();
		console.log('rot label constr');
		let templateContent = rotatingLabelTemplate.content;
  
		this.r = this.attachShadow({ mode: "open" });
		this.r.appendChild(templateContent.cloneNode(true));
	}

	static get observedAttributes() {
		return ['text'];
	}

	async scroll() {
		const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
		const stop = ()=>{ 
			if (this.scrollInterval) {
				clearInterval(this.scrollInterval); 
				this.scrollInterval=null;
			}
		};
		stop();
		let sub = this.sub;
		let w = sub.width();
		let w2 = w+50;
		let sub2 = $('<div class="sub"/>').appendTo(this.c);
		sub2.html(sub.html());
		let x = 0;
		this.scrollInterval = setInterval(() => {
			sub.css('left', -x);
			sub2.css('left', w2-x);
			if (++x>=w2) {
				stop();
				sub.css('left', 0);
				sub2.remove();
			}
		}, 12);
	}

	setText(txt) {
		let r = this.shadowRoot;
		let c = this.c = $('#container', r).empty();
		let sub = this.sub = $('<div class="sub">' + txt + '</div>').appendTo(c);
		c.css('height', sub.height());
		if (sub.width() > c.width()) {
			sub.on('click', (event)=> { event.stopPropagation(); this.scroll(); });
			this.scroll();
		}
		else
			sub.on('click', (event)=> { event.stopPropagation();  });

	}

	prova() {
		console.log('prova');
		return this.r;
	}
	attributeChangedCallback(property, oldValue, newValue) {
		console.log('attributeChangedCallback', property, oldValue, newValue);
		if (oldValue === newValue) return;
			this[ property ] = newValue;
		if (property=='text') {
			this.setText(newValue);
		}
	}

	connectedCallback() {

	}

	disconnectedCallback() {

	}		

}

customElements.define('rotating-label', RotatingLabel);