import { useState } from "react";
import { Trash2, Recycle, Leaf, Calendar, Info, Check, Edit, Plus, X, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WasteConfig } from "@shared/schema";

interface ScheduleDay {
  day: string;
  organic: boolean;
  recyclable: boolean;
}

interface RecyclableCategory {
  category: string;
  items: string[];
}

const defaultSchedule: ScheduleDay[] = [
  { day: "Segunda", organic: true, recyclable: false },
  { day: "Terça", organic: false, recyclable: true },
  { day: "Quarta", organic: true, recyclable: false },
  { day: "Quinta", organic: false, recyclable: true },
  { day: "Sexta", organic: true, recyclable: false },
  { day: "Sábado", organic: false, recyclable: true },
];

const defaultOrganicItems = [
  "Restos de alimentos",
  "Cascas de frutas e vegetais",
  "Borra de café e saquinhos de chá",
  "Guardanapos e papel toalha usados",
  "Folhas e podas de jardim",
];

const defaultRecyclableCategories: RecyclableCategory[] = [
  { category: "Papel", items: ["Jornais", "Revistas", "Caixas de papelão", "Papel de escritório"] },
  { category: "Plástico", items: ["Garrafas PET", "Embalagens limpas", "Sacolas plásticas", "Potes"] },
  { category: "Metal", items: ["Latas de alumínio", "Latas de aço", "Tampas metálicas", "Papel alumínio"] },
  { category: "Vidro", items: ["Garrafas", "Potes", "Frascos", "Copos (não quebrados)"] },
];

const defaultNotRecyclable = [
  "Papel higiênico e fraldas",
  "Espelhos e vidros quebrados",
  "Cerâmicas e porcelanas",
  "Isopor sujo",
  "Embalagens metalizadas (como de salgadinho)",
];

export default function Waste() {
  const { canEdit, dbUserId, user } = useAuth();
  const { toast } = useToast();
  
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [isEditOrganicOpen, setIsEditOrganicOpen] = useState(false);
  const [isEditRecyclableOpen, setIsEditRecyclableOpen] = useState(false);
  const [isEditNotRecyclableOpen, setIsEditNotRecyclableOpen] = useState(false);
  
  const [editSchedule, setEditSchedule] = useState<ScheduleDay[]>([]);
  const [editOrganicItems, setEditOrganicItems] = useState<string[]>([]);
  const [editRecyclableCategories, setEditRecyclableCategories] = useState<RecyclableCategory[]>([]);
  const [editNotRecyclable, setEditNotRecyclable] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [collectionTime, setCollectionTime] = useState("07:00");

  const { data: wasteConfig, isLoading } = useQuery<WasteConfig | null>({
    queryKey: ["/api/waste-config"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<WasteConfig>) =>
      apiRequest("PATCH", "/api/waste-config", {
        ...data,
        updatedBy: dbUserId,
        userEmail: user?.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/waste-config"] });
      toast({ title: "Configuração atualizada com sucesso!" });
      setIsEditScheduleOpen(false);
      setIsEditOrganicOpen(false);
      setIsEditRecyclableOpen(false);
      setIsEditNotRecyclableOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const wasteSchedule: ScheduleDay[] = wasteConfig?.schedule 
    ? JSON.parse(wasteConfig.schedule) 
    : defaultSchedule;
  
  const organicItems: string[] = wasteConfig?.organicItems 
    ? JSON.parse(wasteConfig.organicItems) 
    : defaultOrganicItems;
  
  const recyclableItems: RecyclableCategory[] = wasteConfig?.recyclableCategories 
    ? JSON.parse(wasteConfig.recyclableCategories) 
    : defaultRecyclableCategories;
  
  const notRecyclable: string[] = wasteConfig?.notRecyclable 
    ? JSON.parse(wasteConfig.notRecyclable) 
    : defaultNotRecyclable;

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
  const todaySchedule = wasteSchedule.find(
    (s) => s.day.toLowerCase() === today.split("-")[0]?.toLowerCase()
  );

  const handleEditSchedule = () => {
    setEditSchedule([...wasteSchedule]);
    setCollectionTime(wasteConfig?.collectionTime || "07:00");
    setIsEditScheduleOpen(true);
  };

  const handleSaveSchedule = () => {
    updateConfigMutation.mutate({
      schedule: JSON.stringify(editSchedule),
      collectionTime,
    });
  };

  const handleEditOrganic = () => {
    setEditOrganicItems([...organicItems]);
    setIsEditOrganicOpen(true);
  };

  const handleSaveOrganic = () => {
    updateConfigMutation.mutate({
      organicItems: JSON.stringify(editOrganicItems),
    });
  };

  const handleEditRecyclable = () => {
    setEditRecyclableCategories(JSON.parse(JSON.stringify(recyclableItems)));
    setIsEditRecyclableOpen(true);
  };

  const handleSaveRecyclable = () => {
    updateConfigMutation.mutate({
      recyclableCategories: JSON.stringify(editRecyclableCategories),
    });
  };

  const handleEditNotRecyclable = () => {
    setEditNotRecyclable([...notRecyclable]);
    setIsEditNotRecyclableOpen(true);
  };

  const handleSaveNotRecyclable = () => {
    updateConfigMutation.mutate({
      notRecyclable: JSON.stringify(editNotRecyclable),
    });
  };

  const addItemToList = (list: string[], setList: (items: string[]) => void) => {
    if (newItem.trim()) {
      setList([...list, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItemFromList = (list: string[], setList: (items: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              . Deixe seu lixo na lixeira correta até as {wasteConfig?.collectionTime || "7h"}.
            </>
          ) : (
            "Não há coleta programada para hoje."
          )}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendário de Coleta
              </CardTitle>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleEditSchedule} data-testid="button-edit-schedule">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {wasteSchedule.map((schedule) => (
                  <div
                    key={schedule.day}
                    className="flex flex-col items-center rounded-lg border p-4 text-center"
                    data-testid={`schedule-day-${schedule.day}`}
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
                      {!schedule.organic && !schedule.recyclable && (
                        <Badge variant="secondary">Sem coleta</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="recyclable" className="mt-6">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
              <TabsTrigger value="recyclable" data-testid="tab-recyclable" className="gap-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400">
                <span>♻️</span> Recicláveis
              </TabsTrigger>
              <TabsTrigger value="organic" data-testid="tab-organic" className="gap-2 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">
                <span>🍂</span> Orgânicos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recyclable" className="mt-4 space-y-4">
              {canEdit && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleEditRecyclable} data-testid="button-edit-recyclable">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Recicláveis
                  </Button>
                </div>
              )}
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
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    O que pode ir no lixo orgânico
                  </CardTitle>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={handleEditOrganic} data-testid="button-edit-organic">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Não Reciclável
              </CardTitle>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={handleEditNotRecyclable} data-testid="button-edit-not-recyclable">
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Estes itens devem ser descartados no lixo comum:
              </p>
              <ul className="space-y-2">
                {notRecyclable.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <X className="h-4 w-4 text-destructive" />
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
                Dicas de Sustentabilidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Lave as embalagens antes de reciclar</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Separe os materiais por tipo</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Compacte garrafas e latas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Dobre caixas de papelão</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Schedule Dialog */}
      <Dialog open={isEditScheduleOpen} onOpenChange={setIsEditScheduleOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Calendário de Coleta</DialogTitle>
            <DialogDescription>
              Configure os dias de coleta de resíduos orgânicos e recicláveis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Horário limite de coleta:</Label>
              <Input
                type="time"
                value={collectionTime}
                onChange={(e) => setCollectionTime(e.target.value)}
                className="w-32"
                data-testid="input-collection-time"
              />
            </div>
            <div className="space-y-3">
              {editSchedule.map((schedule, index) => (
                <div key={schedule.day} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium w-24">{schedule.day}</span>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.organic}
                        onCheckedChange={(checked) => {
                          const newSchedule = [...editSchedule];
                          newSchedule[index].organic = checked;
                          setEditSchedule(newSchedule);
                        }}
                        data-testid={`switch-organic-${schedule.day}`}
                      />
                      <Label className="text-sm">Orgânico</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.recyclable}
                        onCheckedChange={(checked) => {
                          const newSchedule = [...editSchedule];
                          newSchedule[index].recyclable = checked;
                          setEditSchedule(newSchedule);
                        }}
                        data-testid={`switch-recyclable-${schedule.day}`}
                      />
                      <Label className="text-sm">Reciclável</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditScheduleOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule} disabled={updateConfigMutation.isPending} data-testid="button-save-schedule">
              {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organic Items Dialog */}
      <Dialog open={isEditOrganicOpen} onOpenChange={setIsEditOrganicOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Itens Orgânicos</DialogTitle>
            <DialogDescription>
              Configure a lista de itens que podem ser descartados no lixo orgânico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItemToList(editOrganicItems, setEditOrganicItems)}
                data-testid="input-new-organic-item"
              />
              <Button onClick={() => addItemToList(editOrganicItems, setEditOrganicItems)} data-testid="button-add-organic-item">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2 max-h-[300px] overflow-auto">
              {editOrganicItems.map((item, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{item}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemFromList(editOrganicItems, setEditOrganicItems, index)}
                    data-testid={`button-remove-organic-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOrganicOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveOrganic} disabled={updateConfigMutation.isPending} data-testid="button-save-organic">
              {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Not Recyclable Dialog */}
      <Dialog open={isEditNotRecyclableOpen} onOpenChange={setIsEditNotRecyclableOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Itens Não Recicláveis</DialogTitle>
            <DialogDescription>
              Configure a lista de itens que não podem ser reciclados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item..."
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItemToList(editNotRecyclable, setEditNotRecyclable)}
                data-testid="input-new-not-recyclable-item"
              />
              <Button onClick={() => addItemToList(editNotRecyclable, setEditNotRecyclable)} data-testid="button-add-not-recyclable-item">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2 max-h-[300px] overflow-auto">
              {editNotRecyclable.map((item, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{item}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemFromList(editNotRecyclable, setEditNotRecyclable, index)}
                    data-testid={`button-remove-not-recyclable-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditNotRecyclableOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNotRecyclable} disabled={updateConfigMutation.isPending} data-testid="button-save-not-recyclable">
              {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Recyclable Categories Dialog */}
      <Dialog open={isEditRecyclableOpen} onOpenChange={setIsEditRecyclableOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Categorias Recicláveis</DialogTitle>
            <DialogDescription>
              Configure as categorias e itens recicláveis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {editRecyclableCategories.map((category, catIndex) => (
              <div key={catIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Input
                    value={category.category}
                    onChange={(e) => {
                      const newCategories = [...editRecyclableCategories];
                      newCategories[catIndex].category = e.target.value;
                      setEditRecyclableCategories(newCategories);
                    }}
                    className="font-semibold w-40"
                    data-testid={`input-category-name-${catIndex}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      setEditRecyclableCategories(editRecyclableCategories.filter((_, i) => i !== catIndex));
                    }}
                    data-testid={`button-remove-category-${catIndex}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newCategories = [...editRecyclableCategories];
                          newCategories[catIndex].items[itemIndex] = e.target.value;
                          setEditRecyclableCategories(newCategories);
                        }}
                        className="text-sm"
                        data-testid={`input-item-${catIndex}-${itemIndex}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newCategories = [...editRecyclableCategories];
                          newCategories[catIndex].items = category.items.filter((_, i) => i !== itemIndex);
                          setEditRecyclableCategories(newCategories);
                        }}
                        data-testid={`button-remove-item-${catIndex}-${itemIndex}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const newCategories = [...editRecyclableCategories];
                      newCategories[catIndex].items.push("Novo item");
                      setEditRecyclableCategories(newCategories);
                    }}
                    data-testid={`button-add-item-to-category-${catIndex}`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Item
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEditRecyclableCategories([...editRecyclableCategories, { category: "Nova Categoria", items: [] }]);
              }}
              data-testid="button-add-category"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Categoria
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRecyclableOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRecyclable} disabled={updateConfigMutation.isPending} data-testid="button-save-recyclable">
              {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
