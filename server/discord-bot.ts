// Discord bot integration - uses Bot Token from environment
import {
  Client,
  GatewayIntentBits,
  Message,
  AttachmentBuilder,
} from "discord.js";
import path from "path";

// Path to custom QR code image
const QR_IMAGE_PATH = path.join(process.cwd(), "attached_assets/QR_1765562456554.jpg");
// Path to OPEN and CLOSE banner images
const OPEN_BANNER_PATH = path.join(process.cwd(), "attached_assets/open_banner.jpg");
const CLOSE_BANNER_PATH = path.join(process.cwd(), "attached_assets/close_banner.jpg");
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
    //PS command - sends Private Server Link
    if (content === "!ps") {
      try {
        await message.reply({
          content:
            "**Private Server Link**\nhttps://www.roblox.com/share?code=f97e45ea97c78547854d616588a889ac&type=Server",
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
            "Terima kasih sudah order di J2Y Crate 💜\n" +
            "Ditunggu next ordernya ya! 🙏🏻😄",
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
            "Terima kasih sudah order di J2Y Crate 💜\n" +
            "Ditunggu next ordernya ya! 🙏🏻😄",
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
          content: 
            "🚨 **READ BEFORE TRANSACTION** 🚨\n\n" +
            "Semua transaksi **WAJIB** menggunakan MM resmi J2Y.\n" +
            "Jika tidak pakai MM J2Y dan terjadi penipuan, itu bukan tanggung jawab kami.\n\n" +
            "🔗 **Detail rules:**\n" +
            "https://discord.com/channels/1437084504538742836/1447876608512888915\n\n" +
            "Terima kasih 🙏💜"
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

    // PD command - Payment Done
    if (content === '!pd') {
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
            "Selamat datang di J2Y Crate 💜\n" +
            "Mau order apa hari ini? Silakan jelaskan kebutuhan kamu ya ✨"
        });
      } catch (error) {
        console.error("Error sending HALO message:", error);
        await message.channel.send("Sorry, I could not send the message right now.");
      }
      return;
    }
    
    /// ORDERX8 command - PT PT X8 order format
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
          content: "@everyone 🎉 **STORE OPEN!** 🎉\n\n📦 Ready to serve your orders!\n💎 J2Y Crate is now OPEN for business!",
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

  return client;
}
