import type { Assignment } from "../../game/setup";
import NoticeBoard, { type BoardItem } from "./NoticeBoard";

export default function NoticeBoardStep({
  board,
  moderatorName,
  onRestart,
  onReveal,
}: {
  board: Assignment[];
  moderatorName: string | null;
  onRestart: () => void;
  onReveal: () => void;
}) {
  const items: BoardItem[] = board.map((a) => ({
    characterId: a.characterId,
    hidden: a.random,
    dead: false,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          Tonight's cast
        </h2>
        <p className="mt-1 text-sm text-moss-200">
          {board.length} roles are in play
          {moderatorName ? ` · ${moderatorName} narrates` : " · the app narrates"}.
        </p>
      </div>

      <NoticeBoard items={items} />

      <p className="text-center text-xs text-moss-300 italic">
        These are the roles hidden among you — the “?” cards stay a mystery. Now pass the phone so
        everyone can privately learn their own.
      </p>

      <div className="flex gap-3">
        <button className="btn-lantern flex-1 px-4 py-3" onClick={onRestart}>
          Re-deal
        </button>
        <button className="btn-lantern flex-[2] px-4 py-3 text-lg" onClick={onReveal}>
          Begin the reveal →
        </button>
      </div>
    </div>
  );
}
