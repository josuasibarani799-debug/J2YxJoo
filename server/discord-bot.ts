// Discord bot integration - 7 PS System
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
// Path to PS data files
const PS_DATA_DIR = path.join(process.cwd(), "data/ps");

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
  userId: string;
  discordName: string;
  robloxUsn: string;
  status: boolean;
}

// PS Data interface
interface PSData {
  participants: Participant[];
  announcement: {
    title: string;
    infoText: string;
  };
  lastListMessageId?: string;
  lastListChannelId?: string;
}

// Default announcement per PS
function getDefaultAnnouncement(psNumber: number) {
  return {
    title: `OPEN PT PT X8 24 JAM 18K/AKUN - PS${psNumber}`,
    infoText: "YANG MAU IKUTAN LANGSUNG KE 🎫【TICKET】"
  };
}

// Load PS data
async function loadPSData(psNumber: number): Promise<PSData> {
  try {
    const filePath = path.join(PS_DATA_DIR, `ps${psNumber}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {
      participants: [],
      announcement: getDefaultAnnouncement(psNumber)
    };
  }
}

// Save PS data
async function savePSData(psNumber: number, data: PSData): Promise<void> {
  try {
    await fs.mkdir(PS_DATA_DIR, { recursive: true });
    const filePath = path.join(PS_DATA_DIR, `ps${psNumber}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving PS${psNumber} data:`, error);
  }
}

// Generate list embed for specific PS
async function generatePSListEmbed(psNumber: number): Promise<EmbedBuilder> {
  const psData = await loadPSData(psNumber);
  
  const embed = new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle(psData.announcement.title)
    .setTimestamp();

  let listText = "";
  for (let i = 0; i < 20; i++) {
    if (i < psData.participants.length) {
      const p = psData.participants[i];
      const status = p.status ? "✅" : "❌";
      const mention = p.userId ? `<@${p.userId}>` : p.discordName;
      listText += `${i + 1}. ${mention} ${p.robloxUsn} ${status}\n`;
    } else {
      listText += `${i + 1}. -\n`;
    }
  }

  embed.setDescription(listText);
  embed.addFields({
    name: '📢 Info',
    value: psData.announcement.infoText,
    inline: false
  });
  embed.setFooter({ text: `PS${psNumber} • Total Peserta: ${psData.participants.length}/20` });

  return embed;
}

// Generate admin buttons for PS
function generatePSAdminButtons(psNumber: number) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_edit_info`)
      .setLabel('📝 Edit Info')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_clear`)
      .setLabel('🔄 Clear All')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_tag_everyone`)
      .setLabel('📢 Tag Everyone')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1];
}

// Auto-update list embed after changes
async function autoUpdatePSList(client: Client, psNumber: number): Promise<void> {
  try {
    const psData = await loadPSData(psNumber);
    
    if (!psData.lastListMessageId || !psData.lastListChannelId) {
      console.log(`No tracked list message for PS${psNumber}`);
      return;
    }

    const channel = await client.channels.fetch(psData.lastListChannelId);
    if (!channel?.isTextBased()) {
      console.log(`Channel not found or not text-based for PS${psNumber}`);
      return;
    }

    const message = await channel.messages.fetch(psData.lastListMessageId);
    if (!message) {
      console.log(`Message not found for PS${psNumber}`);
      return;
    }

    const updatedEmbed = await generatePSListEmbed(psNumber);
    const buttons = generatePSAdminButtons(psNumber);

    await message.edit({
      embeds: [updatedEmbed],
      components: buttons
    });

    console.log(`✅ Auto-updated list for PS${psNumber}`);
  } catch (error) {
    console.error(`Error auto-updating PS${psNumber} list:`, error);
  }
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
      GatewayIntentBits.GuildMembers,
    ],
  });

  // Set up all event handlers BEFORE login
  client.once("ready", () => {
    console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
    console.log("Available commands:");
    console.log("  !listps[1-7] - Show PS list");
    console.log("  !addptops[1-7] @user roblox - Add participant to PS");
    console.log("  !removeps[1-7] <number> - Remove participant from PS");
    console.log("  !editps[1-7] <number> @user roblox - Edit participant in PS");
    console.log("  !checkps[1-7] <number> - Toggle status in PS");
    console.log("  !clearps[1-7] - Clear all participants in PS");
  });

  // Add comprehensive error handlers
  client.on("error", (error) => {
    console.error("❌ Discord client error:", error);
  });

  client.on("warn", (warning) => {
    console.warn("⚠️ Discord client warning:", warning);
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

    // Yan command
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

    // Wild command
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
    // PS LIST COMMANDS (7 PS)
    // ===========================================

    // Check for !listps[1-7] command
    const listPSMatch = content.match(/^!listps([1-7])$/);
    if (listPSMatch) {
      const psNumber = parseInt(listPSMatch[1]);
      
      try {
        const embed = await generatePSListEmbed(psNumber);

        // Check if user is admin
        const ALLOWED_ROLE_IDS = [
          "1437084858798182501",
          "1449427010488111267",
          "1448227813550198816",
        ];

        const hasAllowedRole = message.member?.roles.cache.some((role) =>
          ALLOWED_ROLE_IDS.includes(role.id),
        );

        let sentMessage;
        if (hasAllowedRole) {
          const buttons = generatePSAdminButtons(psNumber);
          sentMessage = await message.reply({ 
            embeds: [embed],
            components: buttons
          });
        } else {
          sentMessage = await message.reply({ embeds: [embed] });
        }

        // Save message ID for auto-update later
        const psData = await loadPSData(psNumber);
        psData.lastListMessageId = sentMessage.id;
        psData.lastListChannelId = message.channel.id;
        await savePSData(psNumber, psData);

      } catch (error) {
        console.error(`Error showing PS${psNumber} list:`, error);
        await message.reply(`❌ Gagal menampilkan list PS${psNumber}.`);
      }
      return;
    }

    // Check for !addptops[1-7] command
    const addPSMatch = content.match(/^!addptops([1-7])\s/);
    if (addPSMatch) {
      const psNumber = parseInt(addPSMatch[1]);
      
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
          "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
        );
        setTimeout(() => {
          if (reply.deletable) reply.delete();
        }, 4000);
        setTimeout(async () => {
          try {
            await message.delete();
          } catch (error) {
            console.log("Cannot delete user message:", error);
          }
        }, 4000);
        return;
      }

      try {
        const parts = message.content.split(" ");
        if (parts.length < 3) {
          await message.reply(`❌ Format salah! Gunakan: \`!addptops${psNumber} @user RobloxUsername\``);
          return;
        }

        const robloxUsn = parts.slice(2).join(" ");
        const psData = await loadPSData(psNumber);

        if (psData.participants.length >= 20) {
          await message.reply(`❌ PS${psNumber} sudah penuh! (Maksimal 20 peserta)`);
          return;
        }

        // Get mentioned user
        let userId = '';
        let discordName = '';

        if (message.mentions.users.size > 0) {
          const mentionedUser = message.mentions.users.first();
          if (mentionedUser) {
            userId = mentionedUser.id;
            const member = message.guild?.members.cache.get(userId);
            discordName = member?.displayName || mentionedUser.username;
          }
        } else {
          await message.reply("❌ Kamu harus mention user! Contoh: `!addptops1 @user RobloxUsername`");
          return;
        }

        // Find next empty slot
        const nextSlot = psData.participants.length + 1;

        psData.participants.push({
          userId,
          discordName,
          robloxUsn,
          status: true
        });

        await savePSData(psNumber, psData);

        const mention = userId ? `<@${userId}>` : discordName;
        const reply = await message.reply(`✅ Berhasil menambahkan ${mention} (${robloxUsn}) ke PS${psNumber} nomor ${nextSlot}!`);

        // Auto-update the list
        await autoUpdatePSList(client, psNumber);

        // Auto-delete command and reply after 5 seconds
        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {
            console.log("Cannot delete messages:", error);
          }
        }, 5000);

      } catch (error) {
        console.error(`Error adding to PS${psNumber}:`, error);
        await message.reply(`❌ Gagal menambahkan peserta ke PS${psNumber}.`);
      }
      return;
    }

    // Check for !removeps[1-7] command
    const removePSMatch = content.match(/^!removeps([1-7])\s+(\d+)$/);
    if (removePSMatch) {
      const psNumber = parseInt(removePSMatch[1]);
      const slotNumber = parseInt(removePSMatch[2]);

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
          "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
        );
        setTimeout(() => {
          if (reply.deletable) reply.delete();
        }, 4000);
        setTimeout(async () => {
          try {
            await message.delete();
          } catch (error) {
            console.log("Cannot delete user message:", error);
          }
        }, 4000);
        return;
      }

      try {
        const psData = await loadPSData(psNumber);

        if (slotNumber < 1 || slotNumber > psData.participants.length) {
          await message.reply(`❌ Nomor tidak valid! PS${psNumber} hanya punya ${psData.participants.length} peserta.`);
          return;
        }

        const removed = psData.participants.splice(slotNumber - 1, 1)[0];
        await savePSData(psNumber, psData);

        const mention = removed.userId ? `<@${removed.userId}>` : removed.discordName;
        const reply = await message.reply(`✅ Berhasil menghapus ${mention} dari PS${psNumber}!`);

        // Auto-update the list
        await autoUpdatePSList(client, psNumber);

        // Auto-delete command and reply after 5 seconds
        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {
            console.log("Cannot delete messages:", error);
          }
        }, 5000);

      } catch (error) {
        console.error(`Error removing from PS${psNumber}:`, error);
        await message.reply(`❌ Gagal menghapus peserta dari PS${psNumber}.`);
      }
      return;
    }

    // Check for !editps[1-7] command
    const editPSMatch = content.match(/^!editps([1-7])\s/);
    if (editPSMatch) {
      const psNumber = parseInt(editPSMatch[1]);

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
          "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
        );
        setTimeout(() => {
          if (reply.deletable) reply.delete();
        }, 4000);
        setTimeout(async () => {
          try {
            await message.delete();
          } catch (error) {
            console.log("Cannot delete user message:", error);
          }
        }, 4000);
        return;
      }

      try {
        const parts = message.content.split(" ");
        if (parts.length < 4) {
          await message.reply(`❌ Format salah! Gunakan: \`!editps${psNumber} <nomor> @user RobloxUsername\``);
          return;
        }

        const slotNumber = parseInt(parts[1]);
        const robloxUsn = parts.slice(3).join(" ");
        const psData = await loadPSData(psNumber);

        if (slotNumber < 1 || slotNumber > psData.participants.length) {
          await message.reply(`❌ Nomor tidak valid! PS${psNumber} hanya punya ${psData.participants.length} peserta.`);
          return;
        }

        // Get mentioned user
        let userId = '';
        let discordName = '';

        if (message.mentions.users.size > 0) {
          const mentionedUser = message.mentions.users.first();
          if (mentionedUser) {
            userId = mentionedUser.id;
            const member = message.guild?.members.cache.get(userId);
            discordName = member?.displayName || mentionedUser.username;
          }
        } else {
          await message.reply(`❌ Kamu harus mention user! Contoh: \`!editps${psNumber} 1 @user RobloxUsername\``);
          return;
        }

        psData.participants[slotNumber - 1] = {
          userId,
          discordName,
          robloxUsn,
          status: psData.participants[slotNumber - 1].status
        };

        await savePSData(psNumber, psData);

        const mention = userId ? `<@${userId}>` : discordName;
        const reply = await message.reply(`✅ Berhasil mengubah peserta nomor ${slotNumber} di PS${psNumber} menjadi ${mention} (${robloxUsn})!`);

        // Auto-update the list
        await autoUpdatePSList(client, psNumber);

        // Auto-delete command and reply after 5 seconds
        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {
            console.log("Cannot delete messages:", error);
          }
        }, 5000);

      } catch (error) {
        console.error(`Error editing PS${psNumber}:`, error);
        await message.reply(`❌ Gagal mengubah peserta di PS${psNumber}.`);
      }
      return;
    }

    // Check for !checkps[1-7] command
    const checkPSMatch = content.match(/^!checkps([1-7])\s+(\d+)$/);
    if (checkPSMatch) {
      const psNumber = parseInt(checkPSMatch[1]);
      const slotNumber = parseInt(checkPSMatch[2]);

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
          "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
        );
        setTimeout(() => {
          if (reply.deletable) reply.delete();
        }, 4000);
        setTimeout(async () => {
          try {
            await message.delete();
          } catch (error) {
            console.log("Cannot delete user message:", error);
          }
        }, 4000);
        return;
      }

      try {
        const psData = await loadPSData(psNumber);

        if (slotNumber < 1 || slotNumber > psData.participants.length) {
          await message.reply(`❌ Nomor tidak valid! PS${psNumber} hanya punya ${psData.participants.length} peserta.`);
          return;
        }

        psData.participants[slotNumber - 1].status = !psData.participants[slotNumber - 1].status;
        await savePSData(psNumber, psData);

        const newStatus = psData.participants[slotNumber - 1].status ? "✅" : "❌";
        const reply = await message.reply(`✅ Status peserta nomor ${slotNumber} di PS${psNumber} diubah menjadi ${newStatus}!`);

        // Auto-update the list
        await autoUpdatePSList(client, psNumber);

        // Auto-delete command and reply after 5 seconds
        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {
            console.log("Cannot delete messages:", error);
          }
        }, 5000);

      } catch (error) {
        console.error(`Error checking PS${psNumber}:`, error);
        await message.reply(`❌ Gagal mengubah status di PS${psNumber}.`);
      }
      return;
    }

    // Check for !clearps[1-7] command
    const clearPSMatch = content.match(/^!clearps([1-7])$/);
    if (clearPSMatch) {
      const psNumber = parseInt(clearPSMatch[1]);

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
          "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
        );
        setTimeout(() => {
          if (reply.deletable) reply.delete();
        }, 4000);
        setTimeout(async () => {
          try {
            await message.delete();
          } catch (error) {
            console.log("Cannot delete user message:", error);
          }
        }, 4000);
        return;
      }

      try {
        const psData = await loadPSData(psNumber);
        psData.participants = [];
        await savePSData(psNumber, psData);

        const reply = await message.reply(`✅ Semua peserta di PS${psNumber} berhasil dihapus!`);

        // Auto-update the list
        await autoUpdatePSList(client, psNumber);

        // Auto-delete command and reply after 5 seconds
        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {
            console.log("Cannot delete messages:", error);
          }
        }, 5000);

      } catch (error) {
        console.error(`Error clearing PS${psNumber}:`, error);
        await message.reply(`❌ Gagal menghapus semua peserta di PS${psNumber}.`);
      }
      return;
    }

    // ===========================================
    // END OF PS COMMANDS
    // ===========================================

    // Only check roles if message is a command (excluding public commands)
    if (content.startsWith("!") && !content.startsWith("!listps")) {
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

      if (!hasAllowedRole && !content.startsWith("!jo") && !content.startsWith("!yanlopkal") && !content.startsWith("!wild") && !content.startsWith("!help")) {
        const reply = await message.channel.send(
          "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan untuk menggunakan bot ini.",
        );

        setTimeout(() => {
          if (reply.deletable) reply.delete();
        }, 4000);

        setTimeout(async () => {
          try {
            await message.delete();
          } catch (error) {
            console.log("Cannot delete user message:", error);
          }
        }, 4000);

        return;
      }
    }

    // Help command
    if (content === "!help") {
      await message.reply({
        content:
          `**Available Commands:**\n\n` +
          `**PS Management (PS1-PS7):**\n` +
          `\`!listps[1-7]\` - Show PS list (e.g., !listps1)\n` +
          `\`!addptops[1-7] @user roblox\` - Add participant\n` +
          `\`!removeps[1-7] <number>\` - Remove participant\n` +
          `\`!editps[1-7] <number> @user roblox\` - Edit participant\n` +
          `\`!checkps[1-7] <number>\` - Toggle status ✅/❌\n` +
          `\`!clearps[1-7]\` - Clear all participants\n\n` +
          `**Other Commands:**\n` +
          `\`!qr\` - Send the J2Y Crate QR payment code\n` +
          `\`!ps\` - Send The Private Server Link\n` +
          `\`!makasi\` - Send a thank you message\n` +
          `\`!help\` - Show this help message`,
      });
      return;
    }

    // QR code command
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

    // DANA payment command
    if (content === "!pay2") {
      try {
        const danaEmbed = new EmbedBuilder()
          .setColor('#9B59B6')
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

    // Makasi command
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
              console.log("Cannot delete user message:", error);
            }
          }, 4000);
          return;
        }

        await message.delete();

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
              console.log("Cannot delete user message:", error);
            }
          }, 4000);
          return;
        }

        await message.delete();

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
      // PS BUTTON HANDLERS
      // ========================================

      // Edit Info button for PS
      const editInfoMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_edit_info$/);
      if (editInfoMatch) {
        const psNumber = parseInt(editInfoMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({
            content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
            ephemeral: true,
          });
          return;
        }

        const psData = await loadPSData(psNumber);

        const modal = new ModalBuilder()
          .setCustomId(`ps${psNumber}_edit_info_modal`)
          .setTitle(`📝 Edit Info PS${psNumber}`);

        const titleInput = new TextInputBuilder()
          .setCustomId('info_title')
          .setLabel('Title')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(psData.announcement.title)
          .setRequired(true);

        const infoInput = new TextInputBuilder()
          .setCustomId('info_text')
          .setLabel('Info Text')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(psData.announcement.infoText)
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(infoInput);

        modal.addComponents(row1, row2);
        await interaction.showModal(modal);
      }

      // Clear PS button
      const clearMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_clear$/);
      if (clearMatch) {
        const psNumber = parseInt(clearMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({
            content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
            ephemeral: true,
          });
          return;
        }

        const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ps${psNumber}_clear_confirm`)
            .setLabel('⚠️ Ya, Hapus Semua')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`ps${psNumber}_clear_cancel`)
            .setLabel('❌ Batal')
            .setStyle(ButtonStyle.Secondary),
        );

        await interaction.reply({
          content: `⚠️ **Konfirmasi**\n\nApakah kamu yakin ingin menghapus SEMUA peserta di PS${psNumber}?`,
          components: [confirmRow],
          ephemeral: true,
        });
      }

      // Clear confirm
      const clearConfirmMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_clear_confirm$/);
      if (clearConfirmMatch) {
        const psNumber = parseInt(clearConfirmMatch[1]);

        if (!hasAllowedRole) {
          await interaction.update({
            content: "⛔ *Akses Ditolak!*",
            components: [],
          });
          return;
        }

        const psData = await loadPSData(psNumber);
        psData.participants = [];
        await savePSData(psNumber, psData);

        await interaction.update({
          content: `✅ Semua peserta di PS${psNumber} berhasil dihapus!`,
          components: [],
        });

        // Auto-update the list message
        await autoUpdatePSList(interaction.client, psNumber);
      }

      // Clear cancel
      const clearCancelMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_clear_cancel$/);
      if (clearCancelMatch) {
        await interaction.update({
          content: "❌ Dibatalkan. Tidak ada perubahan.",
          components: [],
        });
      }

      // Tag Everyone button
      const tagEveryoneMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_tag_everyone$/);
      if (tagEveryoneMatch) {
        const psNumber = parseInt(tagEveryoneMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({
            content: "⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan.",
            ephemeral: true,
          });
          return;
        }

        const embed = await generatePSListEmbed(psNumber);

        await interaction.channel?.send({
          content: `@everyone 📢 **LIST PESERTA PS${psNumber} UPDATE!**`,
          embeds: [embed]
        });

        await interaction.reply({
          content: `✅ Berhasil tag @everyone dengan list PS${psNumber}!`,
          ephemeral: true,
        });
      }

      // ========================================
      // PS MODAL SUBMIT HANDLERS
      // ========================================

      // Edit Info modal submit
      const editInfoModalMatch = interaction.type === InteractionType.ModalSubmit && interaction.customId.match(/^ps(\d+)_edit_info_modal$/);
      if (editInfoModalMatch) {
        const psNumber = parseInt(editInfoModalMatch[1]);
        
        const title = interaction.fields.getTextInputValue('info_title');
        const infoText = interaction.fields.getTextInputValue('info_text');

        const psData = await loadPSData(psNumber);
        psData.announcement = {
          title: title,
          infoText: infoText,
        };

        await savePSData(psNumber, psData);

        await interaction.reply({
          content: `✅ Info PS${psNumber} berhasil diubah!`,
          ephemeral: true,
        });

        // Auto-update the list message
        await autoUpdatePSList(interaction.client, psNumber);
      }

      // ========================================
      // DETAIL ORDER HANDLERS
      // ========================================

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

      if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'detail_order_modal') {
        const item = interaction.fields.getTextInputValue('item_input');
        const netAmount = interaction.fields.getTextInputValue('net_amount_input');
        const notes = interaction.fields.getTextInputValue('notes_input') || '-';

        const formattedAmount = new Intl.NumberFormat('id-ID').format(Number(netAmount));

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

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Login timeout after 30 seconds")),
      30000,
    );
  });

  try {
    await Promise.race([client.login(token), timeoutPromise]);

    console.log("✅ Login call completed!");
    console.log("⏳ Waiting for ready event...");

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
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const userPermissions = channel.permissionOverwrites.cache.filter(
        overwrite => 
          overwrite.type === 1 &&
          overwrite.allow.has('ViewChannel')
      );
      
      let ticketCreatorId = null;
      for (const [id, permission] of userPermissions) {
        const user = await client.users.fetch(id).catch(() => null);
        if (user && !user.bot) {
          ticketCreatorId = id;
          break;
        }
      }
      
      if (!ticketCreatorId) {
        console.log(`⚠️ No human user found for ${channel.name}`);
        return;
      }
      
      const member = await channel.guild.members.fetch(ticketCreatorId).catch(() => null);
      
      if (!member) {
        console.log(`⚠️ Member not found in guild`);
        return;
      }
      
      const cleanDisplayName = member.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 20);
      
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
