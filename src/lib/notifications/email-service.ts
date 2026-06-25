/**
 * Placeholder service for future email notifications.
 * Ready for SMTP, Resend, or SendGrid integrations.
 */
export async function sendEmailNotification(userId: string, subject: string, body: string): Promise<boolean> {
  console.log(`[Email Placeholder] Preparing to send email to user ${userId}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  return true;
}
