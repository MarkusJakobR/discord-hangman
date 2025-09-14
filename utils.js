import "dotenv/config";

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = "https://discord.com/api/v10/" + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "DiscordBot (https://github.com/MarkusJakobR/discord-hangman.git, 1.0.0)",
    },
    ...options,
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: "PUT", body: commands });
  } catch (err) {
    console.error(err);
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = [
    "😭",
    "😄",
    "😌",
    "🤓",
    "😎",
    "😤",
    "🤖",
    "😶‍🌫️",
    "🌏",
    "📸",
    "💿",
    "👋",
    "🌊",
    "✨",
  ];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function handleGuess(letter, message, game, activeGames) {
  const { secretWord, guessedLetters, maxTries } = game;

  if (guessedLetters.includes(letter)) {
    await message.reply(`You already guessed **${letter}**!`);
    return;
  }

  game.guessedLetters.push(letter);

  if (secretWord.includes(letter)) {
    game.hiddenWord = secretWord
      .split("")
      .map((ch) =>
        ch === " " ? " " : game.guessedLetters.includes(ch) ? ch : "_",
      )
      .join(" ");

    await message.reply(`✅ Good guess! \n\`\`\`\n${game.hiddenWord}\n\`\`\``);

    if (!game.hiddenWord.includes("_")) {
      await message.reply(
        `🎉 Congratulations <@${game.playerId}>, you saved Chiikawa!`,
      );
      delete activeGames[message.channel.id];
    }
  } else {
    game.wrongGuesses++;

    await message.reply(
      `❌ Wrong! You have ${maxTries - game.wrongGuesses} tries left.\n\`\`\`\n${game.hiddenWord}\n\`\`\``,
    );

    if (game.wrongGuesses >= maxTries) {
      await message.reply(`💀 Game over! The word was **${secretWord}**.`);
      delete activeGames[message.channel.id];
    }
  }
}
