"use client";

import type { Area } from "react-easy-crop";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import { ChangeEvent, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

async function getCroppedBlob(imageSrc: string, crop: Area) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Avatar crop failed"));
        return;
      }

      resolve(blob);
    }, "image/jpeg", 0.92);
  });
}

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
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? "");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const avatarPreview = imageSrc || avatarUrl || "";

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function uploadAvatar() {
    if (!imageSrc || !croppedAreaPixels) {
      setError("Choose and crop an avatar first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData
      });

      const payload = await response.json().catch(() => ({ error: "Avatar upload failed" }));
      if (!response.ok) {
        setError(payload.error ?? "Avatar upload failed");
        pushToast({ title: "Avatar update failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      setAvatarUrl(payload.data?.avatarUrl ?? avatarUrl);
      setSuccess("Avatar updated.");
      setImageSrc(null);
      pushToast({ title: "Avatar updated", description: "Your profile photo is live.", tone: "success" });
      router.refresh();
    } catch {
      setError("Avatar upload failed.");
      pushToast({ title: "Avatar update failed", description: "Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

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
    <div className="profile-settings-layout">
      <div className="profile-avatar-panel">
        <div className="profile-avatar-frame">
          {avatarPreview ? (
            <Image alt="Profile avatar" src={avatarPreview} className="profile-avatar-image" fill sizes="220px" unoptimized />
          ) : (
            <span>No avatar</span>
          )}
        </div>
        <label className="upload-pill">
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatarChange} />
          Choose avatar
        </label>
        {imageSrc ? (
          <div className="avatar-cropper-card">
            <div className="avatar-cropper-stage">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
              />
            </div>
            <Input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            <Button type="button" onClick={uploadAvatar} disabled={loading}>Save avatar</Button>
          </div>
        ) : null}
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