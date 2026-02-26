import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const region = process.env.AWS_REGION ?? "us-east-2";
const fromEmail = process.env.EVCARE_ALERT_FROM ?? "noreply@evcare.local";

export const sesClient = new SESClient({ region });

export async function sendBatteryAlertEmail(
  toEmail: string,
  vehicle: { vin: string; make: string; model: string; battery_health_score: number }
): Promise<boolean> {
  try {
    const subject = `EVCare: Battery health alert - ${vehicle.make} ${vehicle.model}`;
    const body = `Your vehicle (VIN: ${vehicle.vin}, ${vehicle.make} ${vehicle.model}) has battery health at ${vehicle.battery_health_score}%. Please consider maintenance or replacement.`;
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject },
        Body: {
          Text: { Data: body },
        },
      },
    });
    await sesClient.send(command);
    return true;
  } catch (err) {
    console.error("SES send failed:", err);
    return false;
  }
}
