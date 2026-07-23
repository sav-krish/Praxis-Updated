"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="min-h-[44px] min-w-[44px] rounded-full"
      title="Toggle color theme"
      aria-label="Toggle color theme"
    >
      <Moon className="h-5 w-5 text-[#4a1f10] transition-all dark:text-[#f0eee6]" strokeWidth={2.4} />
      <span className="sr-only">Toggle dark mode</span>
    </Button>
  );
}
