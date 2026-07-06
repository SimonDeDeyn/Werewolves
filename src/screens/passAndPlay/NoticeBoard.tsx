import { byId } from "../../data/characters";
import CharacterPortrait from "../../components/CharacterPortrait";

export interface BoardItem {
  characterId: string;
  /** Show a "?" instead of the role (an alive randomized filler). */
  hidden: boolean;
  /** The player holding this role has been eliminated. */
  dead: boolean;
}

function Nail() {
  return (
    <div
      className="z-10 -mb-1.5 h-3 w-3 rounded-full"
      style={{
        background: "radial-gradient(circle at 35% 30%, #f3ead0, #8a7358 60%, #3d3226)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}
    />
  );
}

/** Red X scrawled over an eliminated role. */
function Cross() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="14" y1="17" x2="86" y2="83" stroke="#b3271e" strokeWidth="9" strokeLinecap="round" />
      <line x1="85" y1="16" x2="15" y2="84" stroke="#b3271e" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

function Pin({ item, tilt }: { item: BoardItem; tilt: number }) {
  const mystery = item.hidden && !item.dead;
  const character = mystery ? null : byId(item.characterId);

  return (
    <div className="flex flex-col items-center" style={{ transform: `rotate(${tilt}deg)` }}>
      <Nail />
      <div className="w-full rounded-sm bg-moon-100/95 p-1.5 pb-3 shadow-[0_6px_10px_rgba(0,0,0,0.5)]">
        <div className="relative">
          {mystery ? (
            <div className="grid aspect-square w-full place-items-center rounded-full bg-[radial-gradient(120%_100%_at_50%_0%,#16241a,#080f0a)]">
              <span className="font-display text-3xl font-bold text-moss-300">?</span>
            </div>
          ) : (
            character && (
              <CharacterPortrait
                character={character}
                className={`aspect-square w-full ${item.dead ? "opacity-70" : ""}`}
              />
            )
          )}
          {item.dead && <Cross />}
        </div>
        <p
          className={`mt-1 truncate text-center font-display text-[0.6rem] font-semibold ${
            mystery ? "text-bark-400" : "text-night-900"
          }`}
        >
          {mystery ? "Unknown" : character?.name}
        </p>
      </div>
    </div>
  );
}

export default function NoticeBoard({ items }: { items: BoardItem[] }) {
  return (
    <div
      className="rounded-xl border-4 p-4 shadow-inner"
      style={{
        borderColor: "#3d3226",
        background:
          "repeating-linear-gradient(115deg,#4a3b2a,#4a3b2a 6px,#463726 6px,#463726 12px)",
      }}
    >
      <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
        {items.map((it, i) => (
          <Pin key={i} item={it} tilt={(i % 3) - 1} />
        ))}
      </div>
    </div>
  );
}
