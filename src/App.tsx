import { useState } from "react";
import ForestBackdrop from "./components/ForestBackdrop";
import HomeScreen from "./screens/HomeScreen";
import CompendiumScreen from "./screens/CompendiumScreen";
import NewGameScreen from "./screens/NewGameScreen";
import { loadGame } from "./game/persistence";

type Screen = "home" | "compendium" | "newgame" | "resume";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  // The in-progress saved game, if any. Re-read whenever we return home so the
  // Resume option appears/disappears as a game is saved, finished, or replaced.
  const [saved, setSaved] = useState(() => loadGame());
  const goHome = () => {
    setSaved(loadGame());
    setScreen("home");
  };

  return (
    <>
      <ForestBackdrop />
      {screen === "home" && (
        <HomeScreen
          onNavigate={setScreen}
          onResume={saved ? () => setScreen("resume") : undefined}
        />
      )}
      {screen === "compendium" && <CompendiumScreen onBack={goHome} />}
      {screen === "newgame" && <NewGameScreen onBack={goHome} />}
      {screen === "resume" && saved && <NewGameScreen onBack={goHome} resume={saved} />}
    </>
  );
}
