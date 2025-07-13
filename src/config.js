require('dotenv').config();

const config = {
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN,
    status: {
      message: process.env.DISCORD_BOT_STATUS_MESSAGE,
      type: process.env.DISCORD_BOT_STATUS_TYPE
    }
  },
  chatwoot: {
    baseUrl: process.env.CHATWOOT_BASE_URL,
    apiAccessToken: process.env.CHATWOOT_API_ACCESS_TOKEN,
    inboxIdentifier: process.env.CHATWOOT_INBOX_IDENTIFIER,
    accountId: process.env.CHATWOOT_ACCOUNT_ID
  },
  webhook: {
    port: process.env.WEBHOOK_PORT || 3000
  }
};

// Validate required environment variables
function validateConfig() {
  const requiredVars = [
    'DISCORD_BOT_TOKEN',
    'CHATWOOT_BASE_URL',
    'CHATWOOT_API_ACCESS_TOKEN',
    'CHATWOOT_INBOX_IDENTIFIER',
    'DISCORD_BOT_STATUS_MESSAGE',
    'DISCORD_BOT_STATUS_TYPE',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error("FATAL ERROR: Missing required environment variables:");
    missing.forEach(varName => console.error(`  - ${varName}`));
    
    console.log("\nEnvironment variables status:");
    console.log("DISCORD_BOT_TOKEN:", config.discord.botToken ? "Defined" : "MISSING");
    console.log("CHATWOOT_BASE_URL:", config.chatwoot.baseUrl ? "Defined" : "MISSING");
    console.log("CHATWOOT_API_ACCESS_TOKEN:", config.chatwoot.apiAccessToken ? "Defined" : "MISSING");
    console.log("CHATWOOT_INBOX_IDENTIFIER:", config.chatwoot.inboxIdentifier ? "Defined" : "MISSING");
    
    if (!config.chatwoot.accountId) {
      console.warn("WARNING: CHATWOOT_ACCOUNT_ID is not defined. Direct image upload to Chatwoot will be disabled; image URLs will be sent instead.");
    }
    
    process.exit(1);
  }
}

module.exports = {
  config,
  validateConfig
};