import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";

const themes = [
  { id: "slate", name: "Slate", primary: "222.2 47.4% 11.2%", primaryFg: "210 40% 98%" },
  { id: "gray", name: "Gray", primary: "220.9 39.3% 11%", primaryFg: "220 14.3% 95.9%" },
  { id: "zinc", name: "Zinc", primary: "240 5.9% 10%", primaryFg: "240 5.9% 90%" },
  { id: "neutral", name: "Neutral", primary: "0 0% 9%", primaryFg: "0 0% 98%" },
  { id: "stone", name: "Stone", primary: "24 9.8% 10%", primaryFg: "60 9.1% 97.8%" },
  { id: "red", name: "Red", primary: "0 72.2% 50.6%", primaryFg: "0 85.7% 97.3%" },
  { id: "rose", name: "Rose", primary: "346.8 77.2% 49.8%", primaryFg: "355.7 100% 97.3%" },
  { id: "orange", name: "Orange", primary: "24.6 95% 53.1%", primaryFg: "33.3 100% 96.5%" },
  { id: "green", name: "Green", primary: "142.1 76.2% 36.3%", primaryFg: "138.5 76.5% 96.7%" },
  { id: "blue", name: "Blue", primary: "221.2 83.2% 53.3%", primaryFg: "214.3 95% 96.5%" },
  { id: "yellow", name: "Yellow", primary: "47.9 95.8% 53.1%", primaryFg: "54.5 91.7% 95.3%" },
  { id: "violet", name: "Violet", primary: "262.1 83.3% 57.8%", primaryFg: "267 100% 98%" },
];

export function ThemeSettings() {
  const { user, refreshUser } = useAuth();
  const { fetchApi } = useApi();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(user?.theme || "slate");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.theme) {
      setSelectedTheme(user.theme);
      applyTheme(user.theme);
    }
  }, [user?.theme]);

  const applyTheme = (themeId: string) => {
    document.documentElement.setAttribute("data-theme", themeId);
  };

  const handleThemeChange = async (themeId: string) => {
    setSelectedTheme(themeId);
    setIsUpdating(true);

    try {
      await fetchApi(`/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify({ theme: themeId }),
      });

      await refreshUser();
      applyTheme(themeId);

      toast({
        title: "Theme updated",
        description: "Your color theme has been applied",
      });
    } catch (error) {
      console.error("Failed to update theme:", error);
      toast({
        title: "Error",
        description: "Failed to update theme",
        variant: "destructive",
      });
      // Revert to previous theme
      setSelectedTheme(user?.theme || "slate");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Settings
        </CardTitle>
        <CardDescription>Choose your preferred color theme</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label>Color Theme</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                disabled={isUpdating}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  selectedTheme === theme.id ? "border-primary bg-accent" : "border-muted hover:border-primary/50"
                } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex gap-1">
                  <div className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: `hsl(${theme.primary})` }}></div>
                  <div className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: `hsl(${theme.primaryFg})` }}></div>
                </div>
                <span className="text-sm font-medium">{theme.name}</span>
                {selectedTheme === theme.id && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
