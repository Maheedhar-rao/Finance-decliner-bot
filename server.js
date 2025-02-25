require("dotenv").config();
const express = require("express");
const processEmails = require("./decliner-bot/processEmails");
const supabase = require("./decliner-bot/supabaseClient");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ API to Manually Trigger the Decliner Bot
app.post("/api/run-decliner", async (req, res) => {
    try {
        await processEmails();
        res.json({ message: "Decliner Bot executed successfully!" });
    } catch (error) {
        console.error("Error running Decliner Bot:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ API to Fetch Declined Businesses from Supabase
app.get("/api/declined-businesses", async (req, res) => {
    try {
        const { data, error } = await supabase.from("declines").select("*");
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Error fetching declined businesses:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// ✅ Run Decliner Bot every 2 minutes
cron.schedule("*/2 * * * *", async () => {
  console.log("⏳ Running Decliner Bot...");
  await processEmails();
  console.log("✅ Decliner Bot Execution Completed!");
});

// ✅ Start Express Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
