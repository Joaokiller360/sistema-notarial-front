"use client";

import { useFieldArray, useFormContext, Controller } from "react-hook-form";
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

interface GrantorFormProps {
  fieldName: "grantors" | "beneficiaries";
  title: string;
  icon?: React.ReactNode;
}

export function GrantorForm({ fieldName, title, icon }: GrantorFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

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
          className="bg-sidebar/80 cursor-pointer hover:bg-sidebar"
          variant="default"
          size="sm"
          onClick={() =>
            append({ nombresCompletos: "", cedulaORuc: "", nacionalidad: DEFAULT_NATIONALITY })
          }
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
          <div
            key={field.id}
            className="p-4 rounded-lg border border-border space-y-3 bg-sidebar/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                Registro #{index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1.5">
                <Label className="text-xs">Nombres Completos</Label>
                <Input
                  placeholder="Ej: Juan Carlos Pérez"
                  className="h-8 text-sm"
                  {...register(`${fieldName}.${index}.nombresCompletos`)}
                />
                {fieldErrors?.[index]?.nombresCompletos?.message && (
                  <p className="text-xs text-destructive">
                    {fieldErrors[index].nombresCompletos.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cédula / RUC</Label>
                <Input
                  placeholder="Ej: 0912345678"
                  className="h-8 text-sm"
                  {...register(`${fieldName}.${index}.cedulaORuc`)}
                />
                {fieldErrors?.[index]?.cedulaORuc?.message && (
                  <p className="text-xs text-destructive">
                    {fieldErrors[index].cedulaORuc.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Nacionalidad</Label>
                <Controller
                  control={control}
                  name={`${fieldName}.${index}.nacionalidad`}
                  render={({ field: f }) => (
                    <Select
                      value={f.value || DEFAULT_NATIONALITY}
                      onValueChange={f.onChange}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {fieldErrors?.[index]?.nacionalidad?.message && (
                  <p className="text-xs text-destructive">
                    {fieldErrors[index].nacionalidad.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
