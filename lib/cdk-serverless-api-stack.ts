import {CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";
import {Code, Function, Runtime} from "aws-cdk-lib/aws-lambda";
import {Policy, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {LambdaIntegration, RestApi} from "aws-cdk-lib/aws-apigateway";
import * as path from "path";

export class CdkServerlessApiStack extends Stack {

    private readonly appName: string;
    private customerTable: Table;
    private customerApiLambda: Function;
    private customerApi: RestApi;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        this.appName = this.node.tryGetContext('appName');

        this.createCustomerTable();

        this.createCustomerApiLambda();

        this.createCustomerApi();
    }

    /*
        Creating a DynamoDB table for storing Customer data
     */
    private createCustomerTable = () => {
        this.customerTable = new Table(this, `${this.appName}-Customers-Table`, {
            tableName: 'Customers',
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
        });
    }

    /*
        Creating lambda function for handling API endpoints
     */
    private createCustomerApiLambda = () => {
        this.customerApiLambda = new Function(this, `${this.appName}-Customer-Lambda`, {
            code: Code.fromAsset(path.join(__dirname, '../lambda')),
            handler: "customer.handler",
            runtime: Runtime.NODEJS_14_X
        });

        //Required permissions for Lambda function to interact with Customer table
        const customerTablePermissionPolicy = new PolicyStatement({
            actions: [
                "dynamodb:BatchGetItem",
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:BatchWriteItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            resources: [this.customerTable.tableArn]
        });

        //Attaching an inline policy to the role
        this.customerApiLambda.role?.attachInlinePolicy(
            new Policy(this, `${this.appName}-CustomerTablePermissions`, {
                statements: [customerTablePermissionPolicy],
            }),
        );
    }

    /*
        API Gateway integration
     */
    private createCustomerApi = () => {
        this.customerApi = new RestApi(this, `${this.appName}-Customers-API`, {
            description: 'Customers API',
            deployOptions: {
                stageName: 'dev'
            },
            defaultCorsPreflightOptions: {
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                ],
                allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                allowCredentials: true,
                allowOrigins: ['http://localhost:3000'],
            },
        });
        new CfnOutput(this, 'apiUrl', {value: this.customerApi.url});

        this.addCustomerApiResources();
    }

    private addCustomerApiResources = () => {
        const customers = this.customerApi.root.addResource('customers');
        const customer = customers.addResource('{id}');

        customers.addMethod('GET', new LambdaIntegration(this.customerApiLambda));
        customers.addMethod('PUT', new LambdaIntegration(this.customerApiLambda))

        customer.addMethod('GET', new LambdaIntegration(this.customerApiLambda));
        customer.addMethod('DELETE', new LambdaIntegration(this.customerApiLambda));
    }
}
