// Discord bot integration - with 7 PS Management System
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

// Path configurations
const QR_IMAGE_PATH = path.join(process.cwd(), "attached_assets/QR_1765562456554.jpg");
const OPEN_BANNER_PATH = path.join(process.cwd(), "attached_assets/open_banner.jpg");
const CLOSE_BANNER_PATH = path.join(process.cwd(), "attached_assets/close_banner.jpg");
const PS_DATA_DIR = path.join(process.cwd(), "data/ps");

// Interfaces
interface Participant {
  userId: string;
  discordName: string;
  robloxUsn: string;
  status: boolean;
}

interface PSData {
  participants: Participant[];
  announcement: { title: string; infoText: string; };
  lastListMessageId?: string;
  lastListChannelId?: string;
}

// Helper functions
function getDefaultAnnouncement(psNumber: number) {
  return {
    title: `OPEN PT PT X8 24 JAM 18K/AKUN - PS${psNumber}`,
    infoText: "YANG MAU IKUTAN LANGSUNG KE 🎫【TICKET】"
  };
}

async function loadPSData(psNumber: number): Promise<PSData> {
  try {
    const filePath = path.join(PS_DATA_DIR, `ps${psNumber}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { participants: [], announcement: getDefaultAnnouncement(psNumber) };
  }
}

async function savePSData(psNumber: number, data: PSData): Promise<void> {
  try {
    await fs.mkdir(PS_DATA_DIR, { recursive: true });
    const filePath = path.join(PS_DATA_DIR, `ps${psNumber}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving PS${psNumber} data:`, error);
  }
}

async function generatePSListEmbed(psNumber: number): Promise<EmbedBuilder> {
  const psData = await loadPSData(psNumber);
  const embed = new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle(psData.announcement.title)
    .setTimestamp();

  let listText = "";
  for (let i = 0; i < 20; i++) {
    if (i === 19) {
      listText += `20. ADMIN ✅\n`;
    } else if (i < psData.participants.length) {
      const p = psData.participants[i];
      const status = p.status ? "✅" : "❌";
      const mention = p.userId ? `<@${p.userId}>` : p.discordName;
      listText += `${i + 1}. ${mention} - ${p.robloxUsn} ${status}\n`;
    } else {
      listText += `${i + 1}. -\n`;
    }
  }

  embed.setDescription(listText);
  embed.addFields({ name: '📢 Info', value: psData.announcement.infoText, inline: false });
  embed.setFooter({ text: `PS${psNumber} • Total Peserta: ${psData.participants.length}/19` });
  return embed;
}

function generatePSAdminButtons(psNumber: number) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ps${psNumber}_add`).setLabel('➕ Add').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ps${psNumber}_edit`).setLabel('✏️ Edit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ps${psNumber}_remove`).setLabel('🗑️ Remove').setStyle(ButtonStyle.Danger),
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ps${psNumber}_toggle`).setLabel('🔄 Toggle Status').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ps${psNumber}_edit_info`).setLabel('📝 Edit Info').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ps${psNumber}_edit_manual`).setLabel('✏️ Edit Manual').setStyle(ButtonStyle.Primary),
  );
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ps${psNumber}_clear`).setLabel('🔄 Clear All').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ps${psNumber}_tag_everyone`).setLabel('📢 Tag Everyone').setStyle(ButtonStyle.Secondary),
  );
  return [row1, row2, row3];
}

async function autoUpdatePSList(client: Client, psNumber: number): Promise<void> {
  try {
    const psData = await loadPSData(psNumber);
    if (!psData.lastListMessageId || !psData.lastListChannelId) return;

    const channel = await client.channels.fetch(psData.lastListChannelId);
    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(psData.lastListMessageId);
    if (!message) return;

    const updatedEmbed = await generatePSListEmbed(psNumber);
    const buttons = generatePSAdminButtons(psNumber);
    await message.edit({ embeds: [updatedEmbed], components: buttons });
    console.log(`✅ Auto-updated list for PS${psNumber}`);
  } catch (error) {
    console.error(`Error auto-updating PS${psNumber} list:`, error);
  }
}

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN environment variable is not set");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once("ready", () => {
    console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
  });

  client.on("error", (error) => console.error("❌ Discord client error:", error));
  client.on("warn", (warning) => console.warn("⚠️ Discord client warning:", warning));

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase().trim();
    const ALLOWED_ROLE_IDS = ["1437084858798182501", "1449427010488111267", "1448227813550198816"];
    const hasRole = message.member?.roles.cache.some((role) => ALLOWED_ROLE_IDS.includes(role.id));

    // Public commands
    if (content === "!jo") {
      await message.reply({ content: "**Josua Ganteng Banget 😎🔥**\n\nNo cap fr fr! 💯" });
      return;
    }
    if (content === "!yanlopkal") {
      await message.reply({ content: "**DRIAN AND KAL GAY 😀🔥**\n\nASLI NO FAKE FAKE 💅💯" });
      return;
    }
    if (content === "!wild") {
      await message.reply({ content: "**WILD GWOBLOK AND DONGO 🤡💩**\n\nREALL NO FAKE FAKE OON NYA 🤪🧠❌" });
      return;
    }

    // PS List Commands
    const listPSMatch = content.match(/^!listps([1-7])$/);
    if (listPSMatch) {
      const psNumber = parseInt(listPSMatch[1]);
      try {
        const embed = await generatePSListEmbed(psNumber);
        let sentMessage;
        if (hasRole) {
          const buttons = generatePSAdminButtons(psNumber);
          sentMessage = await message.reply({ embeds: [embed], components: buttons });
        } else {
          sentMessage = await message.reply({ embeds: [embed] });
        }
        const psData = await loadPSData(psNumber);
        psData.lastListMessageId = sentMessage.id;
        psData.lastListChannelId = message.channel.id;
        await savePSData(psNumber, psData);
      } catch (error) {
        await message.reply(`❌ Gagal menampilkan list PS${psNumber}.`);
      }
      return;
    }

    // Add Participant
    const addPSMatch = content.match(/^!addptops([1-7])\s/);
    if (addPSMatch) {
      const psNumber = parseInt(addPSMatch[1]);
      if (!hasRole) {
        const reply = await message.channel.send("⛔ *Akses Ditolak!*");
        setTimeout(() => { if (reply.deletable) reply.delete(); }, 4000);
        setTimeout(async () => { try { await message.delete(); } catch {} }, 4000);
        return;
      }
      try {
        const parts = message.content.split(" ");
        if (parts.length < 3) {
          await message.reply(`❌ Format: \`!addptops${psNumber} @user RobloxUsername\``);
          return;
        }
        const robloxUsn = parts.slice(2).join(" ");
        const psData = await loadPSData(psNumber);
        if (psData.participants.length >= 19) {
          await message.reply(`❌ PS${psNumber} sudah penuh!`);
          return;
        }
        if (message.mentions.users.size === 0) {
          await message.reply("❌ Mention user dulu!");
          return;
        }
        const mentionedUser = message.mentions.users.first()!;
        const userId = mentionedUser.id;
        const member = message.guild?.members.cache.get(userId);
        const discordName = member?.displayName || mentionedUser.username;
        const nextSlot = psData.participants.length + 1;
        psData.participants.push({ userId, discordName, robloxUsn, status: true });
        await savePSData(psNumber, psData);
        const reply = await message.reply(`✅ Berhasil menambahkan <@${userId}> (${robloxUsn}) ke PS${psNumber} nomor ${nextSlot}!`);
        await autoUpdatePSList(client, psNumber);
        setTimeout(async () => { try { await message.delete(); await reply.delete(); } catch {} }, 5000);
      } catch (error) {
        await message.reply(`❌ Gagal menambahkan peserta.`);
      }
      return;
    }

    // Remove Participant
    const removePSMatch = content.match(/^!removeps([1-7])\s+(\d+)$/);
    if (removePSMatch) {
      const psNumber = parseInt(removePSMatch[1]);
      const slotNumber = parseInt(removePSMatch[2]);
      if (!hasRole) {
        const reply = await message.channel.send("⛔ *Akses Ditolak!*");
        setTimeout(() => { if (reply.deletable) reply.delete(); }, 4000);
        setTimeout(async () => { try { await message.delete(); } catch {} }, 4000);
        return;
      }
      try {
        const psData = await loadPSData(psNumber);
        if (slotNumber < 1 || slotNumber > psData.participants.length) {
          await message.reply(`❌ Nomor tidak valid!`);
          return;
        }
        const removed = psData.participants.splice(slotNumber - 1, 1)[0];
        await savePSData(psNumber, psData);
        const mention = removed.userId ? `<@${removed.userId}>` : removed.discordName;
        const reply = await message.reply(`✅ Berhasil menghapus ${mention} dari PS${psNumber}!`);
        await autoUpdatePSList(client, psNumber);
        setTimeout(async () => { try { await message.delete(); await reply.delete(); } catch {} }, 5000);
      } catch (error) {
        await message.reply(`❌ Gagal menghapus peserta.`);
      }
      return;
    }

    // ... (Continued in part 2 - add remaining commands like edit, check, clear, and other original commands)
    
    // Help command
    if (content === "!help") {
      await message.reply({
        content:
          `**Available Commands:**\n\n` +
          `**PS Management (PS1-PS7):**\n` +
          `\`!listps[1-7]\` - Show PS list\n` +
          `\`!addptops[1-7] @user roblox\` - Add participant\n` +
          `\`!removeps[1-7] <num>\` - Remove participant\n` +
          `\`!editps[1-7] <num> @user roblox\` - Edit participant\n` +
          `\`!checkps[1-7] <num>\` - Toggle status\n` +
          `\`!clearps[1-7]\` - Clear all\n\n` +
          `**Other:**\n` +
          `\`!qr\` - QR payment\n` +
          `\`!help\` - Show this`,
      });
      return;
    }

    // QR command (add your remaining commands here from original file)
    if (content === "!qr") {
      try {
        const attachment = new AttachmentBuilder(QR_IMAGE_PATH, { name: "j2y-crate-qr.jpg" });
        await message.reply({ content: "**J2Y Crate - Tiga Dara Store**\nScan QR to pay:", files: [attachment] });
      } catch (error) {
        await message.reply("Sorry, I could not send the QR image right now.");
      }
      return;
    }
  });

  // Button interaction handlers for PS management
  client.on('interactionCreate', async (interaction) => {
    // Add button handlers here (Add, Edit, Remove, Toggle, Clear, Tag Everyone)
  });

  // Auto-rename tickets
  client.on('channelCreate', async (channel) => {
    try {
      if (channel.type !== 0 || !channel.name.startsWith('ticket-')) return;
      if (channel.name.split('-').length > 2) return;
      await new Promise(resolve => setTimeout(resolve, 3000));
      const userPermissions = channel.permissionOverwrites.cache.filter(
        overwrite => overwrite.type === 1 && overwrite.allow.has('ViewChannel')
      );
      let ticketCreatorId = null;
      for (const [id] of userPermissions) {
        const user = await client.users.fetch(id).catch(() => null);
        if (user && !user.bot) {
          ticketCreatorId = id;
          break;
        }
      }
      if (!ticketCreatorId) return;
      const member = await channel.guild.members.fetch(ticketCreatorId).catch(() => null);
      if (!member) return;
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
      }
    } catch (error) {
      console.error('❌ Error auto-renaming ticket:', error);
    }
  });

  await client.login(token);
  return client;
}
