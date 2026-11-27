"use client";

import { loadSampleAction } from "@/app/actions/auth";
import { ActionButton } from "./ActionButton";

export function SampleButton() {
  return (
    <ActionButton action={loadSampleAction} className="btn btn-primary">
      Load sample data
    </ActionButton>
  );
}
