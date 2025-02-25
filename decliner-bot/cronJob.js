const cron = require("node-cron");
const processEmails = require("./processEmails");

console.log("🕒 Decliner Bot cron job started...");

// Run processEmails every 2 minutes
cron.schedule("*/2 * * * *", async () => {
  await processEmails();
});
