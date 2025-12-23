// Discord bot integration - COMPLETE VERSION with 7 PS System
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

// Paths
const QR_IMAGE_PATH = path.join(process.cwd(), "attached_assets/QR_1765562456554.jpg");
const OPEN_BANNER_PATH = path.join(process.cwd(), "attached_assets/open_banner.jpg");
const CLOSE_BANNER_PATH = path.join(process.cwd(), "attached_assets/close_banner.jpg");
const PS_DATA_DIR = path.join(process.cwd(), "data/ps");

// Image categories
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

// Interfaces
interface Participant {
  userId: string;
  discordName: string;
  robloxUsn: string;
  status: boolean;
}

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

// Load/Save PS data
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

async function savePSData(psNumber: number, data: PSData): Promise<void> {
  try {
    await fs.mkdir(PS_DATA_DIR, { recursive: true });
    const filePath = path.join(PS_DATA_DIR, `ps${psNumber}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving PS${psNumber} data:`, error);
  }
}

// Generate list embed with nomor 20 = ADMIN
async function generatePSListEmbed(psNumber: number): Promise<EmbedBuilder> {
  const psData = await loadPSData(psNumber);
  
  const embed = new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle(psData.announcement.title)
    .setTimestamp();

  let listText = "";
  for (let i = 0; i < 20; i++) {
    if (i === 19) {
      listText += `20. ADMIN - J2Y_ACC1\n`;
    } else if (i < psData.participants.length) {
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
  embed.setFooter({ text: `PS${psNumber} • Total Peserta: ${psData.participants.length}/19` });

  return embed;
}

// Generate admin buttons (3 rows)
function generatePSAdminButtons(psNumber: number) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_add`)
      .setLabel('➕ Add')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_edit`)
      .setLabel('✏️ Edit')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_remove`)
      .setLabel('🗑️ Remove')
      .setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_toggle`)
      .setLabel('✅ Toggle Status')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_edit_info`)
      .setLabel('📝 Edit Info')
      .setStyle(ButtonStyle.Primary),
  );

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_clear`)
      .setLabel('🔄 Clear All')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_tag_everyone`)
      .setLabel('📢 Tag Everyone')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2, row3];
}

// Auto-update list
async function autoUpdatePSList(client: Client, psNumber: number): Promise<void> {
  try {
    const psData = await loadPSData(psNumber);
    
    if (!psData.lastListMessageId || !psData.lastListChannelId) {
      return;
    }

    const channel = await client.channels.fetch(psData.lastListChannelId);
    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(psData.lastListMessageId);
    if (!message) return;

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
  const images = imageCategories[category.toLowerCase()] || imageCategories.random;
  return images[Math.floor(Math.random() * images.length)];
}

export async function startDiscordBot() {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is not set");
  }

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

    // PUBLIC COMMANDS (No role check)
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

    // PS LIST COMMANDS (Everyone can see)
    const listPSMatch = content.match(/^!listps([1-7])$/);
    if (listPSMatch) {
      const psNumber = parseInt(listPSMatch[1]);
      
      try {
        const embed = await generatePSListEmbed(psNumber);

        const ALLOWED_ROLE_IDS = ["1437084858798182501", "1449427010488111267", "1448227813550198816"];
        const hasAllowedRole = message.member?.roles.cache.some((role) => ALLOWED_ROLE_IDS.includes(role.id));

        let sentMessage;
        if (hasAllowedRole) {
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
        console.error(`Error showing PS${psNumber} list:`, error);
        await message.reply(`❌ Gagal menampilkan list PS${psNumber}.`);
      }
      return;
    }

    // ADMIN ROLE CHECK for other commands
    const ALLOWED_ROLE_IDS = ["1437084858798182501", "1449427010488111267", "1448227813550198816"];
    
    const requiresAdminRole = content.startsWith("!") && 
      !content.startsWith("!jo") && 
      !content.startsWith("!yanlopkal") && 
      !content.startsWith("!wild") &&
      !content.startsWith("!listps") &&
      !content.startsWith("!help") &&
      !content.startsWith("!halo") &&
      !content.startsWith("!orderitem") &&
      !content.startsWith("!orderx8");

    if (requiresAdminRole) {
      const hasAllowedRole = message.member?.roles.cache.some((role) => ALLOWED_ROLE_IDS.includes(role.id));

      if (!hasAllowedRole) {
        const reply = await message.channel.send("⛔ *Akses Ditolak!*\nKamu tidak memiliki role yang diperlukan untuk menggunakan bot ini.");
        setTimeout(() => { if (reply.deletable) reply.delete(); }, 4000);
        setTimeout(async () => {
          try { await message.delete(); } catch (error) {}
        }, 4000);
        return;
      }
    }

    // PS MANAGEMENT COMMANDS
    const addPSMatch = content.match(/^!addptops([1-7])\s/);
    if (addPSMatch) {
      const psNumber = parseInt(addPSMatch[1]);
      
      try {
        const parts = message.content.split(" ");
        if (parts.length < 3) {
          await message.reply(`❌ Format salah! Gunakan: \`!addptops${psNumber} @user RobloxUsername\``);
          return;
        }

        const robloxUsn = parts.slice(2).join(" ");
        const psData = await loadPSData(psNumber);

        if (psData.participants.length >= 19) {
          await message.reply(`❌ PS${psNumber} sudah penuh! (Maksimal 19 peserta + 1 admin di nomor 20)`);
          return;
        }

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

        await autoUpdatePSList(client, psNumber);

        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {}
        }, 5000);

      } catch (error) {
        console.error(`Error adding to PS${psNumber}:`, error);
        await message.reply(`❌ Gagal menambahkan peserta ke PS${psNumber}.`);
      }
      return;
    }

    const removePSMatch = content.match(/^!removeps([1-7])\s+(\d+)$/);
    if (removePSMatch) {
      const psNumber = parseInt(removePSMatch[1]);
      const slotNumber = parseInt(removePSMatch[2]);

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

        await autoUpdatePSList(client, psNumber);

        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {}
        }, 5000);

      } catch (error) {
        console.error(`Error removing from PS${psNumber}:`, error);
        await message.reply(`❌ Gagal menghapus peserta dari PS${psNumber}.`);
      }
      return;
    }

    const editPSMatch = content.match(/^!editps([1-7])\s/);
    if (editPSMatch) {
      const psNumber = parseInt(editPSMatch[1]);

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

        await autoUpdatePSList(client, psNumber);

        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {}
        }, 5000);

      } catch (error) {
        console.error(`Error editing PS${psNumber}:`, error);
        await message.reply(`❌ Gagal mengubah peserta di PS${psNumber}.`);
      }
      return;
    }

    const checkPSMatch = content.match(/^!checkps([1-7])\s+(\d+)$/);
    if (checkPSMatch) {
      const psNumber = parseInt(checkPSMatch[1]);
      const slotNumber = parseInt(checkPSMatch[2]);

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

        await autoUpdatePSList(client, psNumber);

        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {}
        }, 5000);

      } catch (error) {
        console.error(`Error checking PS${psNumber}:`, error);
        await message.reply(`❌ Gagal mengubah status di PS${psNumber}.`);
      }
      return;
    }

    const clearPSMatch = content.match(/^!clearps([1-7])$/);
    if (clearPSMatch) {
      const psNumber = parseInt(clearPSMatch[1]);

      try {
        const psData = await loadPSData(psNumber);
        psData.participants = [];
        await savePSData(psNumber, psData);

        const reply = await message.reply(`✅ Semua peserta di PS${psNumber} berhasil dihapus!`);

        await autoUpdatePSList(client, psNumber);

        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {}
        }, 5000);

      } catch (error) {
        console.error(`Error clearing PS${psNumber}:`, error);
        await message.reply(`❌ Gagal menghapus semua peserta di PS${psNumber}.`);
      }
      return;
    }

    // ORIGINAL COMMANDS FROM OLD BOT
    if (content === "!help") {
      await message.reply({
        content:
          `**Available Commands:**\n\n` +
          `**PS Management:**\n` +
          `\`!listps[1-7]\` - Show PS list\n` +
          `\`!addptops[1-7] @user roblox\` - Add participant\n` +
          `\`!removeps[1-7] <number>\` - Remove participant\n` +
          `\`!editps[1-7] <number> @user roblox\` - Edit participant\n` +
          `\`!checkps[1-7] <number>\` - Toggle status\n` +
          `\`!clearps[1-7]\` - Clear all\n\n` +
          `**Payment & Info:**\n` +
          `\`!qr\` - QR payment code\n` +
          `\`!pay2\` - DANA payment info\n` +
          `\`!ps\` - Private Server Link\n` +
          `\`!pd\` - Payment done message\n` +
          `\`!rbt\` - Read Before Transaction\n\n` +
          `**Order Formats:**\n` +
          `\`!orderx8\` - PT PT X8 order format\n` +
          `\`!orderitem\` - Item gift order format\n` +
          `\`!detail\` - Detail order form\n\n` +
          `**Redfinger:**\n` +
          `\`!rfjb\` - Redfinger Joki Before\n` +
          `\`!rfjd\` - Redfinger Joki Done\n` +
          `\`!rfcd\` - Redfinger Code Done\n` +
          `\`!rfjformat\` - Redfinger Joki Format\n` +
          `\`!rfformat\` - Redfinger Format\n` +
          `\`!rfcb\` - Redfinger Code Before\n` +
          `\`!rfcp\` - Redfinger Code Perpanjang\n\n` +
          `**Others:**\n` +
          `\`!halo\` - Welcome greeting\n` +
          `\`!makasi\` - Thank you message\n` +
          `\`!open\` - Store OPEN announcement\n` +
          `\`!close\` - Store CLOSE announcement\n` +
          `\`!image\` - Random image\n` +
          `\`!help\` - Show this message`,
      });
      return;
    }

    if (content === "!qr") {
      try {
        const attachment = new AttachmentBuilder(QR_IMAGE_PATH, { name: "j2y-crate-qr.jpg" });
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

    if (content === "!pay2") {
      try {
        const danaEmbed = new EmbedBuilder()
          .setColor('#9B59B6')
          .setTitle('💳 Metode Pembayaran DANA')
          .setDescription('⚠️ **QRIS (Payment 1) sedang OFF**\nGunakan DANA untuk sementara waktu!')
          .addFields(
            { name: '📱 Nomor DANA', value: '```081360705790```', inline: false },
            { name: '👤 Atas Nama', value: '```Josua Alex Franciskus Sibarani```', inline: false },
            { name: '📝 Petunjuk', value: '> • Transfer ke nomor DANA di atas\n> • Kirim bukti transfer di ticket ini\n> • Tunggu konfirmasi dari admin', inline: false }
          )
          .setFooter({ text: 'Payment Method 2 • QRIS akan aktif kembali segera!' })
          .setTimestamp();

        await message.reply({ embeds: [danaEmbed] });
      } catch (error) {
        console.error("Error sending DANA payment embed:", error);
        await message.reply("Sorry, I could not send the DANA payment info right now.");
      }
      return;
    }

    if (content === "!ps") {
      try {
        await message.reply({
          content: "**Private Server Link**\nhttps://www.roblox.com/share?code=f97e45ea97c78547854d616588a889ac&type=Server",
        });
      } catch (error) {
        console.error("Error sending PS Link:", error);
        await message.reply("Sorry, I could not send the PS link right now.");
      }
      return;
    }

    if (content === "!makasi") {
      try {
        await message.channel.send({
          content:
            "🙏 **Makasih banyak ya udah belanja di J2Y Crate** 💎\n\n" +
            "Kami apresiasi banget kepercayaan kamu 🤍\n" +
            "Kalau ada kendala, pertanyaan, atau butuh bantuan lanjutan,\n" +
            "langsung chat aja, jangan sungkan 💬✨\n\n" +
            "J2Y Crate selalu berusaha ngasih pelayanan terbaik buat setiap customer 🔥\n\n" +
            "Semoga puas yaa~\n" +
            "Ditunggu order selanjutnya, thanks udah support J2Y Crate! 🚀💜",
        });
      } catch (error) {
        console.error("Error sending thank you message:", error);
      }
      return;
    }

    if (content === "!rfjb") {
      try {
        await message.channel.send({
          content:
            "⚠ PENTING UNTUK DIBACA SEBELUM MEMBELI**\n\n" +
            "- Via login email jadi harus buat password di akun redfinger\n" +
            "- Estimasi pengerjaan 1 jam - 1 hari tergantung dari antrian\n" +
            "- Server dan androidnya random tidak bisa di pilih, sesuai dengan stock di Redfinger\n" +
            "- Wajib mengganti password setelah selesai joki\n\n" +
            "Tidak menerima komplain jika server dan android tidak sesuai dengan keinginan\n\n" +
            '✅ Jika setuju dengan ketentuan di atas bisa ketik "Setuju"',
        });
      } catch (error) {
        console.error("Error sending RFJB message:", error);
      }
      return;
    }

    if (content === "!rfjd") {
      try {
        await message.channel.send({
          content:
            "Done ya kak untuk Joki Redeem nya. Bisa di cek kembali di akun Redfinger kakak☺\n" +
            "Jangan lupa untuk mengganti password dan mengaktifkan kembali step 4-6 ya\n\n" +
            "Terima kasih sudah order di J2Y Crate 💜\n" +
            "Ditunggu next ordernya ya! 🙏🏻😄",
        });
      } catch (error) {
        console.error("Error sending RFJD message:", error);
      }
      return;
    }

    if (content === "!rfcd") {
      try {
        await message.channel.send({
          content:
            "Ini ya kak kode nya, kode nya bisa di klaim seperti di tutorial ya ☺\n\n" +
            "Jika pada saat redeem muncul notifikasi:\n" +
            '"Saat ini tidak ada ponsel cloud yang tersedia: 20000010"\n' +
            '"Insufficient cloud phone equipment"\n' +
            '"Telepon Awam kehabisan stock"\n' +
            '"No Cloud Phone Available"\n' +
            '"Insufficient Stock"\n' +
            '"Out of Stock"\n' +
            "Artinya tidak ada stock server, kodenya bisa di coba berkala sampai ada server yang restock.\n" +
            "Untuk jadwal restock servernya random ya jadi kodenya harus di coba berkala.\n\n" +
            "Jika pada saat redeem muncul notifikasi:\n" +
            '"Request too frequently, please try again"\n' +
            "Artinya di tunggu dulu beberapa menit, baru di coba redeem kembali\n\n" +
            "Terima kasih sudah order di J2Y Crate 💜\n" +
            "Ditunggu next ordernya ya! 🙏🏻😄",
        });
      } catch (error) {
        console.error("Error sending RFCD message:", error);
      }
      return;
    }

    if (content === "!rfjformat") {
      try {
        await message.channel.send({
          content: 
            "*FORMAT ORDER REDFINGER + JASA REDEEM — J2Y CRATE*\n\n" +
            "Jasa redeem / Jasa redeem + upgrade= \n" +
            "Email akun redfinger=\n" +
            "Password akun Redfinger=\n" +
            "Tipe= VIP\n" +
            "Durasi (7 Days / 30 Days / 90 Days)=30\n\n" +
            "Server dan android nya random tidak bisa di pilih, sesuai dengan stock di Redfingernya"
        });
      } catch (error) {
        console.error("Error sending RFJFORMAT message:", error);
      }
      return;
    }

    if (content === "!rfformat") {
      try {
        await message.channel.send({
          content: 
            "🎮 FORMAT ORDER REDFINGER – J2Y CRATE**\n\n" +
            "Device baru / perpanjang device= \n" +
            "Tipe (VIP / KVIP / SVIP) =\n" +
            "Android (10/12) untuk device redfinger = \n" +
            "Durasi (7 Days / 30 Days / 90 Days)=7"
        });
      } catch (error) {
        console.error("Error sending RFFORMAT message:", error);
      }
      return;
    }

    if (content === "!rfcb") {
      try {
        await message.channel.send({
          content: 
            "⚠ PENTING UNTUK DIBACA SEBELUM MEMBELI**\n\n" +
            "📍 UNTUK DEVICE BARU**\n" +
            "Sebelum membeli, harap pahami terlebih dahulu tentang server.\n" +
            "- Pemilihan server dilakukan saat proses redeem code.\n" +
            "- Kode nya harus di coba secara berkala sampai servernya restock.\n" +
            "- Sistem stock server dari Redfinger rebutan jadi tidak bisa langsung di pakai.\n" +
            "Masa aktif dimulai setelah kode berhasil di redeem. Kadarluarsa kode 1 bulan\n\n" +
            "Membeli bearti sudah paham tentang stock server di Redfinger susah di dapat.\n" +
            "Tidak menerima komplain jika setelah membeli tidak dapat2 server\n" +
            "Kode yang di berikan valid dan tidak bisa di refund / di tukar dengan alasan apapun\n\n" +
            "✅ Jika setuju dengan ketentuan di atas bisa ketik \"Setuju\""
        });
      } catch (error) {
        console.error("Error sending RFCB message:", error);
      }
      return;
    }

    if (content === '!rfcp') {
      try {
        await message.channel.send({
          content: 
            "⚠️ **PENTING UNTUK DIBACA SEBELUM MEMBELI**\n\n" +
            "📍 **UNTUK PERPANJANG DEVICE**\n" +
            "- Harus menggunakan tipe dan versi Android yang sama.\n" +
            "- Pastikan masih ada sisa masa aktif sebelum melakukan perpanjangan.\n" +
            "- Masa aktif akan ditambahkan sesuai durasi yang dibeli.\n\n" +
            "✅ Jika setuju dengan ketentuan di atas bisa ketik \"Setuju\""
        });
      } catch (error) {
        console.error("Error sending RFCP message:", error);
      }
      return;
    }

    if (content === '!rbt') {
      try {
        await message.channel.send({
          embeds: [{
            color: 0x9b59b6,
            title: "🚨 READ BEFORE TRANSACTION – J2Y CRATE 🚨",
            description: 
              "**🔒 WAJIB MM J2Y (KHUSUS JB)**\n" +
              "Semua transaksi **HARUS** menggunakan Middleman (MM) resmi J2Y.\n" +
              "Jika tidak menggunakan MM J2Y dan terjadi penipuan, itu bukan tanggung jawab admin.\n\n" +
              
              "**📩 NO DM / OUTSIDE PLATFORM**\n" +
              "J2Y Crate **TIDAK** menerima order melalui DM atau aplikasi lain.\n" +
              "Semua order **HANYA** melalui Discord resmi J2Y Crate.\n\n",
            
            fields: [
              {
                name: "💳 PAYMENT INFORMATION",
                value: 
                  "Pembayaran **HANYA DITERIMA** melalui:\n\n" +
                  "✅ **QRIS**\n" +
                  "Atas Nama: Tiga Dara Store\n\n" +
                  "✅ **DANA**\n" +
                  "081360705790\n" +
                  "Atas Nama: Josua Alex Franciskus Sibarani\n\n" +
                  "❗ Pembayaran di luar metode di atas **TIDAK DIANGGAP SAH**.\n" +
                  "❗ Kerugian akibat transfer ke rekening lain bukan tanggung jawab admin.",
                inline: false
              },
              {
                name: "🔗 Detail Rules",
                value: "[Klik di sini](https://discord.com/channels/1437084504538742836/1447876608512888915)",
                inline: false
              }
            ],
            footer: {
              text: "Terima kasih sudah bertransaksi di J2Y Crate 💜"
            },
            timestamp: new Date()
          }]
        });
      } catch (error) {
        console.error("Error sending RBT message:", error);
      }
      return;
    }

    if (content === '!orderitem') {
      try {
        await message.channel.send({
          content:
            "📋 **FORMAT ORDER ITEM GIFT — J2Y CRATE**\n\n" +
            "```\n" +
            "Nama Item:\n" +
            "Username & Displayname:\n" +
            "Jumlah Item:\n" +
            "Jumlah Akun:\n" +
            "```\n" +
            "**Note:** Copy dan isi sendiri"
        });
      } catch (error) {
        console.error("Error sending ORDERITEM message:", error);
      }
      return;
    }

    if (content === '!pd') {
      try {
        await message.channel.send({
          content: 
            "Baik kak, pembayaran sudah di terima ya 🙏🏻☺️\n" +
            "Mohon menunggu☺️"
        });
      } catch (error) {
        console.error("Error sending PD message:", error);
      }
      return;
    }

    if (content === '!halo') {
      try {
        await message.channel.send({
          content: 
            "Halo! 👋\n" +
            "Selamat datang di J2Y Crate 💜\n" +
            "Mau order apa hari ini? Silakan jelaskan kebutuhan kamu ya ✨"
        });
      } catch (error) {
        console.error("Error sending HALO message:", error);
      }
      return;
    }

    if (content === '!orderx8') {
      try {
        await message.channel.send({
          content: 
            "📋 **FORMAT ORDER PT PT X8 — J2Y CRATE**\n\n" +
            "```\n" +
            "Durasi (12 Jam/24 Jam/48 Jam):\n" +
            "Tanggal dimulai:\n" +
            "Metode (Murni/Gaya Bebas):\n" +
            "Quantity (Jumlah Account):\n" +
            "Username and Displayname:\n" +
            "```\n" +
            "**Note:** Copy text dan isi sendiri"
        });
      } catch (error) {
        console.error("Error sending ORDERX8 format:", error);
      }
      return;
    }

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
      }
      return;
    }

    if (content === "!open") {
      try {
        await message.delete();

        const attachment = new AttachmentBuilder(OPEN_BANNER_PATH, { name: "store-open.jpg" });
        
        await message.channel.send({
          content: "@everyone 🎉 **STORE OPEN!** 🎉\n\n🛒 We're now accepting orders!\n💫 Come and shop with us!",
          files: [attachment],
        });
      } catch (error) {
        console.error("Error sending OPEN announcement:", error);
      }
      return;
    }

    if (content === "!close") {
      try {
        await message.delete();

        const attachment = new AttachmentBuilder(CLOSE_BANNER_PATH, { name: "store-close.jpg" });
        
        await message.channel.send({
          content: "@everyone 🔒 **STORE CLOSED!** 🔒\n\n😴 We're currently closed\n💤 See you next time!",
          files: [attachment],
        });
      } catch (error) {
        console.error("Error sending CLOSE announcement:", error);
      }
      return;
    }

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
      }
      return;
    }
  });

  // INTERACTION HANDLERS (Buttons & Modals)
  client.on('interactionCreate', async (interaction) => {
    try {
      const ALLOWED_ROLE_IDS = ["1437084858798182501", "1449427010488111267", "1448227813550198816"];
      const member = interaction.member as any;
      const hasAllowedRole = member?.roles?.cache?.some((role: any) => ALLOWED_ROLE_IDS.includes(role.id));

      // ADD BUTTON
      const addMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_add$/);
      if (addMatch) {
        const psNumber = parseInt(addMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);
        if (psData.participants.length >= 19) {
          await interaction.reply({ content: `❌ PS${psNumber} sudah penuh!`, ephemeral: true });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`ps${psNumber}_add_modal`)
          .setTitle(`➕ Add Peserta PS${psNumber}`);

        const userInput = new TextInputBuilder()
          .setCustomId('user_mention')
          .setLabel('Discord User (mention @user)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const robloxInput = new TextInputBuilder()
          .setCustomId('roblox_usn')
          .setLabel('Roblox Username')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(userInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(robloxInput);

        modal.addComponents(row1, row2);
        await interaction.showModal(modal);
      }

      // EDIT BUTTON
      const editMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_edit$/);
      if (editMatch) {
        const psNumber = parseInt(editMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);
        if (psData.participants.length === 0) {
          await interaction.reply({ content: `❌ PS${psNumber} kosong!`, ephemeral: true });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`ps${psNumber}_edit_modal`)
          .setTitle(`✏️ Edit Peserta PS${psNumber}`);

        const numberInput = new TextInputBuilder()
          .setCustomId('slot_number')
          .setLabel('Nomor Peserta (1-19)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const userInput = new TextInputBuilder()
          .setCustomId('user_mention')
          .setLabel('Discord User Baru')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const robloxInput = new TextInputBuilder()
          .setCustomId('roblox_usn')
          .setLabel('Roblox Username Baru')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(userInput);
        const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(robloxInput);

        modal.addComponents(row1, row2, row3);
        await interaction.showModal(modal);
      }

      // REMOVE BUTTON
      const removeMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_remove$/);
      if (removeMatch) {
        const psNumber = parseInt(removeMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);
        if (psData.participants.length === 0) {
          await interaction.reply({ content: `❌ PS${psNumber} kosong!`, ephemeral: true });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`ps${psNumber}_remove_modal`)
          .setTitle(`🗑️ Remove Peserta PS${psNumber}`);

        const numberInput = new TextInputBuilder()
          .setCustomId('slot_number')
          .setLabel('Nomor Peserta (1-19)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput);
        modal.addComponents(row1);
        await interaction.showModal(modal);
      }

      // TOGGLE BUTTON
      const toggleMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_toggle$/);
      if (toggleMatch) {
        const psNumber = parseInt(toggleMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);
        if (psData.participants.length === 0) {
          await interaction.reply({ content: `❌ PS${psNumber} kosong!`, ephemeral: true });
          return;
        }

        const modal = new ModalBuilder()
          .setCustomId(`ps${psNumber}_toggle_modal`)
          .setTitle(`✅ Toggle Status PS${psNumber}`);

        const numberInput = new TextInputBuilder()
          .setCustomId('slot_number')
          .setLabel('Nomor Peserta (1-19)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput);
        modal.addComponents(row1);
        await interaction.showModal(modal);
      }

      // EDIT INFO BUTTON
      const editInfoMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_edit_info$/);
      if (editInfoMatch) {
        const psNumber = parseInt(editInfoMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
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

      // CLEAR BUTTON
      const clearMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_clear$/);
      if (clearMatch) {
        const psNumber = parseInt(clearMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
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

      // CLEAR CONFIRM
      const clearConfirmMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_clear_confirm$/);
      if (clearConfirmMatch) {
        const psNumber = parseInt(clearConfirmMatch[1]);

        if (!hasAllowedRole) {
          await interaction.update({ content: "⛔ *Akses Ditolak!*", components: [] });
          return;
        }

        const psData = await loadPSData(psNumber);
        psData.participants = [];
        await savePSData(psNumber, psData);

        await interaction.update({ content: `✅ Semua peserta di PS${psNumber} berhasil dihapus!`, components: [] });
        await autoUpdatePSList(interaction.client, psNumber);
      }

      // CLEAR CANCEL
      const clearCancelMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_clear_cancel$/);
      if (clearCancelMatch) {
        await interaction.update({ content: "❌ Dibatalkan.", components: [] });
      }

      // TAG EVERYONE BUTTON
      const tagEveryoneMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_tag_everyone$/);
      if (tagEveryoneMatch) {
        const psNumber = parseInt(tagEveryoneMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
          return;
        }

        const embed = await generatePSListEmbed(psNumber);

        await interaction.channel?.send({
          content: `@everyone 📢 **LIST PESERTA PS${psNumber} UPDATE!**`,
          embeds: [embed]
        });

        await interaction.reply({ content: `✅ Berhasil tag @everyone dengan list PS${psNumber}!`, ephemeral: true });
      }

      // ADD MODAL SUBMIT
      const addModalMatch = interaction.type === InteractionType.ModalSubmit && interaction.customId.match(/^ps(\d+)_add_modal$/);
      if (addModalMatch) {
        const psNumber = parseInt(addModalMatch[1]);
        
        const userMention = interaction.fields.getTextInputValue('user_mention');
        const robloxUsn = interaction.fields.getTextInputValue('roblox_usn');

        const psData = await loadPSData(psNumber);

        if (psData.participants.length >= 19) {
          await interaction.reply({ content: `❌ PS${psNumber} sudah penuh!`, ephemeral: true });
          return;
        }

        let userId = '';
        let discordName = '';
        
        const mentionMatch = userMention.match(/<@!?(\d+)>/);
        if (mentionMatch) {
          userId = mentionMatch[1];
          try {
            const user = await interaction.client.users.fetch(userId);
            const guild = interaction.guild;
            if (guild) {
              const member = await guild.members.fetch(userId);
              discordName = member.displayName || user.username;
            } else {
              discordName = user.username;
            }
          } catch (error) {
            discordName = userMention;
          }
        } else {
          discordName = userMention.replace('@', '');
        }

        const nextSlot = psData.participants.length + 1;

        psData.participants.push({ userId, discordName, robloxUsn, status: true });
        await savePSData(psNumber, psData);

        const mention = userId ? `<@${userId}>` : discordName;
        await interaction.reply({ content: `✅ Berhasil menambahkan ${mention} (${robloxUsn}) ke PS${psNumber} nomor ${nextSlot}!`, ephemeral: true });

        await autoUpdatePSList(interaction.client, psNumber);
      }

      // EDIT MODAL SUBMIT
      const editModalMatch = interaction.type === InteractionType.ModalSubmit && interaction.customId.match(/^ps(\d+)_edit_modal$/);
      if (editModalMatch) {
        const psNumber = parseInt(editModalMatch[1]);
        
        const slotNumber = parseInt(interaction.fields.getTextInputValue('slot_number'));
        const userMention = interaction.fields.getTextInputValue('user_mention');
        const robloxUsn = interaction.fields.getTextInputValue('roblox_usn');

        if (isNaN(slotNumber)) {
          await interaction.reply({ content: "❌ Nomor tidak valid!", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);

        if (slotNumber < 1 || slotNumber > psData.participants.length) {
          await interaction.reply({ content: `❌ Nomor tidak valid! PS${psNumber} hanya punya ${psData.participants.length} peserta.`, ephemeral: true });
          return;
        }

        let userId = '';
        let discordName = '';
        
        const mentionMatch = userMention.match(/<@!?(\d+)>/);
        if (mentionMatch) {
          userId = mentionMatch[1];
          try {
            const user = await interaction.client.users.fetch(userId);
            const guild = interaction.guild;
            if (guild) {
              const member = await guild.members.fetch(userId);
              discordName = member.displayName || user.username;
            } else {
              discordName = user.username;
            }
          } catch (error) {
            discordName = userMention;
          }
        } else {
          discordName = userMention.replace('@', '');
        }

        psData.participants[slotNumber - 1] = {
          userId,
          discordName,
          robloxUsn,
          status: psData.participants[slotNumber - 1].status
        };

        await savePSData(psNumber, psData);
        await interaction.reply({ content: `✅ Data peserta nomor ${slotNumber} di PS${psNumber} berhasil diubah!`, ephemeral: true });
        await autoUpdatePSList(interaction.client, psNumber);
      }

      // REMOVE MODAL SUBMIT
      const removeModalMatch = interaction.type === InteractionType.ModalSubmit && interaction.customId.match(/^ps(\d+)_remove_modal$/);
      if (removeModalMatch) {
        const psNumber = parseInt(removeModalMatch[1]);
        
        const slotNumber = parseInt(interaction.fields.getTextInputValue('slot_number'));

        if (isNaN(slotNumber)) {
          await interaction.reply({ content: "❌ Nomor tidak valid!", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);

        if (slotNumber < 1 || slotNumber > psData.participants.length) {
          await interaction.reply({ content: `❌ Nomor tidak valid! PS${psNumber} hanya punya ${psData.participants.length} peserta.`, ephemeral: true });
          return;
        }

        const removed = psData.participants.splice(slotNumber - 1, 1)[0];
        await savePSData(psNumber, psData);

        const mention = removed.userId ? `<@${removed.userId}>` : removed.discordName;
        await interaction.reply({ content: `✅ Berhasil menghapus ${mention} dari PS${psNumber}!`, ephemeral: true });
        await autoUpdatePSList(interaction.client, psNumber);
      }

      // TOGGLE MODAL SUBMIT
      const toggleModalMatch = interaction.type === InteractionType.ModalSubmit && interaction.customId.match(/^ps(\d+)_toggle_modal$/);
      if (toggleModalMatch) {
        const psNumber = parseInt(toggleModalMatch[1]);
        
        const slotNumber = parseInt(interaction.fields.getTextInputValue('slot_number'));

        if (isNaN(slotNumber)) {
          await interaction.reply({ content: "❌ Nomor tidak valid!", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);

        if (slotNumber < 1 || slotNumber > psData.participants.length) {
          await interaction.reply({ content: `❌ Nomor tidak valid! PS${psNumber} hanya punya ${psData.participants.length} peserta.`, ephemeral: true });
          return;
        }

        psData.participants[slotNumber - 1].status = !psData.participants[slotNumber - 1].status;
        await savePSData(psNumber, psData);

        const newStatus = psData.participants[slotNumber - 1].status ? "✅" : "❌";
        await interaction.reply({ content: `✅ Status peserta nomor ${slotNumber} di PS${psNumber} diubah menjadi ${newStatus}!`, ephemeral: true });
        await autoUpdatePSList(interaction.client, psNumber);
      }

      // EDIT INFO MODAL SUBMIT
      const editInfoModalMatch = interaction.type === InteractionType.ModalSubmit && interaction.customId.match(/^ps(\d+)_edit_info_modal$/);
      if (editInfoModalMatch) {
        const psNumber = parseInt(editInfoModalMatch[1]);
        
        const title = interaction.fields.getTextInputValue('info_title');
        const infoText = interaction.fields.getTextInputValue('info_text');

        const psData = await loadPSData(psNumber);
        psData.announcement = { title, infoText };
        await savePSData(psNumber, psData);

        await interaction.reply({ content: `✅ Info PS${psNumber} berhasil diubah!`, ephemeral: true });
        await autoUpdatePSList(interaction.client, psNumber);
      }

      // DETAIL ORDER MODAL
      if (interaction.isButton() && interaction.customId === 'open_detail_modal') {
        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
          return;
        }
        
        const modal = new ModalBuilder()
          .setCustomId('detail_order_modal')
          .setTitle('Detail Order');

        const itemInput = new TextInputBuilder()
          .setCustomId('item_input')
          .setLabel('Item/Product Name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const netAmountInput = new TextInputBuilder()
          .setCustomId('net_amount_input')
          .setLabel('Net Amount (Rp)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const notesInput = new TextInputBuilder()
          .setCustomId('notes_input')
          .setLabel('Additional Notes (Optional)')
          .setStyle(TextInputStyle.Paragraph)
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

  // Auto-rename Ticket King channels
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

  // Login
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Login timeout after 30 seconds")), 30000);
  });

  try {
    await Promise.race([client.login(token), timeoutPromise]);

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
    try {
      await client.destroy();
    } catch (destroyError) {
      console.error("Error destroying client:", destroyError);
    }
    throw error;
  }

  return client;
}
