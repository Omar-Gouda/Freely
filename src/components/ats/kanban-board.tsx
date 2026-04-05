"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { pipelineStages } from "@/lib/constants";
import { formatScore } from "@/lib/utils";

type Candidate = {
  id: string;
  name: string;
  stage: string;
  source: string;
  overallScore: number | null;
  suggestedStage: string | null;
};

function SortableCandidateCard({
  candidate,
  onQuickMove,
  onDelete
}: {
  candidate: Candidate;
  onQuickMove: (candidateId: string, stage: string) => Promise<void>;
  onDelete: (candidateId: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.id });

  return (
    <div
      ref={setNodeRef}
      className="card candidate-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.75 : 1
      }}
      {...attributes}
      {...listeners}
    >
      <div className="candidate-card-head">
        <strong>{candidate.name}</strong>
        <Badge>{formatScore(candidate.overallScore)}</Badge>
      </div>
      <p>{candidate.source}</p>
      {candidate.suggestedStage ? <small>AI suggests {candidate.suggestedStage.replaceAll("_", " ").toLowerCase()}</small> : null}
      <div className="candidate-card-quick-actions">
        <select className="input compact-input" value={candidate.stage} onChange={(event) => void onQuickMove(candidate.id, event.target.value)}>
          {pipelineStages.map((stage) => (
            <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>
          ))}
        </select>
        <Link href={`/candidates/${candidate.id}`}>Open profile</Link>
        <button type="button" className="link-button danger" onClick={() => void onDelete(candidate.id)}>Delete</button>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  items,
  onQuickMove,
  onDelete
}: {
  stage: string;
  items: Candidate[];
  onQuickMove: (candidateId: string, stage: string) => Promise<void>;
  onDelete: (candidateId: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="kanban-column" id={stage} ref={setNodeRef} style={{ background: isOver ? "rgba(124,58,237,0.1)" : undefined }}>
      <div className="kanban-column-header">
        <strong>{stage.replaceAll("_", " ")}</strong>
        <Badge>{items.length}</Badge>
      </div>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-stack">
          {items.map((candidate) => (
            <SortableCandidateCard key={candidate.id} candidate={candidate} onQuickMove={onQuickMove} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ initialCandidates }: { initialCandidates: Candidate[] }) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const router = useRouter();
  const { pushToast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function persistStage(candidateId: string, stage: string) {
    const previous = candidates;
    setCandidates((current) => current.map((candidate) => (candidate.id === candidateId ? { ...candidate, stage } : candidate)));

    const response = await fetch(`/api/candidates/${candidateId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Stage update failed" }));
      setCandidates(previous);
      pushToast({ title: "Stage update failed", description: payload.error ?? "Please try again.", tone: "error" });
      return;
    }

    pushToast({ title: "Stage updated", description: `Candidate moved to ${stage.replaceAll("_", " ").toLowerCase()}.`, tone: "success" });
    router.refresh();
  }

  async function deleteCandidate(candidateId: string) {
    if (!window.confirm("Soft delete this candidate from the pipeline?")) {
      return;
    }

    const previous = candidates;
    setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));

    const response = await fetch(`/api/candidates/${candidateId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Delete failed" }));
      setCandidates(previous);
      pushToast({ title: "Delete failed", description: payload.error ?? "Please try again.", tone: "error" });
      return;
    }

    pushToast({ title: "Candidate removed", description: "The candidate was soft deleted from active pipeline views.", tone: "success" });
    router.refresh();
  }

  async function onDragEnd(event: DragEndEvent) {
    const candidateId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    const overCandidate = candidates.find((candidate) => candidate.id === overId);
    const stage = overCandidate?.stage ?? overId;

    if (!pipelineStages.includes(stage as never)) {
      return;
    }

    await persistStage(candidateId, stage);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="kanban-grid">
        {pipelineStages.map((stage) => {
          const items = candidates.filter((candidate) => candidate.stage === stage);
          return <KanbanColumn key={stage} stage={stage} items={items} onQuickMove={persistStage} onDelete={deleteCandidate} />;
        })}
      </div>
    </DndContext>
  );
}
