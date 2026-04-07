"use client";

import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Role, SupportMessageAuthorType, SupportThreadSource, SupportThreadStatus } from "@/lib/models";

type SupportMessageItem = {
  id: string;
  authorType: string;
  authorUserId?: string | null;
  authorName: string;
  authorEmail?: string | null;
  body: string;
  createdAt: string | Date;
  deliveredByEmail?: boolean | null;
};

type SupportThreadItem = {
  id: string;
  organizationId: string;
  organizationName?: string | null;
  requesterUserId?: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterCompany?: string | null;
  subject: string;
  status: string;
  source: string;
  lastMessageAt: string | Date;
  resolvedAt?: string | Date | null;
  messages: SupportMessageItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ApiPayload = {
  error?: string;
  data?: {
    thread?: SupportThreadItem;
    threadId?: string;
    warning?: string | null;
  };
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString();
}

function statusLabel(status: string) {
  switch (status) {
    case SupportThreadStatus.OPEN:
      return "Open";
    case SupportThreadStatus.WAITING_ON_REQUESTER:
      return "Waiting on requester";
    case SupportThreadStatus.RESOLVED:
      return "Resolved";
    default:
      return status;
  }
}

function sourceLabel(source: string) {
  return source === SupportThreadSource.PUBLIC_CONTACT ? "Public request" : "Workspace request";
}

export function SupportInbox({
  initialThreads,
  currentUserId,
  currentUserName,
  role
}: {
  initialThreads: SupportThreadItem[];
  currentUserId: string;
  currentUserName: string;
  role: Role;
}) {
  const { pushToast } = useToast();
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreads[0]?.id ?? "");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const isAdmin = role === Role.ADMIN;

  useEffect(() => {
    setThreads(initialThreads);
  }, [initialThreads]);

  useEffect(() => {
    if (!threads.length) {
      setSelectedThreadId("");
      return;
    }

    if (!threads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(threads[0].id);
    }
  }, [selectedThreadId, threads]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  );

  function upsertThread(nextThread: SupportThreadItem) {
    setThreads((current) => {
      const existing = current.some((thread) => thread.id === nextThread.id);
      const next = existing
        ? current.map((thread) => (thread.id === nextThread.id ? nextThread : thread))
        : [nextThread, ...current];

      return [...next].sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime());
    });
    setSelectedThreadId(nextThread.id);
  }

  async function createThread() {
    setBusyAction("create");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject, message: newMessage })
      });
      const payload = await response.json().catch(() => ({ error: "Could not create support request" })) as ApiPayload;

      if (!response.ok || !payload.data?.thread) {
        pushToast({ title: "Support request failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      upsertThread(payload.data.thread);
      setNewSubject("");
      setNewMessage("");
      pushToast({ title: "Support request created", description: "Your request is now visible inside the support inbox.", tone: "success" });
    } finally {
      setBusyAction(null);
    }
  }

  async function sendReply() {
    if (!selectedThread) {
      return;
    }

    setBusyAction(`reply:${selectedThread.id}`);

    try {
      const response = await fetch(`/api/support/${selectedThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage })
      });
      const payload = await response.json().catch(() => ({ error: "Could not send reply" })) as ApiPayload;

      if (!response.ok || !payload.data?.thread) {
        pushToast({ title: "Reply failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      upsertThread(payload.data.thread);
      setReplyMessage("");
      pushToast({
        title: "Reply sent",
        description: isAdmin && selectedThread.source === SupportThreadSource.PUBLIC_CONTACT
          ? "The reply was added to the thread and queued for email delivery when SMTP is available."
          : "The reply was added to the thread.",
        tone: "success"
      });

      if (payload.data.warning) {
        pushToast({ title: "Delivery note", description: payload.data.warning, tone: "info" });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function updateStatus(nextStatus: SupportThreadStatus) {
    if (!selectedThread) {
      return;
    }

    setBusyAction(`status:${selectedThread.id}`);

    try {
      const response = await fetch(`/api/support/${selectedThread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const payload = await response.json().catch(() => ({ error: "Could not update support status" })) as ApiPayload;

      if (!response.ok || !payload.data?.thread) {
        pushToast({ title: "Status update failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      upsertThread(payload.data.thread);
      pushToast({ title: "Support thread updated", description: `This request is now marked as ${statusLabel(nextStatus).toLowerCase()}.`, tone: "success" });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="support-layout-grid">
      <Card className="support-sidebar-card">
        <div className="support-sidebar-header">
          <div>
            <strong>{isAdmin ? "Admin support channel" : "Your support requests"}</strong>
            <p className="muted">
              {isAdmin
                ? "Review workspace issues, answer public requests, and keep every support conversation in one queue."
                : "Open a request without leaving Freely and keep the full reply history attached to your account."}
            </p>
          </div>
        </div>

        {!isAdmin ? (
          <div className="support-compose-card">
            <label className="field-shell">
              <span>Subject</span>
              <Input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Need help with interview scheduling" />
            </label>
            <label className="field-shell">
              <span>Describe the issue</span>
              <Textarea value={newMessage} onChange={(event) => setNewMessage(event.target.value)} rows={5} placeholder="Tell the admin what is blocked, what page you are on, and what outcome you need." />
            </label>
            <Button type="button" onClick={() => void createThread()} disabled={busyAction === "create" || newSubject.trim().length < 3 || newMessage.trim().length < 10}>
              {busyAction === "create" ? "Sending..." : "Create support request"}
            </Button>
          </div>
        ) : null}

        <div className="support-thread-list">
          {threads.length ? (
            threads.map((thread) => {
              const latestMessage = thread.messages[thread.messages.length - 1];
              const isSelected = thread.id === selectedThreadId;

              return (
                <button key={thread.id} type="button" className={`support-thread-item ${isSelected ? "support-thread-item-active" : ""}`.trim()} onClick={() => setSelectedThreadId(thread.id)}>
                  <div className="support-thread-item-head">
                    <strong>{thread.subject}</strong>
                    <span className={`support-thread-status support-thread-status-${thread.status.toLowerCase()}`}>{statusLabel(thread.status)}</span>
                  </div>
                  <div className="support-thread-item-meta">
                    <span>{thread.requesterName}</span>
                    <span>{sourceLabel(thread.source)}</span>
                    {thread.organizationName ? <span>{thread.organizationName}</span> : null}
                  </div>
                  <p>{latestMessage?.body ?? "No messages yet."}</p>
                  <small>Updated {formatDate(thread.lastMessageAt)}</small>
                </button>
              );
            })
          ) : (
            <div className="support-empty-state">
              <strong>{isAdmin ? "No support requests yet" : "No support conversations yet"}</strong>
              <p className="muted">{isAdmin ? "New public and member requests will appear here automatically." : "Create your first request when you need admin help with access, bugs, or workflow questions."}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="support-detail-card">
        {selectedThread ? (
          <div className="stack-lg">
            <div className="support-detail-header">
              <div className="stack-sm">
                <span className="eyebrow eyebrow-soft">{sourceLabel(selectedThread.source)}</span>
                <h2 className="support-detail-title">{selectedThread.subject}</h2>
                <p className="muted">
                  Opened by {selectedThread.requesterName} ({selectedThread.requesterEmail})
                  {selectedThread.requesterCompany ? ` from ${selectedThread.requesterCompany}` : ""}
                  {selectedThread.organizationName ? ` in ${selectedThread.organizationName}` : ""}.
                </p>
              </div>
              <div className="support-detail-actions">
                <span className={`support-thread-status support-thread-status-${selectedThread.status.toLowerCase()}`}>{statusLabel(selectedThread.status)}</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void updateStatus(selectedThread.status === SupportThreadStatus.RESOLVED ? SupportThreadStatus.OPEN : SupportThreadStatus.RESOLVED)}
                  disabled={busyAction === `status:${selectedThread.id}`}
                >
                  {busyAction === `status:${selectedThread.id}` ? "Saving..." : selectedThread.status === SupportThreadStatus.RESOLVED ? "Reopen" : "Resolve"}
                </Button>
              </div>
            </div>

            {selectedThread.source === SupportThreadSource.PUBLIC_CONTACT ? (
              <div className="support-info-banner">
                <strong>Public request</strong>
                <p>Admin replies stay in this thread and are also sent by email when outgoing mail is configured. Public users are promised a reply within 24 to 48 hours, Monday to Friday, 10 AM to 4 PM.</p>
              </div>
            ) : null}

            <div className="support-message-stack">
              {selectedThread.messages.map((message) => {
                const ownMessage = message.authorUserId === currentUserId || (message.authorType === SupportMessageAuthorType.EXTERNAL && !isAdmin);
                const toneClass = ownMessage ? "support-message-own" : "support-message-shared";

                return (
                  <article key={message.id} className={`support-message ${toneClass}`.trim()}>
                    <div className="support-message-head">
                      <strong>{message.authorName}</strong>
                      <small>{formatDate(message.createdAt)}</small>
                    </div>
                    <p>{message.body}</p>
                    <small>
                      {message.authorType === SupportMessageAuthorType.ADMIN ? `Admin reply${message.deliveredByEmail ? " by email" : ""}` : message.authorType === SupportMessageAuthorType.EXTERNAL ? "Public requester" : "Workspace member"}
                    </small>
                  </article>
                );
              })}
            </div>

            <div className="support-reply-card">
              <label className="field-shell">
                <span>{isAdmin ? "Reply to requester" : `Reply as ${currentUserName}`}</span>
                <Textarea
                  value={replyMessage}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  rows={5}
                  placeholder={selectedThread.source === SupportThreadSource.PUBLIC_CONTACT && isAdmin
                    ? "Write the reply that should be saved here and sent by email to the requester."
                    : "Write your reply here."}
                />
              </label>
              <div className="support-reply-actions">
                <Button type="button" onClick={() => void sendReply()} disabled={busyAction === `reply:${selectedThread.id}` || replyMessage.trim().length < 2}>
                  {busyAction === `reply:${selectedThread.id}` ? "Sending..." : "Send reply"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="support-empty-state support-empty-state-detail">
            <strong>Select a support request</strong>
            <p className="muted">Choose a thread from the left to review the full conversation and send replies.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
