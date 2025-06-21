import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import { ApplicationLoadBalancer } from "@pulumi/awsx/lb/applicationLoadBalancer";
import { registerAutoTags } from './autotag';
import * as child_process from "child_process";

const stack = pulumi.getStack();
const config = new pulumi.Config("kalivibecoding"); // KVC: Changed config namespace

const kvcEncryptionKey = config.getSecret("kvcEncryptionKey")?.apply(secretValue => { // KVC: Changed variable and config key
    return secretValue || child_process.execSync("openssl rand -hex 16").toString().trim();
});
const kvcJwtSecret = config.getSecret("kvcJwtSecret")?.apply(secretValue => { // KVC: Changed variable and config key
    return secretValue || child_process.execSync("openssl rand -hex 32").toString().trim();
});
const containerCpu = config.requireNumber("containerCpu");
const containerMemory = config.requireNumber("containerMemory");
const containerInstances = config.requireNumber("containerInstances");
const addIpToPostgresSecurityGroup = config.get("addIpToPostgresSecurityGroup");
const domain = config.get("domain");
const subDomain = config.get("subDomain");
const usePostgres = config.requireBoolean("usePostgres");
const useRedis = config.requireBoolean("useRedis");
const redisNodeType = config.require("redisNodeType");
const dbIsPublic = config.getBoolean("dbIsPublic");
const dbUsername = config.get("dbUsername");
const dbPassword = config.getSecret("dbPassword");
const dbInstanceClass = config.require("dbInstanceClass");

// Add tags for every resource that allows them, with the following properties.
// Useful to know who or what created the resource/service
registerAutoTags({
    "pulumi:Project": pulumi.getProject(),
    "pulumi:Stack": pulumi.getStack(),
    "Created by": config.get("author") || child_process.execSync("pulumi whoami").toString().trim().replace('\\', '/')
});

let imageName;

// Check if we're deploying a local build or direct from Docker Hub
if (config.getBoolean("deployLocalBuild")) {

    const repoName = config.require("repoName");

    const repo = new aws.ecr.Repository(repoName, {
        name: repoName // https://www.pulumi.com/docs/intro/concepts/resources/names/#autonaming
    }); // Create a private ECR repository

    const repoUrl = pulumi.interpolate`${repo.repositoryUrl}`; // Get registry info (creds and endpoint)
    const name = pulumi.interpolate`${repoUrl}:latest`;

    // Get the repository credentials we use to push the image to the repository
    const repoCreds = repo.registryId.apply(async (registryId) => {
        const credentials = await aws.ecr.getCredentials({
            registryId: registryId,
        });
        const decodedCredentials = Buffer.from(credentials.authorizationToken, "base64").toString();
        const [username, password] = decodedCredentials.split(":");
        return {
            server: credentials.proxyEndpoint,
            username,
            password
        };
    });

    // Build and publish the container image.
    const image = new docker.Image(stack, {
        build: {
            context: `../../`,
            dockerfile: `../../Dockerfile`,
            builderVersion: "BuilderBuildKit",
            args: {
                "BUILDKIT_INLINE_CACHE": "1"
            },
        },
        skipPush: pulumi.runtime.isDryRun(),
        imageName: name,
        registry: repoCreds
    });

    imageName = image.imageName;

    pulumi.log.info(`Finished pushing image to ECR`, image);
} else {
    imageName = process.env.IMAGE_NAME || config.get("imageName") || "kalivibecoding/kalivibecoding:latest"; // KVC: Changed default image name
}

const containerEnvironmentVars: awsx.types.input.ecs.TaskDefinitionKeyValuePairArgs[] = [];

// Allocate a new VPC with the default settings:
const vpc = new awsx.ec2.Vpc(`${stack}-vpc`, {
    numberOfAvailabilityZones: 2,
    natGateways: {
        strategy: "Single"
    },
    tags: {
        // For some reason, this is how you name a VPC with AWS:
        // https://github.com/pulumi/pulumi-terraform/issues/38#issue-262186406
        Name: `${stack}-vpc`
    },
    enableDnsHostnames: true,
    enableDnsSupport: true
});

const albSecGroup = new aws.ec2.SecurityGroup(`${stack}-alb-sg`, {
    name: `${stack}-alb-sg`,
    vpcId: vpc.vpcId,
    ingress: [{ // Allow only http & https traffic
        protocol: "tcp",
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ["0.0.0.0/0"]
    },
    {
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"]
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"]
    }]
})

const fargateSecGroup = new aws.ec2.SecurityGroup(`${stack}-fargate-sg`, {
    name: `${stack}-fargate-sg`,
    vpcId: vpc.vpcId,
    ingress: [
        {
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            securityGroups: [albSecGroup.id]
        }
    ],
    egress: [ // allow all outbound traffic
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"]
        }
    ]
});

if (usePostgres) {
    const rdsSecurityGroupArgs: aws.ec2.SecurityGroupArgs = {
        name: `${stack}-db-sg`,
        vpcId: vpc.vpcId,
        ingress: [{
            protocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            securityGroups: [fargateSecGroup.id]  // The id of the Fargate security group
        }],
        egress: [ // allow all outbound traffic
            {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"]
            }
        ]
    };

    // Optionally add the current outgoing public IP address to the CIDR block
    // so that they can connect directly to the Db during development
    if (addIpToPostgresSecurityGroup) {

        // @ts-ignore
        rdsSecurityGroupArgs.ingress.push({
            protocol: "tcp",
            fromPort: 5432,
            toPort: 5432,
            cidrBlocks: [`${addIpToPostgresSecurityGroup}/32`],
            description: `Public IP for local connection`
        });
    }

    const rdsSecurityGroup = new aws.ec2.SecurityGroup(`${stack}-db-sg`, rdsSecurityGroupArgs);

    const rdsSubnets = new aws.rds.SubnetGroup(`${stack}-db-subnet-group`, {
        name: `${stack}-db-subnet-group`,
        subnetIds: dbIsPublic ? vpc.publicSubnetIds : vpc.privateSubnetIds
    });

    const db = new aws.rds.Instance(stack, {
        allocatedStorage: 10,
        engine: "postgres",
        engineVersion: "14.9",
        identifier: stack, // In RDS
        dbName: "postgres", // When connected to the DB host
        instanceClass: dbInstanceClass,
        port: 5432,
        publiclyAccessible: dbIsPublic,
        skipFinalSnapshot: true,
        storageType: "gp2",
        username: dbUsername,
        password: dbPassword,
        dbSubnetGroupName: rdsSubnets.id,
        vpcSecurityGroupIds: [rdsSecurityGroup.id],
        backupRetentionPeriod: 0,
        applyImmediately: true,
        allowMajorVersionUpgrade: true,
        autoMinorVersionUpgrade: true
    }, {
        protect: dbIsPublic === false,
        deleteBeforeReplace: true
    });

    containerEnvironmentVars.push(
        {
            name: "KVC_POSTGRES_DATABASE", // KVC: Env var name updated
            value: db.dbName
        },
        {
            name: "KVC_POSTGRES_HOST", // KVC: Env var name updated
            value: db.address
        },
        {
            name: "KVC_POSTGRES_PORT", // KVC: Env var name updated
            value: pulumi.interpolate`${db.port}`
        },
        {
            name: "KVC_POSTGRES_USERNAME", // KVC: Env var name updated
            value: db.username
        },
        {
            name: "KVC_POSTGRES_PASSWORD", // KVC: Env var name updated
            value: config.requireSecret("dbPassword") // KVC: Ensure this secret name matches updated pulumi config if changed
        },
        {
            name: "KVC_POSTGRES_USE_SSL", // KVC: Env var name updated
            value: "false"
        });

} else {
    containerEnvironmentVars.push(
        {
            name: "KVC_DB_TYPE", // KVC: Env var name updated
            value: "SQLITE3"
        });
}

if (useRedis) {

    const redisCluster = new aws.elasticache.Cluster(`${stack}-kvc-redis-cluster`, { // KVC: Resource name updated
        clusterId: `${stack}-kvc-redis-cluster`, // KVC: Resource name updated
        engine: "redis",
        engineVersion: '7.0',
        nodeType: redisNodeType,
        numCacheNodes: 1,
        parameterGroupName: "default.redis7",
        port: 6379,
        subnetGroupName: new aws.elasticache.SubnetGroup(`${stack}-kvc-redis-subnet-group`, { // KVC: Resource name updated
            name: `${stack}-kvc-redis-subnet-group`, // KVC: Resource name updated
            subnetIds: vpc.privateSubnetIds
        }).id,
        securityGroupIds: [
            new aws.ec2.SecurityGroup(`${stack}-kvc-redis-sg`, { // KVC: Resource name updated
                name: `${stack}-kvc-redis-sg`, // KVC: Resource name updated
                vpcId: vpc.vpcId,
                ingress: [{
                    protocol: "tcp",
                    fromPort: 6379, // The standard port for Redis
                    toPort: 6379,
                    securityGroups: [fargateSecGroup.id]
                }],
                egress: [{
                    protocol: "-1",
                    fromPort: 0,
                    toPort: 0,
                    cidrBlocks: ["0.0.0.0/0"]
                }]
            }).id
        ]
    });

    const redisUrl = pulumi.interpolate`${redisCluster.cacheNodes[0].address}:${redisCluster.cacheNodes[0].port}`;
    containerEnvironmentVars.push(
        {
            name: "KVC_REDIS_URL", // KVC: Env var name updated
            value: redisUrl
        });

} else {
    containerEnvironmentVars.push(
        {
            name: "KVC_QUEUE_MODE", // KVC: Env var name updated
            value: "MEMORY"
        });
}

let alb: ApplicationLoadBalancer;
// Export the URL so we can easily access it.
let frontendUrl;

if (subDomain && domain) {
    const fullDomain = `${subDomain}.${domain}`;

    const exampleCertificate = new aws.acm.Certificate(`${stack}-cert`, {
        domainName: fullDomain,
        validationMethod: "DNS",
    });

    const hostedZoneId = aws.route53.getZone({ name: domain }, { async: true }).then(zone => zone.zoneId);

    // DNS records to verify SSL Certificate
    const certificateValidationDomain = new aws.route53.Record(`${fullDomain}-validation`, {
        name: exampleCertificate.domainValidationOptions[0].resourceRecordName,
        zoneId: hostedZoneId,
        type: exampleCertificate.domainValidationOptions[0].resourceRecordType,
        records: [exampleCertificate.domainValidationOptions[0].resourceRecordValue],
        ttl: 600,
    });

    const certificateValidation = new aws.acm.CertificateValidation(`${fullDomain}-cert-validation`, {
        certificateArn: exampleCertificate.arn,
        validationRecordFqdns: [certificateValidationDomain.fqdn],
    });

    // Creates an ALB associated with our custom VPC.
    alb = new awsx.lb.ApplicationLoadBalancer(`${stack}-alb`, {
        securityGroups: [albSecGroup.id],
        name: `${stack}-alb`,
        subnetIds: vpc.publicSubnetIds,
        listeners: [{
            port: 80, // port on the docker container
            protocol: "HTTP",
            defaultActions: [{
                type: "redirect",
                redirect: {
                    protocol: "HTTPS",
                    port: "443",
                    statusCode: "HTTP_301",
                },
            }]
        },
        {
            protocol: "HTTPS",
            port: 443,
            certificateArn: certificateValidation.certificateArn
        }],
        defaultTargetGroup: {
            name: `${stack}-alb-tg`,
            port: 80 // port on the docker container ,
        }
    });

    // Create a DNS record for the load balancer
    const albDomain = new aws.route53.Record(fullDomain, {
        name: fullDomain,
        zoneId: hostedZoneId,
        type: "CNAME",
        records: [alb.loadBalancer.dnsName],
        ttl: 600,
    });

    frontendUrl = pulumi.interpolate`https://${subDomain}.${domain}`;

} else {

    // Creates an ALB associated with our custom VPC.
    alb = new awsx.lb.ApplicationLoadBalancer(`${stack}-alb`, {
        securityGroups: [albSecGroup.id],
        name: `${stack}-alb`,
        subnetIds: vpc.publicSubnetIds,
        listeners: [{
            port: 80, // exposed port from the docker file
            protocol: "HTTP"
        }],
        defaultTargetGroup: {
            name: `${stack}-alb-tg`,
            port: 80, // port on the docker container
            protocol: "HTTP"
        }
    });

    frontendUrl = pulumi.interpolate`http://${alb.loadBalancer.dnsName}`;
}

const environmentVariables = [
    ...containerEnvironmentVars,
    {
        name: "KVC_ENGINE_EXECUTABLE_PATH", // KVC: Env var name updated
        value: "dist/packages/kvc-engine/main.js" // KVC: Path updated
    },
    {
        name: "KVC_ENCRYPTION_KEY", // KVC: Env var name updated
        value: kvcEncryptionKey // KVC: Variable name updated
    },
    {
        name: "KVC_JWT_SECRET", // KVC: Env var name updated
        value: kvcJwtSecret // KVC: Variable name updated
    },
    {
        name: "KVC_ENVIRONMENT", // KVC: Env var name updated
        value: "prod"
    },
    {
        name: "KVC_FRONTEND_URL", // KVC: Env var name updated
        value: frontendUrl
    },
    {
        name: "KVC_TRIGGER_DEFAULT_POLL_INTERVAL", // KVC: Env var name updated
        value: "5"
    },
    {
        name: "KVC_EXECUTION_MODE", // KVC: Env var name updated
        value: "UNSANDBOXED"
    },
    {
        name: "KVC_REDIS_USE_SSL", // KVC: Env var name updated
        value: "false"
    },
    {
        name: "KVC_SANDBOX_RUN_TIME_SECONDS", // KVC: Env var name updated
        value: "600"
    },
    {
        name: "KVC_TELEMETRY_ENABLED", // KVC: Env var name updated
        value: "true"
    },
    {
        name: "KVC_TEMPLATES_SOURCE_URL", // KVC: Env var name updated
        value: "https://cloud.kalivibecoding.com/api/v1/blueprint-templates" // KVC: URL updated
    }
];

const fargateService = new awsx.ecs.FargateService(`${stack}-kvc-fg`, { // KVC: Resource name updated
    name: `${stack}-kvc-fg`, // KVC: Resource name updated
    cluster: (new aws.ecs.Cluster(`${stack}-kvc-cluster`, { // KVC: Resource name updated
        name: `${stack}-kvc-cluster` // KVC: Resource name updated
    })).arn,
    networkConfiguration: {
        subnets: vpc.publicSubnetIds,
        securityGroups: [fargateSecGroup.id],
        assignPublicIp: true
    },
    desiredCount: containerInstances,
    taskDefinitionArgs: {
        family: `${stack}-kvc-fg-task-definition`, // KVC: Resource name updated
        container: {
            name: "kalivibecoding", // KVC: Container name updated
            image: imageName,
            cpu: containerCpu,
            memory: containerMemory,
            portMappings: [{
                targetGroup: alb.defaultTargetGroup,
            }],
            environment: environmentVariables
        }
    }
});

pulumi.log.info("Finished KVC Pulumi deployment configuration."); // KVC: Log message updated

export const _ = {
    kaliVibeCodingUrl: frontendUrl, // KVC: Export name updated
    kaliVibeCodingEnv: environmentVariables // KVC: Export name updated
};
