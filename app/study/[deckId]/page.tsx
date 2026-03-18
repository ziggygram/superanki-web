import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudySession } from "@/components/study-session";
import { State } from "@/lib/fsrs";

export default async function DeckStudyPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/study/" + deckId);
  }

  // Fetch deck info
  const { data: deck } = await supabase
    .from("sync_decks")
    .select("id, name, color_hex")
    .eq("id", deckId)
    .eq("user_id", user.id)
    .single();

  if (!deck) {
    redirect("/study");
  }

  const now = new Date().toISOString();

  // Fetch learning/relearning cards (due now)
  const { data: learningCards } = await supabase
    .from("sync_cards")
    .select("*")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .in("state", [State.Learning, State.Relearning])
    .lte("due", now)
    .order("due", { ascending: true });

  // Fetch review cards (due now)
  const { data: reviewCards } = await supabase
    .from("sync_cards")
    .select("*")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .eq("state", State.Review)
    .lte("due", now)
    .order("due", { ascending: true })
    .limit(200);

  // Fetch new cards
  const { data: newCards } = await supabase
    .from("sync_cards")
    .select("*")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .eq("state", State.New)
    .order("id", { ascending: true })
    .limit(20);

  const cards = [
    ...(learningCards ?? []),
    ...(reviewCards ?? []),
    ...(newCards ?? []),
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:py-16">
      <div className="mx-auto max-w-2xl">
        <StudySession
          cards={cards}
          deckName={deck.name}
          deckId={deck.id}
          userId={user.id}
        />
      </div>
    </main>
  );
}
