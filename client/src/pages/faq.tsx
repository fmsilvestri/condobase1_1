import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCondominium } from "@/hooks/use-condominium";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Faq {
  id: string;
  condominiumId: string;
  question: string;
  answer: string;
  category: string;
  isPublished: boolean;
  viewCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const faqCategories = [
  "geral",
  "financeiro",
  "manutenção",
  "reservas",
  "regras",
  "segurança",
  "áreas comuns",
  "animais",
  "mudanças",
  "estacionamento",
];

const categoryLabels: Record<string, string> = {
  geral: "Geral",
  financeiro: "Financeiro",
  "manutenção": "Manutenção",
  reservas: "Reservas",
  regras: "Regras",
  "segurança": "Segurança",
  "áreas comuns": "Áreas Comuns",
  animais: "Animais",
  "mudanças": "Mudanças",
  estacionamento: "Estacionamento",
};

const faqFormSchema = z.object({
  question: z.string().min(5, "A pergunta deve ter pelo menos 5 caracteres"),
  answer: z.string().min(10, "A resposta deve ter pelo menos 10 caracteres"),
  category: z.string().min(1, "Categoria é obrigatória"),
  isPublished: z.boolean().default(true),
});

type FaqFormValues = z.infer<typeof faqFormSchema>;

export default function FaqPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCondominium } = useCondominium();

  const canEdit = user?.role === "admin" || user?.role === "síndico";

  const { data: faqs = [], isLoading } = useQuery<Faq[]>({
    queryKey: ["/api/faqs"],
  });

  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      question: "",
      answer: "",
      category: "geral",
      isPublished: true,
    },
  });

  const createFaqMutation = useMutation({
    mutationFn: (data: FaqFormValues & { condominiumId: string; createdBy: string }) =>
      apiRequest("POST", "/api/faqs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "Pergunta frequente criada com sucesso!" });
      handleCloseDialog();
    },
    onError: (error: any) => {
      console.error("[FAQ Create] Error:", error);
      toast({ title: "Erro ao criar pergunta frequente", variant: "destructive" });
    },
  });

  const updateFaqMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FaqFormValues> }) =>
      apiRequest("PATCH", `/api/faqs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "Pergunta frequente atualizada!" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar pergunta frequente", variant: "destructive" });
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/faqs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      toast({ title: "Pergunta frequente removida!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover pergunta frequente", variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFaq(null);
    form.reset({
      question: "",
      answer: "",
      category: "geral",
      isPublished: true,
    });
  };

  const handleNewFaq = () => {
    setEditingFaq(null);
    form.reset({
      question: "",
      answer: "",
      category: "geral",
      isPublished: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditFaq = (faq: Faq) => {
    setEditingFaq(faq);
    form.reset({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isPublished: faq.isPublished,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: FaqFormValues) => {
    if (editingFaq) {
      updateFaqMutation.mutate({ id: editingFaq.id, data });
    } else {
      if (!selectedCondominium) {
        toast({ title: "Selecione um condomínio", variant: "destructive" });
        return;
      }
      createFaqMutation.mutate({
        ...data,
        condominiumId: selectedCondominium.id,
        createdBy: user?.id || "",
      });
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const isVisible = canEdit || faq.isPublished;
    return matchesSearch && matchesCategory && isVisible;
  });

  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    const category = faq.category || "geral";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, Faq[]>);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Perguntas Frequentes"
        description="Base de conhecimento e dúvidas comuns do condomínio"
        backHref="/"
        actions={
          canEdit && (
            <Button onClick={handleNewFaq} data-testid="button-new-faq">
              <Plus className="mr-2 h-4 w-4" />
              Nova Pergunta
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar perguntas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-faq"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {faqCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryLabels[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredFaqs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhuma pergunta encontrada"
          description={
            searchTerm || selectedCategory !== "all"
              ? "Tente ajustar os filtros de busca"
              : "Comece adicionando perguntas frequentes para ajudar os moradores"
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {categoryLabels[category] || category}
                  <Badge variant="secondary" className="ml-2">
                    {categoryFaqs.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {categoryFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left hover:no-underline" data-testid={`faq-question-${faq.id}`}>
                        <div className="flex flex-1 items-center justify-between pr-4">
                          <span className="font-medium">{faq.question}</span>
                          <div className="flex items-center gap-2">
                            {!faq.isPublished && (
                              <Badge variant="outline" className="text-xs">
                                Rascunho
                              </Badge>
                            )}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {faq.viewCount}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                          {canEdit && (
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditFaq(faq)}
                                data-testid={`button-edit-faq-${faq.id}`}
                              >
                                <Edit className="mr-1 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja remover esta pergunta?")) {
                                    deleteFaqMutation.mutate(faq.id);
                                  }
                                }}
                                data-testid={`button-delete-faq-${faq.id}`}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Remover
                              </Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? "Editar Pergunta" : "Nova Pergunta Frequente"}
            </DialogTitle>
            <DialogDescription>
              {editingFaq
                ? "Atualize as informações da pergunta frequente"
                : "Adicione uma nova pergunta à base de conhecimento"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-faq-category">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {faqCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {categoryLabels[cat] || cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Como faço para reservar o salão de festas?"
                        {...field}
                        data-testid="input-faq-question"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resposta</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite a resposta detalhada..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="input-faq-answer"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid="checkbox-faq-published"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">
                      Publicar imediatamente
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel-faq"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                  data-testid="button-save-faq"
                >
                  {(createFaqMutation.isPending || updateFaqMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingFaq ? "Salvar Alterações" : "Criar Pergunta"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
