console.log('Loading function');
const AWS = require('aws-sdk');

const storeS3 = require("./store-s3.js");
exports.handler = async function (event, context) {
	let httpreq = event.requestContext.http;
	let method = httpreq.method;
	let path = httpreq.path;
	if (path.startsWith('/')) 
		path = path.substring(1);
	let pathParts = path.split('/');
	let key = pathParts.length>=1 ? pathParts[pathParts.length-1] : null;
	let bucket = pathParts.length>=2 ? pathParts[pathParts.length-2] : null;
	let s3result = "none";
	let resultbody = null;
	let response = null;
	if ((method=='POST'|| method=='PUT') && bucket && event.body) {
		s3result = await storeS3.put(bucket, key, event.body);
	}
	if (method=='GET'  && bucket) {
		s3result = await storeS3.get(bucket, key);
		resultbody = JSON.parse(s3result.body)
		response = resultbody.content;
	}
	if (response==null) {
		response =  {
			event,
			path,  
			params:event.queryStringParameters, 
			pathParts,
			key,
			bucket,
			message:[],
			s3result,
			resultbody
		};
	}

	return response;
};
