"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { entregarArte } from "@/lib/submissions/actions";
import { createClient } from "@/lib/supabase/client";
import type { CanvasConfig, CreativeKind, CreativeProject } from "@/lib/canvas/types";

import { ArteEditor } from "./ArteEditor";
import { BlocksEditor } from "./BlocksEditor";
import { PixelEditor } from "./PixelEditor";
import { VetorEditor } from "./VetorEditor";

export function CreativeSubmission({
  kind,
  classId,
  exerciseId,
  assignmentId,
  config,
  initialProject,
}: {
  kind: CreativeKind;
  classId: string;
  exerciseId: string;
  assignmentId: string;
  config: CanvasConfig;
  initialProject?: CreativeProject | null;
}) {
  const latest = useRef<{ project: CreativeProject; pngBlob: () => Promise<Blob> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // O editor avisa a cada mudança; guardamos o estado mais recente.
  function handleChange(project: CreativeProject, pngBlob: () => Promise<Blob>) {
    latest.current = { project, pngBlob };
  }

  async function entregar() {
    if (!latest.current) return;
    setSaving(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMsg({ ok: false, text: "Sessão expirada. Entre novamente." });
        return;
      }

      const blob = await latest.current.pngBlob();
      if (blob.size > 5 * 1024 * 1024) {
        setMsg({ ok: false, text: "A imagem ficou muito grande (>5MB)." });
        return;
      }
      const path = `${user.id}/${exerciseId}-${assignmentId}.png`;
      const up = await supabase.storage
        .from("submissoes")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (up.error) {
        setMsg({ ok: false, text: `Falha ao enviar imagem: ${up.error.message}` });
        return;
      }

      const res = await entregarArte(classId, {
        exercise_id: exerciseId,
        assignment_id: assignmentId,
        image_path: path,
        project: JSON.stringify(latest.current.project),
      });
      setMsg(res?.ok ? { ok: true, text: res.message } : { ok: false, text: res?.message ?? "Erro." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro inesperado." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {kind === "pixel_art" && (
        <PixelEditor
          config={config}
          initial={initialProject?.kind === "pixel_art" ? initialProject : null}
          onChange={handleChange}
        />
      )}
      {kind === "vetor" && (
        <VetorEditor
          config={config}
          initial={initialProject?.kind === "vetor" ? initialProject : null}
          onChange={handleChange}
        />
      )}
      {kind === "arte_digital" && (
        <ArteEditor
          config={config}
          initial={initialProject?.kind === "arte_digital" ? initialProject : null}
          onChange={handleChange}
        />
      )}
      {kind === "blocos" && (
        <BlocksEditor
          config={config}
          initial={initialProject?.kind === "blocos" ? initialProject : null}
          onChange={handleChange}
        />
      )}

      {msg && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            msg.ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div>
        <Button type="button" onClick={entregar} disabled={saving}>
          {saving ? "Enviando..." : "Entregar arte"}
        </Button>
      </div>
    </div>
  );
}
