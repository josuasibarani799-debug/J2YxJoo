// Discord Bot Integration - Uses Replit Discord Connector
import { Client, GatewayIntentBits, Message, AttachmentBuilder } from 'discord.js';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=discord',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Discord not connected');
  }
  return accessToken;
}

// Sample image URLs for different categories
const imageCategories: Record<string, string[]> = {
  cat: [
    'https://placekitten.com/400/300',
    'https://placekitten.com/500/400',
    'https://placekitten.com/600/400',
  ],
  dog: [
    'https://placedog.net/400/300',
    'https://placedog.net/500/400',
    'https://placedog.net/600/400',
  ],
  nature: [
    'https://picsum.photos/seed/nature1/400/300',
    'https://picsum.photos/seed/nature2/500/400',
    'https://picsum.photos/seed/nature3/600/400',
  ],
  random: [
    'https://picsum.photos/400/300',
    'https://picsum.photos/500/400',
    'https://picsum.photos/600/400',
  ],
};

function getRandomImage(category: string): string {
  const images = imageCategories[category.toLowerCase()] || imageCategories.random;
  return images[Math.floor(Math.random() * images.length)];
}

export async function startDiscordBot() {
  try {
    const token = await getAccessToken();

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    client.once('ready', () => {
      console.log(`Discord bot logged in as ${client.user?.tag}`);
      console.log('Available commands:');
      console.log('  !image [category] - Send a random image (cat, dog, nature, random)');
      console.log('  !help - Show available commands');
    });

    client.on('messageCreate', async (message: Message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      const content = message.content.toLowerCase().trim();

      // Help command
      if (content === '!help') {
        await message.reply({
          content: `**Available Commands:**\n` +
            `\`!image\` - Send a random image\n` +
            `\`!image cat\` - Send a cat image\n` +
            `\`!image dog\` - Send a dog image\n` +
            `\`!image nature\` - Send a nature image\n` +
            `\`!image random\` - Send a random image\n` +
            `\`!help\` - Show this help message`
        });
        return;
      }

      // Image command
      if (content.startsWith('!image')) {
        const parts = content.split(' ');
        const category = parts[1] || 'random';
        
        try {
          const imageUrl = getRandomImage(category);
          
          await message.reply({
            content: `Here's a ${category} image for you!`,
            files: [imageUrl]
          });
        } catch (error) {
          console.error('Error sending image:', error);
          await message.reply('Sorry, I could not send an image right now. Please try again!');
        }
        return;
      }
    });

    await client.login(token);
    console.log('Discord bot started successfully!');
    
    return client;
  } catch (error) {
    console.error('Failed to start Discord bot:', error);
    throw error;
  }
}
