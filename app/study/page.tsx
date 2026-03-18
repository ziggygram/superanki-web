import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function StudyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/study");
  }

  // Fetch decks with folders
  const { data: decks } = await supabase
    .from("sync_decks")
    .select("id, name, color_hex, position, folder_id")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const { data: folders } = await supabase
    .from("sync_folders")
    .select("id, name, position, parent_id")
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  // Fetch due counts
  const now = new Date().toISOString();

  const { data: cardCounts } = await supabase
    .from("sync_cards")
    .select("deck_id, state, due")
    .eq("user_id", user.id);

  const counts: Record<string, { new: number; learning: number; review: number }> = {};
  for (const card of cardCounts ?? []) {
    if (!counts[card.deck_id]) counts[card.deck_id] = { new: 0, learning: 0, review: 0 };
    if (card.state === 0) {
      counts[card.deck_id].new++;
    } else if ((card.state === 1 || card.state === 3) && card.due && card.due <= now) {
      counts[card.deck_id].learning++;
    } else if (card.state === 2 && card.due && card.due <= now) {
      counts[card.deck_id].review++;
    }
  }

  // Group decks by folder
  const folderMap = new Map((folders ?? []).map((f) => [f.id, f]));
  const rootDecks = (decks ?? []).filter((d) => !d.folder_id);
  const folderDecks = new Map<string, typeof decks>();
  for (const deck of decks ?? []) {
    if (deck.folder_id) {
      if (!folderDecks.has(deck.folder_id)) folderDecks.set(deck.folder_id, []);
      folderDecks.get(deck.folder_id)!.push(deck);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white sm:py-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* Header */}
        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl shadow-indigo-950/20 sm:p-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-indigo-300">Study</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                Pick a deck to study.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Cards are scheduled using FSRS-5 spaced repetition. Review due cards to strengthen your memory.
              </p>
            </div>
            <Link
              href="/decks"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Decks
            </Link>
          </div>
        </section>

        {/* Deck list */}
        {(decks ?? []).length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/70 p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-4 text-lg font-semibold">No decks yet</h3>
            <p className="mt-2 text-sm text-slate-400">
              Import or sync decks from the iOS app to start studying.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Folders */}
            {(folders ?? []).map((folder) => {
              const fDecks = folderDecks.get(folder.id) ?? [];
              if (fDecks.length === 0) return null;
              return (
                <div key={folder.id} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-200">{folder.name}</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fDecks.map((deck) => (
                      <DeckCard key={deck.id} deck={deck} counts={counts[deck.id]} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Root decks */}
            {rootDecks.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {rootDecks.map((deck) => (
                  <DeckCard key={deck.id} deck={deck} counts={counts[deck.id]} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function DeckCard({
  deck,
  counts,
}: {
  deck: { id: string; name: string; color_hex: string | null };
  counts?: { new: number; learning: number; review: number };
}) {
  const c = counts ?? { new: 0, learning: 0, review: 0 };
  const totalDue = c.new + c.learning + c.review;

  return (
    <Link
      href={`/study/${deck.id}`}
      className="group flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition hover:border-indigo-400/30 hover:bg-slate-950"
    >
      <div className="flex items-center gap-4">
        {deck.color_hex && (
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: deck.color_hex }}
          />
        )}
        <div>
          <h3 className="font-semibold text-white">{deck.name}</h3>
          <div className="mt-1 flex gap-3 text-xs">
            <span className="text-blue-400">{c.new} new</span>
            <span className="text-orange-400">{c.learning} learning</span>
            <span className="text-green-400">{c.review} review</span>
          </div>
        </div>
      </div>
      {totalDue > 0 && (
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-semibold text-indigo-300">
          {totalDue}
        </span>
      )}
    </Link>
  );
}
