const { google } = require("googleapis");
require("dotenv").config();

const gmail = google.gmail("v1");
const OAuth2 = google.auth.OAuth2;

// Set up OAuth2 Client
const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

async function fetchUnreadEmails() {
  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
      auth: oauth2Client,
    });

    if (!response.data.messages) return [];

    // Fetch full email content
    const emails = await Promise.all(
      response.data.messages.map(async (msg) => {
        const emailData = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          auth: oauth2Client,
        });

        const headers = emailData.data.payload.headers;
        const sender = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
        const bodyData = emailData.data.payload?.body?.data;
        const body = bodyData ? Buffer.from(bodyData, "base64").toString() : "No Content";

        return { id: msg.id, sender, body };
      })
    );

    return emails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    return [];
  }
}

async function deleteEmail(emailId) {
  try {
    await gmail.users.messages.delete({
      userId: "me",
      id: emailId,
      auth: oauth2Client,
    });
  } catch (error) {
    console.error(`Failed to delete email (${emailId}):`, error);
  }
}

module.exports = { fetchUnreadEmails, deleteEmail };
