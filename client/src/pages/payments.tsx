import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditCard, Receipt, CheckCircle2, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: any;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  prices: Price[];
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  metadata: Record<string, string>;
}

function formatCurrency(amount: number, currency: string = 'brl'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'succeeded':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Pago</Badge>;
    case 'processing':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="w-3 h-3 mr-1" />Processando</Badge>;
    case 'canceled':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3 mr-1" />Cancelado</Badge>;
    default:
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
  }
}

export default function Payments() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const paymentStatus = urlParams.get('status');
  const toastShownRef = useRef(false);

  useEffect(() => {
    if (toastShownRef.current) return;
    
    if (paymentStatus === 'success') {
      toastShownRef.current = true;
      toast({
        title: "Pagamento realizado com sucesso!",
        description: "Seu pagamento foi processado.",
      });
    } else if (paymentStatus === 'cancelled') {
      toastShownRef.current = true;
      toast({
        title: "Pagamento cancelado",
        description: "O pagamento foi cancelado.",
        variant: "destructive",
      });
    }
  }, [paymentStatus, toast]);

  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: Product[] }>({
    queryKey: ["/api/stripe/products-with-prices"],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<{ data: PaymentIntent[] }>({
    queryKey: ["/api/stripe/payment-history"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar pagamento",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/customer-portal", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao abrir portal",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const products = productsData?.data || [];
  const paymentHistory = historyData?.data || [];

  return (
    <div className="p-6 space-y-6" data-testid="page-payments">
      <PageHeader
        title="Pagamentos"
        description="Pague suas taxas de condomínio online"
        icon={CreditCard}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Taxas Disponíveis
              </CardTitle>
              <CardDescription>
                Selecione uma taxa para efetuar o pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma taxa disponível no momento</p>
                  <p className="text-sm mt-2">Entre em contato com a administração</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer transition-all hover-elevate ${
                        selectedPrice && product.prices.some(p => p.id === selectedPrice) 
                          ? 'ring-2 ring-primary' 
                          : ''
                      }`}
                      data-testid={`card-product-${product.id}`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        {product.description && (
                          <CardDescription>{product.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {product.prices.map((price) => (
                            <Button
                              key={price.id}
                              variant={selectedPrice === price.id ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedPrice(price.id)}
                              data-testid={`button-select-price-${price.id}`}
                            >
                              {formatCurrency(price.unit_amount, price.currency)}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
            {selectedPrice && (
              <CardFooter>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => checkoutMutation.mutate(selectedPrice)}
                  disabled={checkoutMutation.isPending}
                  data-testid="button-pay-now"
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pagar Agora
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gerenciar Pagamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-customer-portal"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Portal do Cliente
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico de Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhum pagamento realizado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.slice(0, 10).map((payment) => (
                    <div 
                      key={payment.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      data-testid={`payment-history-${payment.id}`}
                    >
                      <div>
                        <p className="font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created * 1000), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
