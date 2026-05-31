import { useEffect, useState } from "react";
import { Wifi, WifiOff, Minus, Square, X } from "lucide-react";
import type { User } from "@/features/pos/types";
import { MERCHANT_CONFIG } from "../../data/dummy-data";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface StatusBarProps {
  currentUser: User | null;
}

export default function StatusBar({ currentUser }: StatusBarProps) {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [online] = useState(true);
  const [platform, setPlatform] = useState<string>("");

  useEffect(() => {
    // Get platform from preload API
    setPlatform(window.api?.getPlatform?.() || "");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString("en-SA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateStr = time.toLocaleDateString("en-SA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isMacOS = platform === "darwin";

  // macOS traffic light colors
  const trafficLights = [
    {
      name: "close",
      color: "#ff5f56",
      action: () => window.api?.closeWindow(),
    },
    {
      name: "minimize",
      color: "#ffbd2e",
      action: () => window.api?.minimizeWindow(),
    },
    {
      name: "maximize",
      color: "#27c93f",
      action: () => window.api?.maximizeWindow(),
    },
  ];

  return (
    <header className="h-10 bg-primary border-b border-border flex items-center justify-between px-4 shrink-0 titlebar-drag pl-20">
      {/* macOS: Traffic lights on left */}
      {/* {isMacOS && (
        <div
          className="flex items-center gap-2 min-w-fit"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {trafficLights.map(({ name, color, action }) => (
            <button
              key={name}
              onClick={action}
              className="w-3 h-3 rounded-full hover:opacity-80 transition-opacity flex-shrink-0"
              style={{ backgroundColor: color }}
              aria-label={name}
              title={name}
            />
          ))}
        </div>
      )} */}

      {/* Left: App name + location */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-accent rounded flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-accent-foreground font-heading">
              N
            </span>
          </div>
          <span className="text-xs font-semibold text-foreground font-heading whitespace-nowrap">
            {t('components.statusBar.naseejPOS')}
          </span>
        </div>
        <div className="w-px h-4 bg-border flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate">
          {MERCHANT_CONFIG.location}
        </span>
      </div>

      {/* Center: Status */}
      <div className="flex items-center gap-3 flex-1 justify-center">
        {online ? (
          <div className="flex items-center gap-1.5 text-success">
            <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium">{t('components.statusBar.connected')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-warning">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs font-medium">{t('components.statusBar.offlineMode')}</span>
          </div>
        )}
      </div>

      {/* Right: Staff + clock + window controls (Windows only) */}
      <div className="flex items-center gap-4 min-w-fit">
        <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <LanguageSwitcher />
        </div>

        {currentUser && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-accent">
                {currentUser.firstName[0]}
              </span>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentUser.firstName} {currentUser.lastName}
            </span>
          </div>
        )}

        <div className="text-right flex-shrink-0">
          <div className="text-xs font-medium text-foreground tabular-nums">
            {timeStr}
          </div>
          <div className="text-[10px] text-muted-foreground">{dateStr}</div>
        </div>

        {/* Windows: Control buttons on right */}
        {!isMacOS && (
          <div
            className="flex items-center gap-0.5 flex-shrink-0"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <button
              onClick={() => window.api?.minimizeWindow()}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => window.api?.maximizeWindow()}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => window.api?.closeWindow()}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
