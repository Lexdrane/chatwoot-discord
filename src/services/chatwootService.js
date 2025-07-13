const axios = require('axios');
const FormData = require('form-data');
const { config } = require('../config');
const { handleAxiosError, truncateString } = require('../utils');

/**
 * Create or retrieve a contact and conversation in Chatwoot
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 * @returns {Object} - Contact and conversation details
 */
async function createContactAndConversation(userId, username) {
  const contactApiUrl = `${config.chatwoot.baseUrl}/public/api/v1/inboxes/${config.chatwoot.inboxIdentifier}/contacts`;
  // console.log(`[API Call] Attempting to create/get Chatwoot contact. URL: ${contactApiUrl}`);

  let contactResponseData;
  try {
    const contactResponse = await axios({
      method: 'post',
      url: contactApiUrl,
      headers: { 
        'Content-Type': 'application/json', 
        'api_access_token': config.chatwoot.apiAccessToken 
      },
      data: { 
        name: username, 
        identifier: userId, 
        email: `${userId}@discord.user.placeholder`, 
        additional_attributes: { 
          discord_id: userId, 
          discord_username: username, 
          platform: 'discord' 
        }
      }
    });
    contactResponseData = contactResponse.data;
    // console.log('[API Response] Chatwoot create contact raw response:', JSON.stringify(contactResponseData, null, 2));
  } catch (error) {
    console.error(`[API Error] Failed Chatwoot contact creation/retrieval for ${username} (${userId}).`);
    handleAxiosError(error, contactApiUrl);
    throw error;
  }

  const sourceId = contactResponseData.source_id;
  const contactId = contactResponseData.id;
  const pubsubToken = contactResponseData.pubsub_token;

  if (!sourceId || typeof contactId === 'undefined') {
    console.error('[API Parse Error] "source_id" or "id" missing from Chatwoot contact response.');
    throw new Error('Failed to parse required contact details (source_id, id) from Chatwoot contact response.');
  }
  // console.log(`[Chatwoot Contact] Details for ${username}: Global Contact ID: ${contactId}, Inbox Source ID: ${sourceId}, PubSub: ${pubsubToken}`);

  const conversationApiUrl = `${config.chatwoot.baseUrl}/public/api/v1/inboxes/${config.chatwoot.inboxIdentifier}/contacts/${sourceId}/conversations`;
  // console.log(`[API Call] Attempting to create Chatwoot conversation. URL: ${conversationApiUrl}`);
  
  let conversationResponseData;
  try {
    const conversationResponse = await axios({
      method: 'post',
      url: conversationApiUrl,
      headers: { 
        'Content-Type': 'application/json', 
        'api_access_token': config.chatwoot.apiAccessToken 
      }
    });
    conversationResponseData = conversationResponse.data;
    // console.log('[API Response] Chatwoot create conversation raw response:', JSON.stringify(conversationResponseData, null, 2));
  } catch (error) {
    console.error(`[API Error] Failed Chatwoot conversation creation for ${username} (${userId}), contact source_id ${sourceId}.`);
    handleAxiosError(error, conversationApiUrl);
    throw error;
  }

  let conversationId;
  if (conversationResponseData.payload && typeof conversationResponseData.payload.id !== 'undefined') {
    conversationId = conversationResponseData.payload.id;
  } else if (typeof conversationResponseData.id !== 'undefined') {
    conversationId = conversationResponseData.id;
  }

  if (typeof conversationId === 'undefined') {
    console.error('[API Parse Error] Conversation ID not found in Chatwoot conversation creation response.');
    throw new Error('Failed to parse conversation ID from Chatwoot response.');
  }
  // console.log(`[Chatwoot Conversation] Created for ${username} with Chatwoot Conversation ID: ${conversationId}`);

  return { sourceId, contactId, conversationId, pubsubToken };
}

/**
 * Send a text message to Chatwoot via public API
 * @param {string} contactSourceId - Contact source ID
 * @param {string} conversationId - Conversation ID
 * @param {string} content - Message content
 * @returns {Object} - API response data
 */
async function sendMessageToChatwootPublicAPI(contactSourceId, conversationId, content) {
  const messageApiUrl = `${config.chatwoot.baseUrl}/public/api/v1/inboxes/${config.chatwoot.inboxIdentifier}/contacts/${contactSourceId}/conversations/${conversationId}/messages`;
  
  let messageResponseData;
  try {
    const response = await axios({
      method: 'post',
      url: messageApiUrl,
      headers: { 
        'Content-Type': 'application/json', 
        'api_access_token': config.chatwoot.apiAccessToken 
      },
      data: { 
        content: content, 
        message_type: 'incoming' 
      }
    });
    messageResponseData = response.data;
    const createdMessageId = (messageResponseData.payload || messageResponseData).id;
    // console.log(`[Message Chatwoot (Public API) Sent] To conv ${conversationId}. Chatwoot Message ID: ${createdMessageId}. Content: "${truncateString(content)}"`);
    return messageResponseData;
  } catch (error) {
    console.error(`[Chatwoot Public API Error] Failed to send message to conversation ${conversationId}.`);
    handleAxiosError(error, messageApiUrl);
    throw error;
  }
}

/**
 * Upload an attachment to Chatwoot via standard API
 * @param {Object} conversationDetails - Conversation details
 * @param {Object} discordAttachment - Discord attachment object
 * @returns {Object} - API response data
 */
async function uploadAttachmentToChatwootStandardAPI(conversationDetails, discordAttachment) {
  if (!config.chatwoot.accountId) {
    throw new Error("CHATWOOT_ACCOUNT_ID is not configured for standard API upload.");
  }

  const apiUrl = `${config.chatwoot.baseUrl}/api/v1/accounts/${config.chatwoot.accountId}/conversations/${conversationDetails.conversationId}/messages`;
  // console.log(`[API Standard Upload] URL: ${apiUrl}, File: ${discordAttachment.name}`);

  // Download file from Discord
  const response = await axios({
    url: discordAttachment.url,
    method: 'GET',
    responseType: 'stream'
  });

  const formData = new FormData();
  formData.append('attachments[]', response.data, {
    filename: discordAttachment.name,
    contentType: discordAttachment.contentType,
  });
  formData.append('message_type', 'incoming');

  try {
    const uploadResponse = await axios.post(apiUrl, formData, {
      headers: {
        ...formData.getHeaders(),
        'api_access_token': config.chatwoot.apiAccessToken,
      },
    });
    // console.log('[API Standard Upload SUCCESS] Chatwoot response:', JSON.stringify(uploadResponse.data, null, 2).substring(0, 500));
    return uploadResponse.data;
  } catch (error) {
    console.error(`[Standard API Upload Error] Failed to upload ${discordAttachment.name}.`);
    handleAxiosError(error, apiUrl);
    throw error;
  }
}

module.exports = {
  createContactAndConversation,
  sendMessageToChatwootPublicAPI,
  uploadAttachmentToChatwootStandardAPI
};