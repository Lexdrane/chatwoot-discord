const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const { config } = require('../config');
const { logAttachmentInfo } = require('../utils');
const { 
  createContactAndConversation,
  sendMessageToChatwootPublicAPI,
  uploadAttachmentToChatwootStandardAPI
} = require('./chatwootService');

class DiscordBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message]
    });

    this.userConversations = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`Connected to Discord as ${this.client.user.tag}`);
      console.log(`Chatwoot integration configuration:`);
      console.log(`  Base URL: ${config.chatwoot.baseUrl}`);
      console.log(`  Inbox Identifier: ${config.chatwoot.inboxIdentifier}`);
      console.log(`  Account ID for upload: ${config.chatwoot.accountId || "Not configured"}`);
      console.log(`  Webhook server will run on port: ${config.webhook.port}`);

      // Set bot status
      this.client.user.setPresence({
        activities: [{ 
          name: config.discord.status.message, 
          type: ActivityType[config.discord.status.type] 
        }],
        status: 'online',
      });
      console.log(`Discord bot status set to "Playing ${config.discord.status.message}"`);
    });

    this.client.on('messageCreate', async (message) => {
      try {
        if (message.author.bot) return;
        if (!message.guild) {
          const attachmentInfo = logAttachmentInfo(message.attachments, message.author.username);
          console.log(`[Discord IN] DM received from ${message.author.username} (${message.author.id}): "${message.content}"${attachmentInfo}`);
          await this.handleDirectMessage(message);
        }
      } catch (error) {
        console.error('[Discord IN Error] Error in messageCreate handler:', error);
      }
    });
  }

  async handleDirectMessage(message) {
    const userId = message.author.id;
    const username = message.author.username;
    const textContent = message.content;
    const discordAttachments = message.attachments;

    if (!textContent && discordAttachments.size === 0) {
      console.log(`[Empty Message] Empty message ignored from ${username} (${userId}).`);
      return;
    }

    let conversationDetails = this.userConversations.get(userId);

    if (!conversationDetails) {
      console.log(`[Chatwoot Session] No existing session for ${username} (${userId}). Attempting to create...`);
      try {
        conversationDetails = await createContactAndConversation(userId, username);
        this.userConversations.set(userId, conversationDetails);
        console.log(`[Chatwoot Session] Session created successfully for ${username} (${userId}). Details:`, conversationDetails);
      } catch (error) {
        console.error(`[Chatwoot Session Error] Failed to establish Chatwoot session for ${username} (${userId}). Error: ${error.message}`);
        message.reply("I couldn't connect to our support system at the moment. Please try again in a few moments. If the problem persists, please notify an administrator.").catch(console.error);
        return;
      }
    }

    if (!conversationDetails || !conversationDetails.conversationId) {
      console.error(`[Chatwoot Session Error] Invalid conversation details for ${username} (${userId}) after creation attempt.`);
      message.reply("An unexpected problem occurred with the support system connection. Please try again later.").catch(console.error);
      return;
    }

    // Send text content if it exists via public client API
    if (textContent) {
      console.log(`[Chatwoot Message] Forwarding text from ${username} to Chatwoot conv ${conversationDetails.conversationId}: "${textContent}"`);
      try {
        await sendMessageToChatwootPublicAPI(
          conversationDetails.sourceId,
          conversationDetails.conversationId,
          textContent
        );
      } catch (error) {
        console.error(`[Chatwoot Message Error] Failed to send text message for ${username} to Chatwoot. Error: ${error.message}`);
        message.reply("I couldn't forward your text message to our support team. Please try resending it.").catch(console.error);
        // Continue to try sending attachments even if text fails
      }
    }

    // Handle attachments (attempt direct upload if possible)
    if (discordAttachments.size > 0) {
      console.log(`[Discord Attachments] ${discordAttachments.size} attachment(s) detected from ${username}.`);
      for (const attachment of discordAttachments.values()) {
        if (config.chatwoot.accountId) {
          // Attempt direct upload if CHATWOOT_ACCOUNT_ID is configured
          try {
            console.log(`[Chatwoot Upload] Attempting direct upload of ${attachment.name} (${attachment.url})`);
            await uploadAttachmentToChatwootStandardAPI(conversationDetails, attachment);
            console.log(`[Chatwoot Upload SUCCESS] ${attachment.name} uploaded to conversation ${conversationDetails.conversationId}.`);
          } catch (uploadError) {
            console.error(`[Chatwoot Upload Failed] Direct upload failed for ${attachment.name}. Error: ${uploadError.message}. Sending URL as fallback.`);
            // Fallback: send attachment URL via public client API
            const fallbackContent = `User attachment (${attachment.name}): ${attachment.url}`;
            try {
              await sendMessageToChatwootPublicAPI(conversationDetails.sourceId, conversationDetails.conversationId, fallbackContent);
            } catch (fallbackError) {
              console.error(`[Attachment Fallback Failed] Unable to send attachment URL for ${attachment.name}. Error: ${fallbackError.message}`);
              message.reply(`I couldn't upload your file or send its link. Please try again or contact an administrator if the problem persists.`).catch(console.error);
            }
          }
        } else {
          // If CHATWOOT_ACCOUNT_ID is not configured, send URL via public client API
          console.log(`[Chatwoot Attachment] CHATWOOT_ACCOUNT_ID not configured. Sending URL for ${attachment.name}`);
          const urlContent = `User sent a file (${attachment.name}): ${attachment.url}`;
          try {
            await sendMessageToChatwootPublicAPI(conversationDetails.sourceId, conversationDetails.conversationId, urlContent);
          } catch (error) {
            console.error(`[Attachment URL Send Error] Failed to send URL for ${attachment.name}. Error: ${error.message}`);
            message.reply(`I couldn't send the link for your file "${attachment.name}". Please try again.`).catch(console.error);
          }
        }
      }
    }
  }

  async sendMessageToUser(userId, messagePayload) {
    try {
      const user = await this.client.users.fetch(userId);
      if (!user) {
        console.warn(`[Discord Relay] Could not fetch Discord user ${userId}. Message not relayed.`);
        return false;
      }

      await user.send(messagePayload);
      console.log(`[Discord Relay Success] Sent reply to Discord user ${user.username}.`);
      return true;
    } catch (error) {
      console.error(`[Discord Relay Error] Failed to send message to Discord user ${userId}:`, error);
      if (error.code === 50007) {
        console.warn(`[Discord Relay Warning] Cannot send DM to ${userId}. User may have disabled DMs or blocked the bot.`);
      }
      return false;
    }
  }

  getUserConversations() {
    return this.userConversations;
  }

  async start() {
    try {
      await this.client.login(config.discord.botToken);
    } catch (error) {
      console.error("FATAL ERROR: Failed to connect to Discord.", error);
      process.exit(1);
    }
  }
}

module.exports = DiscordBot;