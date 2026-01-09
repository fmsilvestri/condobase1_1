import { Trash2, Recycle, Leaf, Calendar, Info, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const wasteSchedule = [
  { day: "Segunda", organic: true, recyclable: false },
  { day: "Terça", organic: false, recyclable: true },
  { day: "Quarta", organic: true, recyclable: false },
  { day: "Quinta", organic: false, recyclable: true },
  { day: "Sexta", organic: true, recyclable: false },
  { day: "Sábado", organic: false, recyclable: true },
];

const organicItems = [
  "Restos de alimentos",
  "Cascas de frutas e vegetais",
  "Borra de café e saquinhos de chá",
  "Guardanapos e papel toalha usados",
  "Folhas e podas de jardim",
];

const recyclableItems = [
  { category: "Papel", items: ["Jornais", "Revistas", "Caixas de papelão", "Papel de escritório"] },
  { category: "Plástico", items: ["Garrafas PET", "Embalagens limpas", "Sacolas plásticas", "Potes"] },
  { category: "Metal", items: ["Latas de alumínio", "Latas de aço", "Tampas metálicas", "Papel alumínio"] },
  { category: "Vidro", items: ["Garrafas", "Potes", "Frascos", "Copos (não quebrados)"] },
];

const notRecyclable = [
  "Papel higiênico e fraldas",
  "Espelhos e vidros quebrados",
  "Cerâmicas e porcelanas",
  "Isopor sujo",
  "Embalagens metalizadas (como de salgadinho)",
];

export default function Waste() {
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
  const todaySchedule = wasteSchedule.find(
    (s) => s.day.toLowerCase() === today.split("-")[0]?.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resíduos & Coleta"
        description="Regras de descarte e calendário de coleta"
        backHref="/"
      />

      <Alert className="border-emerald-500/50 bg-emerald-500/5">
        <Leaf className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-emerald-600 dark:text-emerald-400">
          Coleta de Hoje
        </AlertTitle>
        <AlertDescription>
          {todaySchedule ? (
            <>
              Hoje é dia de coleta de{" "}
              <strong>
                {todaySchedule.organic && todaySchedule.recyclable
                  ? "orgânico e reciclável"
                  : todaySchedule.organic
                  ? "resíduos orgânicos"
                  : "recicláveis"}
              </strong>
              . Deixe seu lixo na lixeira correta até as 7h.
            </>
          ) : (
            "Não há coleta programada para hoje."
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendário de Coleta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {wasteSchedule.map((schedule) => (
                  <div
                    key={schedule.day}
                    className="flex flex-col items-center rounded-lg border p-4 text-center"
                  >
                    <p className="font-medium">{schedule.day}</p>
                    <div className="mt-2 flex flex-col gap-1">
                      {schedule.organic && (
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          <Trash2 className="mr-1 h-3 w-3" />
                          Orgânico
                        </Badge>
                      )}
                      {schedule.recyclable && (
                        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          <Recycle className="mr-1 h-3 w-3" />
                          Reciclável
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="recyclable" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recyclable" data-testid="tab-recyclable">
                <Recycle className="mr-2 h-4 w-4" />
                Recicláveis
              </TabsTrigger>
              <TabsTrigger value="organic" data-testid="tab-organic">
                <Trash2 className="mr-2 h-4 w-4" />
                Orgânicos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recyclable" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {recyclableItems.map((category) => (
                  <Card key={category.category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Check className="h-4 w-4 text-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="organic" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    O que pode ir no lixo orgânico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {organicItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="h-4 w-4 text-amber-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-red-500/30 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                <Info className="h-4 w-4" />
                Não Reciclável
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {notRecyclable.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Dicas Importantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    <strong>Lave as embalagens</strong> antes de descartá-las na
                    coleta seletiva.
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    <strong>Desmonte caixas</strong> de papelão para economizar
                    espaço.
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    <strong>Separe tampas</strong> de garrafas - são materiais
                    diferentes.
                  </span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    <strong>Respeite os horários</strong> de coleta para evitar
                    acúmulo de lixo.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <Recycle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-blue-600 dark:text-blue-400">
                    Descarte Especial
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pilhas, baterias, eletrônicos e medicamentos devem ser
                    descartados em pontos de coleta específicos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
