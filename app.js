import "dotenv/config";
import express from "express";
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from "discord-interactions";
import { DiscordRequest, handleGuess, randomGif } from "./utils.js";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { getPlaylistTracks, MY_PLAYLIST } from "./spotify.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};

client.on("clientReady", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  console.log(
    `User ${message.author.id} sent this message: ${message.content}`,
  );
  if (message.author.bot) {
    console.log("Detected message from bot");
    return;
  }
  const game = activeGames[message.channel.id];
  if (!game) {
    console.log("Detected no game");
    return;
  }
  if (message.author.id !== game.playerId) {
    console.log("Detected author id not equal to player id");
    return;
  }
  if (message.content.length === 1 && /[a-zA-Z0-9'()-]/.test(message.content)) {
    console.log("Detected content is 1 char");
    const guessedLetter = message.content.toUpperCase();
    console.log("Guessed Letter: ", guessedLetter);
    await handleGuess(guessedLetter, message, game, activeGames);
  }
});
/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
    // Interaction id, type and data
    const { id, type, data } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name } = data;

      if (name === "chiikawa" && id) {
        const context = req.body.context;
        const userId =
          context === 0 ? req.body.member.user.id : req.body.user.id;
        // const objectName = req.body.data.options[0].value;

        activeGames[id] = {
          id: userId,
          // objectName,
        };
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags:
              InteractionResponseFlags.IS_COMPONENTS_V2 |
              InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: `Go save chiikawa, <@${userId}>!`,
              },
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.BUTTON,
                    custom_id: `accept_button_${req.body.id}`,
                    label: "Accept",
                    style: ButtonStyleTypes.PRIMARY,
                  },
                ],
              },
            ],
          },
        });
      }
      console.error(`unknown command: ${name}`);
      return res.status(400).json({ error: "unknown command" });
    }
    if (type === InteractionType.MESSAGE_COMPONENT) {
      const componentId = data.custom_id;

      if (componentId.startsWith("accept_button_")) {
        res.send({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        });

        const gameId = componentId.replace("accept_button_", "");
        const tries = 7;
        const channelId = req.body.channel_id || req.body.message?.channel_id;

        const words = await getPlaylistTracks(MY_PLAYLIST);
        // const words = [
        //   "PORK STEAK",
        //   "ADOBONG MANOK",
        //   "HONKAI STAR RAIL",
        //   "GROW A GARDEN",
        //   "GENSHIN IMPACT",
        //   "RIOT GAMES",
        //   "PEPPERONI PIZZA",
        //   "BEST FRIEND",
        //   "VIDEO GAMES",
        // ];

        const secretWord =
          words[Math.floor(Math.random() * words.length)].toUpperCase();
        const hiddenWord = secretWord
          .split("")
          .map((letter) => (letter === " " ? " " : "_"))
          .join(" ");

        console.log("secretWord:", secretWord);
        console.log("hiddenWord:", hiddenWord);

        const gameEmbed = new EmbedBuilder()
          .setTitle("Guess the word to save Chiikawa!")
          .setDescription(
            `Category is top 50 songs in PH!\n\n \`\`\`\nWord: ${hiddenWord}\n\`\`\``,
          )
          .setColor(0x5865f2)
          .addFields(
            { name: "Tries Left", value: tries.toString(), inline: true },
            {
              name: "Guesses Made",
              value: "None Yet",
            },
          )
          .setFooter({
            text: "Type a single letter in the chat to make a guess.",
          })
          .setImage(randomGif("start"));

        try {
          const channel = await client.channels.fetch(channelId);
          console.log("Test message sent");
          const startMsg = await channel.send({
            content: "A new game has started!",
            embeds: [gameEmbed],
          });

          activeGames[channelId] = {
            secretWord: secretWord,
            hiddenWord: hiddenWord,
            guessedLetters: [],
            wrongGuesses: 0,
            maxTries: tries,
            playerId: req.body.member?.user.id || req.body.user.id,
            gameId: gameId,
            gameMsg: startMsg,
          };
        } catch (error) {
          console.error("Error sending game message: ", error);
        }
      }
      return;
    }

    console.error("unknown interaction type", type);
    return res.status(400).json({ error: "unknown interaction type" });
  },
);

client.login(process.env.DISCORD_TOKEN);
setTimeout(() => {
  app.listen(PORT, () => {
    console.log("Listening on port", PORT);
  });
}, 2000);
