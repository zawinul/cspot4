const AWS = require('aws-sdk');
const s3 = new AWS.S3();

async function put(bucketName, fileName, fileContent) {

    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent
    };

    try {
        const result = await s3.putObject(params).promise();
        console.log(`File uploaded successfully. ETag: ${result.ETag}`);
        return {
            statusCode: 200,
            body: JSON.stringify({
				Bucket: bucketName,
				Key: fileName,
				msg:'File written successfully to S3'
			})
        };
    } catch (error) {
        console.error('Error writing file to S3:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
				Bucket: bucketName,
				Key: fileName,
				msg:'Error writing file to S3: '+error
			})
        };
    }
};


async function get(bucketName, fileName) {
    const params = {
        Bucket: bucketName,
        Key: fileName
    };

    try {
        const data = await s3.getObject(params).promise();
        const fileContent = data.Body.toString('utf-8');
        //console.log('File content:', fileContent);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'File read successfully from S3',
                content: fileContent,
				Bucket: bucketName,
				Key: fileName
			})
        };
    } catch (error) {
        console.error('Error reading file from S3:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
				message:'Error reading file from S3: '+error,
				Bucket: bucketName,
				Key: fileName
			})
        };
    }
};

module.exports = { get, put }