import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Star,
  ShoppingCart,
  DollarSign,
  Award,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useCondominium } from "@/hooks/use-condominium";
import type { FornecedorMarketplace } from "@shared/schema";

interface MarketplaceRelatorios {
  servicosMaisContratados: { servicoId: string; nome: string; total: number }[];
  fornecedoresMelhorAvaliados: FornecedorMarketplace[];
  totalContratacoes: number;
  valorTotalContratado: number;
}

export default function MarketplaceRelatorios() {
  const { selectedCondominium } = useCondominium();

  const { data: relatorios, isLoading } = useQuery<MarketplaceRelatorios>({
    queryKey: ["/api/marketplace/relatorios", selectedCondominium?.id],
    enabled: !!selectedCondominium?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!relatorios) {
    return (
      <div className="p-6">
        <EmptyState
          icon={BarChart3}
          title="Sem dados"
          description="Nao ha dados de relatorios disponiveis."
        />
      </div>
    );
  }

  const maxContratacoes = Math.max(
    ...relatorios.servicosMaisContratados.map((s) => s.total),
    1
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        icon={BarChart3}
        title="Relatorios do Marketplace"
        description="Acompanhe o desempenho do marketplace do condominio"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-contracts">
                  {relatorios.totalContratacoes}
                </p>
                <p className="text-sm text-muted-foreground">Total de Contratacoes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-value">
                  R$ {relatorios.valorTotalContratado.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-top-services">
                  {relatorios.servicosMaisContratados.length}
                </p>
                <p className="text-sm text-muted-foreground">Servicos Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-top-suppliers">
                  {relatorios.fornecedoresMelhorAvaliados.length}
                </p>
                <p className="text-sm text-muted-foreground">Fornecedores Avaliados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Servicos Mais Contratados
            </CardTitle>
            <CardDescription>
              Ranking dos servicos mais populares no condominio
            </CardDescription>
          </CardHeader>
          <CardContent>
            {relatorios.servicosMaisContratados.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma contratacao registrada ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {relatorios.servicosMaisContratados.map((servico, index) => (
                  <div key={servico.servicoId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{servico.nome}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {servico.total} contratacoes
                      </span>
                    </div>
                    <Progress
                      value={(servico.total / maxContratacoes) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Fornecedores Melhor Avaliados
            </CardTitle>
            <CardDescription>
              Ranking dos fornecedores com melhores avaliacoes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {relatorios.fornecedoresMelhorAvaliados.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum fornecedor avaliado ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {relatorios.fornecedoresMelhorAvaliados.map((fornecedor, index) => (
                  <div
                    key={fornecedor.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={index === 0 ? "default" : "outline"}
                        className="w-6 h-6 p-0 flex items-center justify-center"
                      >
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{fornecedor.nomeFantasia}</p>
                        <p className="text-sm text-muted-foreground">
                          {fornecedor.totalAvaliacoes} avaliacoes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">
                        {fornecedor.avaliacaoMedia?.toFixed(1) || "0.0"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
