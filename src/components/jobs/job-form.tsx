"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { JobStatus } from "@/lib/models";

const sectorOptions = ["BPO / Call Center", "Customer Service", "Sales", "Telesales", "Marketing", "Finance", "Accounting", "Engineering", "Technology", "Healthcare", "Education", "HR", "Operations", "Logistics", "Retail", "Hospitality", "Manufacturing", "Legal", "Real Estate", "Other"];
const employmentOptions = ["Full-time", "Part-time", "Contract", "Internship", "Temporary", "Freelance"];
const workModeOptions = ["On-site", "Hybrid", "Remote", "Field"];
const seniorityOptions = ["Entry level", "Junior", "Mid level", "Senior", "Lead", "Manager"];
const languageOptions = ["English", "Arabic", "French", "German", "Italian", "Spanish", "Portuguese", "Ukrainian", "Other"];

export function JobForm({ canManageStatus }: { canManageStatus: boolean }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rawDescription, setRawDescription] = useState("");
  const [title, setTitle] = useState("");
  const [headcount, setHeadcount] = useState("25");
  const [location, setLocation] = useState("");
  const [sourceCampaign, setSourceCampaign] = useState("");
  const [sector, setSector] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [seniority, setSeniority] = useState("Entry level");
  const [workMode, setWorkMode] = useState("On-site");
  const [salaryRange, setSalaryRange] = useState("");
  const [languageRequirement, setLanguageRequirement] = useState("English");
  const [experienceRequirement, setExperienceRequirement] = useState("");
  const [status, setStatus] = useState<string>(JobStatus.OPEN);

  const descriptionCount = useMemo(() => rawDescription.trim().length, [rawDescription]);

  async function handleSubmit() {
    setLoading(true);
    const extractResponse = await fetch("/api/jobs/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawDescription })
    });
    const extractPayload = await extractResponse.json().catch(() => ({ error: "Job extraction failed" }));

    if (!extractResponse.ok) {
      pushToast({ title: "Job extraction failed", description: extractPayload.error ?? "Please try again.", tone: "error" });
      setLoading(false);
      return;
    }

    const extracted = extractPayload.data;
    const createResponse = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || extracted.title,
        rawDescription,
        headcount: Number(headcount || 1),
        location: location || extracted.location || "",
        sourceCampaign,
        sector,
        department,
        employmentType,
        seniority,
        workMode,
        salaryRange,
        languageRequirement,
        experienceRequirement,
        status: canManageStatus ? status : JobStatus.OPEN
      })
    });

    const createPayload = await createResponse.json().catch(() => ({ error: "Job creation failed" }));
    if (!createResponse.ok) {
      pushToast({ title: "Job creation failed", description: createPayload.error ?? "Please try again.", tone: "error" });
      setLoading(false);
      return;
    }

    pushToast({ title: "Job created", description: "Structured role details and platform-ready posts are ready.", tone: "success" });
    setLoading(false);
    setTitle("");
    setHeadcount("25");
    setLocation("");
    setSourceCampaign("");
    setSector("");
    setDepartment("");
    setEmploymentType("Full-time");
    setSeniority("Entry level");
    setWorkMode("On-site");
    setSalaryRange("");
    setLanguageRequirement("English");
    setExperienceRequirement("");
    setStatus(JobStatus.OPEN);
    setRawDescription("");
    router.refresh();
  }

  return (
    <div className="stack-lg">
      <div className="stack-md">
        <div className="job-form-section-header">
          <strong>Role basics</strong>
          <small>Core identity and hiring demand.</small>
        </div>
        <div className="job-form-grid">
          <label className="field-shell">
            <span>Job title</span>
            <Input name="title" placeholder="Customer Service Representative" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field-shell">
            <span>Sector</span>
            <input list="job-sectors" className="input" name="sector" placeholder="BPO / Call Center" value={sector} onChange={(event) => setSector(event.target.value)} />
          </label>
          <label className="field-shell">
            <span>Department</span>
            <Input name="department" placeholder="Customer Support" value={department} onChange={(event) => setDepartment(event.target.value)} />
          </label>
          <label className="field-shell">
            <span>Location</span>
            <Input name="location" placeholder="New Cairo" value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
          <label className="field-shell">
            <span>Headcount</span>
            <Input name="headcount" type="number" min={1} value={headcount} onChange={(event) => setHeadcount(event.target.value)} required />
          </label>
          <label className="field-shell">
            <span>Source / campaign</span>
            <Input name="sourceCampaign" placeholder="April social hiring push" value={sourceCampaign} onChange={(event) => setSourceCampaign(event.target.value)} />
          </label>
          {canManageStatus ? (
            <label className="field-shell">
              <span>Initial status</span>
              <select className="input" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
                {Object.values(JobStatus).map((option) => (
                  <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="stack-md">
        <div className="job-form-section-header">
          <strong>Hiring setup</strong>
          <small>Structured fields for reporting and outreach.</small>
        </div>
        <div className="job-form-grid">
          <label className="field-shell">
            <span>Employment type</span>
            <select className="input" name="employmentType" value={employmentType} onChange={(event) => setEmploymentType(event.target.value)}>
              {employmentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="field-shell">
            <span>Work mode</span>
            <select className="input" name="workMode" value={workMode} onChange={(event) => setWorkMode(event.target.value)}>
              {workModeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="field-shell">
            <span>Seniority</span>
            <select className="input" name="seniority" value={seniority} onChange={(event) => setSeniority(event.target.value)}>
              {seniorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="field-shell">
            <span>Language focus</span>
            <select className="input" name="languageRequirement" value={languageRequirement} onChange={(event) => setLanguageRequirement(event.target.value)}>
              {languageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="field-shell">
            <span>Salary / package</span>
            <Input name="salaryRange" placeholder="20K Net + KPIs + overtime" value={salaryRange} onChange={(event) => setSalaryRange(event.target.value)} />
          </label>
          <label className="field-shell">
            <span>Experience requirement</span>
            <Input name="experienceRequirement" placeholder="0-2 years or no experience" value={experienceRequirement} onChange={(event) => setExperienceRequirement(event.target.value)} />
          </label>
        </div>
      </div>

      <div className="stack-md">
        <div className="list-row list-row-start">
          <div>
            <strong>Role brief</strong>
            <p className="muted">Paste the job brief, requirements, benefits, shifts, KPIs, or screening notes.</p>
          </div>
          <small>{descriptionCount} characters</small>
        </div>
        <Textarea
          name="rawDescription"
          placeholder="Paste the full job brief, salary details, requirements, benefits, shifts, KPIs, and hiring notes here"
          required
          rows={10}
          value={rawDescription}
          onChange={(event) => setRawDescription(event.target.value)}
        />
      </div>

      <Button type="button" disabled={loading || descriptionCount < 30} onClick={handleSubmit}>
        {loading ? "Creating role..." : "Create role and generate platform posts"}
      </Button>

      <datalist id="job-sectors">
        {sectorOptions.map((option) => <option key={option} value={option} />)}
      </datalist>
    </div>
  );
}