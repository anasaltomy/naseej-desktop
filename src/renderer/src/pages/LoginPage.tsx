import { useState, useEffect } from "react";
import { Delete } from "lucide-react";
import type { User } from "@/features/pos/types";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const NUMPAD_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "",
  "0",
  "del",
];

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

  // Load staff from SQLite on mount
  useEffect(() => {
    window.api?.staff.getAll().then((members) => {
      const users: User[] = members.map((m) => ({
        id: m.id as string,
        firstName: m.first_name as string,
        lastName: m.last_name as string,
        email: m.email as string,
        role: m.role as User["role"],
        avatarUrl: m.avatar_url as string | undefined,
      }));
      setStaffList(users);
    });
  }, []);

  const handleKey = (key: string) => {
    setError("");
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((p) => p + key);
    }
  };

  const handleLogin = async () => {
    const authenticated = await window.api?.staff.authenticate({
      staffId: selectedStaff?.id,
      pin,
    });
    if (authenticated) {
      const user: User = {
        id: authenticated.id as string,
        firstName: authenticated.first_name as string,
        lastName: authenticated.last_name as string,
        email: authenticated.email as string,
        role: authenticated.role as User["role"],
        avatarUrl: authenticated.avatar_url as string | undefined,
      };
      onLogin(user);
    } else {
      setError(t("pages.login.invalidPin"));
      setPin("");
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative w-full max-w-sm mx-4 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl items-center justify-center mb-4">
            <span className="text-3xl font-bold text-accent font-heading">
              N
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {t("pages.login.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("pages.login.subtitle")}
          </p>
        </div>

        {/* Staff selector */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {staffList.map((staff) => (
            <button
              key={staff.id}
              onClick={() => {
                setSelectedStaff(staff);
                setPin("");
                setError("");
              }}
              className={cn(
                "pos-card p-3 text-center transition-all duration-150 cursor-pointer",
                "hover:border-accent/40 hover:bg-accent/5",
                selectedStaff?.id === staff.id && "border-accent bg-accent/10",
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-1.5",
                  "bg-muted border border-border text-sm font-semibold text-foreground",
                  selectedStaff?.id === staff.id &&
                    "bg-accent/20 border-accent/40 text-accent",
                )}
              >
                {staff.firstName[0]}
                {staff.lastName[0]}
              </div>
              <div className="text-xs font-medium text-foreground leading-tight">
                {staff.firstName}
              </div>
              <div className="text-[10px] text-muted-foreground capitalize">
                {staff.role.replace(/_/g, " ")}
              </div>
            </button>
          ))}
        </div>

        {/* PIN display */}
        <div className="pos-card p-4 mb-4">
          <div
            className="flex items-center justify-center gap-3 h-12"
            aria-label="PIN entry"
            aria-live="polite"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-all duration-150",
                  i < pin.length
                    ? "bg-accent border-accent"
                    : "bg-transparent border-border",
                )}
              />
            ))}
          </div>

          {error && (
            <p
              className="text-xs text-destructive text-center mt-2"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        {/* Numpad */}
        <div className="pos-card p-4">
          <div className="grid grid-cols-3 gap-2">
            {NUMPAD_KEYS.map((key, i) => {
              if (key === "") return <div key={i} />;
              return (
                <button
                  key={i}
                  onClick={() => handleKey(key)}
                  className={cn(
                    "h-14 rounded-lg font-medium text-lg transition-all duration-150 cursor-pointer",
                    "focus:outline-none focus:ring-2 focus:ring-accent/50 active:scale-95",
                    key === "del"
                      ? "bg-muted text-muted-foreground hover:bg-destructive/20 hover:text-destructive flex items-center justify-center"
                      : "bg-secondary text-foreground hover:bg-secondary/80 hover:text-accent",
                  )}
                  aria-label={key === "del" ? t("pages.login.delete") : key}
                >
                  {key === "del" ? <Delete className="w-5 h-5" /> : key}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLogin}
            disabled={pin.length < 4}
            className="btn-primary w-full mt-3 h-12 text-base"
            aria-label={t("pages.login.login")}
          >
            {t("pages.login.login")}
          </button>
        </div>
      </div>
    </div>
  );
}
