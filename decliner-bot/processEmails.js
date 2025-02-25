const fs = require("fs");
const path = require("path");
const supabase = require("./supabaseClient");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function processEmails() {
  console.log("🔄 Running test classification using test file...");

  // ✅ Load test emails from file
  const filePath = path.join(__dirname, "test_emails.json");
  const testEmails = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  if (testEmails.length === 0) {
    console.log("✅ No test emails found.");
    return;
  }

  for (const email of testEmails) {
    console.log(`📩 Processing test email from ${email.sender}...`);

    try {
      // ✅ Step 1: Send Email to OpenAI Assistant (Decliner)
      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(thread.id, { role: "user", content: email.body });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: process.env.ASSISTANT_ID,
      });

      // Wait for completion
      let status = "in_progress";
      while (status !== "completed") {
        await new Promise((r) => setTimeout(r, 2000));
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        status = runStatus.status;
      }

      // Get response from Decliner
      const messages = await openai.beta.threads.messages.list(thread.id);
      const aiResponse = messages.data[0].content[0].text.value;
      const parsedData = JSON.parse(aiResponse.replace(/```json|```/g, "").trim());

      console.log("🤖 OpenAI Response:", parsedData);

      // ✅ Step 2: Store in Supabase
      const { error } = await supabase.from("declines").insert([
        {
          business_name: parsedData.business_name,
          lender_names: parsedData.lender_names.join(", "), // Convert array to string
          reason: parsedData.decline_reason,
        },
      ]);

      if (error) {
        console.error("❌ Failed to save decline:", error);
      } else {
        console.log("✅ Test classification saved successfully!");
      }

    } catch (error) {
      console.error(`❌ Error processing test email:`, error);
    }
  }
}

module.exports = processEmails;

