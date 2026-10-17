export function countWords(text: string): number {
  return text.trim().match(/\S+/gu)?.length ?? 0;
}

export function latestWordWindow(text: string): string {
  return text.trim().match(/\S+/gu)?.slice(-500).join(" ") ?? "";
}
