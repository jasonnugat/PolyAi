import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Exercise the shared TypeScript helper without adding a separate test runtime.
const exports = {};
const source = readFileSync(new URL("../lib/chatRules.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
runInNewContext(outputText, { exports });
const { limitAnswerTimestamps: filter } = exports;

test("one vector explanation keeps one reference even over five minutes apart", () => {
  const text = "A vector is a coordinate list, pictured as an arrow or a point. [Video 1, 0:35:29] [Video 1, 0:41:01]";
  assert.equal(filter(text, "3"), "A vector is a coordinate list, pictured as an arrow or a point. [Video 1, 0:35:29]");
});

test("citation groups include line breaks, punctuation and conjunctions", () => {
  for (const separator of ["\n", "\n\n", ", ", "; ", " and ", " und ", "\n- "]) {
    const text = `A vector. [Video 1, 0:35:29]${separator}[Video 1, 0:41:01].`;
    assert.equal(filter(text, "3"), "A vector. [Video 1, 0:35:29].");
  }
});

test("three references in a group still keep only one per video", () => {
  const text = "A vector. [Video 1, 0:35:29]\n[Video 1, 0:41:01]\n[Video 1, 1:10:00]";
  assert.equal(filter(text, "3"), "A vector. [Video 1, 0:35:29]");
});

test("removing a citation preserves sentence punctuation and balanced wrappers", () => {
  for (const text of [
    "A vector [Video 1, 0:35:29] ([Video 1, 0:41:01]).",
    "A vector [Video 1, 0:35:29]. [Video 1, 0:41:01]",
    "A vector [Video 1, 0:35:29]. [Video 1, 0:41:01].",
  ]) assert.equal(filter(text, "3"), "A vector [Video 1, 0:35:29].");
  assert.equal(
    filter("A vector ([Video 1, 0:35:29]) ([Video 1, 0:41:01]).", "3"),
    "A vector ([Video 1, 0:35:29]).",
  );
});

test("a summary keeps separate citations beside different topics", () => {
  const text = "Inner products [Video 3, 0:00:03].\n\nIndependence [Video 3, 0:08:25]. Equivalent criteria [Video 3, 0:38:16].\n\nSpan [Video 3, 1:21:09].";
  assert.equal(filter(text, "3"), text);
});

test("comparison sources in different videos stay independent", () => {
  const text = "Compare [Video 1, 0:35:29] [Video 2, 0:35:29] [Video 1, 0:41:01]";
  assert.equal(filter(text, "3"), "Compare [Video 1, 0:35:29] [Video 2, 0:35:29]");
});

test("legacy and explicit current-video citations share the same group", () => {
  assert.equal(filter("A vector [0:35:29] [Video 1, 0:41:01]", "1"), "A vector [0:35:29]");
});

test("nearby references still collapse but five minutes allows a new topic", () => {
  const text = "Definition [Video 1, 0:10:00]. Example [Video 1, 0:14:59]. Next topic [Video 1, 0:15:00].";
  assert.equal(filter(text, "1"), "Definition [Video 1, 0:10:00]. Example. Next topic [Video 1, 0:15:00].");
});

test("a discarded nearby citation does not block a valid later source in its group", () => {
  const text = "First [Video 1, 0:10:00]. Different point [Video 1, 0:11:00] [Video 1, 0:20:00]";
  assert.equal(filter(text, "1"), "First [Video 1, 0:10:00]. Different point [Video 1, 0:20:00]");
});

test("API and client can filter twice without changing the answer again", () => {
  const text = "Vectors [Video 1, 0:35:29]\n[Video 1, 0:41:01].\n\nSpan [Video 3, 1:21:09] [Video 3, 1:27:00].";
  const once = filter(text, "3");
  assert.equal(filter(once, "3"), once);
  assert.equal(filter("No references here.", "3"), "No references here.");
});
