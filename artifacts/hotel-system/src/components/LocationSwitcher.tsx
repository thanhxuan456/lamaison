import { useEffect, useState } from "react";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useListHotels } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "grand-palace-branch";

export function LocationSwitcher() {
  const { t } = useT();
  const { data: hotels } = useListHotels();
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setSelectedId(parseInt(saved));
  }, []);

  const selected = hotels?.find((h) => h.id === selectedId) ?? null;

  const handleSelect = (id: number) => {
    setSelectedId(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(id));
    setLocation(`/hotels/${id}`);
  };

  const cityShort = (city: string) => {
    if (city.includes("Hà Nội") || city.includes("Ha Noi")) return "HAN";
    if (city.includes("Đà Nẵng") || city.includes("Da Nang")) return "DAD";
    if (city.includes("Hồ Chí Minh") || city.includes("Ho Chi Minh")) return "SGN";
    return city.slice(0, 3).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("branch.label")}
        className="group relative inline-flex items-center gap-2 h-11 pl-3 pr-2.5 transition-all duration-500 outline-none"
      >
        <span className="absolute inset-0 border border-primary/40 group-hover:border-primary group-data-[state=open]:border-primary transition-colors duration-500"></span>
        <span className="absolute -top-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>
        <span className="absolute -top-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>
        <span className="absolute -bottom-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>
        <span className="absolute -bottom-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity"></span>

        <MapPin size={14} className="text-primary" strokeWidth={1.8} />
        <span className="font-serif text-[13px] tracking-[0.25em] text-primary uppercase pl-0.5">
          {selected ? cityShort(selected.city) : t("branch.all")}
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
        className="rounded-none border-primary/50 bg-popover min-w-[260px] p-0 shadow-2xl relative"
      >
        <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary"></span>
        <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary"></span>
        <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary"></span>
        <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary"></span>

        <div className="px-4 py-3 border-b border-primary/20 bg-primary/5">
          <div className="text-[10px] tracking-[0.3em] uppercase text-primary/80 font-serif">
            {t("branch.label")}
          </div>
        </div>

        {hotels?.map((h) => {
          const active = h.id === selectedId;
          return (
            <DropdownMenuItem
              key={h.id}
              onSelect={() => handleSelect(h.id)}
              className={`group/item rounded-none cursor-pointer flex items-center gap-3 px-4 py-3 text-sm tracking-wide border-b border-primary/10 last:border-b-0 transition-colors focus:bg-primary/10 ${
                active ? "text-primary" : "text-foreground"
              }`}
            >
              <span
                className={`relative flex items-center justify-center w-9 h-9 border transition-all ${
                  active
                    ? "border-primary bg-primary/15"
                    : "border-primary/30 group-hover/item:border-primary/70"
                }`}
              >
                <span className="font-serif text-[10px] tracking-widest text-primary">
                  {cityShort(h.city)}
                </span>
              </span>
              <span className="flex-1 flex flex-col">
                <span className={`font-serif text-base ${active ? "font-medium" : "font-normal"}`}>{h.city}</span>
                <span className="text-[11px] text-muted-foreground tracking-wide truncate">{h.name}</span>
              </span>
              {active && <Check size={14} className="text-primary shrink-0" strokeWidth={2.5} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
