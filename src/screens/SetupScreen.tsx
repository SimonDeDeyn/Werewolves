/**
 * Placeholder for the pass-and-play game setup flow (next phase):
 * enter player names → pick roles → deal & reveal → night one.
 */
export default function SetupScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold tracking-wider text-moon-100">
        New Game
      </h1>
      <div className="panel mt-6 w-full p-6">
        <p className="text-sm leading-relaxed text-moss-200">
          The pass-and-play setup — player names, role selection, dealing, and
          the guided night phase — arrives in the next phase. The character
          roster is already loaded and waiting in the compendium.
        </p>
      </div>
      <button className="btn-lantern mt-6 px-6 py-3" onClick={onBack}>
        ← Back to the village
      </button>
    </main>
  );
}
