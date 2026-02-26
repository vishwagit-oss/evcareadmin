/**
 * EVCare Admin - AWS resource checker
 * Verifies that expected AWS resources exist in your account.
 *
 * Usage:
 *   node scripts/check-aws-resources.js
 *
 * Loads .env.local (or .env) for AWS_REGION and resource names.
 * Uses default credential chain (env vars, ~/.aws/credentials, IAM role).
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const region = process.env.AWS_REGION || "us-east-2";

const expected = {
  cognitoUserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "your_user_pool_id",
  cognitoClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "your_public_client_id",
  s3Bucket: process.env.EVCARE_S3_BUCKET || "evcare-reports",
  sesFrom: process.env.EVCARE_ALERT_FROM || "noreply@evcare.local",
  secretName: process.env.EVCARE_SECRET_NAME || "evcare/production/config",
  logGroup: process.env.EVCARE_LOG_GROUP || "/evcare/admin",
  logStream: process.env.EVCARE_LOG_STREAM || "api",
};

function ok(name, found, detail = "") {
  console.log(`  ✅ ${name}${detail ? ` (${detail})` : ""}`);
}

function fail(name, reason) {
  console.log(`  ❌ ${name}: ${reason}`);
}

function section(title) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

async function checkS3() {
  section("S3 Bucket");
  try {
    const { S3Client, HeadBucketCommand, ListBucketsCommand } = require("@aws-sdk/client-s3");
    const client = new S3Client({ region });
    await client.send(new HeadBucketCommand({ Bucket: expected.s3Bucket }));
    ok("Bucket exists", true, expected.s3Bucket);
  } catch (e) {
    if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) {
      fail("Bucket", `"${expected.s3Bucket}" not found. Create it in S3 or set EVCARE_S3_BUCKET.`);
    } else {
      fail("S3", e.message || String(e));
    }
  }
}

async function checkSES() {
  section("SES (Email)");
  try {
    const { SESClient, GetAccountSendingEnabledCommand, ListIdentitiesCommand } = require("@aws-sdk/client-ses");
    const client = new SESClient({ region });
    await client.send(new GetAccountSendingEnabledCommand({}));
    ok("SES account accessible", true);

    const list = await client.send(new ListIdentitiesCommand({ IdentityType: "EmailAddress" }));
    const emails = list.Identities || [];
    const from = expected.sesFrom;
    if (emails.length === 0) {
      console.log(`  ⚠️  No verified email identities. Add and verify "${from}" in SES.`);
    } else if (!emails.includes(from)) {
      console.log(`  ⚠️  EVCARE_ALERT_FROM "${from}" not in verified emails. Verified: ${emails.join(", ")}`);
    } else {
      ok("Alert from address verified", true, from);
    }
  } catch (e) {
    fail("SES", e.message || String(e));
  }
}

async function checkSecretsManager() {
  section("Secrets Manager");
  try {
    const {
      SecretsManagerClient,
      GetSecretValueCommand,
      DescribeSecretCommand,
    } = require("@aws-sdk/client-secrets-manager");
    const client = new SecretsManagerClient({ region });
    await client.send(new DescribeSecretCommand({ SecretId: expected.secretName }));
    ok("Secret exists", true, expected.secretName);
  } catch (e) {
    if (e.name === "ResourceNotFoundException") {
      console.log(`  ⚠️  Secret "${expected.secretName}" not found. Optional; app falls back to env.`);
    } else {
      fail("Secrets Manager", e.message || String(e));
    }
  }
}

async function checkCloudWatch() {
  section("CloudWatch Logs");
  try {
    const {
      CloudWatchLogsClient,
      DescribeLogGroupsCommand,
      DescribeLogStreamsCommand,
    } = require("@aws-sdk/client-cloudwatch-logs");
    const client = new CloudWatchLogsClient({ region });
    const groups = await client.send(
      new DescribeLogGroupsCommand({ logGroupNamePrefix: expected.logGroup })
    );
    const found = (groups.logGroups || []).find((g) => g.logGroupName === expected.logGroup);
    if (found) {
      ok("Log group exists", true, expected.logGroup);
      const streams = await client.send(
        new DescribeLogStreamsCommand({
          logGroupName: expected.logGroup,
          logStreamNamePrefix: expected.logStream,
        })
      );
      const streamFound = (streams.logStreams || []).some(
        (s) => s.logStreamName === expected.logStream
      );
      if (streamFound) {
        ok("Log stream exists", true, expected.logStream);
      } else {
        console.log(`  ⚠️  Log stream "${expected.logStream}" not found. App will create it on first log.`);
      }
    } else {
      console.log(`  ⚠️  Log group "${expected.logGroup}" not found. App will create it on first log.`);
    }
  } catch (e) {
    fail("CloudWatch Logs", e.message || String(e));
  }
}

async function checkCognito() {
  section("Cognito User Pool");
  try {
    const { CognitoIdentityProviderClient, DescribeUserPoolCommand } = require("@aws-sdk/client-cognito-identity-provider");
    const client = new CognitoIdentityProviderClient({ region });
    const poolId = expected.cognitoUserPoolId;
    if (!poolId || poolId === "your_user_pool_id") {
      fail("Cognito", "NEXT_PUBLIC_COGNITO_USER_POOL_ID not set in .env.local");
      return;
    }
    await client.send(new DescribeUserPoolCommand({ UserPoolId: poolId }));
    ok("User pool exists", true, poolId);

    const { DescribeUserPoolClientCommand } = require("@aws-sdk/client-cognito-identity-provider");
    const clientId = expected.cognitoClientId;
    if (!clientId || clientId === "your_public_client_id") {
      console.log("  ⚠️  NEXT_PUBLIC_COGNITO_CLIENT_ID not set.");
      return;
    }
    const { UserPoolClient } = await client.send(
      new DescribeUserPoolClientCommand({ UserPoolId: poolId, ClientId: clientId })
    );
    if (UserPoolClient) {
      ok("App client exists", true, clientId);
    } else {
      fail("App client", `Client ${clientId} not found in pool ${poolId}`);
    }
  } catch (e) {
    if (e.name === "ResourceNotFoundException") {
      fail("Cognito", `User pool "${expected.cognitoUserPoolId}" not found.`);
    } else {
      fail("Cognito", e.message || String(e));
    }
  }
}

async function main() {
  console.log("\nEVCare Admin – AWS resource check");
  console.log("Region:", region);
  console.log("Expected values from .env.local / .env:");
  console.log("  S3 bucket:", expected.s3Bucket);
  console.log("  SES from:", expected.sesFrom);
  console.log("  Secret:", expected.secretName);
  console.log("  Log group/stream:", expected.logGroup, "/", expected.logStream);
  console.log("  Cognito pool:", expected.cognitoUserPoolId);
  console.log("  Cognito client:", expected.cognitoClientId);

  await checkS3();
  await checkSES();
  await checkSecretsManager();
  await checkCloudWatch();

  try {
    require("@aws-sdk/client-cognito-identity-provider");
    await checkCognito();
  } catch (e) {
    section("Cognito User Pool");
    if (e.code === "MODULE_NOT_FOUND" || e.message?.includes("Cannot find module")) {
      console.log("  ⚠️  Install to check Cognito: npm i @aws-sdk/client-cognito-identity-provider");
      console.log("  Or run: aws cognito-idp list-user-pools --region " + region);
    } else {
      fail("Cognito", e.message || String(e));
    }
  }

  section("Database (RDS)");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("  ⚠️  DATABASE_URL not set. Set it for RDS connection.");
  } else {
    const safe = dbUrl.replace(/:[^:@]+@/, ":****@");
    console.log("  ℹ️  DATABASE_URL is set (host hidden):", safe.split("@")[1] || "***");
    console.log("     Test connection: npm run db:init (or connect with psql).");
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
