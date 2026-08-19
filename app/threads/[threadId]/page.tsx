import { ArenaShell } from "@/app/arena/components/arena-shell";
import { getPublicThread } from "@/app/arena/lib/thread-data";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

interface ThreadPageProps {
  readonly params: Promise<{ readonly threadId: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  const [{ userId }, result] = await Promise.all([auth(), getPublicThread(threadId)]);
  if (!result) notFound();

  return (
    <ArenaShell
      initialThreadId={threadId}
      initialThread={result.thread}
      initialIsOwner={userId === result.ownerId}
    />
  );
}
