# CDK

The CDK also currently includes some even higher-level constructs, which we call
patterns. These constructs often involve multiple kinds of resources and are
designed to help you complete common tasks in AWS or represent entire
applications.

For example, the `aws-ecs-patterns.ApplicationLoadBalancedFargateService` construct represents an
architecture that includes an AWS Fargate container cluster employing an
Application Load Balancer (ALB). These patterns are typically difficult to
design to be one-size-fits-all and are best suited to be published as separate
libraries, rather than included directly in the CDK. The patterns that currently
exist in the CDK will be removed in the next CDK major version (CDKv2).
