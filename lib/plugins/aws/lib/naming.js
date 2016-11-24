'use strict';

const _ = require('lodash');

/**
 * A centralized naming object that provides naming standards for the AWS provider plugin.  The
 * intent is for this to enable naming standards to be configured using a custom naming plugin or
 * a naming configuration feature, based on which of those is determined to in the best approach.
 *
 * There are two main concepts:
 * 1. normalization - normalization of a name comprises removing any unacceptable characters and
 * changing the name to comply with capitalization expectations.
 * 2. logicalization - logicalization of a name comprises preparing it for use as an attribute name
 * for a resource within the Service's CloudFormation Template.  Notably, a suffix or prefix should
 * be added to the name of resources.  These help to disambiguate attributes identifying or
 * declaring different aspects or data about the same resource.  (e.g. MyFuncLambdaFunction vs.
 * MyFuncLambdaFunctionArn)  Generally, normalization of the name also occurs.
 *
 * Sometimes, it is important to deconstruct the names that are created via this centralized
 * utility.  As a result, the regular expressions used for identifying specific resource types using
 * their names or the logic to extract a name components from a logical name are things that must
 * also be centralized so that they co-occur and are more correlated spatially within the code base.
 * That is to say that they are easier to change together.
 */
module.exports = {

  // General
  normalizeName(name) {
    return `${_.upperFirst(name)}`;
  },
  normalizeNameToAlphaNumericOnly(name) {
    return this.normalizeName(name.replace(/[^0-9A-Za-z]/g, ''));
  },
  normalizePathPart(path) {
    return _.upperFirst(
      _.capitalize(path)
        .replace(/-/g, 'Dash')
        .replace(/\{(.*)\}/g, '$1Var')
        .replace(/[^0-9A-Za-z]/g, '')
    );
  },

  getServiceEndpointRegex() {
    return /^ServiceEndpoint/;
  },

  // Stack
  getStackName() {
    return `${this.provider.serverless.service.service}-${this.provider.getStage()}`;
  },

  // Role
  getRolePath() {
    return '/';
  },
  getRoleName() {
    return {
      'Fn::Join': [
        '-',
        [
          this.provider.serverless.service.service,
          this.provider.getStage(),
          this.provider.getRegion(),
          'lambdaRole',
        ],
      ],
    };
  },
  getRoleLogicalId() {
    return 'IamRoleLambdaExecution';
  },

  // Policy
  getPolicyName() {
    return { // TODO should probably have name ordered and altered as above - see AWS docs
      'Fn::Join': [
        '-',
        [
          this.provider.getStage(),
          // TODO is it a bug here in that the role is not specific to the region?
          this.provider.serverless.service.service,
          'lambda',
        ],
      ],
    };
  },
  getPolicyLogicalId() {
    return 'IamPolicyLambdaExecution';
  },

  // Log Group
  getLogGroupLogicalId(functionName) {
    return `${this.getNormalizedFunctionName(functionName)}LogGroup`;
  },
  getLogGroupName(functionName) {
    return `/aws/lambda/${functionName}`;
  },

  // Lambda
  getNormalizedFunctionName(functionName) {
    return this.normalizeName(functionName
      .replace(/-/g, 'Dash')
      .replace(/_/g, 'Underscore'));
  },
  extractLambdaNameFromArn(functionArn) {
    return functionArn.substring(functionArn.lastIndexOf(':') + 1);
  },
  extractAuthorizerNameFromArn(functionArn) {
    const splitArn = functionArn.split(':');
    // TODO the following two lines assumes default function naming?  Is there a better way?
    // TODO (see ~/lib/classes/Service.js:~155)
    const splitName = splitArn[splitArn.length - 1].split('-');
    return splitName[splitName.length - 1];
  },
  getLambdaLogicalId(functionName) {
    return `${this.getNormalizedFunctionName(functionName)}LambdaFunction`;
  },
  getLambdaLogicalIdRegex() {
    return /LambdaFunction$/;
  },
  getLambdaOutputLogicalId(functionName) {
    return `${this.getLambdaLogicalId(functionName)}Arn`;
  },
  getLambdaOutputLogicalIdRegex() {
    return /LambdaFunctionArn$/;
  },

  // API Gateway
  getApiGatewayName() {
    return `${this.provider.getStage()}-${this.provider.serverless.service.service}`;
  },
  generateApiGatewayDeploymentLogicalId() {
    return `ApiGatewayDeployment${(new Date()).getTime().toString()}`;
  },
  getRestApiLogicalId() {
    return 'ApiGatewayRestApi';
  },
  getNormalizedAuthorizerName(functionName) {
    return this.getNormalizedFunctionName(functionName);
  },
  getAuthorizerLogicalId(functionName) {
    return `${this.getNormalizedAuthorizerName(functionName)}ApiGatewayAuthorizer`;
  },
  normalizePath(resourcePath) {
    return resourcePath.split('/').map(
      this.normalizePathPart.bind(this)
    ).join('');
  },
  getResourceLogicalId(resourcePath) {
    return `ApiGatewayResource${this.normalizePath(resourcePath)}`;
  },
  extractResourceId(resourceLogicalId) {
    return resourceLogicalId.match(/ApiGatewayResource(.*)/)[1];
  },
  normalizeMethodName(methodName) {
    return this.normalizeName(methodName.toLowerCase());
  },
  getMethodLogicalId(resourceId, methodName) {
    return `ApiGatewayMethod${resourceId}${this.normalizeMethodName(methodName)}`;
  },
  getApiKeyLogicalId(apiKeyNumber) {
    return `ApiGatewayApiKey${apiKeyNumber}`;
  },
  getApiKeyLogicalIdRegex() {
    return /^ApiGatewayApiKey/;
  },

  // S3
  getDeploymentBucketLogicalId() {
    return 'ServerlessDeploymentBucket';
  },
  getDeploymentBucketOutputLogicalId() {
    return 'ServerlessDeploymentBucketName';
  },
  normalizeBucketName(bucketName) {
    return this.normalizeNameToAlphaNumericOnly(bucketName);
  },
  getBucketLogicalId(bucketName) {
    return `S3Bucket${this.normalizeBucketName(bucketName)}`;
  },

  // SNS
  normalizeTopicName(topicName) {
    return this.normalizeNameToAlphaNumericOnly(topicName);
  },
  getTopicLogicalId(topicName) {
    return `SNSTopic${this.normalizeTopicName(topicName)}`;
  },

  // Schedule
  getScheduleId(functionName) {
    return `${functionName}Schedule`;
  },
  getScheduleLogicalId(functionName, scheduleIndex) {
    return `${this.getNormalizedFunctionName(functionName)}EventsRuleSchedule${scheduleIndex}`;
  },

  // Stream
  getStreamLogicalId(functionName, streamType, streamName) {
    return `${
      this.getNormalizedFunctionName(functionName)
    }EventSourceMapping${
      this.normalizeName(streamType)
    }${this.normalizeNameToAlphaNumericOnly(streamName)}`;
  },

  // Permissions
  getLambdaS3PermissionLogicalId(functionName, bucketName) {
    return `${this.getNormalizedFunctionName(functionName)}LambdaPermission${this
      .normalizeBucketName(bucketName)}S3`;
  },
  getLambdaSnsPermissionLogicalId(functionName, topicName) {
    return `${this.getNormalizedFunctionName(functionName)}LambdaPermission${
      this.normalizeTopicName(topicName)}SNS`;
  },
  getLambdaSchedulePermissionLogicalId(functionName, scheduleIndex) {
    return `${this.getNormalizedFunctionName(functionName)}LambdaPermissionEventsRuleSchedule${
      scheduleIndex}`;
  },
  getLambdaApiGatewayPermissionLogicalId(functionName) {
    return `${this.getNormalizedFunctionName(functionName)}LambdaPermissionApiGateway`;
  },
};