"use client";

import { useFieldArray, useFormContext, Controller, useWatch } from "react-hook-form";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const nombresValue: string = useWatch({ control, name: `${fieldName}.${index}.nombresCompletos` }) ?? "";
  const cedulaValue: string  = useWatch({ control, name: `${fieldName}.${index}.cedulaORuc` }) ?? "";

  const handleClientSelect = (client: Client) => {
    setValue(`${fieldName}.${index}.nombresCompletos`, client.nombresCompletos, { shouldValidate: true });
    setValue(`${fieldName}.${index}.cedulaORuc`,       client.cedulaORuc ?? "",  { shouldValidate: true });
    setValue(`${fieldName}.${index}.nacionalidad`,     client.nacionalidad || DEFAULT_NATIONALITY, { shouldValidate: true });
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

        <div className="space-y-1.5">
          <Label className="text-xs">Cédula / RUC</Label>
          <ClientSearchInput
            value={cedulaValue}
            onChange={(val) => setValue(`${fieldName}.${index}.cedulaORuc`, val, { shouldValidate: true })}
            onSelect={handleClientSelect}
            placeholder="Ej: 0912345678"
          />
          {errors?.cedulaORuc?.message && (
            <p className="text-xs text-destructive">{errors.cedulaORuc.message}</p>
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
          onClick={() => append({ nombresCompletos: "", cedulaORuc: "", nacionalidad: DEFAULT_NATIONALITY })}
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
