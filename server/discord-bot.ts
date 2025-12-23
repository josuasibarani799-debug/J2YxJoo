// Discord bot integration - uses Bot Token from environment
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
  EmbedBuilder
} from "discord.js";
import path from "path";
import fs from "fs/promises";

// Path to custom QR code image
const QR_IMAGE_PATH = path.join(process.cwd(), "attached_assets/QR_1765562456554.jpg");
// Path to OPEN and CLOSE banner images
const OPEN_BANNER_PATH = path.join(process.cwd(), "attached_assets/open_banner.jpg");
const CLOSE_BANNER_PATH = path.join(process.cwd(), "attached_assets/close_banner.jpg");
// Path to participants data
const PARTICIPANTS_FILE = path.join(process.cwd(), "data/participants.json");

// Sample image URLs for different categories
const imageCategories: Record<string, string[]> = {
  cat: [
    "https://placekitten.com/400/300",
    "https://placekitten.com/500/400",
    "https://placekitten.com/600/400",
  ],
  dog: [
    "https://placedog.net/400/300",
    "https://placedog.net/500/400",
    "https://placedog.net/600/400",
  ],
  nature: [
    "https://picsum.photos/seed/nature1/400/300",
    "https://picsum.photos/seed/nature2/500/400",
    "https://picsum.photos/seed/nature3/600/400",
  ],
  random: [
    "https://picsum.photos/400/300",
    "https://picsum.photos/500/400",
    "https://picsum.photos/600/400",
  ],
};

// Participant interface
interface Participant {
  discordName: string;
  robloxUsn: string;
  status: boolean;
}

// Announcement info interface
interface AnnouncementInfo {
  title: string;
  startDate: string;
  infoText: string;
  tagEveryone: boolean;
}

// Default announcement info
const DEFAULT_ANNOUNCEMENT: AnnouncementInfo = {
  title: "OPEN PT PT X8 24 JAM 18K/AKUN START MINGGU 21/12/2025 PUKUL 08.00 WIB - GA BOLEH PAKE SCRIPT",
  startDate: "MINGGU 21/12/2025 PUKUL 08.00 WIB",
  infoText: "YANG MAU IKUTAN LANGSUNG KE 🎫【TICKET】",
  tagEveryone: false
};

// Load participants data
async function loadParticipants(): Promise<Participant[]> {
  try {
    const data = await fs.readFile(PARTICIPANTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.participants || parsed; // Support both old and new format
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

// Save participants data
async function saveParticipants(participants: Participant[]): Promise<void> {
  try {
    // Ensure data directory exists
    await fs.mkdir(path.dirname(PARTICIPANTS_FILE), { recursive: true });
    
    // Load existing data to preserve announcement info
    let existingData: any = { participants: [], announcement: DEFAULT_ANNOUNCEMENT };
    try {
      const data = await fs.readFile(PARTICIPANTS_FILE, 'utf-8');
      existingData = JSON.parse(data);
      if (!existingData.announcement) {
        existingData.announcement = DEFAULT_ANNOUNCEMENT;
      }
    } catch (error) {
      // File doesn't exist yet
    }
    
    existingData.participants = participants;
    await fs.writeFile(PARTICIPANTS_FILE, JSON.stringify(existingData, null, 2));
  } catch (error) {
    console.error("Error saving participants:", error);
  }
}

// Load announcement info
async function loadAnnouncementInfo(): Promise<AnnouncementInfo> {
  try {
    const data = await fs.readFile(PARTICIPANTS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.announcement || DEFAULT_ANNOUNCEMENT;
  } catch (error) {
    return DEFAULT_ANNOUNCEMENT;
  }
}

// Save announcement info
async function saveAnnouncementInfo(announcement: AnnouncementInfo): Promise<void> {
  try {
    await fs.mkdir(path.dirname(PARTICIPANTS_FILE), { recursive: true });
    
    let existingData: any = { participants: [], announcement: DEFAULT_ANNOUNCEMENT };
    try {
      const data = await fs.readFile(PARTICIPANTS_FILE, 'utf-8');
      existingData = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
    }
    
    existingData.announcement = announcement;
    await fs.writeFile(PARTICIPANTS_FILE, JSON.stringify(existingData, null, 2));
  } catch (error) {
    console.error("Error saving announcement:", error);
  }
}

// Generate list embed
async function generateListEmbed(participants: Participant[]): Promise<EmbedBuilder> {
  const announcement = await loadAnnouncementInfo();
  
  const embed = new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle(announcement.title)
    .setTimestamp();

  let listText = "";
  for (let i = 0; i < 20; i++) {
    if (i < participants.length) {
      const p = participants[i];
      const status = p.status ? "✅" : "❌";
      listText += `${i + 1}. ${p.discordName} ${p.robloxUsn} ${status}\n`;
    } else {
      listText += `${i + 1}. -\n`;
    }
  }

  embed.setDescription(listText);
  embed.addFields({
    name: '📢 Info',
    value: announcement.infoText,
    inline: false
  });
  embed.setFooter({ text: `Total Peserta: ${participants.length}/20` });

  return embed;
}

// Generate admin buttons
function generateAdminButtons() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('list_add')
      .setLabel('➕ Add')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('list_remove')
      .setLabel('🗑️ Remove')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('list_edit')
      .setLabel('✏️ Edit')
      .setStyle(ButtonStyle.Primary),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('list_check')
      .setLabel('✅ Toggle Status')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('list_edit_info')
      .setLabel('📝 Edit Info')
      .setStyle(ButtonStyle.Primary),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('list_clear')
      .setLabel('🔄 Clear All')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('list_tag_everyone')
      .setLabel('📢 Tag Everyone')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3];
}

function getRandomImage(category: string): string {
  const images =
    imageCategories[category.toLowerCase()] || imageCategories.random;
  return images[Math.floor(Math.random() * images.length)];
}

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;

  console.log("📝 Debug Info:");
  console.log("- Token exists:", !!token);
  console.log("- Token length:", token?.length || 0);
  console.log("- Token preview:", token?.substring(0, 20) + "...");

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

  // Set up all event handlers BEFORE login
  client.once("ready", () => {
    console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
    console.log("Available commands:");
    console.log(
      "  !image [category] - Send a random image (cat, dog, nature, random)",
    );
    console.log("  !list - Show participants list");
    console.log("  !add <discord> <roblox> - Add participant (Admin only)");
    console.log("  !remove <number> - Remove participant (Admin only)");
    console.log("  !check <number> - Toggle participant status (Admin only)");
    console.log("  !edit <number> <discord> <roblox> - Edit participant (Admin only)");
    console.log("  !clear - Clear all participants (Admin only)");
    console.log("  !help - Show available commands");
  });

  // Add comprehensive error handlers
  client.on("error", (error) => {
    console.error("❌ Discord client error:", error);
  });

  client.on("warn", (warning) => {
    console.warn("⚠️ Discord client warning:", warning);
  });

  client.on("debug", (info) => {
    console.log("🐛 Discord debug:", info);
  });

  client.on("shardError", (error) => {
    console.error("❌ Shard error:", error);
  });

  client.on("shardDisconnect", (event, shardId) => {
    console.log(`🔌 Shard ${shardId} disconnected:`, event);
  });

  client.on("shardReconnecting", (shardId) => {
    console.log(`🔄 Shard ${shardId} reconnecting...`);
  });

  client.on("messageCreate", async (message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const content = message.content.toLowerCase().trim();

    // Jo command - accessible by everyone (no role check)
    if (content === "!jo") {
      try {
        await message.reply({
          content: "**Josua Ganteng Banget 😎🔥**\n\nNo cap fr fr! 💯",
        });
      } catch (error) {
        console.error("Error sending Jo message:", error);
        await message.reply("Sorry, I could not send the message right now.");
      }
      return;
    }
    // Yan command - Yanlopkal appreciation
    if (content === "!yanlopkal") {
      try {
        await message.reply({
          content: "**DRIAN AND KAL GAY 😀🔥**\n\nASLI NO FAKE FAKE 💅💯",
        });
      } catch (error) {
        console.error("Error sending Yan message:", error);
        await message.reply("Sorry, I could not send the message right now.");
      }
      return;
    }

    // Wild command - Wild appreciation
    if (content === "!wild") {
      try {
        await message.reply({
          content: "**WILD GWOBLOK AND DONGO 🤡💩**\n\nREALL NO FAKE FAKE OON NYA 🤪🧠❌",
        });
      } catch (error) {
        console.error("Error sending Wild message:", error);
        await message.reply("Sorry, I could not send the message right now.");
      }
      return;
    }

    // ===========================================
    // PARTICIPANTS LIST COMMAND (WITH BUTTONS)
    // ===========================================

    // !list command - Show participants with admin buttons
    if (content === "!list") {
      try {
        const participants = await loadParticipants();
        const embed = await generateListEmbed(participants);

        // Check if user is admin
        const ALLOWED_ROLE_IDS = [
          "1437084858798182501",
          "1449427010488111267",
          "1448227813550198816",
        ];

        const hasAllowedRole = message.member?.roles.cache.some((role) =>
          ALLOWED_ROLE_IDS.includes(role.id),
        );

        // If admin, show control buttons
        if (hasAllowedRole) {
          const buttons = generateAdminButtons();
          await message.reply({ 
            embeds: [embed],
            components: buttons
          });
        } else {
          // Regular user - no buttons
          await message.reply({ embeds: [embed] });
        }
      } catch (error) {
        console.error("Error showing list:", error);
        await message.reply("❌ Gagal menampilkan list peserta.");
      }
      return;
    }

    // ===========================================
    // END OF PARTICIPANTS LIST COMMAND
    // ===========================================

    // Only check roles if message is a command (excluding !jo, !yanlopkal, !wild, and !list)
    if (content.startsWith("!") && !content.startsWith("!list")) {
      // Multiple allowed role IDs
      const ALLOWED_ROLE_IDS = [
        "1437084858798182501",
        "1449427010488111267",
        "1448227813550198816",
      ];

      // Check if user has any of the allowed roles
      const hasAllowedRole = message.member?.roles.cache.some((role) =>
        ALLOWED_ROLE_IDS.includes(role.id),
      );

      if (!hasAllowedRole) {
        const reply = await message.channel.send(
          "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan untuk menggunakan bot ini.",
        );

        // Delete the bot's reply after 4 seconds
        setTimeout(() => {
          if (reply.deletable) reply.delete();
        }, 4000);

        // Delete the user's command message (with small delay)
        setTimeout(async () => {
          try {
            await message.delete();
          } catch (error) {
            console.log("Cannot delete user message:", error.message);
          }
        }, 4000);

        return;
      }
    }
    // Help command
    if (content === "!help") {
      await message.reply({
        content:
          `**Available Commands:**\n` +
          `\`!qr\` - Send the J2Y Crate QR payment code\n` +
          `\`!ps\` - Send The Private Server Link\n` +
          `\`!makasi\` - Send a thank you message\n` +
          `\`!jo\` - Send a Josua appreciation message\n` +
          `\`!image\` - Send a random image\n` +
          `\`!image cat\` - Send a cat image\n` +
          `\`!image dog\` - Send a dog image\n` +
          `\`!image nature\` - Send a nature image\n` +
          `\`!image random\` - Send a random image\n` +
          `\`!list\` - Show participants list (Admin: with control panel)\n` +
          `\`!help\` - Show this help message`,
      });
      return;
    }
    // QR code command - sends custom QR image
    if (content === "!qr") {
      try {
        const attachment = new AttachmentBuilder(QR_IMAGE_PATH, {
          name: "j2y-crate-qr.jpg",
        });
        await message.reply({
          content: "**J2Y Crate - Tiga Dara Store**\nScan QR to pay:",
          files: [attachment],
        });
      } catch (error) {
        console.error("Error sending QR image:", error);
        await message.reply("Sorry, I could not send the QR image right now.");
      }
      return;
    }
    // DANA payment command - payment 2 (Purple Embed)
if (content === "!pay2") {
  try {
    const danaEmbed = new EmbedBuilder()
      .setColor('#9B59B6') // Warna ungu
      .setTitle('💳 Metode Pembayaran DANA')
      .setDescription('⚠️ **QRIS (Payment 1) sedang OFF**\nGunakan DANA untuk sementara waktu!')
      .addFields(
        {
          name: '📱 Nomor DANA',
          value: '```081360705790```',
          inline: false
        },
        {
          name: '👤 Atas Nama',
          value: '```Josua Alex Franciskus Sibarani```',
          inline: false
        },
        {
          name: '📝 Petunjuk',
          value: '> • Transfer ke nomor DANA di atas\n> • Kirim bukti transfer di ticket ini\n> • Tunggu konfirmasi dari admin',
          inline: false
        }
      )
      .setFooter({ text: 'Payment Method 2 • QRIS akan aktif kembali segera!' })
      .setTimestamp();

    await message.reply({ embeds: [danaEmbed] });
  } catch (error) {
    console.error("Error sending DANA payment info:", error);
    await message.reply("Sorry, I could not send the payment information right now.");
  }
  return;
}

    // PS command (Private Server)
    if (content === "!ps") {
      try {
        await message.reply({
          content:
            "**🔗 Private Server Link:**\n" +
            "https://www.roblox.com/games/3260590327?privateServerLinkCode=35869968994738473116691652998859\n\n" +
            "Buka link di atas untuk join private server!",
        });
      } catch (error) {
        console.error("Error sending PS message:", error);
        await message.reply(
          "Sorry, I could not send the private server link right now.",
        );
      }
      return;
    }
    // Makasi command (Thank You)
    if (content === "!makasi") {
      try {
        await message.reply({
          content:
            "**Terima kasih sudah order di J2Y! 🙏✨**\n\n" +
            "Ditunggu orderan selanjutnya ya! 😊",
        });
      } catch (error) {
        console.error("Error sending Makasi message:", error);
        await message.reply("Sorry, I could not send the message right now.");
      }
      return;
    }
    // Detail command
    if (content === '!detail') {
      try {
        const button = new ButtonBuilder()
          .setCustomId('open_detail_modal')
          .setLabel('📝 Input Detail Order')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await message.reply({
          content: '**Detail Order System**\n\nKlik tombol di bawah untuk input detail order:',
          components: [row],
        });
      } catch (error) {
        console.error('Error sending detail command:', error);
        await message.reply('Sorry, I could not send the detail form right now.');
      }
      return;
    }

    // Open command
    if (content === "!open") {
      try {
        // Check if user has allowed role
        const ALLOWED_ROLE_IDS = [
          "1437084858798182501",
          "1449427010488111267",
          "1448227813550198816",
        ];

        const hasAllowedRole = message.member?.roles.cache.some((role) =>
          ALLOWED_ROLE_IDS.includes(role.id),
        );

        if (!hasAllowedRole) {
          const reply = await message.channel.send(
            "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan untuk menggunakan command ini.",
          );
          setTimeout(() => {
            if (reply.deletable) reply.delete();
          }, 4000);
          setTimeout(async () => {
            try {
              await message.delete();
            } catch (error) {
              console.log("Cannot delete user message:", error.message);
            }
          }, 4000);
          return;
        }

        // Delete the command message
        await message.delete();

        // Send OPEN banner with @everyone mention
        const attachment = new AttachmentBuilder(OPEN_BANNER_PATH, {
          name: "store-open.jpg",
        });
        
        await message.channel.send({
          content: "@everyone 🎉 **STORE OPEN!** 🎉\n\n🛒 We're now accepting orders!\n💫 Come and shop with us!",
          files: [attachment],
        });

        console.log("✅ OPEN announcement sent successfully");
      } catch (error) {
        console.error("Error sending OPEN announcement:", error);
        await message.channel.send("❌ Gagal mengirim announcement OPEN.");
      }
      return;
    }

    // Close command
    if (content === "!close") {
      try {
        // Check if user has allowed role
        const ALLOWED_ROLE_IDS = [
          "1437084858798182501",
          "1449427010488111267",
          "1448227813550198816",
        ];

        const hasAllowedRole = message.member?.roles.cache.some((role) =>
          ALLOWED_ROLE_IDS.includes(role.id),
        );

        if (!hasAllowedRole) {
          const reply = await message.channel.send(
            "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan untuk menggunakan command ini.",
          );
          setTimeout(() => {
            if (reply.deletable) reply.delete();
          }, 4000);
          setTimeout(async () => {
            try {
              await message.delete();
            } catch (error) {
              console.log("Cannot delete user message:", error.message);
            }
          }, 4000);
          return;
        }

        // Delete the command message
        await message.delete();

        // Send CLOSE banner with @everyone mention
        const attachment = new AttachmentBuilder(CLOSE_BANNER_PATH, {
          name: "store-close.jpg",
        });
        
        await message.channel.send({
          content: "@everyone 🔒 **STORE CLOSED!** 🔒\n\n😴 We're currently closed\n💤 See you next time!",
          files: [attachment],
        });

        console.log("✅ CLOSE announcement sent successfully");
      } catch (error) {
        console.error("Error sending CLOSE announcement:", error);
        await message.channel.send("❌ Gagal mengirim announcement CLOSE.");
      }
      return;
    }

    // Image command
    if (content.startsWith("!image")) {
      const parts = content.split(" ");
      const category = parts[1] || "random";

      try {
        const imageUrl = getRandomImage(category);

        await message.reply({
          content: `Here's a ${category} image for you!`,
          files: [imageUrl],
        });
      } catch (error) {
        console.error("Error sending image:", error);
        await message.reply(
          "Sorry, I could not send an image right now. Please try again!",
        );
      }
      return;
    }
  });
// Handle button and modal interactions
client.on('interactionCreate', async (interaction) => {
  try {
    // Check admin role for list management buttons
    const ALLOWED_ROLE_IDS = [
      "1437084858798182501",
      "1449427010488111267",
      "1448227813550198816",
    ];

    const member = interaction.member as any;
    const hasAllowedRole = member?.roles?.cache?.some((role: any) =>
      ALLOWED_ROLE_IDS.includes(role.id),
    );

    // ========================================
    // LIST PARTICIPANTS BUTTON HANDLERS
    // ========================================

    // ADD button - open modal to add participant
    if (interaction.isButton() && interaction.customId === 'list_add') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();
      if (participants.length >= 20) {
        await interaction.reply({
          content: "❌ List sudah penuh! (Maksimal 20 peserta)",
          ephemeral: true,
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId('list_add_modal')
        .setTitle('➕ Tambah Peserta');

      const discordInput = new TextInputBuilder()
        .setCustomId('discord_name')
        .setLabel('Discord Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., @cinziya')
        .setRequired(true);

      const robloxInput = new TextInputBuilder()
        .setCustomId('roblox_usn')
        .setLabel('Roblox Username')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Cinziyaa')
        .setRequired(true);

      const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(discordInput);
      const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(robloxInput);

      modal.addComponents(row1, row2);
      await interaction.showModal(modal);
    }

    // REMOVE button - open modal to remove participant
    if (interaction.isButton() && interaction.customId === 'list_remove') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();
      if (participants.length === 0) {
        await interaction.reply({
          content: "❌ List kosong! Tidak ada peserta untuk dihapus.",
          ephemeral: true,
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId('list_remove_modal')
        .setTitle('🗑️ Hapus Peserta');

      const numberInput = new TextInputBuilder()
        .setCustomId('remove_number')
        .setLabel('Nomor Peserta (1-20)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 5')
        .setRequired(true);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput);
      modal.addComponents(row);
      await interaction.showModal(modal);
    }

    // EDIT button - open modal to edit participant
    if (interaction.isButton() && interaction.customId === 'list_edit') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();
      if (participants.length === 0) {
        await interaction.reply({
          content: "❌ List kosong! Tidak ada peserta untuk diedit.",
          ephemeral: true,
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId('list_edit_modal')
        .setTitle('✏️ Edit Peserta');

      const numberInput = new TextInputBuilder()
        .setCustomId('edit_number')
        .setLabel('Nomor Peserta (1-20)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 3')
        .setRequired(true);

      const discordInput = new TextInputBuilder()
        .setCustomId('edit_discord')
        .setLabel('Discord Name Baru')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., @newname')
        .setRequired(true);

      const robloxInput = new TextInputBuilder()
        .setCustomId('edit_roblox')
        .setLabel('Roblox Username Baru')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., NewRoblox')
        .setRequired(true);

      const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput);
      const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(discordInput);
      const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(robloxInput);

      modal.addComponents(row1, row2, row3);
      await interaction.showModal(modal);
    }

    // CHECK button - open modal to toggle status
    if (interaction.isButton() && interaction.customId === 'list_check') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();
      if (participants.length === 0) {
        await interaction.reply({
          content: "❌ List kosong! Tidak ada peserta untuk diubah statusnya.",
          ephemeral: true,
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId('list_check_modal')
        .setTitle('✅ Toggle Status');

      const numberInput = new TextInputBuilder()
        .setCustomId('check_number')
        .setLabel('Nomor Peserta (1-20)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 1')
        .setRequired(true);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput);
      modal.addComponents(row);
      await interaction.showModal(modal);
    }

    // CLEAR button - confirm clear all
    if (interaction.isButton() && interaction.customId === 'list_clear') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
          ephemeral: true,
        });
        return;
      }

      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('list_clear_confirm')
          .setLabel('⚠️ Ya, Hapus Semua')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('list_clear_cancel')
          .setLabel('❌ Batal')
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.reply({
        content: '⚠️ **Konfirmasi**\n\nApakah kamu yakin ingin menghapus SEMUA peserta?',
        components: [confirmRow],
        ephemeral: true,
      });
    }

    // EDIT INFO button - open modal to edit announcement
    if (interaction.isButton() && interaction.customId === 'list_edit_info') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
          ephemeral: true,
        });
        return;
      }

      const currentInfo = await loadAnnouncementInfo();

      const modal = new ModalBuilder()
        .setCustomId('list_edit_info_modal')
        .setTitle('📝 Edit Announcement Info');

      const titleInput = new TextInputBuilder()
        .setCustomId('info_title')
        .setLabel('Title')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(currentInfo.title)
        .setRequired(true);

      const infoInput = new TextInputBuilder()
        .setCustomId('info_text')
        .setLabel('Info Text (di bagian bawah)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(currentInfo.infoText)
        .setRequired(true);

      const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
      const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(infoInput);

      modal.addComponents(row1, row2);
      await interaction.showModal(modal);
    }

    // TAG EVERYONE button
    if (interaction.isButton() && interaction.customId === 'list_tag_everyone') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();
      const embed = await generateListEmbed(participants);

      // Send new message with @everyone tag
      await interaction.channel?.send({
        content: '@everyone 📢 **LIST PESERTA UPDATE!**',
        embeds: [embed]
      });

      await interaction.reply({
        content: '✅ Berhasil tag @everyone dengan list peserta!',
        ephemeral: true,
      });
    }

    // CLEAR CONFIRM
    if (interaction.isButton() && interaction.customId === 'list_clear_confirm') {
      if (!hasAllowedRole) {
        await interaction.update({
          content: "⛔ *Akses Ditolak!*",
          components: [],
        });
        return;
      }

      await saveParticipants([]);
      await interaction.update({
        content: "✅ Semua peserta berhasil dihapus!",
        components: [],
      });

      // Auto-update the list message
      try {
        const participants = await loadParticipants();
        const updatedEmbed = await generateListEmbed(participants);
        const buttons = generateAdminButtons();
        
        // Find and update the original list message
        if (interaction.message?.reference?.messageId) {
          const originalMessage = await interaction.channel?.messages.fetch(interaction.message.reference.messageId);
          if (originalMessage) {
            await originalMessage.edit({
              embeds: [updatedEmbed],
              components: buttons
            });
          }
        }
      } catch (error) {
        console.error("Error updating list:", error);
      }
    }

    // CLEAR CANCEL
    if (interaction.isButton() && interaction.customId === 'list_clear_cancel') {
      await interaction.update({
        content: "❌ Dibatalkan. Tidak ada perubahan.",
        components: [],
      });
    }

    // ========================================
    // MODAL SUBMIT HANDLERS FOR LIST
    // ========================================

    // Add modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'list_add_modal') {
      const discordName = interaction.fields.getTextInputValue('discord_name');
      const robloxUsn = interaction.fields.getTextInputValue('roblox_usn');

      const participants = await loadParticipants();

      if (participants.length >= 20) {
        await interaction.reply({
          content: "❌ List sudah penuh! (Maksimal 20 peserta)",
          ephemeral: true,
        });
        return;
      }

      participants.push({
        discordName,
        robloxUsn,
        status: true
      });

      await saveParticipants(participants);
      
      // Reply with success message
      await interaction.reply({
        content: `✅ Berhasil menambahkan: ${discordName} ${robloxUsn}`,
        ephemeral: true,
      });

      // Auto-update the original message with new list
      try {
        const updatedEmbed = await generateListEmbed(participants);
        const buttons = generateAdminButtons();
        await interaction.message?.edit({
          embeds: [updatedEmbed],
          components: buttons
        });
      } catch (error) {
        console.error("Error updating list:", error);
      }
    }

    // Remove modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'list_remove_modal') {
      const nomor = parseInt(interaction.fields.getTextInputValue('remove_number'));

      if (isNaN(nomor)) {
        await interaction.reply({
          content: "❌ Nomor tidak valid!",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();

      if (nomor < 1 || nomor > participants.length) {
        await interaction.reply({
          content: "❌ Nomor tidak valid!",
          ephemeral: true,
        });
        return;
      }

      const removed = participants.splice(nomor - 1, 1)[0];
      await saveParticipants(participants);

      await interaction.reply({
        content: `✅ Berhasil menghapus: ${removed.discordName}`,
        ephemeral: true,
      });

      // Auto-update the original message with new list
      try {
        const updatedEmbed = await generateListEmbed(participants);
        const buttons = generateAdminButtons();
        await interaction.message?.edit({
          embeds: [updatedEmbed],
          components: buttons
        });
      } catch (error) {
        console.error("Error updating list:", error);
      }
    }

    // Edit modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'list_edit_modal') {
      const nomor = parseInt(interaction.fields.getTextInputValue('edit_number'));
      const discordName = interaction.fields.getTextInputValue('edit_discord');
      const robloxUsn = interaction.fields.getTextInputValue('edit_roblox');

      if (isNaN(nomor)) {
        await interaction.reply({
          content: "❌ Nomor tidak valid!",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();

      if (nomor < 1 || nomor > participants.length) {
        await interaction.reply({
          content: "❌ Nomor tidak valid!",
          ephemeral: true,
        });
        return;
      }

      participants[nomor - 1].discordName = discordName;
      participants[nomor - 1].robloxUsn = robloxUsn;
      await saveParticipants(participants);

      await interaction.reply({
        content: `✅ Data peserta nomor ${nomor} berhasil diubah!`,
        ephemeral: true,
      });

      // Auto-update the original message with new list
      try {
        const updatedEmbed = await generateListEmbed(participants);
        const buttons = generateAdminButtons();
        await interaction.message?.edit({
          embeds: [updatedEmbed],
          components: buttons
        });
      } catch (error) {
        console.error("Error updating list:", error);
      }
    }

    // Check modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'list_check_modal') {
      const nomor = parseInt(interaction.fields.getTextInputValue('check_number'));

      if (isNaN(nomor)) {
        await interaction.reply({
          content: "❌ Nomor tidak valid!",
          ephemeral: true,
        });
        return;
      }

      const participants = await loadParticipants();

      if (nomor < 1 || nomor > participants.length) {
        await interaction.reply({
          content: "❌ Nomor tidak valid!",
          ephemeral: true,
        });
        return;
      }

      participants[nomor - 1].status = !participants[nomor - 1].status;
      await saveParticipants(participants);

      const status = participants[nomor - 1].status ? "✅" : "❌";
      await interaction.reply({
        content: `✅ Status peserta nomor ${nomor} diubah menjadi ${status}`,
        ephemeral: true,
      });

      // Auto-update the original message with new list
      try {
        const updatedEmbed = await generateListEmbed(participants);
        const buttons = generateAdminButtons();
        await interaction.message?.edit({
          embeds: [updatedEmbed],
          components: buttons
        });
      } catch (error) {
        console.error("Error updating list:", error);
      }
    }

    // Edit Info modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'list_edit_info_modal') {
      const title = interaction.fields.getTextInputValue('info_title');
      const infoText = interaction.fields.getTextInputValue('info_text');

      const currentInfo = await loadAnnouncementInfo();
      const updatedInfo: AnnouncementInfo = {
        ...currentInfo,
        title: title,
        infoText: infoText,
      };

      await saveAnnouncementInfo(updatedInfo);

      await interaction.reply({
        content: '✅ Info announcement berhasil diubah!',
        ephemeral: true,
      });

      // Auto-update the original message with new info
      try {
        const participants = await loadParticipants();
        const updatedEmbed = await generateListEmbed(participants);
        const buttons = generateAdminButtons();
        await interaction.message?.edit({
          embeds: [updatedEmbed],
          components: buttons
        });
      } catch (error) {
        console.error("Error updating list:", error);
      }
    }

    // ========================================
    // DETAIL ORDER BUTTON/MODAL HANDLERS
    // ========================================

    // Handle button click - open modal for detail order
    if (interaction.isButton() && interaction.customId === 'open_detail_modal') {
      if (!hasAllowedRole) {
        await interaction.reply({
          content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan untuk menggunakan fitur ini.",
          ephemeral: true,
        });
        return;
      }
      
      const modal = new ModalBuilder()
        .setCustomId('detail_order_modal')
        .setTitle('Detail Order');

      const itemInput = new TextInputBuilder()
        .setCustomId('item_input')
        .setLabel('Item/Product Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Gaming Laptop, RF VIP 30D, Robux')
        .setRequired(true);

      const netAmountInput = new TextInputBuilder()
        .setCustomId('net_amount_input')
        .setLabel('Net Amount (Rp)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 150000')
        .setRequired(true);

      const notesInput = new TextInputBuilder()
        .setCustomId('notes_input')
        .setLabel('Additional Notes (Optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Any additional information...')
        .setRequired(false);

      const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(itemInput);
      const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(netAmountInput);
      const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(notesInput);

      modal.addComponents(row1, row2, row3);

      await interaction.showModal(modal);
    }

    // Handle modal submit - send formatted result (visible to everyone)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'detail_order_modal') {
      const item = interaction.fields.getTextInputValue('item_input');
      const netAmount = interaction.fields.getTextInputValue('net_amount_input');
      const notes = interaction.fields.getTextInputValue('notes_input') || '-';

      // Format number dengan separator ribuan
      const formattedAmount = new Intl.NumberFormat('id-ID').format(Number(netAmount));

      // Reply to channel (everyone can see)
      await interaction.reply({
        content: 
          `📋 **Detail Order**\n\n` +
          `**Item:** ${item}\n` +
          `**Net Amount:** Rp ${formattedAmount}\n` +
          `**Notes:** ${notes}\n\n` +
          `_Submitted by ${interaction.user.tag}_`,
      });
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});
  console.log("🔌 Attempting to login to Discord...");
  console.log("⏰ Starting login with 30 second timeout...");

  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Login timeout after 30 seconds")),
      30000,
    );
  });

  try {
    // Race between login and timeout
    await Promise.race([client.login(token), timeoutPromise]);

    console.log("✅ Login call completed!");
    console.log("⏳ Waiting for ready event...");

    // Wait for ready event with timeout
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Ready event timeout after 30 seconds"));
      }, 30000);

      client.once("ready", () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  } catch (error) {
    console.error("❌ Login failed with error:", error);
    console.error("Error name:", (error as Error).name);
    console.error("Error message:", (error as Error).message);

    // Try to close client gracefully
    try {
      await client.destroy();
    } catch (destroyError) {
      console.error("Error destroying client:", destroyError);
    }

    throw error;
  }
// Auto-rename Ticket King channels with display name
client.on('channelCreate', async (channel) => {
  try {
    if (channel.type !== 0 || !channel.name.startsWith('ticket-')) return;
    if (channel.name.split('-').length > 2) return;
    
    await new Promise(resolve => setTimeout(resolve, 3000)); // Tunggu 3 detik
    
    // Find ALL users who have ViewChannel permission
    const userPermissions = channel.permissionOverwrites.cache.filter(
      overwrite => 
        overwrite.type === 1 && // Type 1 = User
        overwrite.allow.has('ViewChannel')
    );
    
    // Find first NON-BOT user (the real ticket creator)
    let ticketCreatorId = null;
    for (const [id, permission] of userPermissions) {
      const user = await client.users.fetch(id).catch(() => null);
      if (user && !user.bot) { // ✅ SKIP BOTS!
        ticketCreatorId = id;
        break;
      }
    }
    
    if (!ticketCreatorId) {
      console.log(`⚠️ No human user found for ${channel.name}`);
      return;
    }
    
    // 🔥 FETCH MEMBER dari guild untuk dapetin display name
    const member = await channel.guild.members.fetch(ticketCreatorId).catch(() => null);
    
    if (!member) {
      console.log(`⚠️ Member not found in guild`);
      return;
    }
    
    // Clean display name (ini yang muncul di server)
    const cleanDisplayName = member.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')  // Ganti semua karakter selain huruf/angka jadi -
      .replace(/-+/g, '-')          // Ganti multiple --- jadi satu -
      .replace(/^-|-$/g, '')        // Hapus - di awal/akhir
      .substring(0, 20);            // Max 20 karakter
    
    const ticketNumber = channel.name.replace('ticket-', '');
    const newName = `ticket-${ticketNumber}-${cleanDisplayName}`;
    
    if (channel.name !== newName) {
      await channel.setName(newName);
      console.log(`✅ Renamed: ${channel.name} → ${newName}`);
      console.log(`   Display Name: ${member.displayName}`);
    }
    
  } catch (error) {
    console.error('❌ Error auto-renaming ticket:', error);
  }
});

  return client;
}
