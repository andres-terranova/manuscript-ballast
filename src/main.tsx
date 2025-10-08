import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure light mode by removing dark class
document.documentElement.classList.remove('dark');

createRoot(document.getElementById("root")!).render(<App />);
