import "dotenv/config";
import express from "express";
import { EmbedBuilder } from "discord.js";

const gifs = {
  start: ["https://media.tenor.com/k9PP5BZ0_CcAAAAd/chiikawa-jail.gif"],
  correct: [
    "https://media.tenor.com/U7s8InXQnyQAAAAd/ちいかわ-chiikawa.gif",
    "https://media.tenor.com/lt2zYKuEiNAAAAAd/chiikawa-chiikawa-dance.gif",
  ],
  wrong: [
    "https://media.tenor.com/VzO_AzAqboMAAAAd/chikawa-ちいかわ.gif",
    "https://media.tenor.com/WGfra-Y_Ke0AAAAd/chiikawa-sad.gif",
  ],
  win: [
    "https://media.tenor.com/E0NiMsdDEzcAAAAd/chiikawa-hachiware.gif",
    "https://media.tenor.com/xrSi98HyjLoAAAAd/chiikawa-hachiware.gif",
  ],
  lose: [
    "https://media.tenor.com/duB8JcH5gfcAAAAd/chiikawa-chiikawa-sad.gif",
    "https://media.tenor.com/QM4ZESS5tpUAAAAd/ちいかわ-chiikawa.gif",
  ],
};

export function randomGif(type) {
  const arr = gifs[type];
  return arr[Math.floor(Math.random() * arr.length)];
}

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
  const { secretWord, guessedLetters, maxTries, gameMsg } = game;

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

    const updateMsg = new EmbedBuilder()
      .setTitle("Guess the word to save Chiikawa!")
      .setDescription(`\`\`\`\nWord: ${game.hiddenWord}\n\`\`\``)
      .setColor(0x57f287)
      .addFields(
        {
          name: "Tries Left",
          value: (maxTries - game.wrongGuesses).toString(),
          inline: true,
        },
        {
          name: "Guesses Made",
          value: game.guessedLetters.join(", "),
        },
      )
      .setFooter({
        text: "Type a single letter in the chat to make a guess.",
      })
      .setImage(randomGif("correct"));

    const winningMsg = new EmbedBuilder()
      .setTitle("🎉 Congratulations! You saved Chiikawa!")
      .setDescription(`\`\`\`\nWord: ${game.hiddenWord}\n\`\`\``)
      .setColor(0x57f287)
      .addFields(
        {
          name: "Tries Left",
          value: (maxTries - game.wrongGuesses).toString(),
          inline: true,
        },
        {
          name: "Guesses Made",
          value: game.guessedLetters.join(", "),
        },
      )
      .setImage(randomGif("win"));

    await gameMsg.edit({
      content: "✅ Correct Guess!",
      embeds: [updateMsg],
    });

    if (!game.hiddenWord.includes("_")) {
      await gameMsg.edit({
        content: ``,
        embeds: [winningMsg],
      });
      delete activeGames[message.channel.id];
    }
  } else {
    game.wrongGuesses++;

    const updateMsg = new EmbedBuilder()
      .setTitle("Guess the word to save Chiikawa!")
      .setDescription(`\`\`\`\nWord: ${game.hiddenWord}\n\`\`\``)
      .setColor(0xed4245)
      .addFields(
        {
          name: "Tries Left",
          value: (maxTries - game.wrongGuesses).toString(),
          inline: true,
        },
        {
          name: "Guesses Made",
          value: game.guessedLetters.join(", "),
        },
      )
      .setFooter({
        text: "Type a single letter in the chat to make a guess.",
      })
      .setImage(randomGif("wrong"));

    const losingMsg = new EmbedBuilder()
      .setTitle("💀 You lost! Chiikawa is stuck in jail..")
      .setDescription(`\`\`\`\nThe word was: ${game.secretWord}\n\`\`\``)
      .setColor(0xed4245)
      .addFields(
        {
          name: "Tries Left",
          value: (maxTries - game.wrongGuesses).toString(),
          inline: true,
        },
        {
          name: "Guesses Made",
          value: game.guessedLetters.join(", "),
        },
      )
      .setImage(randomGif("lose"));

    await gameMsg.edit({
      content: `❌ Wrong Guess!`,
      embeds: [updateMsg],
    });

    if (game.wrongGuesses >= maxTries) {
      await gameMsg.edit({
        content: ``,
        embeds: [losingMsg],
      });

      delete activeGames[message.channel.id];
    }
  }
}
