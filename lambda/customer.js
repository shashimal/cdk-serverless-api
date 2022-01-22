const AWS = require("aws-sdk");

const customerDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    const TABLE= 'Customers'
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json"
    };

    let path = event.resource;
    let httpMethod = event.httpMethod;
    let route = httpMethod.concat(' ').concat(path);

    try {
        switch (route) {
            case "GET /customers":
                body = await customerDB.scan({TableName: TABLE}).promise();
                break;
            case "GET /customers/{id}":
                body = await customerDB
                    .get({
                        TableName: TABLE,
                        Key: {
                            id: event.pathParameters.id
                        }
                    })
                    .promise();
                break;
            case "PUT /customers":
                let requestJSON = JSON.parse(event.body);
                await customerDB
                    .put({
                        TableName: TABLE,
                        Item: {
                            id: requestJSON.id,
                            firstName: requestJSON.firstName,
                            lastName: requestJSON.lastName,
                            address:requestJSON.address,
                        }
                    })
                    .promise();
                body = `Put item ${requestJSON.id}`;
                break;
            case "DELETE /customers/{id}":
                await customerDB
                    .delete({
                        TableName: TABLE,
                        Key: {
                            id: event.pathParameters.id
                        }
                    })
                    .promise();
                body = `Deleted item ${event.pathParameters.id}`;
                break;

            default:
                throw new Error(`Unsupported route: "${route}"`);
        }
    } catch (err) {
        console.log(err)
        statusCode = 400;
        body = err.message;
    } finally {
        console.log(body)
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers
    };
};
