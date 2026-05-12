"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, Controller, useWatch } from "react-hook-form";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientSearchInput } from "./ClientSearchInput";
import type { Client } from "@/types";

const NATIONALITIES = [
  "Ecuatoriana",
  "Colombiana",
  "Peruana",
  "Venezolana",
  "Estadounidense",
  "Española",
  "Argentina",
  "Chilena",
  "Boliviana",
  "Brasileña",
  "Mexicana",
  "Panameña",
  "Cubana",
  "Italiana",
  "Francesa",
  "Alemana",
  "China",
  "Otra",
];

const DEFAULT_NATIONALITY = "Ecuatoriana";

interface GrantorRowProps {
  fieldName: "grantors" | "beneficiaries";
  index: number;
  onRemove: () => void;
  errors?: Record<string, { message?: string }>;
}

function GrantorRow({ fieldName, index, onRemove, errors }: GrantorRowProps) {
  const { control, setValue } = useFormContext();
  const [cedulaError, setCedulaError] = useState("");

  const nombresValue: string = useWatch({ control, name: `${fieldName}.${index}.nombresCompletos` }) ?? "";
  const cedulaValue: string  = useWatch({ control, name: `${fieldName}.${index}.cedulaORuc` }) ?? "";
  const pasaporteValue: string = useWatch({ control, name: `${fieldName}.${index}.pasaporte` }) ?? "";
  const isPasaporte: boolean = useWatch({ control, name: `${fieldName}.${index}.isPasaporte` }) ?? false;

  const handleClientSelect = (client: Client) => {
    setValue(`${fieldName}.${index}.nombresCompletos`, client.nombresCompletos, { shouldValidate: true });
    setValue(`${fieldName}.${index}.cedulaORuc`,       client.cedulaORuc ?? "",  { shouldValidate: true });
    setValue(`${fieldName}.${index}.nacionalidad`,     client.nacionalidad || DEFAULT_NATIONALITY, { shouldValidate: true });
  };

  const handleTogglePasaporte = () => {
    const next = !isPasaporte;
    setValue(`${fieldName}.${index}.isPasaporte`, next, { shouldValidate: false });
    // Clear the unused field when switching modes
    if (next) {
      setValue(`${fieldName}.${index}.cedulaORuc`, "", { shouldValidate: false });
      setCedulaError("");
    } else {
      setValue(`${fieldName}.${index}.pasaporte`, "", { shouldValidate: false });
    }
  };

  // Tarea 1: bloquear caracteres no numéricos en cédula/RUC
  const handleCedulaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      setCedulaError("Solo se permiten números en la cédula/RUC");
      setTimeout(() => setCedulaError(""), 2500);
    }
  };

  const handleCedulaChange = (val: string) => {
    const filtered = val.replace(/\D/g, "");
    if (val !== filtered) setCedulaError("Solo se permiten números en la cédula/RUC");
    else setCedulaError("");
    setValue(`${fieldName}.${index}.cedulaORuc`, filtered, { shouldValidate: true });
  };

  // Tarea 3: bloquear caracteres especiales en pasaporte (solo alfanumérico)
  const handlePasaporteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Home", "End"];
    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^[a-zA-Z0-9]$/.test(e.key)) e.preventDefault();
  };

  const handlePasaporteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
    setValue(`${fieldName}.${index}.pasaporte`, filtered, { shouldValidate: true });
  };

  return (
    <div className="p-4 rounded-lg border border-border space-y-3 bg-muted/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Registro #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1 space-y-1.5">
          <Label className="text-xs">Nombres Completos</Label>
          <ClientSearchInput
            value={nombresValue}
            onChange={(val) => setValue(`${fieldName}.${index}.nombresCompletos`, val, { shouldValidate: true })}
            onSelect={handleClientSelect}
            placeholder="Ej: Juan Carlos Pérez"
          />
          {errors?.nombresCompletos?.message && (
            <p className="text-xs text-destructive">{errors.nombresCompletos.message}</p>
          )}
        </div>

        {/* Tarea 2 & 3: checkbox ¿Es Pasaporte? + campo condicional */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{isPasaporte ? "Pasaporte" : "Cédula / RUC"}</Label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPasaporte}
                onChange={handleTogglePasaporte}
                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">¿Es Pasaporte?</span>
            </label>
          </div>

          {isPasaporte ? (
            // Campo pasaporte: alfanumérico, 5–20 caracteres
            <Input
              value={pasaporteValue}
              onChange={handlePasaporteChange}
              onKeyDown={handlePasaporteKeyDown}
              placeholder="Ej: AB123456"
              className="h-8 text-sm"
              maxLength={20}
            />
          ) : (
            // Campo cédula/RUC: solo numérico
            <ClientSearchInput
              value={cedulaValue}
              onChange={handleCedulaChange}
              onKeyDown={handleCedulaKeyDown}
              onSelect={handleClientSelect}
              placeholder="Ej: 0912345678"
            />
          )}

          {/* Errores de validación inline */}
          {cedulaError && !isPasaporte && (
            <p className="text-xs text-destructive">{cedulaError}</p>
          )}
          {!cedulaError && !isPasaporte && errors?.cedulaORuc?.message && (
            <p className="text-xs text-destructive">{errors.cedulaORuc.message}</p>
          )}
          {isPasaporte && errors?.pasaporte?.message && (
            <p className="text-xs text-destructive">{errors.pasaporte.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nacionalidad</Label>
          <Controller
            control={control}
            name={`${fieldName}.${index}.nacionalidad`}
            render={({ field: f }) => (
              <Select value={f.value || DEFAULT_NATIONALITY} onValueChange={f.onChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors?.nacionalidad?.message && (
            <p className="text-xs text-destructive">{errors.nacionalidad.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface GrantorFormProps {
  fieldName: "grantors" | "beneficiaries";
  title: string;
  icon?: React.ReactNode;
}

export function GrantorForm({ fieldName, title, icon }: GrantorFormProps) {
  const { control, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });

  const fieldErrors = errors[fieldName] as
    | Record<number, Record<string, { message?: string }>>
    | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon || <Users className="w-4 h-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {fields.length}
          </span>
        </div>
        <Button
          type="button"
          className="cursor-pointer"
          variant="default"
          size="sm"
          onClick={() => append({
            nombresCompletos: "",
            cedulaORuc: "",
            isPasaporte: false,
            pasaporte: "",
            nacionalidad: DEFAULT_NATIONALITY,
          })}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Agregar
        </Button>
      </div>

      {fields.length === 0 && (
        <div className="py-6 text-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            No hay registros. Haz clic en{" "}
            <strong className="text-foreground">Agregar</strong> para añadir uno.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <GrantorRow
            key={field.id}
            fieldName={fieldName}
            index={index}
            onRemove={() => remove(index)}
            errors={fieldErrors?.[index]}
          />
        ))}
      </div>
    </div>
  );
}
