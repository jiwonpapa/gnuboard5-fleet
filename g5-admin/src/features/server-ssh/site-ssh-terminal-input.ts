import type { MutableRefObject } from "react";

export function normalizeTerminalText(value: string) {
  return value.replace(/\r?\n/g, "\r\n");
}

export function buildPresetChipLabel(preset: {
  command: string;
  label: string;
  slot: number;
}) {
  const source = preset.label.trim() || preset.command.trim();
  if (source.length === 0) {
    return `${preset.slot}`;
  }

  const compact = source.replace(/\s+/g, " ").trim();
  return Array.from(compact).slice(0, 2).join("");
}

export function consumeOptimisticEcho(
  stdout: string,
  optimisticEchoRef: MutableRefObject<string>,
) {
  if (stdout.length === 0 || optimisticEchoRef.current.length === 0) {
    return stdout;
  }

  let remainingOutput = stdout;
  let remainingEcho = optimisticEchoRef.current;
  while (remainingOutput.length > 0 && remainingEcho.length > 0) {
    const sharedPrefixLength = measureSharedPrefix(
      remainingEcho,
      remainingOutput,
    );
    if (sharedPrefixLength === 0) {
      remainingEcho = "";
      break;
    }

    remainingEcho = remainingEcho.slice(sharedPrefixLength);
    remainingOutput = remainingOutput.slice(sharedPrefixLength);
  }

  optimisticEchoRef.current = remainingEcho;
  return remainingOutput;
}

export function shouldOptimisticallyEchoTerminalInput(data: string) {
  return (
    data.length > 0 &&
    data.length <= 16 &&
    Array.from(data).every((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
  );
}

export function shouldFlushTerminalInputImmediately(data: string) {
  return (
    data.includes("\r") ||
    data.includes("\n") ||
    data.includes(String.fromCharCode(3)) ||
    data.includes(String.fromCharCode(4))
  );
}

function measureSharedPrefix(left: string, right: string) {
  const max = Math.min(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) {
      return index;
    }
  }
  return max;
}
