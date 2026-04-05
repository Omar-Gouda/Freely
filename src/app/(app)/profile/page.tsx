import { ProfileSettingsForm, type Profile } from "@/components/profile/profile-settings-form";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
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
    <div className="stack-xl">
      <SectionHeading title="Profile settings" description="Manage your avatar, sign-in identity, and recruiter profile details in one place." />
      <Card>
        <ProfileSettingsForm initialProfile={profile as Profile} />
      </Card>
    </div>
  );
}
