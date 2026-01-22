import { getAllReferences } from "@/lib/references";
import ArchivesClient from "./ArchivesClient"

export default function ArchivesPage() {
  const data = getAllReferences();
  return <ArchivesClient data={data} />;
}
