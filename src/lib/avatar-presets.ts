export const avatarPresets = [
  { id: "omar", label: "Omar", src: "/Avatar1.png" },
  { id: "noor", label: "Noor", src: "/Avatar2.png" },
  { id: "sami", label: "Sami", src: "/Avatar3.png" },
  { id: "maya", label: "Maya", src: "/Avatar4.png" },
  { id: "zayd", label: "Zayd", src: "/Avatar5.png" },
  { id: "lara", label: "Lara", src: "/GirlyAvatar1.png" },
  { id: "hana", label: "Hana", src: "/GirlyAvatar2.png" },
  { id: "reem", label: "Reem", src: "/GirlyAvatar3.png" },
  { id: "nadia", label: "Nadia", src: "/GirlyAvatar4.png" }
] as const;

export const avatarPresetUrls = new Set<string>(avatarPresets.map((avatar) => avatar.src));

export function isAvatarPresetUrl(value: string | null | undefined) {
  return Boolean(value && avatarPresetUrls.has(value));
}
