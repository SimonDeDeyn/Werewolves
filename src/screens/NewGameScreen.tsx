import { useState } from "react";
import PassAndPlayFlow from "./passAndPlay/PassAndPlayFlow";

type Mode = "menu" | "pass" | "host" | "join";

function ModeCard({
  title,
  desc,
  soon,
  onClick,
}: {
  title: string;
  desc: string;
  soon?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soon}
      className="panel w-full p-5 text-left transition-colors enabled:hover:border-moss-400/60 disabled:opacity-55"
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-lg text-moon-100">{title}</p>
        {soon && (
          <span className="text-[0.6rem] tracking-widest text-moss-300 uppercase">soon</span>
        )}
      </div>
      <p className="mt-1 text-sm text-moss-200">{desc}</p>
    </button>
  );
}

export default function NewGameScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("menu");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[calc(2rem+env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))]">
      {mode === "menu" && (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <button className="btn-lantern self-start px-4 py-2 text-sm" onClick={onBack}>
            ← Back
          </button>
          <h1 className="font-display text-3xl font-bold tracking-wider text-moon-100">New Game</h1>
          <ModeCard
            title="Pass & play"
            desc="One device goes around the table. No accounts, works offline."
            onClick={() => setMode("pass")}
          />
          <ModeCard
            title="Host a room"
            desc="Start a room and share a key so everyone joins on their own phone."
            soon
          />
          <ModeCard
            title="Join with a key"
            desc="Enter a friend's room key to join their game."
            soon
          />
        </div>
      )}

      {mode === "pass" && (
        <div className="flex flex-1 flex-col py-2">
          <PassAndPlayFlow onExit={() => setMode("menu")} />
        </div>
      )}
    </main>
  );
}
