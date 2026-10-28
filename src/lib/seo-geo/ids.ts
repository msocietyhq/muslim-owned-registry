export function siteChatId(ownerId: string, domain: string) {
  return `site:${ownerId}:${domain}`;
}

export function uniqueChatsByDomain<T extends { domain: string; updatedAt: string }>(chats: T[]) {
  const seen = new Set<string>();
  return [...chats]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((chat) => {
      if (seen.has(chat.domain)) return false;
      seen.add(chat.domain);
      return true;
    });
}
