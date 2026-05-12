"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { PAISES } from "@/constants/paises.const";
import { cn } from "@/lib/utils";

interface NacionalidadSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function NacionalidadSelect({
  value,
  onChange,
  error,
  disabled,
}: NacionalidadSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      query.trim()
        ? PAISES.filter((p) =>
            p.nombre.toLowerCase().includes(query.toLowerCase())
          )
        : PAISES,
    [query]
  );

  // Compute fixed position from trigger bounding rect
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(220, window.innerHeight * 0.4);

    if (spaceBelow >= dropdownHeight || spaceBelow >= 120) {
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    } else {
      // Open upward if not enough space below
      setDropdownStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open, updatePosition]);

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback(
    (nombre: string) => {
      onChange(nombre);
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
    },
    [onChange]
  );

  // Display: find by nombre for exact matches; fall back to raw value (handles legacy data)
  const displayLabel = PAISES.find((p) => p.nombre === value)?.nombre ?? value;

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="rounded-md border border-border bg-popover shadow-md"
    >
      <div className="p-2 pb-1">
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar país..."
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />
      </div>

      <div
        role="listbox"
        aria-label="Lista de países"
        className="max-h-48 overflow-y-auto p-1 scrollbar-thin"
      >
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No se encontraron resultados
          </p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.codigo}
              type="button"
              role="option"
              aria-selected={value === p.nombre}
              onClick={() => handleSelect(p.nombre)}
              className={cn(
                "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                value === p.nombre && "bg-muted font-medium text-primary"
              )}
            >
              {p.nombre}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          error && "border-destructive",
          open && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className="truncate">{value ? displayLabel : "Buscar país..."}</span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange("");
                }
              }}
              aria-label="Limpiar selección"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      {typeof window !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}

      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
