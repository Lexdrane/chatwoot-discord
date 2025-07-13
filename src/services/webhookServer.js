const express = require('express');
const { config } = require('../config');

class WebhookServer {
  constructor(discordBot) {
    this.app = express();
    this.discordBot = discordBot;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
  }

  setupRoutes() {
    this.app.post('/webhook', async (req, res) => {
      try {
        // console.log('[Webhook IN] Received webhook. Body:', JSON.stringify(req.body, null, 2));
        
        const event = req.body.event;
        const messageType = req.body.message_type;
        const isPrivate = req.body.private === true;

        // if (event === 'message_created' && messageType === 'outgoing' && !isPrivate) {
        //   await this.handleOutgoingMessage(req.body);
        // } else if (event === 'conversation_status_changed') {
        //   console.log(`[Webhook Info] Conversation status changed: ${req.body.status}`);
        // } else {
        //   console.log(`[Webhook Skip] Ignoring event: ${event}, messageType: ${messageType}, private: ${isPrivate}`);
        // }
        
        res.status(200).json({ status: 'success' });
      } catch (error) {
        console.error('[Webhook Error] Error processing webhook:', error, error.stack);
        res.status(500).json({ status: 'error', message: error.message });
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
  }

  async handleOutgoingMessage(webhookBody) {
    const chatwootTextContent = webhookBody.content;
    const chatwootConversationId = webhookBody.conversation.id;
    const chatwootAttachments = webhookBody.attachments || [];

    // if (!chatwootTextContent && chatwootAttachments.length === 0) {
    //   console.log('[Webhook Skip] No content or attachments in the outgoing message from Chatwoot. Ignoring.');
    //   return;
    // }

    // console.log(`[Webhook Process] Chatwoot (Agent) -> Discord. Conv ID ${chatwootConversationId}. Text: "${chatwootTextContent}". Attachments from Chatwoot: ${chatwootAttachments.length}`);

    // Find Discord user ID from conversation mapping
    let discordUserId = null;
    const userConversations = this.discordBot.getUserConversations();
    
    for (const [id, details] of userConversations.entries()) {
      if (details.conversationId === chatwootConversationId) {
        discordUserId = id;
        break;
      }
    }

    if (!discordUserId) {
      console.warn(`[Webhook Skip] Could not find Discord user mapping for Chatwoot conversation ID ${chatwootConversationId}. Message not relayed.`);
      return;
    }

    const discordMessagePayload = {};
    const filesToSendToDiscord = [];

    if (chatwootTextContent) {
      discordMessagePayload.content = chatwootTextContent;
    }

    if (chatwootAttachments.length > 0) {
      for (const att of chatwootAttachments) {
        const imageUrl = att.file_url || att.data_url;
        if (imageUrl) {
          // console.log(`[Webhook Relay] Adding attachment for Discord (will be uploaded by Discord): ${imageUrl}`);
          filesToSendToDiscord.push(imageUrl);
        } else {
          console.warn(`[Webhook Relay] Chatwoot attachment missing usable URL: ${JSON.stringify(att)}`);
          if (!discordMessagePayload.content) discordMessagePayload.content = "";
          discordMessagePayload.content += `\n(Chatwoot sent a file: ${att.filename || 'unknown file'}, but its URL is inaccessible)`;
        }
      }
    }

    if (filesToSendToDiscord.length > 0) {
      discordMessagePayload.files = filesToSendToDiscord;
    }

    if (discordMessagePayload.content || (discordMessagePayload.files && discordMessagePayload.files.length > 0)) {
      const success = await this.discordBot.sendMessageToUser(discordUserId, discordMessagePayload);
      if (success) {
        console.log(`[Webhook Relay Success] Sent reply (Text: ${!!discordMessagePayload.content}, Files: ${filesToSendToDiscord.length}) to Discord user.`);
      }
    } else {
      console.log(`[Webhook Relay Skip] No text content or processable files to send to Discord user.`);
    }
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(config.webhook.port, () => {
        console.log(`Webhook server listening on http://localhost:${config.webhook.port}/webhook`);
        console.log(`Health check available at http://localhost:${config.webhook.port}/health`);
        resolve();
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = WebhookServer;