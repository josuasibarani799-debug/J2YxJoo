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
  EmbedBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import path from "path";

// Path to custom QR code image
const QR_IMAGE_PATH = path.join(process.cwd(), "attached_assets/QR_1765562456554.jpg");
// Path to OPEN and CLOSE banner images
const OPEN_BANNER_PATH = path.join(process.cwd(), "attached_assets/open_banner.jpg");
const CLOSE_BANNER_PATH = path.join(process.cwd(), "attached_assets/close_banner.jpg");
// Path to PRICELIST image
const PRICELIST_IMAGE_PATH = path.join(process.cwd(), "attached_assets/pricelist_j2y.jpeg");
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

  // Map to track active auto-refresh intervals per channel
  const activeIntervals = new Map<string, NodeJS.Timeout>();

  // Map to track bukti transaksi image URLs per user ID
  const userImageUrls = new Map<string, string>();

  // Map to track selected items for order modal (avoid 100 char limit)
  const selectedItemsStore = new Map<string, string[]>();

  // Map to track active order sessions per channel (untuk validasi payment flow)
  const activeOrders = new Map<string, { 
    userId: string; 
    total: number; 
    timestamp: number;
    paymentViewed: boolean; // Track apakah user sudah lihat payment options
    orderType: 'item' | 'ptpt'; // Track order type untuk testimoni logic
  }>();

  // Admin role IDs untuk bypass flow
  const ADMIN_ROLE_IDS = [
    '1437084858798182501',
    '1448227813550198816'
  ];

  // Helper function to check if user is admin
  function isAdmin(member: any): boolean {
    return member?.roles?.cache?.some((role: any) => ADMIN_ROLE_IDS.includes(role.id));
  }

  // Helper function to check if channel is a ticket channel
  function isTicketChannel(channel: any): boolean {
    if (!channel || !channel.name) return false;
    const channelName = channel.name.toLowerCase();
    // Check if channel name contains "ticket" or is in ticket category
    return channelName.includes('ticket') || channelName.startsWith('ticket-');
  }

  // Auto-cleanup Maps setiap 1 jam untuk prevent memory leak
  setInterval(() => {
    // Cleanup selectedItemsStore (expire after 5 minutes - short session)
    // Note: selectedItemsStore sudah auto-delete setelah dipakai
    
    // Optional: Jika mau track timestamps untuk cleanup lebih advanced
    console.log(`🧹 Maps status: userImageUrls=${userImageUrls.size}, selectedItems=${selectedItemsStore.size}, intervals=${activeIntervals.size}`);
  }, 3600000); // Check every 1 hour

  // Set up all event handlers BEFORE login
  client.once("ready", () => {
    console.log(`✅ Discord bot logged in as ${client.user?.tag}`);
    console.log("Available commands:");
    console.log(
      "  !image [category] - Send a random image (cat, dog, nature, random)",
    );
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
    // Only check roles if message is a command (excluding !jo, !yanlopkal, and !wild)
    if (content.startsWith("!")) {
      // Multiple allowed role IDs
      const ALLOWED_ROLE_IDS = [
        "1437084858798182501",
        "1448227813550198816"
      ];

      // Check if user has any of the allowed roles
      const hasAllowedRole = message.member?.roles.cache.some((role) =>
        ALLOWED_ROLE_IDS.includes(role.id),
      );

      if (!hasAllowedRole) {
        const reply = await message.channel.send(
          "⛔ *Akses Ditolak!*\nGABISA YA?? WKWKKWWKK.",
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
          `\`!qr\` - Send the J2Y CRATE QR payment code\n` +
          `\`!ps\` - Send The Private Server Link\n` +
          `\`!makasi\` - Send a thank you message\n` +
          `\`!jo\` - Send a Josua appreciation message\n` +
          `\`!image\` - Send a random image\n` +
          `\`!image cat\` - Send a cat image\n` +
          `\`!image dog\` - Send a dog image\n` +
          `\`!image nature\` - Send a nature image\n` +
          `\`!image random\` - Send a random image\n` +
          `\`!help\` - Show this help message`,
      });
      return;
    }
    // QR code command - sends custom QR image
    if (content === "!qr") {
      try {
        const attachment = new AttachmentBuilder(QR_IMAGE_PATH, {
          name: "jx'o-crate-qr.jpg",
        });
        await message.reply({
          content: "**J2Y CRATE - jx'o store**\nScan QR to pay:",
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
    console.error("Error sending DANA payment embed:", error);
    await message.reply("Sorry, I could not send the DANA payment info right now.");
  }
  return;
}
    //PS command - sends Private Server Link
    if (content === "!ps") {
      try {
        await message.reply({
          content:
            "**Private Server Link**\nhttps://www.roblox.com/share?code=d46557daa10ac04288675f9be0e47f3f&type=Server",
        });
      } catch (error) {
        console.error("Error sending PS Link:", error);
        await message.reply("Sorry, I could not send the PS link right now.");
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
    // Makasi command - Thank you message
    if (content === "!makasi") {
      try {
        await message.channel.send({
          content:
            "🙏 **Makasih banyak ya udah belanja di J2Y CRATE** 💎\n\n" +
            "Kami apresiasi banget kepercayaan kamu 🤍\n" +
            "Kalau ada kendala, pertanyaan, atau butuh bantuan lanjutan,\n" +
            "langsung chat aja, jangan sungkan 💬✨\n\n" +
            "J2Y CRATE selalu berusaha ngasih pelayanan terbaik buat setiap customer 🔥\n\n" +
            "Semoga puas yaa~\n" +
            "Ditunggu order selanjutnya, thanks udah support J2Y CRATE! 🚀",
        });
      } catch (error) {
        console.error("Error sending thank you message:", error);
        await message.channel.send(
          "Sorry, I could not send the message right now.",
        );
      }
      return;
    }
    // Jo command - Josua appreciation
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
    // RFJB command - Redfinger Joki Before (ketentuan)
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
        await message.channel.send(
          "Sorry, I could not send the message right now.",
        );
      }
      return;
    }
    // RFJD command - Redfinger Joki Done
    if (content === "!rfjd") {
      try {
        await message.channel.send({
          content:
            "Done ya kak untuk Joki Redeem nya. Bisa di cek kembali di akun Redfinger kakak☺\n" +
            "Jangan lupa untuk mengganti password dan mengaktifkan kembali step 4-6 ya\n\n" +
            "Terima kasih sudah order di J2Y CRATE\n" +
            "Ditunggu next ordernya ya! 🙏🏻",
        });
      } catch (error) {
        console.error("Error sending RFJD message:", error);
        await message.channel.send(
          "Sorry, I could not send the message right now.",
        );
      }
      return;
    }
    // RFCD command - Redfinger Code Done
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
            "Terima kasih sudah order di J2Y CRATE\n" +
            "Ditunggu next ordernya ya! 🙏🏻",
        });
      } catch (error) {
        console.error("Error sending RFCD message:", error);
        await message.channel.send(
          "Sorry, I could not send the message right now.",
        );
      }
      return;
    }
    // RFJFORMAT command - Redfinger Joki Format Order
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
            await message.channel.send("Sorry, I could not send the message right now.");
        }
        return;
    }
    // RFFORMAT command - Redfinger Format Order (device order)
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
            await message.channel.send("Sorry, I could not send the message right now.");
        }
        return;
    }
    // RFCB command - Redfinger Code Before (ketentuan device baru)
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
        await message.channel.send("Sorry, I could not send the message right now.");
      }
      return;
    }

    // RBT command - Read Before Transaction
    if (content === '!rbt') {
  try {
    await message.channel.send({
      embeds: [{
        color: 0x9b59b6, // Purple color
        title: "🚨 READ BEFORE TRANSACTION – J2Y CRATE 🚨",
        description: 
          "**🔒 WAJIB MM JX'O (KHUSUS JB)**\n" +
          "Semua transaksi **HARUS** menggunakan Middleman (MM) resmi JX'O.\n" +
          "Jika tidak menggunakan MM JX'O dan terjadi penipuan, itu bukan tanggung jawab admin.\n\n" +
          
          "**📩 NO DM / OUTSIDE PLATFORM**\n" +
          "J2Y CRATE **TIDAK** menerima order melalui DM atau aplikasi lain.\n" +
          "Semua order **HANYA** melalui Discord resmi J2Y CRATE.\n\n",
        
        fields: [
          {
            name: "💳 PAYMENT INFORMATION",
            value: 
              "Pembayaran **HANYA DITERIMA** melalui:\n\n" +
              "✅ **QRIS**\n" +
              "Atas Nama: jx'o store\n\n" +
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
          text: "Terima kasih sudah bertransaksi di J2Y CRATE"
        },
        timestamp: new Date()
      }]
    });
  } catch (error) {
    console.error("Error sending RBT message:", error);
    await message.channel.send("Sorry, I could not send the message right now.");
  }
  return;
}

    // RFCP command - Redfinger Code Perpanjang (extend device)
    if (content === '!rfcp') {
      try {
        await message.channel.send({
          content: 
            "⚠️ **PENTING UNTUK DIBACA SEBELUM MEMBELI**\n\n" +
            "📍 **UNTUK PERPANJANG DEVICE**\n" +
            "- Harus menggunakan tipe dan versi Android yang sama.\n" +
            "- Pastikan masih ada sisa masa aktif sebelum melakukan perpanjangan.\n" +
            "- Tidak perlu memilih server lagi.\n\n" +
            "Masa aktif dimulai setelah kode berhasil di-redeem. Kadarluarsa kode 1 bulan\n\n" +
            "Pastikan sama tipe dan android, dan masih ada masa aktif\n" +
            "Kode yang di berikan valid dan tidak bisa di refund / di tukar dengan alasan apapun\n\n" +
            "✅ Jika setuju dengan ketentuan di atas bisa ketik \"Setuju\""
        });
      } catch (error) {
        console.error("Error sending RFCP message:", error);
        await message.channel.send("Sorry, I could not send the message right now.");
      }
      return;
    }

    /// ORDER ITEM GIFT command
if (content === '!orderitem') {
  // Only allow in ticket channels
  if (!isTicketChannel(message.channel)) {
    return; // Silently ignore in non-ticket channels
  }

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
        console.error("Error sending PD message:", error);
        await message.channel.send("Sorry, I could not send the message right now.");
      }
      return;
    }

    // DETAIL command - Order detail form (Admin/Owner only)
if (content === '!detail') {
  try {
    // Check if user has allowed role
    const ALLOWED_ROLE_IDS = [
        "1437084858798182501",
        "1448227813550198816"
      ];

    const hasAllowedRole = message.member?.roles.cache.some((role) =>
      ALLOWED_ROLE_IDS.includes(role.id),
    );

    if (!hasAllowedRole) {
      const reply = await message.channel.send(
        "⛔ *Akses Ditolak!*\nKAGA USAH IKUTAN JING.",
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

    const button = new ButtonBuilder()
      .setCustomId('open_detail_modal')
      .setLabel('📝 Fill Detail Order')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

   // Send button (not reply to avoid "deleted message" notification)
await message.channel.send({
  content: '**Detail Order Form**\nKlik button di bawah untuk isi detail order:',
  components: [row],
});

// Delete command message after a delay
setTimeout(async () => {
  try {
    await message.delete();
  } catch (error) {
    console.log("Cannot delete command message:", error);
  }
}, 3000);

  } catch (error) {
    console.error("Error sending detail button:", error);
    await message.reply("Sorry, I could not send the detail form right now.");
  }
  return;
}
    // PD command - Payment Done (ONLY IN TICKETS)
    if (content === '!pd') {
      if (!isTicketChannel(message.channel)) {
        return; // Silently ignore in non-ticket channels
      }

      try {
        await message.channel.send({
          content: 
            "Baik kak, pembayaran sudah di terima ya 🙏🏻☺️\n" +
            "Mohon menunggu☺️"
        });
      } catch (error) {
        console.error("Error sending PD message:", error);
        await message.channel.send("Sorry, I could not send the message right now.");
      }
      return;
    }

    // HALO command - Welcome greeting
    if (content === '!halo') {
      try {
        await message.channel.send({
          content: 
            "Halo! 👋\n" +
            "Selamat datang di J2Y CRATE\n" +
            "Mau order apa hari ini? Silakan jelaskan kebutuhan kamu ya ✨"
        });
      } catch (error) {
        console.error("Error sending HALO message:", error);
        await message.channel.send("Sorry, I could not send the message right now.");
      }
      return;
    }

    // Admin command untuk cek memory status dan cleanup
    if (content === '!cleanup') {
      const hasRole = isAdmin(message.member);
      const member = message.member;
      const hasRole = member?.roles?.cache?.has(ALLOWED_ROLE_ID);

      if (!hasRole) {
        await message.reply('⛔ **Akses Ditolak!** Command ini hanya untuk admin.');
        return;
      }

      try {
        // Show current Maps status
        const statusEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🧹 Memory Cleanup & Status')
          .addFields(
            {
              name: '📊 Current Memory Usage',
              value: 
                `• User Image URLs: **${userImageUrls.size}** items\n` +
                `• Selected Items Store: **${selectedItemsStore.size}** items\n` +
                `• Active Orders: **${activeOrders.size}** sessions\n` +
                `• Active Intervals: **${activeIntervals.size}** channels`,
              inline: false
            },
            {
              name: '🗑️ Cleanup Actions',
              value: 'Maps akan auto-cleanup:\n• Selected items: Setelah dipakai\n• Image URLs: Setelah testimoni dikirim\n• Active orders: Setelah payment confirmation\n• Intervals: Setelah channel dihapus',
              inline: false
            }
          )
          .setFooter({ text: 'Bot memory status checked' })
          .setTimestamp();

        // Manual cleanup untuk selectedItemsStore (hapus yang sudah >10 menit)
        let cleanedItems = 0;
        // Note: Karena Map ga track timestamp, kita cuma report status aja
        // selectedItemsStore auto-delete setelah modal submit

        await message.reply({ embeds: [statusEmbed] });
        console.log(`✅ Admin ${message.author.tag} checked memory status`);
      } catch (error) {
        console.error('Error in cleanup command:', error);
        await message.reply('❌ Gagal cek status memory!');
      }
      return;
    }
    
    /// ORDERX8 command - PT PT X8 order format (ONLY IN TICKETS)
    if (content === '!orderx8') {
      if (!isTicketChannel(message.channel)) {
        return; // Silently ignore in non-ticket channels
      }

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
        await message.channel.send("Sorry, I could not send the format right now.");
      }
      return;
    }

    // OPEN command - Send OPEN store announcement
    if (content === "!open") {
      try {
        // Check if user has allowed role
        const ALLOWED_ROLE_IDS = [
        "1437084858798182501",
        "1448227813550198816"
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
          content: "@everyone 🎉 **STORE OPEN!** 🎉\n\n📦 Ready to serve your orders!\n💎 DAH OPEN NIH SILAHKAN ORDER JING!",
          files: [attachment],
        });

        console.log("✅ OPEN announcement sent successfully");
      } catch (error) {
        console.error("Error sending OPEN announcement:", error);
        await message.channel.send("❌ Gagal mengirim announcement OPEN.");
      }
      return;
    }

    // CLOSE command - Send CLOSE store announcement
    if (content === "!close") {
      try {
        // Check if user has allowed role
        const ALLOWED_ROLE_IDS = [
        "1437084858798182501",
        "1448227813550198816"
      ];

        const hasAllowedRole = message.member?.roles.cache.some((role) =>
          ALLOWED_ROLE_IDS.includes(role.id),
        );

        if (!hasAllowedRole) {
          const reply = await message.channel.send(
            "⛔ *Akses Ditolak!*\nGABISA YA?? WKKWKWK.",
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
          content: "@everyone 🔒 **STORE CLOSED!** 🔒\n\n😴 We're currently closed\n💤 BESOK LAGI JING!!",
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

    // AUTO-DETECT PAYMENT CONFIRMATION - User sudah bayar dan kirim bukti (ONLY IN TICKET CHANNELS WITH ACTIVE ORDER)
    const lowerContent = content.toLowerCase();
    const confirmKeywords = ['done', 'cek', 'sudah bayar', 'udah bayar', 'sudah transfer', 'udah transfer', 'sudah kirim', 'udah kirim'];
    const OWNER_ID = '1357393423103168745';
    
    if (confirmKeywords.some(keyword => lowerContent.includes(keyword)) && isTicketChannel(message.channel)) {
      // Admin bypass - tidak perlu ikut flow
      if (isAdmin(message.member)) {
        console.log(`🔓 Admin ${message.author.tag} bypass payment flow check`);
        // Admin tetap bisa lanjut tanpa validasi
      } else {
        // User biasa - harus ikut flow strict
        const activeOrder = activeOrders.get(message.channel.id);
        
        if (!activeOrder) {
          await message.reply({
            content: 
              "⚠️ **BELUM ADA ORDER AKTIF!**\n\n" +
              "📝 **Cara order yang benar:**\n" +
              "1️⃣ Klik tombol **🛍️ Order Item** atau **⚡ Order PTPT X8** di atas\n" +
              "2️⃣ Pilih item & isi jumlah\n" +
              "3️⃣ Tunggu **ORDER SUMMARY** muncul\n" +
              "4️⃣ Ketik **`bayar`** → pilih metode → transfer\n" +
              "5️⃣ Kirim bukti transfer → ketik **`done`** atau **`cek`**\n\n" +
              "💡 Jangan skip langkah-langkah di atas ya!"
          });
          
          return;
        }

        // Check apakah user sudah lihat payment options
        if (!activeOrder.paymentViewed) {
          await message.reply({
            content: 
              "⚠️ **BELUM LIHAT METODE PEMBAYARAN!**\n\n" +
              "📝 **Langkah yang benar:**\n" +
              "1️⃣ ~~Order item~~ ✅ Sudah\n" +
              "2️⃣ Ketik **`bayar`** untuk lihat metode pembayaran ❌ **Kamu di sini**\n" +
              "3️⃣ Transfer sesuai metode yang dipilih\n" +
              "4️⃣ Kirim bukti transfer → ketik **`done`** atau **`cek`**\n\n" +
              "💡 Ketik **`bayar`** dulu ya!"
          });
          
          return;
        }
      }

      try {
        const confirmEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('✅ Konfirmasi Pembayaran Diterima')
          .setDescription(
            `Terima kasih <@${message.author.id}>!\n\n` +
            `Bukti pembayaran Anda telah diterima.\n` +
            `Owner/Staff kami akan segera melakukan pengecekan.`
          )
          .addFields(
            {
              name: '⏰ Estimasi Pengecekan',
              value: 'Biasanya 5-15 menit',
              inline: false
            },
            {
              name: '📝 Status',
              value: 'Sedang dalam proses pengecekan...',
              inline: false
            }
          )
          .setFooter({ text: 'Mohon tunggu sebentar ya! 🙏' })
          .setTimestamp();

        const adminButtons = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('admin_done')
              .setLabel('⏳ Proses')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('admin_done_item')
              .setLabel('✅ Done Item')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('admin_done_ptpt')
              .setLabel('✅ Done PTPT')
              .setStyle(ButtonStyle.Primary)
          );

        await message.reply({
          content: `<@${OWNER_ID}> Ada pembayaran yang perlu dicek!`,
          embeds: [confirmEmbed],
          components: [adminButtons]
        });

        // Cleanup order session setelah payment confirmation
        activeOrders.delete(message.channel.id);
        console.log(`🧹 Order session cleared for channel ${message.channel.id}`);

        console.log("✅ Payment confirmation sent with owner mention");
      } catch (error) {
        console.error("Error sending payment confirmation:", error);
      }
      return;
    }
  });
// Handle button and modal interactions for !detail command
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle button guide_orderitem - Show dropdown untuk pilih items
if (interaction.isButton() && interaction.customId === 'guide_orderitem') {
  try {
    // Cek stock Item Gift real-time
    const stockStatus = await getStockStatus(interaction.guild);

    // Kalau stock tidak ready, tolak!
    if (stockStatus.itemGift.status === 'restock') {
      await interaction.reply({
        content: 
          "⚠️ **MAAF, ITEM GIFT PROSES RESTOCK**\n\n" +
          "🟡 Mohon tunggu hingga status menjadi hijau 🟢\n" +
          "Klik tombol **🔄 Cek Stock** di atas untuk melihat status terkini.",
        ephemeral: true
      });
      return;
    }

    if (stockStatus.itemGift.status === 'habis') {
      await interaction.reply({
        content: 
          "❌ **MAAF, STOCK ITEM GIFT SEDANG HABIS**\n\n" +
          "🔴 Mohon bersabar ya, stock akan segera diisi kembali 🙏\n" +
          "Klik tombol **🔄 Cek Stock** di atas untuk melihat status terkini.",
        ephemeral: true
      });
      return;
    }

    // Kalau stock ready, kirim dropdown untuk pilih items
    const itemSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_items_for_order')
      .setPlaceholder('🛒 Pilih item yang mau dibeli...')
      .setMinValues(1)
      .setMaxValues(4) // Max 4 items (karena modal max 5 rows: 4 qty + 1 username)
      .addOptions([
        {
          label: 'VIP + Luck',
          value: 'vip + luck',
          description: 'Rp. 48.950',
          emoji: '💎'
        },
        {
          label: 'Mutation',
          value: 'mutation',
          description: 'Rp. 32.450',
          emoji: '🧬'
        },
        {
          label: 'Extra Luck',
          value: 'extra luck',
          description: 'Rp. 26.950',
          emoji: '🍀'
        },
        {
          label: 'Advanced Luck',
          value: 'advanced luck',
          description: 'Rp. 54.450',
          emoji: '🍀'
        },
        {
          label: 'Double XP',
          value: 'double xp',
          description: 'Rp. 21.450',
          emoji: '⚡'
        },
        {
          label: 'Mini Hoverboat',
          value: 'mini hoverboat',
          description: 'Rp. 24.720',
          emoji: '🚤'
        },
        {
          label: 'Sell Anywhere',
          value: 'sell anywhere',
          description: 'Rp. 34.550',
          emoji: '💰'
        },
        {
          label: 'Small Luck',
          value: 'small luck',
          description: 'Rp. 5.500',
          emoji: '🎲'
        },
        {
          label: 'Hyper Boat Pack',
          value: 'hyper boat pack',
          description: 'Rp. 109.890',
          emoji: '🚀'
        },
        {
          label: 'Elderwood Crate (1x)',
          value: 'elderwood crate (1x)',
          description: 'Rp. 10.890',
          emoji: '📦'
        },
        {
          label: 'Elderwood Crate (5x)',
          value: 'elderwood crate (5x)',
          description: 'Rp. 54.450',
          emoji: '📦'
        },
        {
          label: 'Christmas Crate (1x)',
          value: 'christmas crate (1x)',
          description: 'Rp. 27.390',
          emoji: '🎄'
        },
        {
          label: 'Christmas Crate (5x)',
          value: 'christmas crate (5x)',
          description: 'Rp. 136.950',
          emoji: '🎄'
        },
        {
          label: 'Evolved Enchant Stone',
          value: 'evolved enchant stone',
          description: 'Rp. 5.000',
          emoji: '🪨'
        },
        {
          label: 'Secret Tumbal',
          value: 'secret tumbal',
          description: 'Rp. 5.000',
          emoji: '🐟'
        },
        {
          label: 'Frozen Krampus Scythe',
          value: 'frozen krampus scythe',
          description: 'Rp. 98.890',
          emoji: '🔱'
        },
        {
          label: 'Boost Server Luck 6 Jam',
          value: 'boost server luck 6 jam',
          description: 'Rp. 141.750',
          emoji: '⏰'
        },
        {
          label: 'Boost Server Luck 12 Jam',
          value: 'boost server luck 12 jam',
          description: 'Rp. 206.910',
          emoji: '⏰'
        },
        {
          label: 'Boost Server Luck 24 Jam',
          value: 'boost server luck 24 jam',
          description: 'Rp. 337.590',
          emoji: '⏰'
        }
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(itemSelectMenu);

    await interaction.reply({
      content: 
        '**📋 STEP 1: Pilih Item**\n\n' +
        '🛒 Pilih item yang mau dibeli dari dropdown di bawah\n' +
        '✨ Kamu bisa pilih **lebih dari 1 item** sekaligus!\n' +
        '💡 Setelah pilih item, kamu akan diminta isi jumlah per item\n\n' +
        '⚠️ **Maksimal 4 item per order**',
      components: [row],
      ephemeral: false
    });

    console.log('✅ Item selection dropdown sent');
  } catch (error) {
    console.error('Error showing item dropdown:', error);
    await interaction.reply({
      content: '❌ Gagal menampilkan daftar item. Silakan coba lagi!',
      ephemeral: true
    });
  }
  return;
}

// Handle modal submit - Process order dengan quantity dari dropdown
if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('qm_')) {
  try {
    // Get selected items from Map
    const shortId = interaction.customId.replace('qm_', '');
    const selectedItems = selectedItemsStore.get(shortId);
    
    if (!selectedItems) {
      await interaction.reply({
        content: '❌ **Session expired!** Silakan pilih item lagi.',
        ephemeral: true
      });
      return;
    }
    
    // Clean up from Map after use
    selectedItemsStore.delete(shortId);
    
    const username = interaction.fields.getTextInputValue('username_display');
    
    // Pricelist mapping (sama seperti sebelumnya)
    const priceList: Record<string, number> = {
      'boost server luck 6 jam': 141750,
      'boost server luck 12 jam': 206910,
      'boost server luck 24 jam': 337590,
      'vip + luck': 48950,
      'vip luck': 48950,
      'mutation': 32450,
      'extra luck': 26950,
      'advanced luck': 54450,
      'double xp': 21450,
      'mini hoverboat': 24720,
      'sell anywhere': 34550,
      'small luck': 5500,
      'hyper boat pack': 109890,
      'elderwood crate (1x)': 10890,
      'elderwood crate (5x)': 54450,
      'christmas crate (1x)': 27390,
      'christmas crate (5x)': 136950,
      'evolved enchant stone': 5000,
      'secret tumbal': 5000,
      'frozen krampus scythe': 98890
    };
    
    const parsedItems: Array<{ name: string; quantity: number; price: number; total: number }> = [];
    let totalHarga = 0;
    
    // Parse quantities dari modal
    for (let i = 0; i < selectedItems.length; i++) {
      const itemName = selectedItems[i];
      const quantityStr = interaction.fields.getTextInputValue(`qty_${i}`);
      const quantity = parseInt(quantityStr);
      
      if (isNaN(quantity) || quantity < 1) {
        await interaction.reply({
          content: `❌ **Quantity tidak valid untuk "${itemName}"**\n\nPastikan quantity adalah angka positif!`,
          ephemeral: true
        });
        return;
      }
      
      const price = priceList[itemName.toLowerCase()];
      
      if (!price) {
        await interaction.reply({
          content: `❌ **Item tidak ditemukan:** "${itemName}"\n\nSilakan hubungi admin!`,
          ephemeral: true
        });
        return;
      }
      
      const itemTotal = price * quantity;
      parsedItems.push({
        name: itemName,
        quantity,
        price,
        total: itemTotal
      });
      totalHarga += itemTotal;
    }
    
    // Format total harga
    const formattedTotal = new Intl.NumberFormat('id-ID').format(totalHarga);
    
    // Build items list untuk embed
    const itemsListText = parsedItems.map(item => {
      const formattedPrice = new Intl.NumberFormat('id-ID').format(item.price);
      const formattedItemTotal = new Intl.NumberFormat('id-ID').format(item.total);
      
      if (item.quantity > 1) {
        return `• ${item.name} x${item.quantity} (Rp. ${formattedPrice} × ${item.quantity} = Rp. ${formattedItemTotal})`;
      } else {
        return `• ${item.name} (Rp. ${formattedPrice})`;
      }
    }).join('\n');
    
    // Build order summary embed
    const orderEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📋 ORDER SUMMARY — JX\'O STORE')
      .addFields(
        {
          name: '🛒 Item yang dibeli',
          value: itemsListText,
          inline: false
        },
        {
          name: '🎮 Username & Displayname | Jumlah Akun',
          value: username,
          inline: false
        },
        {
          name: '💳 TOTAL HARGA',
          value: `**Rp. ${formattedTotal}**`,
          inline: false
        },
        {
          name: '⚠️ LANGKAH SELANJUTNYA',
          value: 
            '**1️⃣ Konfirmasi ordermu sudah benar**\n' +
            '**2️⃣ Klik tombol "💳 Bayar Sekarang" di bawah**\n' +
            '**3️⃣ Pilih metode pembayaran (QRIS/DANA)**\n' +
            '**4️⃣ Transfer sesuai total harga**\n' +
            '**5️⃣ Kirim bukti transfer + ketik `done`**',
          inline: false
        }
      )
      .setFooter({ text: 'JX\'O STORE — Transaksi Aman & Terpercaya' })
      .setTimestamp();

    // Tambah button bayar
    const paymentButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('order_payment')
          .setLabel('💳 Bayar Sekarang')
          .setStyle(ButtonStyle.Success)
      );
    
    await interaction.reply({
      embeds: [orderEmbed],
      components: [paymentButton],
      ephemeral: false
    });

    // Simpan order session untuk validasi payment flow
    if (interaction.channel) {
      activeOrders.set(interaction.channel.id, {
        userId: interaction.user.id,
        total: totalHarga,
        timestamp: Date.now(),
        paymentViewed: false, // Belum lihat payment options
        orderType: 'item' // Item Gift order
      });
      console.log(`📝 Order session saved for channel ${interaction.channel.id}`);
    }
    
    console.log(`✅ Order created: ${parsedItems.length} items = Rp. ${formattedTotal}`);
  } catch (error) {
    console.error('Error processing quantity modal:', error);
    await interaction.reply({
      content: '❌ Gagal memproses order. Pastikan semua field diisi dengan benar!',
      ephemeral: true
    });
  }
  return;
}

    // Handle select menu - User memilih items dari dropdown
if (interaction.isStringSelectMenu() && interaction.customId === 'select_items_for_order') {
  try {
    const selectedItems = interaction.values; // Array of selected item values
    
    // Batasi max 4 items karena Discord modal max 5 rows (4 items + 1 username field)
    if (selectedItems.length > 4) {
      await interaction.reply({
        content: '❌ **Maksimal 4 item per order!**\n\nSilakan pilih ulang maksimal 4 item saja.\n(Karena Discord modal terbatas 5 input field)',
        ephemeral: true
      });
      return;
    }
    
    // Generate short random ID untuk avoid 100 char limit
    const shortId = Math.random().toString(36).substring(2, 10); // 8 char random
    
    // Simpan selected items di Map
    selectedItemsStore.set(shortId, selectedItems);
    
    // Build modal dengan short custom ID
    const modal = new ModalBuilder()
      .setCustomId(`qm_${shortId}`) // qm_a1b2c3d4 (max 12 chars)
      .setTitle('Masukkan Jumlah Item');

    // Create text input untuk quantity setiap item yang dipilih
    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const quantityInput = new TextInputBuilder()
        .setCustomId(`qty_${i}`)
        .setLabel(`Jumlah Order: ${item}`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 2')
        .setValue('1') // Default 1
        .setRequired(true)
        .setMaxLength(3)
        .setMinLength(1);
      
      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(quantityInput);
      modal.addComponents(row);
    }
    
    // Add username & displayname field (always last) - Paragraph style untuk multi-line
    const usernameInput = new TextInputBuilder()
      .setCustomId('username_display')
      .setLabel('Username & Displayname | Jumlah Akun')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('player123 | Player Name\n2 akun (opsional)')
      .setRequired(true);
    
    const usernameRow = new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput);
    modal.addComponents(usernameRow);
    
    await interaction.showModal(modal);
    
    console.log(`✅ Quantity modal shown for ${selectedItems.length} items`);
  } catch (error) {
    console.error('Error handling item selection:', error);
    await interaction.reply({
      content: '❌ Gagal memproses pilihan item. Silakan coba lagi!',
      ephemeral: true
    });
  }
  return;
}
    // Handle button guide_orderx8 - Show dropdown pilih durasi
    if (interaction.isButton() && interaction.customId === 'guide_orderx8') {
      try {
        // Cek stock PTPT X8 real-time
        const stockStatus = await getStockStatus(interaction.guild);

        // Kalau stock tidak ready, tolak!
        if (stockStatus.ptptX8.status === 'restock') {
          await interaction.reply({
            content: 
              "⚠️ **MAAF, PTPT X8 SEDANG PROSES RESTOCK**\n\n" +
              "🟡 Mohon tunggu hingga status menjadi hijau 🟢\n" +
              "Klik tombol **🔄 Cek Stock** di atas untuk melihat status terkini, TOMBOL BISA DI KLIK BERULANG TAPI JANGAN SPAM YA.",
            ephemeral: true
          });
          return;
        }

        if (stockStatus.ptptX8.status === 'habis') {
          await interaction.reply({
            content: 
              "❌ **MAAF, STOCK PTPT x8 SEDANG HABIS**\n\n" +
              "🔴 Mohon bersabar ya, stock akan segera diisi kembali 🙏\n" +
              "Klik tombol **🔄 Cek Stock** di atas untuk melihat status terkini. TOMBOL BISA DI KLIK BERULANG TAPI JANGAN SPAM YA",
            ephemeral: true
          });
          return;
        }

        // Kalau stock ready, kirim dropdown pilih durasi
        const durasiSelect = new StringSelectMenuBuilder()
          .setCustomId('ptptx8_durasi')
          .setPlaceholder('⏰ Pilih durasi PTPT X8')
          .addOptions(
            {
              label: '12 Jam - Rp. 10.000/AKUN',
              value: '12',
              emoji: '⏰'
            },
            {
              label: '24 Jam - Rp. 18.000/AKUN',
              value: '24',
              emoji: '⏰'
            },
            {
              label: '48 Jam - Rp. 36.000/AKUN',
              value: '48',
              emoji: '⏰'
            }
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(durasiSelect);

        await interaction.reply({
          content: '⚡ **ORDER PTPT X8 — JX\'O STORE**\n\nPilih durasi yang kamu inginkan:',
          components: [row],
          ephemeral: false
        });
      } catch (error) {
        console.error('Error checking stock for order x8:', error);
        await interaction.reply({
          content: '❌ Gagal mengecek status stock. Silakan coba lagi!',
          ephemeral: true
        });
      }
      return;
    }

    // Handle select menu ptptx8_durasi - Show metode select
    if (interaction.isStringSelectMenu() && interaction.customId === 'ptptx8_durasi') {
      try {
        const durasi = interaction.values[0]; // "12", "24", or "48"
        
        // Kirim dropdown pilih metode
        const metodeSelect = new StringSelectMenuBuilder()
          .setCustomId(`ptptx8_metode_${durasi}`) // Encode durasi di customId
          .setPlaceholder('🎯 Pilih metode PTPT')
          .addOptions(
            {
              label: 'Murni',
              value: 'murni',
              emoji: '⚡',
              description: 'PT PT murni tanpa bantuan'
            },
            {
              label: 'Gaya Bebas',
              value: 'gaya_bebas',
              emoji: '🎨',
              description: 'PT PT dengan bantuan/tools'
            }
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(metodeSelect);

        await interaction.update({
          content: `⚡ **ORDER PTPT X8 ${durasi} JAM**\n\nPilih metode PT:`,
          components: [row]
        });
      } catch (error) {
        console.error('Error showing metode select:', error);
        await interaction.reply({
          content: '❌ Gagal menampilkan pilihan metode!',
          ephemeral: true
        });
      }
      return;
    }

    // Handle select menu ptptx8_metode - Show modal untuk detail order
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ptptx8_metode_')) {
      try {
        const durasi = interaction.customId.replace('ptptx8_metode_', ''); // Extract durasi
        const metode = interaction.values[0]; // "murni" or "gaya_bebas"
        
        // Build modal
        const modal = new ModalBuilder()
          .setCustomId(`ptptx8_modal_${durasi}_${metode}`) // Encode durasi & metode
          .setTitle(`PTPT X8 ${durasi} Jam - ${metode === 'murni' ? 'Murni' : 'Gaya Bebas'}`);

        const tanggalInput = new TextInputBuilder()
          .setCustomId('tanggal_dimulai')
          .setLabel('Tanggal Dimulai')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Contoh: 31 Desember 2025')
          .setRequired(true);

        const jumlahAkunInput = new TextInputBuilder()
          .setCustomId('jumlah_akun')
          .setLabel('Jumlah Akun')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Contoh: 5')
          .setRequired(true);

        const usernameInput = new TextInputBuilder()
          .setCustomId('username_displayname')
          .setLabel('Username & Displayname')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('1 baris per akun:\nusername1 | DisplayName1\nusername2 | DisplayName2')
          .setRequired(true);

        const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(tanggalInput);
        const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(jumlahAkunInput);
        const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
      } catch (error) {
        console.error('Error showing PTPT X8 modal:', error);
        await interaction.reply({
          content: '❌ Gagal membuka form order!',
          ephemeral: true
        });
      }
      return;
    }

    // Handle button order_payment - Kirim payment options dari ORDER SUMMARY
    if (interaction.isButton() && interaction.customId === 'order_payment') {
      try {
        const paymentEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('💳 Metode Pembayaran — JX\'O STORE')
          .setDescription('Pilih metode pembayaran yang kamu inginkan:')
          .addFields(
            {
              name: '🔵 QRIS',
              value: 'Scan QR code untuk pembayaran via QRIS',
              inline: false
            },
            {
              name: '💎 DANA',
              value: 'Transfer ke nomor DANA',
              inline: false
            }
          )
          .setFooter({ text: '💡 Klik tombol di bawah dan baca panduan dengan teliti ya!' });

        const paymentButtons = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('payment_qris')
              .setLabel('🔵 QRIS')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('payment_dana')
              .setLabel('💎 DANA')
              .setStyle(ButtonStyle.Success)
          );

        await interaction.reply({
          embeds: [paymentEmbed],
          components: [paymentButtons],
          ephemeral: false
        });

        // Set paymentViewed = true
        const activeOrder = activeOrders.get(interaction.channel!.id);
        if (activeOrder) {
          activeOrder.paymentViewed = true;
          activeOrders.set(interaction.channel!.id, activeOrder);
          console.log(`💳 Payment viewed for channel ${interaction.channel!.id}`);
        }

        console.log("✅ Payment options sent from order button");
      } catch (error) {
        console.error("Error sending payment options from button:", error);
        await interaction.reply({
          content: "❌ Maaf, gagal mengirim metode pembayaran. Silakan coba lagi!",
          ephemeral: true
        });
      }
      return;
    }

    // Handle button payment_qris - kirim QR code
    if (interaction.isButton() && interaction.customId === 'payment_qris') {
      try {
        const qrAttachment = new AttachmentBuilder(QR_IMAGE_PATH, {
          name: "jx'o-crate-qr.jpg",
        });

        const qrEmbed = new EmbedBuilder()
          .setColor('#0099FF')
          .setTitle('🔵 QRIS - JX\'O STORE')
          .setDescription('Scan QR code di atas untuk pembayaran via QRIS')
          .addFields(
            {
              name: '📝 Cara Pembayaran',
              value: 
                '1. Scan QR code menggunakan aplikasi e-wallet\n' +
                '2. Masukkan nominal sesuai total belanja\n' +
                '3. Lakukan pembayaran\n' +
                '4. Screenshot bukti transfer',
              inline: false
            },
            {
              name: '✅ Setelah Transfer',
              value: 
                '📤 **Kirim screenshot bukti transfer di channel ini**\n\n' +
                '🚨 **PENTING - WAJIB KETIK:** 🚨\n' +
                '```\n' +
                'done  atau  cek\n' +
                '```\n' +
                '💡 **Ketik salah satu keyword di atas agar owner segera cek pembayaran kamu!**',
              inline: false
            }
          )
          .setFooter({ text: '💡 Baca panduan di atas dengan teliti • Owner akan cek pembayaran Anda' })
          .setTimestamp();

        await interaction.reply({
          content: '⚠️ **PENTING:** Baca semua panduan di bawah sebelum transfer!',
          embeds: [qrEmbed],
          files: [qrAttachment],
          ephemeral: false
        });
      } catch (error) {
        console.error("Error sending QR from button:", error);
        await interaction.reply({
          content: "❌ Maaf, gagal mengirim QR code. Silakan coba lagi!",
          ephemeral: true
        });
      }
      return;
    }

    // Handle button payment_dana - kirim info DANA
    if (interaction.isButton() && interaction.customId === 'payment_dana') {
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
              name: '📝 Cara Pembayaran',
              value: 
                '1. Buka aplikasi DANA\n' +
                '2. Transfer ke nomor di atas\n' +
                '3. Masukkan nominal sesuai total belanja\n' +
                '4. Lakukan pembayaran\n' +
                '5. Screenshot bukti transfer',
              inline: false
            },
            {
              name: '✅ Setelah Transfer',
              value: 
                '📤 **Kirim screenshot bukti transfer di channel ini**\n\n' +
                '🚨 **PENTING - WAJIB KETIK:** 🚨\n' +
                '```\n' +
                'done  atau  cek\n' +
                '```\n' +
                '💡 **Ketik salah satu keyword di atas agar owner segera cek pembayaran kamu!**',
              inline: false
            }
          )
          .setFooter({ text: '💡 Baca panduan di atas dengan teliti • Owner akan cek pembayaran Anda' })
          .setTimestamp();

        await interaction.reply({
          content: '⚠️ **PENTING:** Baca semua panduan di bawah sebelum transfer!',
          embeds: [danaEmbed],
          ephemeral: false
        });
      } catch (error) {
        console.error("Error sending DANA from button:", error);
        await interaction.reply({
          content: "❌ Maaf, gagal mengirim info DANA. Silakan coba lagi!",
          ephemeral: true
        });
      }
      return;
    }

    // Handle button refresh_stock - Refresh stock status (EDIT embed yang sama)
    if (interaction.isButton() && interaction.customId === 'refresh_stock') {
      try {
        // Defer update supaya Discord ga timeout
        await interaction.deferUpdate();

        // Fetch stock status terbaru
        const stockStatus = await getStockStatus(interaction.guild);

        // Update embed dengan data terbaru (COMPACT)
        const updatedStockEmbed = new EmbedBuilder()
          .setColor(stockStatus.itemGift.status === 'ready' && stockStatus.ptptX8.status === 'ready' ? '#00FF00' : stockStatus.itemGift.status === 'habis' || stockStatus.ptptX8.status === 'habis' ? '#FF0000' : '#FFA500')
          .setTitle('📊 STATUS STOCK')
          .setDescription(
            `📦 **Item Gift:** ${stockStatus.itemGift.emoji} ${stockStatus.itemGift.message}\n` +
            `⚡ **PTPT X8:** ${stockStatus.ptptX8.emoji} ${stockStatus.ptptX8.message}\n\n` +
            `⚠️ **Jangan order jika kuning 🟡 atau merah 🔴**`
          )
          .setFooter({ text: `Last update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}` });

        const stockButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('refresh_stock')
              .setLabel('🔄 Cek Stock')
              .setStyle(ButtonStyle.Primary)
          );

        // Edit message yang sama (bukan kirim baru)
        await interaction.editReply({
          embeds: [updatedStockEmbed],
          components: [stockButton]
        });

        console.log('✅ Stock status refreshed successfully (manual)');
      } catch (error) {
        console.error('Error refreshing stock:', error);
      }
      return;
    }

    // Handle button admin_done - Payment Done (Admin only)
    if (interaction.isButton() && interaction.customId === 'admin_done') {
      const hasRole = isAdmin(message.member);
      const member = interaction.member as any;
      const hasRole = member?.roles?.cache?.has(ALLOWED_ROLE_ID);

      if (!hasRole) {
        await interaction.reply({
          content: '⛔ **Akses Ditolak!** Hanya staff yang bisa menggunakan tombol ini.',
          ephemeral: true
        });
        return;
      }

      try {
        await interaction.reply({
          content: 
            "Baik kak, pembayaran sudah di terima ya 🙏🏻☺️\n" +
            "Mohon menunggu☺️",
          ephemeral: false
        });
      } catch (error) {
        console.error("Error sending PD message from button:", error);
      }
      return;
    }

    // Handle button give_rating - Show rating select menu
    if (interaction.isButton() && interaction.customId === 'give_rating') {
      try {
        // Fetch gambar terakhir di channel (bukti transaksi) REAL-TIME
        let imageUrl: string | null = null;
        
        if (interaction.channel && interaction.channel.isTextBased()) {
          const messages = await interaction.channel.messages.fetch({ limit: 100 });
          
          // Cari message dengan attachment gambar
          for (const msg of messages.values()) {
            if (msg.attachments.size > 0) {
              const attachment = msg.attachments.first();
              if (attachment && (attachment.contentType?.startsWith('image/') || attachment.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                imageUrl = attachment.url;
                console.log(`✅ Found image: ${imageUrl}`);
                break;
              }
            }
          }
        }

        // Simpan image URL di Map dengan user ID
        if (imageUrl) {
          userImageUrls.set(interaction.user.id, imageUrl);
          console.log(`✅ Saved image for user ${interaction.user.id}`);
        } else {
          console.log(`⚠️ No image found in channel`);
        }

        // Kirim select menu untuk pilih rating
        const ratingSelect = new StringSelectMenuBuilder()
          .setCustomId('rating_select')
          .setPlaceholder('⭐ Pilih rating kamu (1-5 bintang)')
          .addOptions(
            {
              label: '⭐ 1 Bintang - Sangat Buruk',
              value: '1',
              emoji: '😞'
            },
            {
              label: '⭐⭐ 2 Bintang - Buruk',
              value: '2',
              emoji: '😕'
            },
            {
              label: '⭐⭐⭐ 3 Bintang - Cukup',
              value: '3',
              emoji: '😐'
            },
            {
              label: '⭐⭐⭐⭐ 4 Bintang - Baik',
              value: '4',
              emoji: '😊'
            },
            {
              label: '⭐⭐⭐⭐⭐ 5 Bintang - Sangat Baik',
              value: '5',
              emoji: '😍'
            }
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(ratingSelect);

        await interaction.reply({
          content: '⭐ **Kasih Rating & Testimoni**\n\nPilih rating kamu dulu:',
          components: [row],
          ephemeral: false
        });
      } catch (error) {
        console.error('Error showing rating select:', error);
        await interaction.reply({
          content: '❌ Gagal membuka form rating. Silakan coba lagi!',
          ephemeral: true
        });
      }
      return;
    }

    // Handle select menu rating_select - Show modal untuk testimoni
    if (interaction.isStringSelectMenu() && interaction.customId === 'rating_select') {
      try {
        const selectedRating = interaction.values[0]; // "1", "2", "3", "4", or "5"
        
        // Simpan rating di Map sementara (pakai userId sebagai key)
        // Kita butuh cara nyimpan rating yang dipilih user
        // Solusi: encode rating di modal customId
        const modal = new ModalBuilder()
          .setCustomId(`rating_modal_${selectedRating}`) // Encode rating di customId
          .setTitle(`Rating: ${'⭐'.repeat(parseInt(selectedRating))} - J2Y CRATE`);

        const testimoniInput = new TextInputBuilder()
          .setCustomId('testimoni_text')
          .setLabel('Testimoni')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ceritakan pengalaman kamu belanja di JX\'O STORE...')
          .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(testimoniInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
      } catch (error) {
        console.error('Error showing testimoni modal:', error);
        await interaction.reply({
          content: '❌ Gagal membuka form testimoni. Silakan coba lagi!',
          ephemeral: true
        });
      }
      return;
    }

    // Handle button admin_done_item - Konfirmasi Item Gift dengan testimoni
    if (interaction.isButton() && interaction.customId === 'admin_done_item') {
      const member = interaction.member as any;
      const hasRole = isAdmin(member);

      if (!hasRole) {
        await interaction.reply({
          content: '⛔ **Akses Ditolak!** Hanya staff yang bisa menggunakan tombol ini.',
          ephemeral: true
        });
        return;
      }

      try {
        // ITEM GIFT: Kirim konfirmasi + button testimoni
        const ratingButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('give_rating')
              .setLabel('⭐ Kasih Rating & Testimoni')
              .setStyle(ButtonStyle.Success)
          );

        await interaction.reply({
          content: 
            "✅ **ORDERAN SELESAI!**\n\n" +
            "Orderan kamu sudah selesai diproses!\n" +
            "Terima kasih sudah order di J2Y CRATE 💙\n\n" +
            "📝 **JANGAN LUPA WAJIB KASI RATING DAN TESTI YA!!**\n" +
            "Klik tombol di bawah untuk share pengalaman kamu!",
          components: [ratingButton],
          ephemeral: false
        });
      } catch (error) {
        console.error('Error sending item confirmation:', error);
      }
      return;
    }

    // Handle button admin_done_ptpt - Konfirmasi PTPT tanpa testimoni
    if (interaction.isButton() && interaction.customId === 'admin_done_ptpt') {
      const member = interaction.member as any;
      const hasRole = isAdmin(member);

      if (!hasRole) {
        await interaction.reply({
          content: '⛔ **Akses Ditolak!** Hanya staff yang bisa menggunakan tombol ini.',
          ephemeral: true
        });
        return;
      }

      try {
        // PTPT X8: Kirim konfirmasi aja (tanpa testimoni)
        await interaction.reply({
          content: 
            "✅ **ORDERAN SUDAH DIKONFIRMASI!**\n\n" +
            "Akun kamu sudah dilist untuk PT PT X8! 📋\n" +
            "Terima kasih sudah order di J2Y CRATE 💙\n\n" +
            "⏰ **PT akan dimulai sesuai tanggal yang sudah ditentukan.**\n" +
            "🎯 Pastikan akun kamu ready ya!",
          ephemeral: false
        });
      } catch (error) {
        console.error('Error sending PTPT confirmation:', error);
      }
      return;
    }

    // Handle button guide_pricelist - kirim pricelist dengan gambar
    if (interaction.isButton() && interaction.customId === 'guide_pricelist') {
      try {
        const pricelistAttachment = new AttachmentBuilder(PRICELIST_IMAGE_PATH, {
          name: "pricelist.png",
        });

        const pricelistEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('💎 LIST HARGA GAMEPASS FISHIT — JX\'O STORE')
          .setImage('attachment://pricelist.png')
          .setDescription(
            '**Item Tambahan:**\n' +
            '```\n' +
            'Boost Server Luck 6 jam = Rp. 141.750\n' +
            'Boost Server Luck 12 jam = Rp. 206.910\n' +
            'Boost Server Luck 24 jam = Rp. 337.590\n' +
            'Elderwood Crate = (1x) Rp. 10.890 (5x) Rp. 54.450\n' +
            'Christmas Crate = (1x) Rp. 27.390 (5x) Rp. 136.950\n' +
            'Evolved Enchant Stone = Rp. 5.000\n' +
            'Secret Tumbal = Rp. 5.000\n' +
            'Frozen Krampus Scythe = Rp. 98.890\n' +
            'PTPT X8 12 JAM = Rp. 10.000/AKUN\n' +
            'PTPT X8 24 JAM = Rp. 18.000/AKUN\n' +
            '```\n' +
            '📝 **Note:** Harga sudah termasuk pajak. Untuk order, silakan gunakan format order!'
          )
          .setFooter({ text: 'JX\'O STORE - Terpercaya & Amanah' });

        await interaction.reply({
          embeds: [pricelistEmbed],
          files: [pricelistAttachment],
          ephemeral: false
        });
      } catch (error) {
        console.error("Error sending pricelist from button:", error);
        await interaction.reply({
          content: "❌ Maaf, gagal mengirim pricelist. Silakan coba lagi!",
          ephemeral: true
        });
      }
      return;
    }

    // Handle button click - open modal
    if (interaction.isButton() && interaction.customId === 'open_detail_modal') {
      // Check if user has allowed role
    const ALLOWED_ROLE_IDS = [
        "1437084858798182501",
        "1448227813550198816"
      ];

    const member = interaction.member as any;
    const hasAllowedRole = member?.roles?.cache?.some((role: any) =>
      ALLOWED_ROLE_IDS.includes(role.id),
    );

    if (!hasAllowedRole) {
      await interaction.reply({
        content: "⛔ *Akses Ditolak!*\nKAGA USAH IKUTAN MENCET BJIRR.",
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
          `📦 **Detail Order**\n\n` +
          `**Item:** ${item}\n` +
          `**Net Amount:** Rp ${formattedAmount}\n` +
          `**Notes:** ${notes}\n\n` +
          `_Submitted by ${interaction.member?.displayName || interaction.user.displayName}_`,
      });
    }

    // Handle PTPT X8 modal submit - Create ORDER SUMMARY
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('ptptx8_modal_')) {
      try {
        // Extract durasi & metode dari customId (ptptx8_modal_24_murni)
        const parts = interaction.customId.replace('ptptx8_modal_', '').split('_');
        const durasi = parts[0]; // "12", "24", or "48"
        const metode = parts[1]; // "murni" or "gaya_bebas"
        
        // Get form values
        const tanggalDimulai = interaction.fields.getTextInputValue('tanggal_dimulai');
        const jumlahAkunStr = interaction.fields.getTextInputValue('jumlah_akun');
        const usernameDisplayname = interaction.fields.getTextInputValue('username_displayname');
        
        // Validate jumlah akun
        const jumlahAkun = parseInt(jumlahAkunStr);
        if (isNaN(jumlahAkun) || jumlahAkun < 1) {
          await interaction.reply({
            content: '❌ **Jumlah akun tidak valid!** Harus berupa angka positif.',
            ephemeral: true
          });
          return;
        }
        
        // Calculate total harga
        const hargaPerAkun = durasi === '12' ? 10000 : durasi === '24' ? 18000 : 36000;
        const totalHarga = hargaPerAkun * jumlahAkun;
        const formattedTotal = new Intl.NumberFormat('id-ID').format(totalHarga);
        const formattedPerAkun = new Intl.NumberFormat('id-ID').format(hargaPerAkun);
        
        // Format metode display
        const metodeDisplay = metode === 'murni' ? 'Murni' : 'Gaya Bebas';
        
        // Build order summary embed
        const orderEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('⚡ ORDER SUMMARY PTPT X8 — JX\'O STORE')
          .addFields(
            {
              name: '⏰ Durasi',
              value: `${durasi} Jam`,
              inline: true
            },
            {
              name: '🎯 Metode',
              value: metodeDisplay,
              inline: true
            },
            {
              name: '📅 Tanggal Dimulai',
              value: tanggalDimulai,
              inline: false
            },
            {
              name: '👥 Jumlah Akun',
              value: `${jumlahAkun} akun`,
              inline: true
            },
            {
              name: '💰 Harga',
              value: `Rp. ${formattedPerAkun}/akun × ${jumlahAkun}`,
              inline: true
            },
            {
              name: '🎮 Username & Displayname',
              value: usernameDisplayname.length > 1024 ? usernameDisplayname.substring(0, 1021) + '...' : usernameDisplayname,
              inline: false
            },
            {
              name: '💳 TOTAL HARGA',
              value: `**Rp. ${formattedTotal}**`,
              inline: false
            },
            {
              name: '⚠️ LANGKAH SELANJUTNYA',
              value: 
                '**1️⃣ Konfirmasi ordermu sudah benar**\n' +
                '**2️⃣ Klik tombol "💳 Bayar Sekarang" di bawah**\n' +
                '**3️⃣ Pilih metode pembayaran (QRIS/DANA)**\n' +
                '**4️⃣ Transfer sesuai total harga**\n' +
                '**5️⃣ Kirim bukti transfer + ketik `done`**',
              inline: false
            }
          )
          .setFooter({ text: 'JX\'O STORE — Transaksi Aman & Terpercaya' })
          .setTimestamp();

        // Tambah button bayar
        const paymentButton = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('order_payment')
              .setLabel('💳 Bayar Sekarang')
              .setStyle(ButtonStyle.Success)
          );
        
        await interaction.reply({
          embeds: [orderEmbed],
          components: [paymentButton],
          ephemeral: false
        });

        // Simpan order session untuk validation payment flow
        if (interaction.channel) {
          activeOrders.set(interaction.channel.id, {
            userId: interaction.user.id,
            total: totalHarga,
            timestamp: Date.now(),
            paymentViewed: false,
            orderType: 'ptpt' // PTPT X8 order
          });
          console.log(`📝 PTPT X8 order session saved for channel ${interaction.channel.id}`);
        }
        
        console.log(`✅ PTPT X8 Order created: ${durasi}jam × ${jumlahAkun}akun = Rp. ${formattedTotal}`);
      } catch (error) {
        console.error('Error processing PTPT X8 order:', error);
        await interaction.reply({
          content: '❌ Gagal memproses order. Silakan coba lagi!',
          ephemeral: true
        });
      }
      return;
    }

    // Handle rating modal submit
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('rating_modal_')) {
      try {
        // Extract rating dari customId (rating_modal_5 → "5")
        const rating = parseInt(interaction.customId.replace('rating_modal_', ''));
        
        // Ambil image URL dari Map dengan user ID
        const imageUrl = userImageUrls.get(interaction.user.id) || null;

        const testimoniText = interaction.fields.getTextInputValue('testimoni_text');

        // Build star emoji
        const starEmoji = '⭐'.repeat(rating);

        // Ambil display name dari Discord (bukan username)
        const displayName = interaction.member?.displayName || interaction.user.displayName || interaction.user.username;

        // Kirim ke channel testimoni
        const TESTIMONI_CHANNEL_ID = '1453984261588648148';
        const testimoniChannel = await interaction.guild?.channels.fetch(TESTIMONI_CHANNEL_ID);

        if (testimoniChannel && testimoniChannel.isTextBased()) {
          const testimoniEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${starEmoji} TESTIMONI BARU!`)
            .setDescription(`💬 *"${testimoniText}"*`)
            .addFields(
              {
                name: '👤 Dari',
                value: `<@${interaction.user.id}>`,
                inline: true
              },
              {
                name: '⭐ Rating',
                value: `${rating}/5`,
                inline: true
              }
            )
            .setFooter({ text: 'JX\'O STORE - Terima kasih atas testimoni Anda! 💙' })
            .setTimestamp();

          // Set gambar bukti kalau ada
          if (imageUrl) {
            testimoniEmbed.setImage(imageUrl);
          }

          await testimoniChannel.send({
            embeds: [testimoniEmbed]
          });

          // Hapus image URL dari Map setelah terpakai
          userImageUrls.delete(interaction.user.id);

          // Konfirmasi ke user
          await interaction.reply({
            content: 
              '✅ **Terima kasih atas rating & testimoni kamu!**\n\n' +
              `${starEmoji} Rating: ${rating}/5\n` +
              'Testimoni kamu sudah dikirim ke channel testimoni! 💙',
            ephemeral: false
          });

          console.log(`✅ Testimoni sent: ${rating} stars from ${displayName} ${imageUrl ? 'with image' : 'without image'}`);
        } else {
          await interaction.reply({
            content: '❌ Gagal mengirim testimoni. Channel testimoni tidak ditemukan!',
            ephemeral: true
          });
        }
      } catch (error) {
        console.error('Error processing rating:', error);
        await interaction.reply({
          content: '❌ Gagal memproses rating. Silakan coba lagi!',
          ephemeral: true
        });
      }
    }
    
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
});

// Helper function to check stock status
async function getStockStatus(guild: any) {
  try {
    const ITEM_GIFT_CHANNEL_ID = '1455837361115103244';
    const PTPT_X8_CHANNEL_ID = '1455837539406446810';
    
    const itemGiftChannel = await guild.channels.fetch(ITEM_GIFT_CHANNEL_ID);
    const ptptX8Channel = await guild.channels.fetch(PTPT_X8_CHANNEL_ID);
    
    const result = {
      itemGift: { status: 'unknown', emoji: '⚪', message: 'Status tidak diketahui' },
      ptptX8: { status: 'unknown', emoji: '⚪', message: 'Status tidak diketahui' }
    };
    
    // Check ITEM GIFT status
    if (itemGiftChannel) {
      const channelName = itemGiftChannel.name.toLowerCase();
      
      if (channelName.includes('🟢') || channelName.includes(':green_circle:')) {
        result.itemGift = { status: 'ready', emoji: '🟢', message: '**STOCK READY**' };
      } else if (channelName.includes('🔴') || channelName.includes(':red_circle:')) {
        result.itemGift = { status: 'habis', emoji: '🔴', message: '**STOCK HABIS**' };
      } else if (channelName.includes('🟡') || channelName.includes(':yellow_circle:')) {
        result.itemGift = { status: 'restock', emoji: '🟡', message: '**PROSES RESTOCK**' };
      }
    }
    
    // Check PTPT X8 status
    if (ptptX8Channel) {
      const channelName = ptptX8Channel.name.toLowerCase();
      
      if (channelName.includes('🟢') || channelName.includes(':green_circle:')) {
        result.ptptX8 = { status: 'ready', emoji: '🟢', message: '**STOCK READY**' };
      } else if (channelName.includes('🔴') || channelName.includes(':red_circle:')) {
        result.ptptX8 = { status: 'habis', emoji: '🔴', message: '**STOCK HABIS**' };
      } else if (channelName.includes('🟡') || channelName.includes(':yellow_circle:')) {
        result.ptptX8 = { status: 'restock', emoji: '🟡', message: '**PROSES RESTOCK**' };
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error getting stock status:', error);
    return {
      itemGift: { status: 'error', emoji: '⚪', message: 'Gagal cek stock' },
      ptptX8: { status: 'error', emoji: '⚪', message: 'Gagal cek stock' }
    };
  }
}
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
    
    // 🎉 AUTO-GREETING - Kirim pesan sapaan otomatis dengan pricelist (3 pesan terpisah)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Tunggu 1 detik lagi

    // Check stock status
    const stockStatus = await getStockStatus(channel.guild);
    
    // Determine embed color based on stock status
    let embedColor = '#00FF00'; // Default green
    if (stockStatus.itemGift.status === 'habis' || stockStatus.ptptX8.status === 'habis') {
      embedColor = '#FF0000'; // Red if any stock is out
    } else if (stockStatus.itemGift.status === 'restock' || stockStatus.ptptX8.status === 'restock') {
      embedColor = '#FFD700'; // Yellow if restocking
    }
    
    // PESAN 1: Kirim gambar pricelist doang
    const pricelistAttachment = new AttachmentBuilder(PRICELIST_IMAGE_PATH, {
      name: "pricelist.png",
    });

    await channel.send({
      content: `<@${ticketCreatorId}>`,
      files: [pricelistAttachment],
    });

    // PESAN 2: Info tambahan
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await channel.send({
      content:
        "💎 **LIST HARGA GAMEPASS FISHIT — J2Y CRATE**\n\n" +
        "**Item Tambahan:**\n" +
        "```\n" +
        "Boost Server Luck 6 jam = Rp. 141.750\n" +
        "Boost Server Luck 12 jam = Rp. 206.910\n" +
        "Boost Server Luck 24 jam = Rp. 337.590\n" +
        "Elderwood Crate = (1x) Rp. 10.890 (5x) Rp. 54.450\n" +
        "Christmas Crate = (1x) Rp. 27.390 (5x) Rp. 136.950\n" +
        "Evolved Enchant Stone = Rp. 5.000\n" +
        "Secret Tumbal = Rp. 5.000\n" +
        "Frozen Krampus Scythe = Rp. 98.890\n" +
        "PTPT X8 12 JAM = Rp. 10.000/AKUN\n" +
        "PTPT X8 24 JAM = Rp. 18.000/AKUN\n" +
        "```\n" +
        "📝 **Note:** Harga sudah termasuk pajak.",
    });

    // PESAN 3: Greeting dengan tombol (TANPA INFO STOCK)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const greetingEmbed = new EmbedBuilder()
      .setColor('#00FF00') 
      .setTitle('👋 Selamat datang di JX\'O STORE!')
      .setDescription(
        `Hai <@${ticketCreatorId}>!\n\n` +
        `📋 **Silakan lihat pricelist di atas terlebih dahulu**\n` +
        `Setelah itu, klik tombol di bawah untuk memulai order:`
      )
      .addFields(
        {
          name: '🛍️ Order Item',
          value: 'Untuk order item biasa (Gamepass, Crate, dll)',
          inline: false
        },
        {
          name: '⚡ Order PTPT x8',
          value: 'Untuk order PTPT x8',
          inline: false
        },
        {
          name: '💡 Tips',
          value: '• Klik tombol **🛍️ Order Item** atau **⚡ Order PTPT X8** untuk mulai order\n• Klik tombol **🔄 Cek Stock** untuk lihat status stock terkini\n• Setelah order, tekan tombol **💳 Bayar Sekarang** di ORDER SUMMARY',
          inline: false
        }
      )
      .setFooter({ text: 'Staff kami akan segera membantu Anda • Mohon tunggu sebentar' })
      .setTimestamp();

    const buttonRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('guide_orderitem')
          .setLabel('🛍️ Order Item')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('guide_orderx8')
          .setLabel('⚡ Order PTPT x8')
          .setStyle(ButtonStyle.Success)
      );

    await channel.send({
      embeds: [greetingEmbed],
      components: [buttonRow]
    });

    // PESAN 4: Embed stock dengan tombol refresh (COMPACT & CLEAN)
    await new Promise(resolve => setTimeout(resolve, 300));

    const stockEmbed = new EmbedBuilder()
      .setColor(stockStatus.itemGift.status === 'ready' && stockStatus.ptptX8.status === 'ready' ? '#00FF00' : stockStatus.itemGift.status === 'habis' || stockStatus.ptptX8.status === 'habis' ? '#FF0000' : '#FFA500')
      .setTitle('📊 STATUS STOCK')
      .setDescription(
        `📦 **Item Gift:** ${stockStatus.itemGift.emoji} ${stockStatus.itemGift.message}\n` +
        `⚡ **PTPT X8:** ${stockStatus.ptptX8.emoji} ${stockStatus.ptptX8.message}\n\n` +
        `⚠️ **Jangan order jika kuning 🟡 atau merah 🔴**`
      )
      .setFooter({ text: `Last update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}` });

    const stockButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('refresh_stock')
          .setLabel('🔄 Cek Stock')
          .setStyle(ButtonStyle.Primary)
      );

    const stockMessage = await channel.send({
      embeds: [stockEmbed],
      components: [stockButton]
    });

    // Setup auto-refresh setiap 35 detik
    const channelId = channel.id;
    
    // Clear existing interval if any (shouldn't happen, but safety)
    if (activeIntervals.has(channelId)) {
      clearInterval(activeIntervals.get(channelId)!);
    }
    
    const autoRefreshInterval = setInterval(async () => {
      try {
        // Check if channel still exists
        const channelExists = await channel.guild.channels.fetch(channelId).catch(() => null);
        if (!channelExists) {
          console.log(`⚠️ Channel ${channelId} no longer exists, stopping auto-refresh`);
          clearInterval(autoRefreshInterval);
          activeIntervals.delete(channelId);
          return;
        }

        // Fetch stock status terbaru
        const newStockStatus = await getStockStatus(channel.guild);

        // Cek apakah ada perubahan
        const hasChanged = 
          newStockStatus.itemGift.status !== stockStatus.itemGift.status ||
          newStockStatus.ptptX8.status !== stockStatus.ptptX8.status;

        if (hasChanged) {
          // Update stock status
          Object.assign(stockStatus, newStockStatus);

          // Update embed dengan notifikasi
          const updatedStockEmbed = new EmbedBuilder()
            .setColor(stockStatus.itemGift.status === 'ready' && stockStatus.ptptX8.status === 'ready' ? '#00FF00' : stockStatus.itemGift.status === 'habis' || stockStatus.ptptX8.status === 'habis' ? '#FF0000' : '#FFA500')
            .setTitle('📊 STATUS STOCK')
            .setDescription(
              `📦 **Item Gift:** ${stockStatus.itemGift.emoji} ${stockStatus.itemGift.message}\n` +
              `⚡ **PTPT X8:** ${stockStatus.ptptX8.emoji} ${stockStatus.ptptX8.message}\n\n` +
              `⚠️ **Jangan order jika kuning 🟡 atau merah 🔴**\n\n` +
              `✨ *Stock otomatis diupdate*`
            )
            .setFooter({ text: `Last update: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}` });

          await stockMessage.edit({
            embeds: [updatedStockEmbed],
            components: [stockButton]
          }).catch(err => {
            console.error(`Error updating stock embed in ${channel.name}:`, err.message);
            // If edit fails (message deleted), stop interval
            clearInterval(autoRefreshInterval);
            activeIntervals.delete(channelId);
          });

          console.log(`✅ Stock auto-updated in ticket: ${channel.name}`);
        }
      } catch (error) {
        console.error('Error auto-refreshing stock:', error);
        // Stop interval jika ada error
        clearInterval(autoRefreshInterval);
        activeIntervals.delete(channelId);
      }
    }, 35000); // 35 detik

    // Store interval reference
    activeIntervals.set(channelId, autoRefreshInterval);

    console.log(`✅ Auto-greeting berhasil dikirim (4 pesan: gambar, info, greeting, stock) + auto-refresh aktif untuk ${channel.name}`);
    
  } catch (error) {
    console.error('❌ Error auto-renaming ticket:', error);
  }
});

// Cleanup intervals when channel is deleted
client.on('channelDelete', (channel) => {
  const channelId = channel.id;
  
  // Cleanup auto-refresh intervals
  if (activeIntervals.has(channelId)) {
    clearInterval(activeIntervals.get(channelId)!);
    activeIntervals.delete(channelId);
    console.log(`🧹 Cleaned up auto-refresh for deleted channel: ${channelId}`);
  }
  
  // Cleanup active order sessions
  if (activeOrders.has(channelId)) {
    activeOrders.delete(channelId);
    console.log(`🧹 Cleaned up order session for deleted channel: ${channelId}`);
  }
  
  // Note: userImageUrls uses userId as key, not channelId
  // So it will be cleaned up when user submits testimoni or bot restarts
  
  console.log(`✅ Channel ${channelId} deleted - all data cleaned up`);
});

  return client;
}
