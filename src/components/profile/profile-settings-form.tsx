"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { avatarPresets, isAvatarPresetUrl } from "@/lib/avatar-presets";

export type Profile = {
  username: string | null;
  email: string;
  pendingEmail: string | null;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  location: string | null;
  address: string | null;
  skills: string[];
  experienceSummary: string | null;
  educationSummary: string | null;
  bio: string | null;
};

export function ProfileSettingsForm({ initialProfile }: { initialProfile: Profile }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [skills, setSkills] = useState((initialProfile.skills ?? []).join(", "));
  const [avatarUrl, setAvatarUrl] = useState(isAvatarPresetUrl(initialProfile.avatarUrl) ? (initialProfile.avatarUrl ?? "") : (avatarPresets[0]?.src ?? ""));

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(formData.get("username") ?? ""),
        fullName: String(formData.get("fullName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        company: String(formData.get("company") ?? ""),
        position: String(formData.get("position") ?? ""),
        location: String(formData.get("location") ?? ""),
        address: String(formData.get("address") ?? ""),
        bio: String(formData.get("bio") ?? ""),
        avatarUrl,
        experienceSummary: String(formData.get("experienceSummary") ?? ""),
        educationSummary: String(formData.get("educationSummary") ?? ""),
        password: String(formData.get("password") ?? ""),
        email: String(formData.get("email") ?? ""),
        skills: skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      })
    });

    const payload = await response.json().catch(() => ({ error: "Profile update failed" }));

    if (!response.ok) {
      setError(payload.error ?? "Profile update failed");
      setLoading(false);
      pushToast({ title: "Profile update failed", description: payload.error ?? "Please try again.", tone: "error" });
      return;
    }

    setSuccess("Profile updated successfully.");
    pushToast({
      title: "Profile updated",
      description: payload.data?.pendingEmail ? "Email change requested. Check your inbox to verify it." : "Your recruiter profile has been saved.",
      tone: "success"
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="profile-settings-layout profile-settings-layout-rich">
      <div className="profile-avatar-panel profile-avatar-panel-rich">
        <div className="profile-avatar-frame profile-avatar-frame-rich">
          {avatarUrl ? (
            <Image alt="Profile avatar" src={avatarUrl} className="profile-avatar-image" fill sizes="220px" unoptimized />
          ) : (
            <span>No avatar</span>
          )}
        </div>
        <div className="stack-sm">
          <strong>Choose a workspace avatar</strong>
          <p className="muted">Profile photos are disabled to keep storage light and branding consistent.</p>
        </div>
        <div className="avatar-preset-grid">
          {avatarPresets.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              className={`avatar-preset-button ${avatarUrl === avatar.src ? "avatar-preset-button-active" : ""}`}
              onClick={() => setAvatarUrl(avatar.src)}
            >
              <span className="avatar-preset-thumb">
                <Image alt={avatar.label} src={avatar.src} width={72} height={72} unoptimized />
              </span>
              <span>{avatar.label}</span>
            </button>
          ))}
        </div>
      </div>
      <form className="form-grid profile-form-grid" action={handleSubmit}>
        <div className="job-form-grid">
          <label className="field-shell">
            <span>Full name</span>
            <Input name="fullName" placeholder="Full name" defaultValue={initialProfile.fullName} required />
          </label>
          <label className="field-shell">
            <span>Username</span>
            <Input name="username" placeholder="Username" defaultValue={initialProfile.username ?? ""} />
          </label>
          <label className="field-shell">
            <span>Email</span>
            <Input name="email" type="email" placeholder="Email" defaultValue={initialProfile.pendingEmail ?? initialProfile.email} />
          </label>
          <label className="field-shell">
            <span>New password</span>
            <Input name="password" type="password" placeholder="Leave blank to keep current password" />
          </label>
          <label className="field-shell">
            <span>Phone</span>
            <Input name="phone" placeholder="Phone" defaultValue={initialProfile.phone ?? ""} />
          </label>
          <label className="field-shell">
            <span>Company</span>
            <Input name="company" placeholder="Company" defaultValue={initialProfile.company ?? ""} />
          </label>
          <label className="field-shell">
            <span>Position</span>
            <Input name="position" placeholder="Position" defaultValue={initialProfile.position ?? ""} />
          </label>
          <label className="field-shell">
            <span>Location</span>
            <Input name="location" placeholder="Location" defaultValue={initialProfile.location ?? ""} />
          </label>
          <label className="field-shell field-shell-full">
            <span>Address</span>
            <Input name="address" placeholder="Address" defaultValue={initialProfile.address ?? ""} />
          </label>
          <label className="field-shell field-shell-full">
            <span>Skills</span>
            <Input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Skills, comma separated" />
          </label>
          <label className="field-shell field-shell-full">
            <span>Professional summary</span>
            <Textarea name="bio" rows={3} placeholder="Professional summary" defaultValue={initialProfile.bio ?? ""} />
          </label>
          <label className="field-shell field-shell-full">
            <span>Experience</span>
            <Textarea name="experienceSummary" rows={5} placeholder="Experience" defaultValue={initialProfile.experienceSummary ?? ""} />
          </label>
          <label className="field-shell field-shell-full">
            <span>Education</span>
            <Textarea name="educationSummary" rows={5} placeholder="Education" defaultValue={initialProfile.educationSummary ?? ""} />
          </label>
        </div>
        {initialProfile.pendingEmail ? <p className="muted">Pending verification: {initialProfile.pendingEmail}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save profile"}</Button>
      </form>
    </div>
  );
}


