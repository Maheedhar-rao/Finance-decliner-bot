require("dotenv").config();
const express = require("express");
const processEmails = require("./decliner-bot/processEmails");
const supabase = require("./decliner-bot/supabaseClient");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Required: Dummy Route (Render Needs an Open Port)
app.get("/", (req, res) => {
    res.send("✅ Decliner Bot is running on Render!");
});

// ✅ Run Decliner Bot Every 2 Minutes (Keeps Running in Background)
cron.schedule("*/2 * * * *", async () => {
  console.log("⏳ Running Decliner Bot...");
  try {
    await processEmails();
    console.log("✅ Decliner Bot Execution Completed!");
  } catch (error) {
    console.error("❌ Error in Decliner Bot:", error);
  }
});

// ✅ Start Express Server (Required for Render)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
