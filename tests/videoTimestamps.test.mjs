import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const exports = {};
const source = readFileSync(new URL("../lib/videoTimestamps.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
runInNewContext(outputText, { exports });
const { splitVideoTimestamps: split } = exports;

test("all summary chapter markers are retained with their surrounding text", () => {
  const parts = split("[0:33:00] Vector · [0:46:00] Add and scale · [0:58:00] Linear combination · [1:12:00] First proof", "1");
  const timestamps = Array.from(parts).filter((part) => part.type === "timestamp");
  assert.deepEqual(timestamps.map((part) => part.seconds), [1980, 2760, 3480, 4320]);
  assert.ok(timestamps.every((part) => part.videoId === "1"));
  assert.equal(parts.filter((part) => part.type === "text").map((part) => part.text).join(""), " Vector ·  Add and scale ·  Linear combination ·  First proof");
});

test("explicit cross-video references and zero seconds are valid", () => {
  const parts = Array.from(split("[Video 2, 0:24:00] [0:00:00]", "1"));
  assert.deepEqual(parts.filter((part) => part.type === "timestamp").map((part) => [part.videoId, part.seconds]), [["2", 1440], ["1", 0]]);
});

test("nearby and repeated summary markers are never deduplicated", () => {
  assert.equal(split("[0:01:00] [0:01:30] [0:01:30]", "1").filter((part) => part.type === "timestamp").length, 3);
});

test("malformed and unsafe timestamps stay ordinary text", () => {
  const text = "[0:60:00] [0:12:99] [-1:00:00] [99999999999999999:00:00] [Video ../2, 0:24:00]";
  const parts = split(text, "1");
  assert.equal(parts.length, 1);
  assert.equal(parts[0].type, "text");
  assert.equal(parts[0].text, text);
});

test("parsing separate messages does not retain regex state", () => {
  for (let i = 0; i < 3; i++) assert.equal(split("[0:33:00]", "1")[0].seconds, 1980);
  assert.equal(split("No chapter markers.", "1")[0].text, "No chapter markers.");
});
