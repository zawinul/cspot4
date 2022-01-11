var aws = (function () {
	var s3;

	var initialized = $.Deferred();
	function get(bucket, path) {
		return initialized
			.then(() => _get(bucket, path))
			.then(null, logIfError);
	}

	function put(bucket, path, textContent) {
		return initialized
			.then(() => _put(bucket, path, textContent))
			.then(null, logIfError);
	}

	function _get(bucket, path) {
		var ret = $.Deferred();
		var params = {
			Bucket: bucket,
			Key: path
		};
		s3.getObject(params, function (err, data) {
			if (err) 
				ret.reject(err);
			else if (data && data.Body)
				ret.resolve(data.Body.toString('utf-8'));
			else
				ret.reject(err);
		});
		return ret;
	}


	function _put(bucket, path, textContent) {
		var ret = $.Deferred();

		var params = {
			Bucket: bucket,
			Key: path,
			Body: textContent
		};
		s3.putObject(params, function (err, data) {
			if (err)
				ret.reject(err);
			else
				ret.resolve();
		});
	}

	function logIfError(err) {
		console.log({logIfError: this, args:arguments});
		console.log({ log_err: err}, err.stack); 
		return Promise.reject(err);
	}

	function init() {
		//msg('AWS Init');
		$.getScript("https://sdk.amazonaws.com/js/aws-sdk-2.188.0.min.js", start);

		function start() {
			AWS.config.region = 'us-east-1'; // Region
			AWS.config.credentials = new AWS.CognitoIdentityCredentials({
				IdentityPoolId: 'us-east-1:0882c823-f779-45af-96ae-25743def2984',
			});
			s3 = new AWS.S3({ region: 'us-east-1' });
			initialized.resolve();	
		}
		// initS3();
		// listBucket();
		// getFile('users/abcd');
	}
	function delayInit() {
		setTimeout(init, 1000, 'del init');
	}
	prova2Initialized.done(delayInit);

	return {
		get: get,
		put: put
	}
})();

