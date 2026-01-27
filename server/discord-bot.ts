// Discord bot integration - MAINTENANCE MODE (BOT NEED UPDATE)
// Semua command dan button akan menampilkan pesan "BOT NEED UPDATE"

import {
  Client,
  GatewayIntentBits,
  Message,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  EmbedBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import path from "path";
import fs from "fs";

// Path tetap sama (tidak diubah)
const QR_IMAGE_PATH = path.join(process.cwd(), "attached_assets/00000999999.jpg");
const OPEN_BANNER_PATH = path.join(process.cwd(), "attached_assets/open_banner.jpg");
const CLOSE_BANNER_PATH = path.join(process.cwd(), "attached_assets/close_banner.jpg");
const PRICELIST_IMAGE_PATH = path.join(process.cwd(), "attached_assets/pricelist_j2y.jpeg");

function getRandomImage(category: string): string {
  // Disabled in maintenance mode
  throw new Error("Function disabled - Bot in maintenance mode");
}

// 🚨 FUNGSI UNTUK KIRIM PESAN "BOT NEED UPDATE" 🚨
async function sendUpdateNeededMessage(interaction: any) {
  const updateEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ BOT NEED UPDATE')
    .setDescription(
      '```diff\n' +
      '- Bot butuh di update\n' +
      '- Semua fitur sementara tidak dapat digunakan\n' +
      '- Mohon update dan perbaiki beberapa bug dan crash\n' +
      '```\n\n' +
      '🔧 **Status:** OFF\n' +
      '📌 **Info:** Contact jo for help'
    )
    .setFooter({ text: 'J2Y CRATE - System Update Required' })
    .setTimestamp();

  if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
    await interaction.reply({
      embeds: [updateEmbed],
      ephemeral: true
    }).catch(() => {
      interaction.followUp({
        embeds: [updateEmbed],
        ephemeral: true
      }).catch(() => {});
    });
  }
}

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚠️  BOT MODE: MAINTENANCE (UPDATE NEEDED)");
  console.log("⚠️  All commands and buttons will show update message");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("📝 Debug Info:");
  console.log("- Token exists:", !!token);
  console.log("- Token length:", token?.length || 0);
  console.log("- Mode: MAINTENANCE");

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }

  console.log("🔧 Creating Discord client...");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Maps (tetap ada tapi tidak digunakan)
  const activeIntervals = new Map<string, NodeJS.Timeout>();
  const selectedItemsStore = new Map<string, string[]>();
  const activeOrders = new Map<string, { 
    userId: string; 
    total: number; 
    timestamp: number;
    paymentViewed: boolean;
    items?: string;
  }>();

  const ADMIN_ROLE_IDS = ['1437084858798182501', '1448227813550198816'];

  function isAdmin(member: any): boolean {
    return member?.roles?.cache?.some((role: any) => ADMIN_ROLE_IDS.includes(role.id));
  }

  function isTicketChannel(channel: any): boolean {
    if (!channel || !channel.name) return false;
    const channelName = channel.name.toLowerCase();
    return channelName.includes('ticket') || channelName.startsWith('ticket-');
  }

  client.once("ready", () => {
    console.log(`✅ Bot logged in as ${client.user?.tag}`);
    console.log(`⚠️  MODE: MAINTENANCE - All features disabled`);
    console.log(`⚠️  Response: "BOT NEED UPDATE" for all interactions`);
  });

  // 🚨 SEMUA MESSAGE COMMANDS RETURN "BOT NEED UPDATE" 🚨
  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    // Cek apakah ini command (dimulai dengan !)
    if (content.startsWith('!')) {
      const updateEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ BOT NEED UPDATE')
        .setDescription(
          '```diff\n' +
          '- Bot butuh di update\n' +
          '- Semua fitur sementara tidak dapat digunakan\n' +
          '- Mohon update dan perbaiki beberapa bug dan crash\n' +
          '```\n\n' +
          '🔧 **Status:** OFF\n' +
          '📌 **Info:** Contact jo for help'
        )
        .setFooter({ text: 'J2Y CRATE - System Update Required' })
        .setTimestamp();

      await message.reply({
        embeds: [updateEmbed]
      });

      console.log(`⚠️ Command blocked: ${message.content} by ${message.author.tag}`);
      return;
    }
  });

  // 🚨 SEMUA BUTTON & INTERACTION RETURN "BOT NEED UPDATE" 🚨
  client.on("interactionCreate", async (interaction) => {
    try {
      // SEMUA BUTTON INTERACTIONS
      if (interaction.isButton()) {
        console.log(`⚠️ Button blocked: ${interaction.customId} by ${interaction.user.tag}`);
        await sendUpdateNeededMessage(interaction);
        return;
      }

      // SEMUA SELECT MENU INTERACTIONS
      if (interaction.isStringSelectMenu()) {
        console.log(`⚠️ Select menu blocked: ${interaction.customId} by ${interaction.user.tag}`);
        await sendUpdateNeededMessage(interaction);
        return;
      }

      // SEMUA MODAL SUBMISSIONS
      if (interaction.isModalSubmit()) {
        console.log(`⚠️ Modal blocked: ${interaction.customId} by ${interaction.user.tag}`);
        await sendUpdateNeededMessage(interaction);
        return;
      }

      // SEMUA COMMAND INTERACTIONS (slash commands jika ada)
      if (interaction.isChatInputCommand()) {
        console.log(`⚠️ Slash command blocked: ${interaction.commandName} by ${interaction.user.tag}`);
        
        const updateEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('⚠️ BOT NEED UPDATE')
          .setDescription(
            '```diff\n' +
            '- Bot butuh di update\n' +
            '- Semua fitur sementara tidak dapat digunakan\n' +
            '- Mohon update dan perbaiki beberapa bug dan crash\n' +
            '```\n\n' +
            '🔧 **Status:** OFF\n' +
            '📌 **Info:** Contact jo for help'
          )
          .setFooter({ text: 'J2Y CRATE - System Update Required' })
          .setTimestamp();

        await interaction.reply({
          embeds: [updateEmbed],
          ephemeral: true
        });
        return;
      }

    } catch (error) {
      console.error("❌ Error handling interaction:", error);
    }
  });

  // Event untuk channel create - kirim maintenance message
  client.on("channelCreate", async (channel) => {
    try {
      // Cek apakah ini ticket channel
      if (!channel.isTextBased() || channel.isDMBased()) return;
      
      const channelName = channel.name.toLowerCase();
      if (!channelName.includes('ticket')) return;

      console.log(`⚠️ Ticket detected but bot in maintenance: ${channel.name}`);

      // Tunggu sebentar lalu kirim pesan maintenance
      await new Promise(resolve => setTimeout(resolve, 2000));

      const maintenanceEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ BOT NEED UPDATE')
        .setDescription(
          '```diff\n' +
          '- Bot butuh di update\n' +
          '- Semua fitur sementara tidak dapat digunakan\n' +
          '- Mohon update dan perbaiki beberapa bug dan crash\n' +
          '```\n\n' +
          '🔧 **Status:** OFF\n' +
          '📌 **Info:** Contact jo for help'
        )
        .setFooter({ text: 'J2Y CRATE - System Update Required' })
        .setTimestamp();

      await channel.send({
        embeds: [maintenanceEmbed]
      });

    } catch (error) {
      console.error("❌ Error in channel create:", error);
    }
  });

  // Cleanup saat channel dihapus (tetap ada)
  client.on('channelDelete', (channel) => {
    const channelId = channel.id;
    
    if (activeIntervals.has(channelId)) {
      clearInterval(activeIntervals.get(channelId)!);
      activeIntervals.delete(channelId);
    }
    
    if (activeOrders.has(channelId)) {
      activeOrders.delete(channelId);
    }
  });

  await client.login(token);
  return client;
}
