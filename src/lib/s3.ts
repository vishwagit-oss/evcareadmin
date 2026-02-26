import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION ?? "us-east-2";
const bucket = process.env.EVCARE_S3_BUCKET ?? "evcare-reports";

export const s3Client = new S3Client({ region });

export async function uploadReport(
  key: string,
  body: string | Buffer,
  contentType = "text/csv"
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3Client.send(command);
  return `s3://${bucket}/${key}`;
}
