import { useState } from "react";
import ForestBackdrop from "./components/ForestBackdrop";
import HomeScreen from "./screens/HomeScreen";
import CompendiumScreen from "./screens/CompendiumScreen";
import SetupScreen from "./screens/SetupScreen";

type Screen = "home" | "compendium" | "setup";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const goHome = () => setScreen("home");

  return (
    <>
      <ForestBackdrop />
      {screen === "home" && <HomeScreen onNavigate={setScreen} />}
      {screen === "compendium" && <CompendiumScreen onBack={goHome} />}
      {screen === "setup" && <SetupScreen onBack={goHome} />}
    </>
  );
}
