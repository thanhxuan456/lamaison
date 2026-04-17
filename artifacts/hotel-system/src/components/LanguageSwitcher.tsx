import { ChevronDown, Check } from "lucide-react";
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
        className="group relative inline-flex items-center gap-2 h-11 pl-3 pr-2.5 transition-all duration-500 outline-none"
      >
        {/* Ornamental gold frame with diamond corners */}
        <span className="absolute inset-0 border border-primary/40 group-hover:border-primary group-data-[state=open]:border-primary transition-colors duration-500"></span>
        <span className="absolute -top-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>
        <span className="absolute -top-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>
        <span className="absolute -bottom-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>
        <span className="absolute -bottom-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>

        {/* Globe glyph (custom diamond style) */}
        <span className="relative flex items-center justify-center w-5 h-5">
          <span className="absolute inset-0 rotate-45 border border-primary/60 group-hover:border-primary transition-colors"></span>
          <span className="absolute inset-1 border border-primary/40 rounded-full group-hover:border-primary/80 transition-colors"></span>
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-primary/60 group-hover:bg-primary transition-colors"></span>
        </span>

        <span className="font-serif text-[13px] tracking-[0.25em] text-primary uppercase pl-0.5">
          {current.flag}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className="text-primary/70 transition-transform duration-300 group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="rounded-none border-primary/50 bg-popover min-w-[210px] p-0 shadow-2xl relative"
      >
        {/* Ornamental corners */}
        <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary"></span>
        <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary"></span>
        <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary"></span>
        <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary"></span>

        {/* Header */}
        <div className="px-4 py-3 border-b border-primary/20 bg-primary/5">
          <div className="text-[10px] tracking-[0.3em] uppercase text-primary/70 font-serif">
            {t("language")}
          </div>
        </div>

        {LANGUAGES.map((l) => {
          const active = l.code === lang;
          return (
            <DropdownMenuItem
              key={l.code}
              onSelect={() => setLang(l.code)}
              className={`group/item rounded-none cursor-pointer flex items-center gap-3 px-4 py-3 text-sm tracking-wide border-b border-primary/10 last:border-b-0 transition-colors focus:bg-primary/10 ${
                active ? "text-primary" : "text-foreground"
              }`}
            >
              <span
                className={`relative flex items-center justify-center w-7 h-7 border transition-all ${
                  active
                    ? "border-primary bg-primary/15"
                    : "border-primary/30 group-hover/item:border-primary/70"
                }`}
              >
                <span className="font-serif text-[10px] tracking-widest text-primary">{l.flag}</span>
              </span>
              <span className={`flex-1 font-serif ${active ? "font-medium" : "font-normal"}`}>
                {l.label}
              </span>
              {active && <Check size={14} className="text-primary" strokeWidth={2.5} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
