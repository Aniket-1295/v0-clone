import Sandbox from "@e2b/code-interpreter";
import z from "zod";

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
};

const toJsonSchema = (schema) => {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema);
  void $schema;
  return jsonSchema;
};

export const CODE_AGENT_TOOLS = Object.entries(TOOL_SCHEMAS).map(([name, { description, parameters }]) => ({
  name,
  description,
  parametersJsonSchema: toJsonSchema(parameters),
}));

// `npm install a b --yes` (no other commands chained): the package names it installs.
const npmInstallPackages = (command) => {
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

const reply = (call, output, writtenFiles = {}) => ({
  part: { functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response: output } },
  writtenFiles,
});

/**
 * Runs one function call in the sandbox. Returns the functionResponse part to send back
 * and the files it wrote (path -> content).
 */
export const runTool = async (call, sandboxId) => {
  const spec = TOOL_SCHEMAS[call.name];
  if (!spec) return reply(call, { error: `Unknown tool: ${call.name}` });

  const parsed = spec.parameters.safeParse(call.args ?? {});
  if (!parsed.success) return reply(call, { error: `Invalid arguments: ${parsed.error.message}` });

  const sandbox = await Sandbox.connect(sandboxId);

  switch (call.name) {
    case "terminal": {
      const installed = await alreadyInstalled(sandbox, parsed.data.command);
      if (installed) {
        return reply(call, { output: `Already installed: ${installed.join(", ")}. No need to install them.` });
      }

      const buffers = { stdout: "", stderr: "" };
      try {
        const result = await sandbox.commands.run(parsed.data.command, {
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
