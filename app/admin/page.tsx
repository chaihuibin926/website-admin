import { Studio } from "@/app/admin/studio";
import { readPortal } from "@/lib/portal/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const doc = await readPortal();
  return <Studio initial={doc} />;
}
