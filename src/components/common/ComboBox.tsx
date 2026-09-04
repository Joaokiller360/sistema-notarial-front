"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
}

interface ComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

/**
 * Lista desplegable con buscador (combobox). Renderiza el panel en un portal
 * para no ser recortado por contenedores con overflow.
 */
export function ComboBox({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  error,
  disabled,
  allowClear = false,
  className,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [query, options]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(240, window.innerHeight * 0.4);
    if (spaceBelow >= dropdownHeight || spaceBelow >= 140) {
      setDropdownStyle({ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    } else {
      setDropdownStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, zIndex: 9999 });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open, updatePosition]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [close]);

  const handleSelect = useCallback(
    (v: string) => {
      onChange(v);
      close();
    },
    [onChange, close]
  );

  const displayLabel = options.find((o) => o.value === value)?.label ?? value;

  const dropdown = open ? (
    <div ref={dropdownRef} style={dropdownStyle} className="rounded-md border border-border bg-popover shadow-md">
      <div className="p-2 pb-1">
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          onKeyDown={(e) => e.key === "Escape" && close()}
        />
      </div>
      <div role="listbox" className="max-h-52 overflow-y-auto p-1 scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No se encontraron resultados</p>
        ) : (
          filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value === o.value}
              onClick={() => handleSelect(o.value)}
              className={cn(
                "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                value === o.value && "bg-muted font-medium text-primary"
              )}
            >
              {o.label}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
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
        <span className="truncate">{value ? displayLabel : placeholder}</span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {allowClear && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
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
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {typeof window !== "undefined" && dropdown ? createPortal(dropdown, document.body) : null}

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
