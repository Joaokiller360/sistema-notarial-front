"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FORM_TEMPLATES } from "@/lib/form-templates";
import { cn } from "@/lib/utils";

export default function PlantillasPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Elige una plantilla"
        description="Selecciona la plantilla para el nuevo formulario"
      >
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => router.push("/forms")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORM_TEMPLATES.map((tpl) => (
          <Card
            key={tpl.id}
            className={cn(
              "flex flex-col",
              tpl.principal && "border-primary/40 ring-1 ring-primary/20"
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                {tpl.name}
                {tpl.principal && (
                  <Badge variant="outline" className="ml-auto gap-1 text-[10px]">
                    <Star className="w-3 h-3" />
                    Principal
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="text-sm text-muted-foreground flex-1">{tpl.description}</p>
              <Button
                className="cursor-pointer w-full"
                onClick={() => router.push(`/forms/nuevo/${tpl.id}`)}
              >
                Usar esta plantilla
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
