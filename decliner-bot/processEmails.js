const supabase = require("./supabaseClient");
const { OpenAI } = require("openai");
const fs = require("fs");
const path = require("path");
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
    console.log(`📩 Processing test email from ${email.id}...`);

    try {
      // ✅ Step 1: Send Plain Text Email Content to OpenAI Assistant
      const thread = await openai.beta.threads.create();
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `Analyze the following email and extract details: 

        ${email.body}
        
        Return the response as JSON with fields: "lender_name", "lender_email", "business_name", and "decline_reason". Ensure correct formatting.`,
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: process.env.ASSISTANT_ID,
      });

      // ✅ Wait for OpenAI response
      let status = "in_progress";
      while (status !== "completed") {
        await new Promise((r) => setTimeout(r, 2000));
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        status = runStatus.status;
      }

      // ✅ Get response from OpenAI
      const messages = await openai.beta.threads.messages.list(thread.id);
      const aiResponse = messages.data[0].content[0].text.value;
      const parsedData = JSON.parse(aiResponse.replace(/```json|```/g, "").trim());

      console.log("🤖 OpenAI Response:", parsedData);

      // ✅ Step 2: Handle Null Values
      const businessName = parsedData.business_name || "Unknown Business";
      const lenderName = parsedData.lender_name || "Unknown Lender";
      //const lenderEmail = parsedData.lender_email || "unknown@example.com";
      const declineReason = parsedData.decline_reason || "No reason provided";

      // ✅ Step 3: Insert into Supabase
      const { data, error } = await supabase.from("declines").insert([
        {
          business_name: businessName,
          lender_names: lenderName, // Ensure it's a single string
         // lender_email: lenderEmail,
          reason: declineReason,
        }
      ]);

      if (error) {
        console.error("❌ Supabase Insert Failed:", error);
      } else {
        console.log("✅ Decline saved successfully in Supabase!", data);
      }

    } catch (error) {
      console.error(`❌ Error processing email ${email.id}:`, error);
    }
  }
}

module.exports = processEmails;
