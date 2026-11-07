/**
 * Built-in WebChat sticker pack (static — no upload).
 * kind:sticker messages use media.url = `sticker:{id}` and text = emoji glyph.
 */
export interface WebChatSticker {
  id: string;
  emoji: string;
  label: string;
}

export const WEBCHAT_STICKERS: WebChatSticker[] = [
  { id: "wave", emoji: "👋", label: "挥手" },
  { id: "smile", emoji: "😊", label: "微笑" },
  { id: "grin", emoji: "😄", label: "大笑" },
  { id: "heart", emoji: "❤️", label: "爱心" },
  { id: "thumb", emoji: "👍", label: "赞" },
  { id: "clap", emoji: "👏", label: "鼓掌" },
  { id: "ok", emoji: "👌", label: "OK" },
  { id: "think", emoji: "🤔", label: "思考" },
  { id: "cry", emoji: "😢", label: "哭" },
  { id: "fire", emoji: "🔥", label: "火" },
  { id: "star", emoji: "⭐", label: "星星" },
  { id: "party", emoji: "🎉", label: "庆祝" },
  { id: "coffee", emoji: "☕", label: "咖啡" },
  { id: "rocket", emoji: "🚀", label: "起飞" },
  { id: "pray", emoji: "🙏", label: "拜托" },
  { id: "cool", emoji: "😎", label: "酷" },
];

export const WEBCHAT_EMOJI = [
  "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆",
  "😉", "😊", "😋", "😎", "😍", "😘", "🥰", "😗",
  "🙂", "🤗", "🤩", "🤔", "🤨", "😐", "😑", "😶",
  "🙄", "😏", "😣", "😥", "😮", "🤐", "😯", "😪",
  "😫", "🥱", "😴", "😌", "😛", "😜", "😝", "🤤",
  "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "☹️",
  "🙁", "😖", "😞", "😟", "😤", "😢", "😭", "😦",
  "😧", "😨", "😩", "🤯", "😬", "😰", "😱", "🥵",
  "🥶", "😳", "🤪", "😵", "😡", "😠", "🤬", "😷",
  "👍", "👎", "👏", "🙌", "👐", "🤝", "🙏", "💪",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔",
  "💯", "✨", "🔥", "🎉", "🎊", "✅", "❌", "⭐",
];

export function stickerById(id: string): WebChatSticker | undefined {
  return WEBCHAT_STICKERS.find((s) => s.id === id);
}
