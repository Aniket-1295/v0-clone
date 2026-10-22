import Sandbox from "@e2b/code-interpreter";
import z from "zod";
import { LIGHT_NPM_FLAGS } from "@/lib/sandbox";
import { IMAGE_ASPECT_RATIOS, saveGeneratedImage } from "@/lib/generated-images";
import { generateImage } from "./gemini";

// Zod schemas are the single source: they validate the model's arguments and are
// converted to the JSON Schema the model sees.
const TOOL_SCHEMAS = {
  terminal: {
    description: "Use the terminal to run commands",
    parameters: z.object({ command: z.string() }),
  },
  createOrUpdateFiles: {
    description: "Create or update files in the sandbox",
    parameters: z.object({
      files: z.array(z.object({ path: z.string(), content: z.string() })),
    }),
  },
  readFiles: {
    description: "Read files in the sandbox",
    parameters: z.object({ files: z.array(z.string()) }),
  },
  // Only offered when the user turned on "Generate images" (see agentTools).
  generateImage: {
    description:
      "Generate an image (photo, illustration or background) for the app from a detailed description. Returns its public URL, width and height; use the URL as an <img> src.",
    parameters: z.object({
      prompt: z.string().min(1).max(1000).describe("What the image shows: subject, style, colours, lighting. No text in the image."),
      aspectRatio: z.enum(IMAGE_ASPECT_RATIOS).default("16:9"),
    }),
  },
};

const IMAGE_TOOLS = new Set(["generateImage"]);

const toJsonSchema = (schema) => {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema);
  void $schema;
  return jsonSchema;
};

const toDeclaration = ([name, { description, parameters }]) => ({
  name,
  description,
  parametersJsonSchema: toJsonSchema(parameters),
});

/** The tools the code agent may call; generateImage only when `images` is on. */
export const agentTools = ({ images = false } = {}) =>
  Object.entries(TOOL_SCHEMAS).filter(([name]) => images || !IMAGE_TOOLS.has(name)).map(toDeclaration);

// `npm install a b --yes` (no other commands chained): the package names it installs.
export const npmInstallPackages = (command) => {
  const match = /^\s*npm\s+(?:install|i|add)\s+([^;&|]+)$/.exec(command);
  if (!match) return null;
  const names = match[1]
    .split(/\s+/)
    .filter((arg) => arg && !arg.startsWith("-"))
    // "react@19", "@scope/pkg@^1" -> package name without the version
    .map((arg) => arg.replace(/(?!^)@.*$/, ""));
  return names.length ? names : null;
};

/**
 * The package names of an `npm install` when every one is already in the app's
 * package.json, otherwise null.
 * Reinstalling them (the model often reinstalls lucide-react) next to the running dev
 * server can exhaust the sandbox's 1 GB of memory and hang it.
 */
const alreadyInstalled = async (sandbox, command) => {
  const names = npmInstallPackages(command);
  if (!names) return null;
  try {
    const pkg = JSON.parse(await sandbox.files.read("/home/user/package.json"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return names.every((name) => name in deps) ? names : null;
  } catch {
    return null;
  }
};

// Every npm install the agent runs skips audit, fund and progress output: with them, an
// install next to the dev server can exhaust the sandbox's memory and hang it.
export const withLightNpmFlags = (command) => command.replace(/\bnpm\s+(install|i|add)\b/g, `npm $1 ${LIGHT_NPM_FLAGS}`);

const reply = (call, output, writtenFiles = {}) => ({
  part: { functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response: output } },
  writtenFiles,
});

// Sent back when image generation is off, used up or unavailable: the agent should not retry.
const NO_MORE_IMAGES =
  "Do not call generateImage again in this task. Where an image is still needed, build a placeholder in code (a gradient or a tinted block with a lucide-react icon). Do not use image URLs from the web (Unsplash or any other site): guessed URLs break. Say in your summary that images could not be generated and placeholders are shown.";

const runGenerateImage = async (call, { prompt, aspectRatio }, { chatId, imagesLeft = 0 }) => {
  if (imagesLeft <= 0) return reply(call, { error: `The image limit for this task is reached. ${NO_MORE_IMAGES}` });
  try {
    const image = await generateImage({ prompt, aspectRatio });
    const { url, width, height } = await saveGeneratedImage({ chatId, prompt, data: image.data });
    return reply(call, { output: { url, width, height } });
  } catch (error) {
    if (error.unavailable) return reply(call, { error: `Image generation is unavailable right now (quota). ${NO_MORE_IMAGES}` });
    return reply(call, { error: `Could not generate this image: ${error.message}` });
  }
};

/**
 * Runs one function call. Returns the functionResponse part to send back and the files it
 * wrote (path -> content). `context` is { chatId, images, imagesLeft } for generateImage.
 */
export const runTool = async (call, sandboxId, context = {}) => {
  const spec = TOOL_SCHEMAS[call.name];
  if (!spec || (IMAGE_TOOLS.has(call.name) && !context.images)) return reply(call, { error: `Unknown tool: ${call.name}` });

  const parsed = spec.parameters.safeParse(call.args ?? {});
  if (!parsed.success) return reply(call, { error: `Invalid arguments: ${parsed.error.message}` });

  // Needs no sandbox.
  if (call.name === "generateImage") return runGenerateImage(call, parsed.data, context);

  const sandbox = await Sandbox.connect(sandboxId);

  switch (call.name) {
    case "terminal": {
      const installed = await alreadyInstalled(sandbox, parsed.data.command);
      if (installed) {
        return reply(call, { output: `Already installed: ${installed.join(", ")}. No need to install them.` });
      }

      const buffers = { stdout: "", stderr: "" };
      try {
        const result = await sandbox.commands.run(withLightNpmFlags(parsed.data.command), {
          onStdout: (data) => {
            buffers.stdout += data;
          },
          onStderr: (data) => {
            buffers.stderr += data;
          },
        });
        return reply(call, { output: result.stdout || "(no output)" });
      } catch (error) {
        return reply(call, { error: `Command failed: ${error}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}` });
      }
    }

    case "createOrUpdateFiles": {
      try {
        const writtenFiles = {};
        for (const file of parsed.data.files) {
          await sandbox.files.write(file.path, file.content);
          writtenFiles[file.path] = file.content;
        }
        return reply(call, { output: `Wrote ${Object.keys(writtenFiles).join(", ")}` }, writtenFiles);
      } catch (error) {
        return reply(call, { error: `Error: ${error}` });
      }
    }

    case "readFiles": {
      try {
        const contents = [];
        for (const file of parsed.data.files) {
          contents.push({ path: file, content: await sandbox.files.read(file) });
        }
        return reply(call, { output: JSON.stringify(contents) });
      } catch (error) {
        return reply(call, { error: `Error: ${error}` });
      }
    }
  }
};
