"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Loader2, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clientsService } from "@/services";
import type { Client } from "@/types";

interface ClientSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (client: Client) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ClientSearchInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  onKeyDown,
  onPaste,
}: ClientSearchInputProps) {
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedValue = useDebounce(value, 300);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await clientsService.getAll({ search: query, limit: 6, page: 1 });
      const seen = new Set<string>();
      const unique = result.data.filter((c) => {
        const key = (c.cedulaORuc ?? c.nombresCompletos).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setSuggestions(unique);
      if (unique.length > 0) {
        updateDropdownPosition();
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [updateDropdownPosition]);

  useEffect(() => {
    search(debouncedValue);
  }, [debouncedValue, search]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClose(e: MouseEvent) {
      if (inputRef.current && inputRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClose);
    return () => document.removeEventListener("mousedown", handleClose);
  }, [isOpen]);

  const handleSelect = (client: Client) => {
    setIsOpen(false);
    setSuggestions([]);
    onSelect(client);
  };

  const dropdown =
    isOpen && suggestions.length > 0 ? (
      <ul
        style={dropdownStyle}
        className="rounded-md border border-border bg-popover shadow-lg overflow-hidden"
      >
        {suggestions.map((client) => (
          <li key={client.id}>
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(client);
              }}
            >
              <UserCheck className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {client.nombresCompletos}
                </p>
                <p className="text-xs text-muted-foreground">
                  {client.cedulaORuc || "Sin cédula"} · {client.nacionalidad || "—"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={() => {
            if (suggestions.length > 0) {
              updateDropdownPosition();
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="h-8 text-sm pr-7"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5 opacity-40" />
          )}
        </div>
      </div>

      {typeof window !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
