![Discord X Chatwoot](https://i.imgur.com/8VMIBrw.png)

This project provides an advanced integration between Discord and Chatwoot, allowing direct messages from Discord users to be routed to Chatwoot as conversations, and replies from Chatwoot agents to be sent back to the Discord users. It supports both text messages and attachments.

## Features

  * **Discord to Chatwoot (DM)**:
      * Creates a new Chatwoot contact and conversation for a Discord user on their first direct message (DM) to the bot.
      * Sends subsequent DMs (text and attachments) from the Discord user to the associated Chatwoot conversation.
      * **Advanced Attachment Handling**: Prioritizes direct file uploads to Chatwoot's standard API if `CHATWOOT_ACCOUNT_ID` is configured. Falls back to sending attachment URLs if direct upload fails or `CHATWOOT_ACCOUNT_ID` is not set.
  * **Chatwoot to Discord (Webhook)**:
      * Relays outgoing messages from Chatwoot conversations back to the corresponding Discord user's DMs.
      * Supports text content and attachments from Chatwoot.
  * **Error Handling**: Robust error logging for API calls and Discord operations.
  * **Presence Management**: Sets a custom playing status for the Discord bot.

## Prerequisites

Before you begin, ensure you have the following:

  * **Node.js**: Version 16.x or higher.
  * **npm**: Node package manager, usually installed with Node.js.
  * **A Discord Bot**: With `Message Content Intent` enabled in your Discord Developer Portal.
  * **A Chatwoot Instance**: Self-hosted or Cloud.
  * **Chatwoot Inbox**: An API Inbox configured in your Chatwoot instance.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Lexdrane/chatwoot-discord/
    cd chatwoot-discord
    ```

2.  **Install npm packages:**

    ```bash
    npm install discord.js axios dotenv express form-data
    ```

3.  **Create a `.env` file** in the root directory of your project and populate it with your environment variables:

    ```env
    DISCORD_BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN"
    CHATWOOT_BASE_URL="YOUR_CHATWOOT_INSTANCE_URL"
    CHATWOOT_API_ACCESS_TOKEN="YOUR_CHATWOOT_GLOBAL_API_ACCESS_TOKEN"
    CHATWOOT_INBOX_IDENTIFIER="YOUR_CHATWOOT_INBOX_IDENTIFIER"
    CHATWOOT_ACCOUNT_ID="YOUR_CHATWOOT_ACCOUNT_ID"
    PORT=3000
    ```

      * `DISCORD_BOT_TOKEN`: Your Discord bot's token from the Discord Developer Portal.
      * `CHATWOOT_BASE_URL`: The URL of your Chatwoot instance (e.g., `https://app.chatwoot.com` or `https://your-self-hosted.com`).
      * `CHATWOOT_API_ACCESS_TOKEN`: A global API access token from your Chatwoot profile settings (`Settings` -\> `Profile Settings` -\> `Access Token`).
      * `CHATWOOT_INBOX_IDENTIFIER`: The identifier for your Chatwoot API inbox. You can find this in your Chatwoot inbox settings under `Configuration` -\> `API` -\> `Inbox Identifier`.
      * `CHATWOOT_ACCOUNT_ID` (Optional but Recommended for attachments): Your Chatwoot account ID. This is required for direct attachment uploads to Chatwoot's standard API. You can find it in the URL when you're logged into Chatwoot (e.g., `https://app.chatwoot.com/app/accounts/YOUR_ACCOUNT_ID/inboxes`). If not provided, attachments will be sent as URLs.
      * `PORT`: The port your webhook server will listen on (default: `3000`).

## Running the Bot

To start the bot, run the following command:

```bash
node index.js
```

The bot will connect to Discord, and the webhook server will start listening on the configured port.

## Chatwoot Webhook Configuration

For Chatwoot to send messages back to Discord, you need to configure a webhook in your Chatwoot inbox.

1.  Go to your Chatwoot instance.
2.  Navigate to `Settings` -\> `Inboxes`.
3.  Select the API inbox you are using for this integration.
4.  Go to `Webhooks` -\> `Add Webhook`.
5.  **Payload URL**: Enter the URL where your bot's webhook server is accessible.
      * If running locally for testing, you'll need a tunneling service like `ngrok`. For example, if your bot is running on `localhost:3000`, and `ngrok` gives you `https://your-ngrok-id.ngrok-free.app`, your Payload URL would be `https://your-ngrok-id.ngrok-free.app/webhook`.
      * In a production environment, this would be your server's public IP or domain name followed by `/webhook` (e.g., `https://your-domain.com/webhook`).
6.  **Webhook Events**: Select `message_created` and `conversation_status_changed`.
7.  Click `Create Webhook`.

-----

# Tutorial: Setting up Your Discord-Chatwoot Integration Bot

This tutorial will walk you through the process of setting up and running your Discord-Chatwoot integration bot.

## Step 1: Prepare Your Discord Bot

1.  **Create a New Application**: Go to the [Discord Developer Portal](https://discord.com/developers/applications).
      * Click "New Application".
      * Give it a name (e.g., "Support Bot") and click "Create".
2.  **Create a Bot User**:
      * In your application, go to "Bot" on the left sidebar.
      * Click "Add Bot" and confirm.
      * **IMPORTANT**: Under "Privileged Gateway Intents", enable **"Message Content Intent"**. This is crucial for your bot to read message content.
      * Copy your **Bot Token**. You'll need this for your `.env` file. Keep it secret\!
3.  **Invite Your Bot to Your Server**:
      * Go to "OAuth2" -\> "URL Generator".
      * Under "Scopes", select `bot`.
      * Under "Bot Permissions", select `Send Messages` and `Read Message History`.
      * Copy the generated URL and paste it into your browser to invite the bot to your Discord server.

## Step 2: Prepare Your Chatwoot Instance

1.  **Access Chatwoot**: Log in to your Chatwoot instance (e.g., `https://app.chatwoot.com` or your self-hosted URL).
2.  **Get Account ID**: Your Account ID is visible in the URL when you are logged in. For example, if your URL is `https://app.chatwoot.com/app/accounts/123/dashboard`, then `123` is your `CHATWOOT_ACCOUNT_ID`. Note this down.
3.  **Create an API Inbox**:
      * Go to `Settings` -\> `Inboxes` -\> `Add Inbox`.
      * Choose "API" as the channel type.
      * Give it a name (e.g., "Discord Support").
      * Note down the **Inbox Identifier**. This is your `CHATWOOT_INBOX_IDENTIFIER`.
      * Select agents who should handle conversations from this inbox.
4.  **Generate an API Access Token**:
      * Go to `Settings` -\> `Profile Settings` -\> `Access Token`.
      * Copy the existing token or generate a new one if you don't have one. This is your `CHATWOOT_API_ACCESS_TOKEN`.


## Step 3: Run and Test Locally

1.  **Start the Bot**:

    ```bash
    node index.js
    ```

    You should see console messages indicating the bot is connected to Discord and the webhook server is listening.

2.  **Expose Your Local Server (for Webhooks)**:
    Since Chatwoot needs to send webhooks to your local machine, you'll need a tunneling service like `ngrok`.

      * Download `ngrok` from their [official website](https://ngrok.com/download).
      * Run `ngrok` in your terminal, targeting the port your bot's webhook server is listening on (default `3000`):
        ```bash
        ngrok http 3000
        ```
      * `ngrok` will provide you with a public URL (e.g., `https://abcdef.ngrok-free.app`). Copy this URL.

3.  **Configure Chatwoot Webhook**:

      * Go back to your Chatwoot instance -\> `Settings` -\> `Inboxes`.
      * Select your "Discord Support" API inbox.
      * Go to `Webhooks` -\> `Add Webhook`.
      * **Payload URL**: Paste the `ngrok` URL you copied, followed by `/webhook`. For example: `https://abcdef.ngrok-free.app/webhook`.
      * **Webhook Events**: Check `message_created` and `conversation_status_changed`.
      * Click `Create Webhook`.

-----
