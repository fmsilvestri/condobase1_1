import { useState } from "react";
import {
  FileText,
  Plus,
  Upload,
  Calendar,
  AlertTriangle,
  Check,
  Download,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { documentTypes } from "@shared/schema";

interface Document {
  id: string;
  name: string;
  type: string;
  expirationDate?: string;
  status: "ok" | "atenção" | "alerta";
  uploadedAt: string;
}

const mockDocuments: Document[] = [
  { id: "1", name: "AVCB - Auto de Vistoria do Corpo de Bombeiros", type: "AVCB", expirationDate: "2024-06-15", status: "ok", uploadedAt: "2023-06-15" },
  { id: "2", name: "Alvará de Funcionamento", type: "Alvará", expirationDate: "2024-02-20", status: "atenção", uploadedAt: "2023-02-20" },
  { id: "3", name: "Certificado de Dedetização", type: "Dedetização", expirationDate: "2024-01-25", status: "alerta", uploadedAt: "2023-07-25" },
  { id: "4", name: "Relatório de Limpeza das Caixas d'Água", type: "Limpeza Caixas d'Água", expirationDate: "2024-07-10", status: "ok", uploadedAt: "2023-07-10" },
  { id: "5", name: "Certificado de Manutenção dos Elevadores", type: "Certificado", expirationDate: "2024-04-30", status: "ok", uploadedAt: "2023-10-30" },
  { id: "6", name: "Contrato de Seguro Condominial", type: "Contrato", expirationDate: "2024-12-01", status: "ok", uploadedAt: "2023-12-01" },
];

const getTypeIcon = (type: string) => {
  const colors: Record<string, string> = {
    "AVCB": "bg-red-500/10 text-red-500",
    "Alvará": "bg-blue-500/10 text-blue-500",
    "Dedetização": "bg-green-500/10 text-green-500",
    "Limpeza Caixas d'Água": "bg-cyan-500/10 text-cyan-500",
    "Certificado": "bg-purple-500/10 text-purple-500",
    "Contrato": "bg-amber-500/10 text-amber-500",
  };
  return colors[type] || "bg-muted text-muted-foreground";
};

export default function Documents() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const expiringCount = mockDocuments.filter((d) => d.status === "atenção" || d.status === "alerta").length;

  const getDaysUntilExpiration = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    const expiration = new Date(dateStr);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos & Licenças"
        description="Gerencie certificados, alvarás e documentos do condomínio"
        backHref="/"
        actions={
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-document">
                <Upload className="mr-2 h-4 w-4" />
                Enviar Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Enviar Documento</DialogTitle>
                <DialogDescription>
                  Faça upload de um novo documento ou certificado.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="doc-name">Nome do Documento</Label>
                  <Input id="doc-name" placeholder="Ex: AVCB 2024" data-testid="input-document-name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="doc-type">Tipo</Label>
                  <Select>
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
                  <Input id="expiration" type="date" data-testid="input-document-expiration" />
                </div>
                <div className="grid gap-2">
                  <Label>Arquivo</Label>
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Arraste o arquivo ou clique para fazer upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, JPG ou PNG (máx. 10MB)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" placeholder="Observações adicionais..." data-testid="input-document-notes" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsUploadOpen(false)} data-testid="button-save-document">
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                  Atenção: {expiringCount} documento(s) próximo(s) do vencimento
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
            onClick: () => setIsUploadOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const daysUntil = getDaysUntilExpiration(doc.expirationDate);
            
            return (
              <Card
                key={doc.id}
                className={`hover-elevate ${
                  doc.status === "alerta"
                    ? "border-red-500/30"
                    : doc.status === "atenção"
                    ? "border-amber-500/30"
                    : ""
                }`}
                data-testid={`document-card-${doc.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getTypeIcon(
                        doc.type
                      )}`}
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {doc.expirationDate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Vence em{" "}
                            {new Date(doc.expirationDate).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {daysUntil !== null && (
                          <Badge
                            variant="outline"
                            className={
                              daysUntil <= 30
                                ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                                : daysUntil <= 60
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {daysUntil <= 0
                              ? "Vencido"
                              : `${daysUntil} dias`}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1">
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1">
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
