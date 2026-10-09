import WorldWorkspace from "@/src/components/workspace/WorldWorkspace";

export default async function WorldPage({
  params,
}: {
  params: Promise<{ worldId: string }>;
}) {
  const { worldId } = await params;
  return <WorldWorkspace worldId={worldId} />;
}
