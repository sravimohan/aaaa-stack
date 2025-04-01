#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppCdkStack } from '../lib/app-cdk-stack';

const app = new cdk.App();
new AppCdkStack(app, 'aaa-stack', {
  // AWS account and region are automatically determined from the environment
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
 
  // by default, CDK will use the DefaultStackSynthesizer, which is the recommended way to synthesize stacks.
  // The DefaultStackSynthesizer assumes the role configured by the cdk boottrap command.
  // It supports cross-account deployment and is compatible with CDK Pipelines.
  //
  // As an alternative, you can use the CliCredentialsStackSynthesizer, which uses the CLI's current credentials.
  //
  // Refer to the documentation for more details:
  // https://github.com/aws/aws-cdk/wiki/Security-And-Safety-Dev-Guide
  //  
  // Uncomment the following line to use the CliCredentialsStackSynthesizer:
  // synthesizer: new cdk.CliCredentialsStackSynthesizer()
});
