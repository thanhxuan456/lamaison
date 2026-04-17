import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, useT } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language")}
        className="inline-flex items-center gap-2 px-3 h-10 border border-primary/40 text-primary hover:border-primary hover:bg-primary/10 transition-colors text-xs uppercase tracking-widest"
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{current.flag}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-none border-primary/40 bg-popover min-w-[180px] p-0"
      >
        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <DropdownMenuItem
              key={l.code}
              onSelect={() => setLang(l.code)}
              className={`rounded-none cursor-pointer flex items-center justify-between gap-3 px-4 py-3 text-sm tracking-wide border-b border-primary/10 last:border-b-0 ${
                active ? "text-primary font-medium" : "text-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-primary/70 w-6">{l.flag}</span>
                <span>{l.label}</span>
              </span>
              {active && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
