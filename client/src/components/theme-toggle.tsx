import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";
import "./theme-toggle.css";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      data-testid="button-theme-toggle"
      className="theme-toggle-button relative overflow-visible"
    >
      <span className="icon-wrapper sun-wrapper">
        <Sun className="theme-icon sun-icon h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <span className="sun-pulse-wave" />
      </span>
      <span className="icon-wrapper moon-wrapper absolute">
        <Moon className="theme-icon moon-icon h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </span>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
