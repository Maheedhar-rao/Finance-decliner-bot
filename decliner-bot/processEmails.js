const { fetchUnreadEmails, deleteEmail } = require("./gmailClient");
const supabase = require("./supabaseClient");
const { OpenAI } = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function processEmails() {
  console.log("🔄 Checking for new unread emails...");

  const emails = await fetchUnreadEmails();
  if (emails.length === 0) {
    console.log("✅ No new unread emails.");
    return;
  }

  for (const email of emails) {
    console.log(`📩 Processing email from ${email.sender}...`);

    try {
      // ✅ Step 1: Ask OpenAI Assistant (Decliner)
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
        console.log("✅ Decline saved successfully!");
      }

      // ✅ Step 3: Delete processed email
      await deleteEmail(email.id);
    } catch (error) {
      console.error(`❌ Error processing email from ${email.sender}:`, error);
    }
  }
}

module.exports = processEmails;
