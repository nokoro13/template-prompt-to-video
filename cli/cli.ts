#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import prompts from "prompts";
import ora from "ora";
import chalk from "chalk";
import * as dotenv from "dotenv";
import { runSimpleGenerate } from "../lib/generate-simple-story";

dotenv.config({ quiet: true });

interface GenerateOptions {
  apiKey?: string;
  geminiApiKey?: string;
  elevenlabsApiKey?: string;
  title?: string;
  topic?: string;
  /** OpenAI Responses API + web_search for the main script. */
  useWebSearch?: boolean;
}

async function generateStory(options: GenerateOptions) {
  try {
    let apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    let geminiApiKey =
      options.geminiApiKey || process.env.NANO_BANANA_API_KEY;
    let elevenlabsApiKey =
      options.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      const response = await prompts({
        type: "password",
        name: "apiKey",
        message: "Enter your OpenAI API key:",
        validate: (value) => value.length > 0 || "API key is required",
      });

      if (!response.apiKey) {
        console.log(chalk.red("API key is required. Exiting..."));
        process.exit(1);
      }

      apiKey = response.apiKey;
    }

    if (!geminiApiKey) {
      const response = await prompts({
        type: "password",
        name: "geminiApiKey",
        message: "Enter your Google Gemini API key (NANO_BANANA / image generation):",
        validate: (value) =>
          value.length > 0 || "Gemini API key is required",
      });

      if (!response.geminiApiKey) {
        console.log(chalk.red("Gemini API key is required. Exiting..."));
        process.exit(1);
      }

      geminiApiKey = response.geminiApiKey;
    }

    if (!elevenlabsApiKey) {
      const response = await prompts({
        type: "password",
        name: "elevenlabsApiKey",
        message: "Enter your ElevenLabs API key:",
        validate: (value) =>
          value.length > 0 || "ElevenLabs API key is required",
      });

      if (!response.elevenlabsApiKey) {
        console.log(chalk.red("API key is required. Exiting..."));
        process.exit(1);
      }

      elevenlabsApiKey = response.elevenlabsApiKey;
    }

    let { title, topic } = options;

    if (!title || !topic) {
      const response = await prompts([
        {
          type: "text",
          name: "title",
          message: "Title of the story:",
          initial: title,
          validate: (value) => value.length > 0 || "Title is required",
        },
        {
          type: "text",
          name: "topic",
          message: "Topic of the story:",
          initial: topic,
          validate: (value) => value.length > 0 || "Topic is required",
        },
      ]);

      if (!response.title || !response.topic) {
        console.log(chalk.red("Title and topic are required. Exiting..."));
        process.exit(1);
      }

      title = response.title;
      topic = response.topic;
    }

    console.log(chalk.blue(`\n📖 Creating story: "${title}"`));
    console.log(chalk.blue(`📝 Topic: ${topic}\n`));

    const spinner = ora("Starting generation...").start();
    await runSimpleGenerate({
      title: title!,
      topic: topic!,
      openaiApiKey: apiKey!,
      geminiApiKey: geminiApiKey!,
      elevenlabsApiKey: elevenlabsApiKey!,
      useWebSearch: options.useWebSearch === true,
      onProgress: (p) => {
        if (p.stage === "story") {
          spinner.text = "Generating story...";
        } else if (p.stage === "descriptions") {
          spinner.text = "Generating image descriptions...";
        } else if (p.stage === "assets") {
          const label =
            p.phase === "image" ? "image" : "voice";
          spinner.text = `[${p.current}/${p.total}] Generating ${label}...`;
        }
      },
    });
    spinner.succeed(chalk.green("Generation finished."));

    console.log(chalk.green.bold("\n✨ Story generation complete!\n"));
    console.log("Run " + chalk.blue("npm run dev") + " to preview the story");

    return {};
  } catch (error) {
    console.error(chalk.red("\n❌ Error:"), error);
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command(
    "generate",
    "Generate story timeline for given title and topic",
    (yargs) => {
      return yargs
        .option("api-key", {
          alias: "k",
          type: "string",
          description: "OpenAI API key",
        })
        .option("gemini-key", {
          alias: "g",
          type: "string",
          description:
            "Google Gemini API key (NANO_BANANA_API_KEY) for image generation",
        })
        .option("title", {
          alias: "t",
          type: "string",
          description: "Title of the story",
        })
        .option("topic", {
          alias: "p",
          type: "string",
          description:
            "Topic of the story (e.g. Interesting Facts, History, etc.)",
        })
        .option("web-search", {
          type: "boolean",
          default: false,
          description:
            "Use OpenAI web search for the main script (Responses API; slower)",
        });
    },
    async (argv) => {
      await generateStory({
        apiKey: argv["api-key"],
        geminiApiKey: argv["gemini-key"],
        title: argv.title,
        topic: argv.topic,
        useWebSearch: argv["web-search"] === true,
      });
    },
  )
  .command(
    "$0",
    "Generate a story (default command)",
    (yargs) => {
      return yargs
        .option("api-key", {
          alias: "k",
          type: "string",
          description: "OpenAI API key",
        })
        .option("gemini-key", {
          alias: "g",
          type: "string",
          description:
            "Google Gemini API key (NANO_BANANA_API_KEY) for image generation",
        })
        .option("title", {
          alias: "t",
          type: "string",
          description: "Title of the story",
        })
        .option("topic", {
          alias: "p",
          type: "string",
          description:
            "Topic of the story (e.g. Interesting Facts, History, etc.)",
        })
        .option("web-search", {
          type: "boolean",
          default: false,
          description:
            "Use OpenAI web search for the main script (Responses API; slower)",
        });
    },
    async (argv) => {
      await generateStory({
        apiKey: argv["api-key"],
        geminiApiKey: argv["gemini-key"],
        title: argv.title,
        topic: argv.topic,
        useWebSearch: argv["web-search"] === true,
      });
    },
  )
  .demandCommand(0, 1)
  .help()
  .alias("help", "h")
  .version()
  .alias("version", "v")
  .strict()
  .parse();
