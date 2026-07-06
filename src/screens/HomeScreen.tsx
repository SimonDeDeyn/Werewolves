import Logo from "../components/Logo";

interface Props {
  onNavigate: (screen: "compendium" | "setup") => void;
}

export default function HomeScreen({ onNavigate }: Props) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pl-[max(1.5rem,env(safe-area-inset-left))] text-center">
      <Logo
        variant="emblem"
        className="mb-5 h-40 w-40 drop-shadow-[0_0_24px_rgba(221,210,172,0.15)] sm:h-48 sm:w-48"
      />
      <p className="font-display text-sm tracking-[0.4em] text-moss-300 uppercase">
        Night falls on the village
      </p>
      <h1 className="font-display mt-3 text-5xl font-bold tracking-wider text-moon-100 drop-shadow-[0_0_18px_rgba(221,210,172,0.25)] sm:text-7xl">
        Werewolves
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-moss-200 sm:text-base">
        A digital narrator for your in-person games. Deal the roles, guide the
        night, and let no one leave the fireside to moderate.
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <button
          className="btn-lantern px-6 py-3.5 text-lg"
          onClick={() => onNavigate("setup")}
        >
          New Game
        </button>
        <button className="btn-lantern px-6 py-3.5 text-lg" disabled title="Coming soon">
          Play Online
          <span className="ml-2 align-middle text-[0.6rem] tracking-widest text-moss-300 uppercase">
            soon
          </span>
        </button>
        <button
          className="btn-lantern px-6 py-3.5 text-lg"
          onClick={() => onNavigate("compendium")}
        >
          Characters
        </button>
      </div>
    </main>
  );
}
