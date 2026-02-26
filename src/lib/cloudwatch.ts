import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const region = process.env.AWS_REGION ?? "us-east-2";
const logGroup = process.env.EVCARE_LOG_GROUP ?? "/evcare/admin";
const logStream = process.env.EVCARE_LOG_STREAM ?? "api";

let client: CloudWatchLogsClient | null = null;

function getClient() {
  if (!client) client = new CloudWatchLogsClient({ region });
  return client;
}

export async function logEvent(
  message: string,
  level: "info" | "warn" | "error" = "info",
  meta?: Record<string, unknown>
) {
  if (!process.env.AWS_REGION) {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      JSON.stringify({ message, ...meta })
    );
    return;
  }
  try {
    const cw = getClient();
    const ts = Date.now();
    const event = {
      message: JSON.stringify({ level, message, ...meta }),
      timestamp: ts,
    };
    await cw.send(
      new PutLogEventsCommand({
        logGroupName: logGroup,
        logStreamName: logStream,
        logEvents: [event],
      })
    );
  } catch (err) {
    console.warn("CloudWatch log failed:", err);
    console.log(JSON.stringify({ level, message, ...meta }));
  }
}

export async function ensureLogGroupAndStream() {
  if (!process.env.AWS_REGION) return;
  try {
    const cw = getClient();
    await cw.send(new CreateLogGroupCommand({ logGroupName: logGroup }));
  } catch {}
  try {
    const cw = getClient();
    await cw.send(
      new CreateLogStreamCommand({
        logGroupName: logGroup,
        logStreamName: logStream,
      })
    );
  } catch {}
}
