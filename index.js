const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require("discord.js");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// Store warnings in memory (could be upgraded to DB later)
const warnings = new Map();

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // --- BAN ---
  if (command === "ban" && config.moderation.banCommand) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ You don’t have permission to use this.");
    const user = message.mentions.members.first();
    if (!user) return message.reply("Please mention a user to ban.");
    await user.ban({ reason: args.slice(1).join(" ") || "No reason provided" });
    logAction(message, `🔨 Banned ${user.user.tag}`);
    message.channel.send(`✅ Banned ${user.user.tag}`);
  }

  // --- KICK ---
  if (command === "kick" && config.moderation.kickCommand) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply("❌ You don’t have permission.");
    const user = message.mentions.members.first();
    if (!user) return message.reply("Please mention a user to kick.");
    await user.kick(args.slice(1).join(" ") || "No reason provided");
    logAction(message, `👢 Kicked ${user.user.tag}`);
    message.channel.send(`✅ Kicked ${user.user.tag}`);
  }

  // --- WARN ---
  if (command === "warn" && config.moderation.warnCommand) {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Please mention a user to warn.");
    const reason = args.slice(1).join(" ") || "No reason provided";
    const userWarnings = warnings.get(user.id) || [];
    userWarnings.push(reason);
    warnings.set(user.id, userWarnings);
    logAction(message, `⚠️ Warned ${user.user.tag}: ${reason}`);
    message.channel.send(`✅ Warned ${user.user.tag}`);
  }

  // --- MUTE ---
  if (command === "mute" && config.moderation.muteCommand) {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Please mention a user to mute.");
    const muteRole = message.guild.roles.cache.find(r => r.name === config.roles.muteRole);
    if (!muteRole) return message.reply("Mute role not found.");
    await user.roles.add(muteRole);
    logAction(message, `🔇 Muted ${user.user.tag}`);
    message.channel.send(`✅ Muted ${user.user.tag}`);
  }

  // --- UNMUTE ---
  if (command === "unmute" && config.moderation.unmuteCommand) {
    const user = message.mentions.members.first();
    if (!user) return message.reply("Please mention a user to unmute.");
    const muteRole = message.guild.roles.cache.find(r => r.name === config.roles.muteRole);
    if (!muteRole) return message.reply("Mute role not found.");
    await user.roles.remove(muteRole);
    logAction(message, `🔊 Unmuted ${user.user.tag}`);
    message.channel.send(`✅ Unmuted ${user.user.tag}`);
  }

  // --- ROLE ADD ---
  if (command === "roleadd" && config.moderation.roleAddCommand) {
    const user = message.mentions.members.first();
    const roleName = args.slice(1).join(" ");
    if (!user || !roleName) return message.reply("Usage: !roleadd @user RoleName");
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return message.reply("Role not found.");
    await user.roles.add(role);
    logAction(message, `➕ Added role ${role.name} to ${user.user.tag}`);
    message.channel.send(`✅ Role ${role.name} added to ${user.user.tag}`);
  }

  // --- ROLE REMOVE ---
  if (command === "roleremove" && config.moderation.roleRemoveCommand) {
    const user = message.mentions.members.first();
    const roleName = args.slice(1).join(" ");
    if (!user || !roleName) return message.reply("Usage: !roleremove @user RoleName");
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return message.reply("Role not found.");
    await user.roles.remove(role);
    logAction(message, `➖ Removed role ${role.name} from ${user.user.tag}`);
    message.channel.send(`✅ Role ${role.name} removed from ${user.user.tag}`);
  }

  // --- CLEAR MESSAGES ---
  if (command === "clear" && config.moderation.clearMessagesCommand) {
    const amount = parseInt(args[0]) || 1;
    if (amount < 1 || amount > 100) return message.reply("Please provide a number between 1 and 100.");
    await message.channel.bulkDelete(amount, true);
    logAction(message, `🧹 Cleared ${amount} messages in #${message.channel.name}`);
    message.channel.send(`✅ Cleared ${amount} messages.`).then(msg => setTimeout(() => msg.delete(), 5000));
  }
});

// --- LOGGING FUNCTION ---
async function logAction(message, action) {
  if (!config.logging.enabled) return;
  const logChannel = message.guild.channels.cache.find(c => c.name === config.logging.logChannel);
  if (logChannel) logChannel.send(action);
}

client.login(config.token);
