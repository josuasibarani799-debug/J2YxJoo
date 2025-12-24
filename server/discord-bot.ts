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

// Generate list embed with nomor 20 editable
async function generatePSListEmbed(psNumber: number): Promise<EmbedBuilder> {
  const psData = await loadPSData(psNumber);
  
  const embed = new EmbedBuilder()
    .setColor('#2F3136')
    .setTitle(psData.announcement.title)
    .setTimestamp();

  let listText = "";
  
  // Track which userIds have been mentioned already
  const mentionedUserIds = new Set<string>();
  
  // Count actual participants (non-empty slots)
  let actualCount = 0;
  for (let i = 0; i < 20; i++) {
    if (i < psData.participants.length) {
      const p = psData.participants[i];
      // Check if slot is actually filled (not just a placeholder)
      if (p.discordName !== '-' && p.discordName !== '' && p.discordName) {
        const status = p.status ? "✅" : "❌";
        const roblox = p.robloxUsn || '-';
        
        // If user has userId and it's their first appearance, use mention
        // Otherwise use @displayName (plain text with @)
        let displayName;
        if (p.userId && !mentionedUserIds.has(p.userId)) {
          displayName = `<@${p.userId}>`;
          mentionedUserIds.add(p.userId);
        } else {
          // Plain text with @ prefix
          displayName = `@${p.discordName}`;
        }
        
        listText += `${i + 1}. ${displayName} ${roblox} ${status}\n`;
        actualCount++;
      } else {
        listText += `${i + 1}. -\n`;
      }
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
  embed.setFooter({ text: `PS${psNumber} • Total Peserta: ${actualCount}/20` });

  return embed;
}

// Generate admin buttons (ONLY Edit and Toggle)
function generatePSAdminButtons(psNumber: number) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_edit`)
      .setLabel('✏️ Edit')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ps${psNumber}_toggle`)
      .setLabel('✅ Toggle Status')
      .setStyle(ButtonStyle.Success),
  );

  return [row];
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
          sentMessage = await message.channel.send({ embeds: [embed], components: buttons });
        } else {
          sentMessage = await message.channel.send({ embeds: [embed] });
        }

        const psData = await loadPSData(psNumber);
        psData.lastListMessageId = sentMessage.id;
        psData.lastListChannelId = message.channel.id;
        await savePSData(psNumber, psData);

      } catch (error) {
        console.error(`Error showing PS${psNumber} list:`, error);
        await message.channel.send(`❌ Gagal menampilkan list PS${psNumber}.`);
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

    // PS MANAGEMENT COMMANDS - ONLY addptops (with strict validation)
    const addPSMatch = content.match(/^!addptops([1-7])\s/);
    if (addPSMatch) {
      const psNumber = parseInt(addPSMatch[1]);
      
      try {
        const parts = message.content.split(" ");
        if (parts.length < 3) {
          await message.channel.send(`❌ Format salah! Gunakan: \`!addptops${psNumber} @user RobloxUsername\``);
          return;
        }

        const robloxUsn = parts.slice(2).join(" ");
        const psData = await loadPSData(psNumber);

        // Count actual participants (not placeholders)
        const actualCount = psData.participants.filter(p => 
          p.discordName !== '-' && p.discordName !== ''
        ).length;

        if (actualCount >= 20) {
          await message.channel.send(`❌ PS${psNumber} sudah penuh! (Maksimal 20 peserta)`);
          return;
        }

        // STRICT VALIDATION: Must mention valid user
        if (message.mentions.users.size === 0) {
          await message.channel.send("❌ Kamu harus mention user! Contoh: `!addptops1 @user RobloxUsername`");
          return;
        }

        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
          await message.channel.send("❌ User tidak ditemukan!");
          return;
        }

        const userId = mentionedUser.id;
        
        // STRICT VALIDATION: User must exist in guild
        let discordName = '';
        try {
          const member = await message.guild?.members.fetch(userId);
          if (!member) {
            await message.channel.send("❌ User tidak ada di server! Pastikan user masih member.");
            return;
          }
          discordName = member.displayName || mentionedUser.username;
        } catch (error) {
          await message.channel.send("❌ Tidak bisa fetch user! Pastikan user masih di server.");
          return;
        }

        // Find first empty slot (slot with placeholder)
        let slotIndex = -1;
        for (let i = 0; i < psData.participants.length; i++) {
          if (psData.participants[i].discordName === '-' || psData.participants[i].discordName === '') {
            slotIndex = i;
            break;
          }
        }

        // If found empty slot, use it. Otherwise add to end
        if (slotIndex !== -1) {
          psData.participants[slotIndex] = {
            userId,
            discordName,
            robloxUsn,
            status: true
          };
        } else {
          psData.participants.push({
            userId,
            discordName,
            robloxUsn,
            status: true
          });
          slotIndex = psData.participants.length - 1;
        }

        const nextSlot = slotIndex + 1;
        await savePSData(psNumber, psData);

        const mention = `<@${userId}>`;
        const reply = await message.channel.send(`✅ Berhasil menambahkan ${mention} (${robloxUsn}) ke PS${psNumber} nomor ${nextSlot}!`);
        await autoUpdatePSList(client, psNumber);

        setTimeout(async () => {
          try {
            await message.delete();
            await reply.delete();
          } catch (error) {}
        }, 5000);

      } catch (error) {
        console.error(`Error adding to PS${psNumber}:`, error);
        await message.channel.send(`❌ Gagal menambahkan peserta ke PS${psNumber}.`);
      }
      return;
    }
    
    // LIST PS COMMAND

    // ORIGINAL COMMANDS FROM OLD BOT
    if (content === "!help") {
      await message.reply({
        content:
          `**Available Commands:**\n\n` +
          `**PS Management:**\n` +
          `\`!listps[1-7]\` - Show PS list (use buttons to Edit/Toggle)\n` +
          `\`!addptops[1-7] @user roblox\` - Quick add (must mention valid user)\n\n` +
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
        if (psData.participants.length >= 20) {
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

      // EDIT BUTTON - Full text editor for entire list
      const editMatch = interaction.isButton() && interaction.customId.match(/^ps(\d+)_edit$/);
      if (editMatch) {
        const psNumber = parseInt(editMatch[1]);

        if (!hasAllowedRole) {
          await interaction.reply({ content: "⛔ *Akses Ditolak!*", ephemeral: true });
          return;
        }

        const psData = await loadPSData(psNumber);
        
        // Generate current list content as plain text
        let currentContent = `${psData.announcement.title}\n\n`;
        
        for (let i = 0; i < 20; i++) {
          if (i < psData.participants.length && psData.participants[i].discordName !== '-' && psData.participants[i].discordName !== '') {
            const p = psData.participants[i];
            const status = p.status ? "✅" : "❌";
            currentContent += `${i + 1}. ${p.discordName} ${p.robloxUsn} ${status}\n`;
          } else {
            currentContent += `${i + 1}. -\n`;
          }
        }
        
        currentContent += `\n📢 Info\n${psData.announcement.infoText}`;

        const modal = new ModalBuilder()
          .setCustomId(`ps${psNumber}_edit_full_modal`)
          .setTitle(`✏️ Edit List PS${psNumber}`);

        const contentInput = new TextInputBuilder()
          .setCustomId('full_content')
          .setLabel('Edit Seluruh List (Bebas ubah apa aja)')
          .setStyle(TextInputStyle.Paragraph)
          .setValue(currentContent)
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput);
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

        const modal = new ModalBuilder()
          .setCustomId(`ps${psNumber}_toggle_modal`)
          .setTitle(`✅ Toggle Status PS${psNumber}`);

        const numberInput = new TextInputBuilder()
          .setCustomId('slot_number')
          .setLabel('Nomor Peserta (1-20)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput);
        modal.addComponents(row1);
        await interaction.showModal(modal);
      }

      // EDIT FULL LIST MODAL SUBMIT
      const editFullModalMatch = interaction.type === InteractionType.ModalSubmit && interaction.customId.match(/^ps(\d+)_edit_full_modal$/);
      if (editFullModalMatch) {
        const psNumber = parseInt(editFullModalMatch[1]);
        
        const fullContent = interaction.fields.getTextInputValue('full_content');
        
        try {
          const lines = fullContent.split('\n').map(l => l.trim()).filter(l => l);
          
          // Parse title (first line)
          const title = lines[0] || `OPEN PT PT X8 - PS${psNumber}`;
          
          // Parse participants (lines that start with number)
          const participants: Participant[] = [];
          for (let i = 0; i < 20; i++) {
            participants.push({
              userId: '',
              discordName: '-',
              robloxUsn: '-',
              status: false
            });
          }
          
          for (const line of lines) {
            const match = line.match(/^(\d+)\.\s*(.+)$/);
            if (match) {
              const slotNum = parseInt(match[1]);
              const content = match[2].trim();
              
              if (slotNum >= 1 && slotNum <= 20 && content !== '-') {
                // Parse: "username roblox ✅/❌"
                const parts = content.split(/\s+/);
                if (parts.length >= 1) {
                  const discordName = parts[0].replace('@', '');
                  const hasCheckmark = content.includes('✅');
                  const hasCross = content.includes('❌');
                  const status = hasCheckmark || !hasCross;
                  
                  // Find roblox username (everything except first part and status)
                  let robloxUsn = '-';
                  if (parts.length >= 2) {
                    // Remove status emoji from last part if exists
                    const filtered = parts.slice(1).filter(p => p !== '✅' && p !== '❌');
                    robloxUsn = filtered.join(' ') || '-';
                  }
                  
                  participants[slotNum - 1] = {
                    userId: '',
                    discordName,
                    robloxUsn,
                    status
                  };
                }
              }
            }
          }
          
          // Parse info (after "📢 Info" or "Info")
          let infoText = 'YANG MAU IKUTAN LANGSUNG KE 🎫 [TICKET]';
          const infoIndex = lines.findIndex(l => l.includes('Info') || l.includes('📢'));
          if (infoIndex !== -1 && infoIndex < lines.length - 1) {
            infoText = lines.slice(infoIndex + 1).join('\n');
          }
          
          const psData = await loadPSData(psNumber);
          psData.participants = participants;
          psData.announcement = { title, infoText };
          
          await savePSData(psNumber, psData);
          await interaction.reply({ content: `✅ List PS${psNumber} berhasil diubah!`, ephemeral: true });
          await autoUpdatePSList(interaction.client, psNumber);
        } catch (error) {
          console.error('Error parsing edit:', error);
          await interaction.reply({ content: '❌ Gagal parse content! Pastikan format benar.', ephemeral: true });
        }
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
