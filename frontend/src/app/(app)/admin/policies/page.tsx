"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAdminPolicies, useDeletePolicy, useUploadPolicy } from "@/features/policies/hooks";
import type { PolicyDocument } from "@/features/policies/types";
import { formatDate } from "@/lib/format";

function UploadPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const uploadPolicy = useUploadPolicy();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function reset() {
    setTitle("");
    setFile(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !file) return;
    uploadPolicy.mutate(
      { title: title.trim(), file },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Policy Document</DialogTitle>
          <DialogDescription>
            The PDF&apos;s text is extracted and indexed so the AI assistant can ground policy
            answers in it. The original file is not stored, only the extracted text.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="policy-title">Title</Label>
            <Input
              id="policy-title"
              placeholder="Cancellation Policy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="policy-file">PDF file</Label>
            <Input
              id="policy-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadPolicy.isPending || !title.trim() || !file}>
              {uploadPolicy.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPoliciesPage() {
  const { data: policies, isLoading, isError, error, refetch } = useAdminPolicies();
  const deletePolicy = useDeletePolicy();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PolicyDocument | null>(null);

  return (
    <div>
      <PageHeader
        title="Policies"
        description="Company policy documents the AI assistant can answer questions from"
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" /> Upload Policy
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !policies || policies.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No policy documents yet"
          description="Upload a PDF (cancellation policy, refund policy, terms of service, ...) so the AI assistant can answer questions grounded in it."
          action={{ label: "Upload Policy", onClick: () => setUploadOpen(true) }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.title}</TableCell>
                  <TableCell className="text-muted-foreground">{policy.filename}</TableCell>
                  <TableCell>{policy.chunkCount}</TableCell>
                  <TableCell>{formatDate(policy.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive"
                      title="Delete"
                      onClick={() => setToDelete(policy)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <UploadPolicyDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this policy document?"
        description={
          <>
            &quot;{toDelete?.title}&quot; will be removed and the assistant will no longer be
            able to reference it. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        isPending={deletePolicy.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          deletePolicy.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
