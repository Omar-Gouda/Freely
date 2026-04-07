export const avatarPresets = [
  { id: "atlas", label: "Atlas", src: "/avatars/avatar-atlas.svg" },
  { id: "nova", label: "Nova", src: "/avatars/avatar-nova.svg" },
  { id: "sol", label: "Sol", src: "/avatars/avatar-sol.svg" },
  { id: "iris", label: "Iris", src: "/avatars/avatar-iris.svg" },
  { id: "zen", label: "Zen", src: "/avatars/avatar-zen.svg" },
  { id: "lyra", label: "Lyra", src: "/avatars/avatar-lyra.svg" }
] as const;

export const avatarPresetUrls = new Set<string>(avatarPresets.map((avatar) => avatar.src));

export function isAvatarPresetUrl(value: string | null | undefined) {
  return Boolean(value && avatarPresetUrls.has(value));
}
