import { toFhirExtension } from "./fhir";
import { mask, type MaskOptions } from "./mask";
import { PURPOSES, forPurpose, type Purpose } from "./policy";
import { at, parsePartial } from "./postcode";
import { stateName } from "./states";
import {
  CONFIDENCES,
  LEVELS,
  SOURCES,
  type Confidence,
  type Level,
  type ReferenceOptions,
  type Source,
  type Style,
} from "./types";

declare const __VERSION__: string;

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export const USAGE = [
  "Usage: health-postcode <command> [arguments] [options]",
  "",
  "Commands:",
  "  parse <code>           The code split into its segments, as JSON",
  "  at <code> <level>      The code cut to a level",
  "    --style <style>",
  "  mask <code> <level>    The code kept to a level with the rest filled in",
  "    --style <style>",
  "    --fill <char>        One character; the default is a middle dot",
  "  for <code> <purpose>   The code at the most that purpose may see",
  "    --style <style>",
  "  fhir <code>            The FHIR R4 Address extension, as JSON",
  "    --level <level>",
  "    --confidence " + CONFIDENCES.join("|"),
  "    --source " + SOURCES.join("|"),
  "    --assigned true|false",
  "    --checked-at <time>  Date and time with an offset, e.g. 2026-10-06T09:00:00Z",
  "  state <code>           The state name for the code",
  "  help, --help           Print this text",
  "  --version              Print the version",
  "",
  "A code may be spaced, hyphenated or compact, in any case; quote the spaced form.",
  "Styles: display, hyphen, compact",
  "Levels: " + LEVELS.join(", "),
  "Purposes: " + Object.keys(PURPOSES).join(", "),
  "",
  "Exit status: 0 done, 1 the postcode could not be used or an option value is wrong, 2 usage error.",
].join("\n");

const NOT_VALID = "not a valid NIPOST postcode";

type Options = ReadonlyMap<string, string>;

interface Command {
  /** Positional names, used to say which one is missing. */
  args: readonly string[];
  /** Allowed options; a list restricts the value, null accepts any value. */
  options: Readonly<Record<string, readonly string[] | null>>;
  exec(args: readonly string[], options: Options): RunResult;
}

function ok(stdout: string): RunResult {
  return { exitCode: 0, stdout, stderr: "" };
}

function fail(message: string): RunResult {
  return { exitCode: 1, stdout: "", stderr: message };
}

function usageError(reason: string): RunResult {
  return { exitCode: 2, stdout: "", stderr: reason + "\n\n" + USAGE };
}

function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

function isPurpose(value: string): value is Purpose {
  return Object.hasOwn(PURPOSES, value);
}

/** The library validates the style, so an unknown one reaches it and comes back as a RangeError. */
function styleOf(options: Options): { style?: Style } {
  const style = options.get("style");
  return style === undefined ? {} : { style: style as Style };
}

const COMMANDS: Readonly<Record<string, Command>> = {
  parse: {
    args: ["<code>"],
    options: {},
    exec([code]) {
      const parsed = parsePartial(code);
      return parsed === null ? fail(NOT_VALID) : ok(JSON.stringify(parsed, null, 2));
    },
  },
  at: {
    args: ["<code>", "<level>"],
    options: { style: null },
    exec([code, level], options) {
      if (!isLevel(level)) return fail(`${level}: unknown level`);
      const parsed = parsePartial(code);
      if (parsed === null) return fail(NOT_VALID);
      const out = at(code, level, styleOf(options));
      return out === null ? fail(`${parsed.display}: input is coarser than ${level}`) : ok(out);
    },
  },
  mask: {
    args: ["<code>", "<level>"],
    options: { style: null, fill: null },
    exec([code, level], options) {
      if (!isLevel(level)) return fail(`${level}: unknown level`);
      const maskOptions: MaskOptions = styleOf(options);
      const fill = options.get("fill");
      if (fill !== undefined) maskOptions.fill = fill;
      const out = mask(code, level, maskOptions);
      return out === null ? fail(NOT_VALID) : ok(out);
    },
  },
  for: {
    args: ["<code>", "<purpose>"],
    options: { style: null },
    exec([code, purpose], options) {
      if (!isPurpose(purpose)) return fail(`${purpose}: unknown purpose`);
      if (PURPOSES[purpose] === null) return fail(`${purpose}: never include a postcode`);
      const out = forPurpose(code, purpose, styleOf(options));
      return out === null ? fail(NOT_VALID) : ok(out);
    },
  },
  fhir: {
    args: ["<code>"],
    options: { level: null, confidence: null, source: null, assigned: ["true", "false"], "checked-at": null },
    exec([code], options) {
      const reference: ReferenceOptions = {};
      const level = options.get("level");
      if (level !== undefined) {
        if (!isLevel(level)) return fail(`${level}: unknown level`);
        reference.level = level;
      }
      const confidence = options.get("confidence");
      if (confidence !== undefined) reference.confidence = confidence as Confidence;
      const assigned = options.get("assigned");
      if (assigned !== undefined) reference.assigned = assigned === "true";
      const checkedAt = options.get("checked-at");
      if (checkedAt !== undefined) reference.checkedAt = checkedAt;
      const source = options.get("source");
      if (source !== undefined) reference.source = source as Source;
      const parsed = parsePartial(code);
      if (parsed === null) return fail(NOT_VALID);
      const extension = toFhirExtension(code, reference);
      if (extension !== null) return ok(JSON.stringify(extension, null, 2));
      return fail(level === undefined ? NOT_VALID : `${parsed.display}: input is coarser than ${level}`);
    },
  },
  state: {
    args: ["<code>"],
    options: {},
    exec([code]) {
      const parsed = parsePartial(code);
      if (parsed === null) return fail(NOT_VALID);
      const name = stateName(code);
      return name === null ? fail(`${parsed.state}: unknown state code`) : ok(name);
    },
  },
};

/** Splits the words after the command into positionals and options, or returns why it cannot. */
function readArgs(command: Command, words: readonly string[]): { args: string[]; options: Options } | string {
  const args: string[] = [];
  const options = new Map<string, string>();
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (!word.startsWith("--")) {
      args.push(word);
      continue;
    }
    const name = word.slice(2);
    if (!Object.hasOwn(command.options, name)) return `unknown option: ${word}`;
    const value = words[i + 1];
    if (value === undefined || value.startsWith("--")) return `${word} needs a value`;
    if (options.has(name)) return `${word} given twice`;
    const allowed = command.options[name];
    if (allowed !== null && !allowed.includes(value)) return `${word} must be ${allowed.join(" or ")}`;
    options.set(name, value);
    i += 1;
  }
  if (args.length < command.args.length) return `missing ${command.args[args.length]}`;
  if (args.length > command.args.length) return `unexpected argument: ${args[command.args.length]}`;
  return { args, options };
}

export function run(argv: readonly string[]): RunResult {
  if (argv.length === 0 || argv[0] === "help" || argv.includes("--help")) return ok(USAGE);
  const [name, ...words] = argv;
  if (name === "--version") {
    return words.length === 0 ? ok(__VERSION__) : usageError(`unexpected argument: ${words[0]}`);
  }
  if (!Object.hasOwn(COMMANDS, name)) return usageError(`unknown command: ${name}`);
  const command = COMMANDS[name];
  const read = readArgs(command, words);
  if (typeof read === "string") return usageError(read);
  try {
    return command.exec(read.args, read.options);
  } catch (error) {
    if (error instanceof RangeError || error instanceof TypeError) return fail(error.message);
    throw error;
  }
}
