"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Download, LoaderCircle, Upload } from "lucide-react";

type ActionState =
  | null
  | {
      tone: "success" | "warning" | "error";
      title: string;
      description: string;
      href?: string;
      hrefLabel?: string;
    };

export function DeckManagementPanel({
  deckId,
  deckName,
  restoreBlockedReason,
  importBlockedReason,
}: {
  deckId?: string;
  deckName?: string;
  restoreBlockedReason?: string | null;
  importBlockedReason?: string | null;
}) {
  const router = useRouter();
  const [restoreState, setRestoreState] = useState<ActionState>(null);
  const [importState, setImportState] = useState<ActionState>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleRestore() {
    if (!deckId) return;

    setRestoreLoading(true);
    setRestoreState(null);

    try {
      const response = await fetch(`/api/decks/${deckId}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        setRestoreState({
          tone: response.status >= 500 ? "warning" : "error",
          title: payload.error || "Restore preparation failed",
          description: payload.nextStep || "The deck backup could not be prepared for restore.",
        });
        return;
      }

      setRestoreState({
        tone: "success",
        title: "Restore manifest ready",
        description: payload.nextStep || "Hand this signed backup URL to the restore client before it expires.",
        href: payload.restore?.downloadUrl,
        hrefLabel: "Open signed backup URL",
      });
    } catch {
      setRestoreState({
        tone: "error",
        title: "Network error",
        description: "The restore manifest request did not complete.",
      });
    } finally {
      setRestoreLoading(false);
    }
  }

  async function handleImport() {
    if (!selectedFile) {
      setImportState({
        tone: "warning",
        title: "Choose an Anki package first",
        description: "Upload an .apkg or .colpkg file before creating an import job.",
      });
      return;
    }

    setImportLoading(true);
    setImportState(null);

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);

      if (deckId) {
        formData.set("deckId", deckId);
      }

      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        setImportState({
          tone: response.status >= 500 ? "warning" : "error",
          title: payload.error || "Import request failed",
          description: payload.nextStep || "The import workflow is not available yet.",
        });
        if (payload.importJob?.id) {
          router.refresh();
        }
        return;
      }

      setImportState({
        tone: "success",
        title: payload.message || "Import job queued",
        description:
          payload.nextStep ||
          `The package for ${deckName ?? "this account"} was handed off to the configured import service.`,
      });
      setSelectedFile(null);
      router.refresh();
    } catch {
      setImportState({
        tone: "error",
        title: "Network error",
        description: "The import request did not complete.",
      });
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Restore management</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Prepare a secure restore link</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Generate a short-lived backup link you can open in your restore client.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRestore}
          disabled={restoreLoading || !deckId || Boolean(restoreBlockedReason)}
          className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            restoreBlockedReason
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
              : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-wait disabled:bg-indigo-600/80"
          }`}
        >
          {restoreLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {restoreBlockedReason ? "Restore unavailable" : "Prepare restore link"}
        </button>

        {restoreBlockedReason ? (
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            {restoreBlockedReason}
          </p>
        ) : null}

        <ActionNotice state={restoreState} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-300">Import management</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Start a web import</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Upload an Anki package and follow its progress from this workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            .apkg / .colpkg
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col gap-3 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
          <span>{selectedFile ? selectedFile.name : "Choose an Anki package to upload."}</span>
          <input
            type="file"
            accept=".apkg,.colpkg"
            className="hidden"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          <span className="inline-flex w-fit rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
            Select file
          </span>
        </label>

        <button
          type="button"
          onClick={handleImport}
          disabled={importLoading || Boolean(importBlockedReason)}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            importBlockedReason
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-500"
              : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 disabled:cursor-wait"
          }`}
        >
          {importLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {importBlockedReason ? "Import unavailable" : "Start import"}
        </button>

        {importBlockedReason ? (
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            {importBlockedReason}
          </p>
        ) : null}

        <ActionNotice state={importState} />
      </section>
    </div>
  );
}

function ActionNotice({ state }: { state: ActionState }) {
  if (!state) return null;

  const toneClasses = {
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    warning: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    error: "border-rose-400/20 bg-rose-400/10 text-rose-100",
  } satisfies Record<NonNullable<ActionState>["tone"], string>;

  const Icon = state.tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${toneClasses[state.tone]}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">{state.title}</p>
          <p className="mt-1">{state.description}</p>
          {state.href ? (
            <a
              href={state.href}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-xl border border-current/20 px-3 py-2 text-xs font-semibold"
            >
              {state.hrefLabel ?? "Open"}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
