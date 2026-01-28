import twilio from 'twilio';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string[];
}

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  const client = await getTwilioClient();
  const fromNumber = await getTwilioFromPhoneNumber();
  
  const formattedTo = message.to.startsWith('whatsapp:') 
    ? message.to 
    : `whatsapp:${message.to.startsWith('+') ? message.to : '+55' + message.to.replace(/\D/g, '')}`;
  
  const formattedFrom = fromNumber?.startsWith('whatsapp:') 
    ? fromNumber 
    : `whatsapp:${fromNumber}`;

  const messageOptions: any = {
    from: formattedFrom,
    to: formattedTo,
    body: message.body,
  };

  if (message.mediaUrl && message.mediaUrl.length > 0) {
    messageOptions.mediaUrl = message.mediaUrl;
  }

  return client.messages.create(messageOptions);
}

export async function sendBulkWhatsAppMessages(messages: WhatsAppMessage[]) {
  const results = [];
  for (const message of messages) {
    try {
      const result = await sendWhatsAppMessage(message);
      results.push({ success: true, to: message.to, sid: result.sid });
    } catch (error: any) {
      results.push({ success: false, to: message.to, error: error.message });
    }
  }
  return results;
}
