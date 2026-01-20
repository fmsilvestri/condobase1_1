import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Calendar,
  AlertTriangle,
  Download,
  Eye,
  Search,
  Filter,
  Pencil,
  Trash2,
  Loader2,
  Paperclip,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { documentTypes, type Document } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpload } from "@/hooks/use-upload";

const getTypeIcon = (type: string) => {
  const colors: Record<string, string> = {
    "AVCB": "bg-red-500/10 text-red-500",
    "Alvará": "bg-blue-500/10 text-blue-500",
    "Dedetização": "bg-green-500/10 text-green-500",
    "Limpeza Caixas d'Água": "bg-cyan-500/10 text-cyan-500",
    "Certificado": "bg-purple-500/10 text-purple-500",
    "Contrato": "bg-amber-500/10 text-amber-500",
    "Licença": "bg-indigo-500/10 text-indigo-500",
    "Relatório": "bg-pink-500/10 text-pink-500",
  };
  return colors[type] || "bg-muted text-muted-foreground";
};

const getDocumentStatus = (expirationDate?: Date | string | null) => {
  if (!expirationDate) return "ok";
  const today = new Date();
  const expiration = expirationDate instanceof Date ? expirationDate : new Date(expirationDate);
  const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "vencido";
  if (diffDays <= 30) return "alerta";
  if (diffDays <= 60) return "atenção";
  return "ok";
};

export default function Documents() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canEdit } = useAuth();
  const { toast } = useToast();

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setFormData(prev => ({ ...prev, fileUrl: response.objectPath }));
      toast({ title: "Arquivo enviado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao enviar arquivo", description: error.message, variant: "destructive" });
    },
  });

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    expirationDate: "",
    notes: "",
    fileUrl: "",
  });

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Documento criado com sucesso" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar documento", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/documents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Documento atualizado com sucesso" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar documento", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Documento excluído com sucesso" });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir documento", description: error.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDocument(null);
    setFormData({ name: "", type: "", expirationDate: "", notes: "", fileUrl: "" });
    setUploadedFileName("");
  };

  const openEditDialog = (doc: Document) => {
    setEditingDocument(doc);
    const expDate = doc.expirationDate 
      ? (doc.expirationDate instanceof Date 
          ? doc.expirationDate.toISOString().split("T")[0] 
          : new Date(doc.expirationDate).toISOString().split("T")[0])
      : "";
    setFormData({
      name: doc.name,
      type: doc.type,
      expirationDate: expDate,
      notes: doc.notes || "",
      fileUrl: doc.fileUrl || "",
    });
    setUploadedFileName(doc.fileUrl ? "Arquivo existente" : "");
    setIsDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      await uploadFile(file);
    }
  };

  const openDeleteDialog = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      type: formData.type,
      expirationDate: formData.expirationDate || null,
      notes: formData.notes || null,
      fileUrl: formData.fileUrl || null,
    };

    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.id);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const expiringCount = documents.filter((d) => {
    const status = getDocumentStatus(d.expirationDate);
    return status === "atenção" || status === "alerta" || status === "vencido";
  }).length;

  const getDaysUntilExpiration = (date?: Date | string | null) => {
    if (!date) return null;
    const today = new Date();
    const expiration = date instanceof Date ? date : new Date(date);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Documentos & Licenças"
          description="Gerencie certificados, alvarás e documentos do condomínio"
          backHref="/"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos & Licenças"
        description="Gerencie certificados, alvarás e documentos do condomínio"
        backHref="/"
        actions={
          canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) closeDialog();
              else setIsDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-document">
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar Documento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingDocument ? "Editar Documento" : "Enviar Documento"}</DialogTitle>
                  <DialogDescription>
                    {editingDocument ? "Edite as informações do documento." : "Faça upload de um novo documento ou certificado."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="doc-name">Nome do Documento</Label>
                    <Input
                      id="doc-name"
                      placeholder="Ex: AVCB 2024"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      data-testid="input-document-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="doc-type">Tipo</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger data-testid="select-document-type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiration">Data de Validade</Label>
                    <Input
                      id="expiration"
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                      data-testid="input-document-expiration"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Arquivo</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      data-testid="input-document-file"
                    />
                    <div
                      className="flex items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Enviando arquivo...</span>
                        </div>
                      ) : uploadedFileName || formData.fileUrl ? (
                        <div className="flex items-center gap-2 text-primary">
                          <Paperclip className="h-5 w-5" />
                          <span className="truncate max-w-[250px]">{uploadedFileName || "Arquivo anexado"}</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Clique para anexar arquivo
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, JPG, PNG ou DOC (máx. 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Observações adicionais..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      data-testid="input-document-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.name || !formData.type || createMutation.isPending || updateMutation.isPending || isUploading}
                    data-testid="button-save-document"
                  >
                    {isUploading ? "Enviando arquivo..." : createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingDocument ? "Salvar" : "Enviar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {expiringCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Atenção: {expiringCount} documento(s) próximo(s) do vencimento ou vencidos
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifique os documentos destacados abaixo e providencie a renovação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-document"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-document-type">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {documentTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento encontrado"
          description="Envie documentos para manter o controle de certificados e licenças."
          action={{
            label: "Enviar Documento",
            onClick: () => setIsDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const daysUntil = getDaysUntilExpiration(doc.expirationDate);
            const status = getDocumentStatus(doc.expirationDate);

            return (
              <Card
                key={doc.id}
                className={`hover-elevate ${
                  status === "alerta" || status === "vencido"
                    ? "border-red-500/30"
                    : status === "atenção"
                    ? "border-amber-500/30"
                    : ""
                }`}
                data-testid={`document-card-${doc.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getTypeIcon(doc.type)}`}
                    >
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {doc.name}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {doc.type}
                      </Badge>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(doc)}
                        data-testid={`button-edit-document-${doc.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(doc)}
                        data-testid={`button-delete-document-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {doc.expirationDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Vence em {new Date(doc.expirationDate).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {daysUntil !== null && (
                          <Badge
                            variant="outline"
                            className={
                              daysUntil <= 0
                                ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                                : daysUntil <= 30
                                ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                                : daysUntil <= 60
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {daysUntil <= 0 ? "Vencido" : `${daysUntil} dias`}
                          </Badge>
                        )}
                      </div>
                    )}
                    {doc.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{doc.notes}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {doc.fileUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => window.open(doc.fileUrl!, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => window.open(doc.fileUrl!, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                            Baixar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento "{documentToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
