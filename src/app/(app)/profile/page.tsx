import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { ProfileSettingsForm, type Profile } from "@/components/profile/profile-settings-form";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProfilePage() {
  const session = await requireSession();
  const profile = await db.user.findFirst({
    where: { id: session.id, deletedAt: null },
    select: {
      username: true,
      email: true,
      pendingEmail: true,
      fullName: true,
      avatarUrl: true,
      phone: true,
      company: true,
      position: true,
      location: true,
      address: true,
      skills: true,
      experienceSummary: true,
      educationSummary: true,
      bio: true
    }
  });

  if (!profile) {
    return null;
  }

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="profile"
        eyebrow="Recruiter identity"
        title="Keep your profile polished with preset avatars and cleaner workspace details."
        description="Profile photos are now replaced with avatar presets, which keeps storage lighter while still giving the workspace a more intentional feel."
        stats={[
          { label: "Avatar mode", value: "Preset" },
          { label: "Profile fields", value: "Editable" },
          { label: "Workspace ready", value: "Yes" }
        ]}
      />
      <Card className="workspace-side-card workspace-side-card-rich">
        <SectionHeading title="Profile settings" description="Manage your avatar, sign-in identity, and recruiter profile details in one place." />
        <ProfileSettingsForm initialProfile={profile as Profile} />
      </Card>
    </div>
  );
}
