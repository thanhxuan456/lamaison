import { useEffect, useState } from "react";
import { ChevronDown, MapPin, Check, Building2 } from "lucide-react";
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

const CITY_META: Record<string, { code: string; img: string; stars: number }> = {
  "Hà Nội":        { code: "HAN", img: "/images/hotel-hanoi.png",   stars: 5 },
  "Đà Nẵng":       { code: "DAD", img: "/images/hotel-danang.png",  stars: 5 },
  "Hồ Chí Minh":   { code: "SGN", img: "/images/hotel-hcmc.png",   stars: 5 },
};

function getCityMeta(city: string) {
  for (const [key, val] of Object.entries(CITY_META)) {
    if (city.includes(key)) return val;
  }
  return { code: city.slice(0, 3).toUpperCase(), img: "", stars: 5 };
}

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
  const selectedMeta = selected ? getCityMeta(selected.city) : null;

  const handleSelect = (id: number) => {
    setSelectedId(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(id));
    setLocation(`/hotels/${id}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("branch.label")}
        className="group relative inline-flex items-center gap-2 h-11 pl-3 pr-2.5 transition-all duration-500 outline-none"
      >
        {/* Border frame */}
        <span className="absolute inset-0 border border-primary/40 group-hover:border-primary group-data-[state=open]:border-primary transition-colors duration-500" />
        {/* Corner diamonds */}
        <span className="absolute -top-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />
        <span className="absolute -top-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />
        <span className="absolute -bottom-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />
        <span className="absolute -bottom-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />

        <MapPin size={14} className="text-primary shrink-0" strokeWidth={1.8} />
        <span className="font-serif text-[13px] tracking-[0.25em] text-primary uppercase pl-0.5 whitespace-nowrap">
          {selectedMeta ? selectedMeta.code : t("branch.all")}
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
        className="rounded-none border border-primary/60 bg-card min-w-[290px] p-0 shadow-[0_8px_32px_rgba(0,0,0,0.18)] relative overflow-hidden"
      >
        {/* Corner accents */}
        <span className="pointer-events-none absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-primary z-10" />
        <span className="pointer-events-none absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-primary z-10" />
        <span className="pointer-events-none absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-primary z-10" />
        <span className="pointer-events-none absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-primary z-10" />

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/25 bg-primary/10">
          <Building2 size={12} className="text-primary" strokeWidth={1.5} />
          <span className="text-[10px] tracking-[0.35em] uppercase text-primary font-serif font-medium">
            {t("branch.label")}
          </span>
        </div>

        {/* Hotel items */}
        {hotels?.map((h, idx) => {
          const meta = getCityMeta(h.city);
          const active = h.id === selectedId;
          return (
            <DropdownMenuItem
              key={h.id}
              onSelect={() => handleSelect(h.id)}
              className={[
                "group/item rounded-none cursor-pointer p-0 border-b border-primary/15 last:border-b-0",
                "focus:bg-transparent data-[highlighted]:bg-transparent",
                "transition-colors duration-200",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center gap-3 w-full px-3 py-3 transition-all duration-200",
                  active
                    ? "bg-primary/15"
                    : "hover:bg-primary/10 group-data-[highlighted]/item:bg-primary/10",
                ].join(" ")}
              >
                {/* Thumbnail */}
                <div className={[
                  "relative shrink-0 w-14 h-14 overflow-hidden border transition-all duration-200",
                  active ? "border-primary" : "border-primary/30 group-data-[highlighted]/item:border-primary/70",
                ].join(" ")}>
                  {meta.img ? (
                    <img
                      src={meta.img}
                      alt={h.city}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : null}
                  {/* City code overlay */}
                  <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/60 to-transparent p-1">
                    <span className="font-serif text-[9px] tracking-[0.18em] text-white/95 font-medium">
                      {meta.code}
                    </span>
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={[
                      "font-serif text-[15px] leading-tight transition-colors",
                      active ? "text-primary font-semibold" : "text-foreground font-normal group-data-[highlighted]/item:text-primary",
                    ].join(" ")}>
                      {h.city}
                    </span>
                    {active && (
                      <Check size={12} className="text-primary shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                  <span className="text-[11px] leading-tight truncate text-foreground/60 tracking-wide">
                    {h.name}
                  </span>
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: meta.stars }).map((_, i) => (
                      <span key={i} className="text-primary text-[9px]">★</span>
                    ))}
                  </div>
                </div>

                {/* Right chevron indicator */}
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  className={[
                    "-rotate-90 shrink-0 transition-colors",
                    active ? "text-primary" : "text-foreground/30 group-data-[highlighted]/item:text-primary/60",
                  ].join(" ")}
                />
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
