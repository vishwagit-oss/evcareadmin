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

const adminEmail = () => process.env.EVCARE_ADMIN_EMAIL ?? "vishwagohil21@gmail.com";
const appName = "EVCare Admin";
const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Notify main admin that a new user verified email and is awaiting approval. */
export async function sendNewUserPendingEmailToAdmin(user: { email: string; name?: string }): Promise<boolean> {
  try {
    const to = adminEmail();
    const subject = `${appName}: New user awaiting approval - ${user.email}`;
    const body = [
      `A new user has verified their email and is waiting for approval.`,
      ``,
      `Email: ${user.email}`,
      `Name: ${user.name ?? "—"}`,
      ``,
      `Log in to the admin dashboard and approve or reject this user.`,
      baseUrl,
    ].join("\n");
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    });
    await sesClient.send(command);
    return true;
  } catch (err) {
    console.error("SES send (admin notify) failed:", err);
    return false;
  }
}

/** Notify user that their account has been approved and they can log in. */
export async function sendApprovedEmailToUser(toEmail: string, name?: string): Promise<boolean> {
  try {
    const subject = `${appName}: Your account has been approved`;
    const body = [
      name ? `Hi ${name},` : "Hi,",
      ``,
      `Your ${appName} account has been approved. You can log in now.`,
      ``,
      `Log in: ${baseUrl}/login`,
      ``,
      `— ${appName}`,
    ].join("\n");
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    });
    await sesClient.send(command);
    return true;
  } catch (err) {
    console.error("SES send (user approved) failed:", err);
    return false;
  }
}
