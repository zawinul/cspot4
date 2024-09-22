cloud = (function(){
	const service = 'https://ztodw5a5y6h7ykuermuznv3jtu0cadum.lambda-url.eu-south-1.on.aws/';
	const bucket = 'spotify-user-data'
	async function read(id) {
		let url = `${service}${bucket}/${id}`;
		let response = await fetch(url);
		let data = await response.json();
		return data;
	}

	async function write(id, data) {
		let url = `${service}${bucket}/${id}`;
		let response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(data)
		});
		let result = await response.json();
		return result;
	}

	return {
		read,
		write
	}	
})();