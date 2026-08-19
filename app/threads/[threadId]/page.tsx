import { ArenaShell } from "@/app/arena/components/arena-shell";

interface ThreadPageProps {
  readonly params: Promise<{ readonly threadId: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  return <ArenaShell initialThreadId={threadId} />;
}
