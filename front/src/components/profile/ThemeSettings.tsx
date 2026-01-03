import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Check, Sparkles } from "lucide-react";
import { CustomThemeDialog } from "./CustomThemeDialog";

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
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customPrimary, setCustomPrimary] = useState("222.2 47.4% 11.2%");
  const [customPrimaryForeground, setCustomPrimaryForeground] = useState("210 40% 98%");

  useEffect(() => {
    if (user?.theme) {
      setSelectedTheme(user.theme);

      // Load custom colors if theme is "custom"
      if (user.theme === "custom" && user.customPrimary && user.customPrimaryForeground) {
        setCustomPrimary(user.customPrimary);
        setCustomPrimaryForeground(user.customPrimaryForeground);
        applyTheme(user.theme, {
          primary: user.customPrimary,
          primaryForeground: user.customPrimaryForeground,
        });
      } else {
        applyTheme(user.theme);
      }
    }
  }, [user?.theme, user?.customPrimary, user?.customPrimaryForeground]);

  const applyTheme = (themeId: string, customColors?: { primary: string; primaryForeground: string }) => {
    document.documentElement.setAttribute("data-theme", themeId);

    // Apply custom colors if theme is "custom"
    if (themeId === "custom" && customColors) {
      document.documentElement.style.setProperty("--primary", customColors.primary);
      document.documentElement.style.setProperty("--primary-foreground", customColors.primaryForeground);
    } else if (themeId !== "custom") {
      // Remove custom colors if switching away from custom theme
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--primary-foreground");
    }
  };

  const handleThemeChange = async (themeId: string) => {
    setSelectedTheme(themeId);
    setIsUpdating(true);

    try {
      const payload: Record<string, unknown> = { theme: themeId };

      // If custom theme, don't send custom colors yet (they will be sent separately)
      if (themeId === "custom") {
        payload.customPrimary = customPrimary;
        payload.customPrimaryForeground = customPrimaryForeground;
      }

      await fetchApi(`/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await refreshUser();

      if (themeId === "custom") {
        applyTheme(themeId, {
          primary: customPrimary,
          primaryForeground: customPrimaryForeground,
        });
      } else {
        applyTheme(themeId);
      }

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

  const handleSaveCustomColors = async (primary: string, primaryForeground: string) => {
    setCustomPrimary(primary);
    setCustomPrimaryForeground(primaryForeground);
    setIsUpdating(true);

    try {
      await fetchApi(`/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify({
          theme: "custom",
          customPrimary: primary,
          customPrimaryForeground: primaryForeground,
        }),
      });

      await refreshUser();
      setSelectedTheme("custom");
      applyTheme("custom", {
        primary,
        primaryForeground,
      });

      toast({
        title: "Couleurs personnalisées enregistrées",
        description: "Votre thème personnalisé a été appliqué",
      });
    } catch (error) {
      console.error("Failed to save custom colors:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les couleurs personnalisées",
        variant: "destructive",
      });
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

            {/* Custom Theme Button */}
            <button
              onClick={() => setCustomDialogOpen(true)}
              disabled={isUpdating}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                selectedTheme === "custom" ? "border-primary bg-accent" : "border-muted hover:border-primary/50"
              } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex gap-1">
                <div className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: `hsl(${customPrimary})` }}></div>
                <div className="w-8 h-8 rounded-full border-2" style={{ backgroundColor: `hsl(${customPrimaryForeground})` }}></div>
              </div>
              <span className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Personnalisé
              </span>
              {selectedTheme === "custom" && (
                <div className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              )}
            </button>
          </div>
        </div>

        <CustomThemeDialog
          open={customDialogOpen}
          onOpenChange={setCustomDialogOpen}
          onSave={handleSaveCustomColors}
          initialPrimary={customPrimary}
          initialPrimaryForeground={customPrimaryForeground}
        />
      </CardContent>
    </Card>
  );
}
