"use server";

import { revalidatePath } from "next/cache";
import { publishPortal, savePortal } from "@/lib/portal/store";
import { parsePortal } from "@/lib/portal/schema";
import type { PortalDocument } from "@/lib/portal/types";

export type PortalActionResult =
  | { ok: true; doc: PortalDocument }
  | { ok: false; message: string };

function failed(error: unknown): PortalActionResult {
  return { ok: false, message: error instanceof Error ? error.message : "没能写入门户稿" };
}

export async function saveDraftAction(input: unknown): Promise<PortalActionResult> {
  try {
    const doc = await savePortal(parsePortal(input));
    revalidatePath("/admin");
    revalidatePath("/admin/preview");
    return { ok: true, doc };
  } catch (error) {
    return failed(error);
  }
}

export async function publishAction(input: unknown): Promise<PortalActionResult> {
  try {
    const doc = await publishPortal(parsePortal(input));
    revalidatePath("/admin");
    revalidatePath("/admin/preview");
    return { ok: true, doc };
  } catch (error) {
    return failed(error);
  }
}
