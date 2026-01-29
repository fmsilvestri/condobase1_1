import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { supabase, supabaseReady } from "@/lib/supabase";
import { format, differenceInMonths, differenceInYears, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCog,
  Plus,
  Search,
  DollarSign,
  AlertTriangle,
  Calendar,
  Briefcase,
  User,
  MapPin,
  FileText,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import type { Funcionario, InsertFuncionario } from "@shared/schema";

const statusOptions = [
  { value: "ativo", label: "Ativo", color: "bg-green-500" },
  { value: "afastado", label: "Afastado", color: "bg-yellow-500" },
  { value: "ferias", label: "Férias", color: "bg-blue-500" },
  { value: "demitido", label: "Demitido", color: "bg-red-500" },
];

const generoOptions = ["Masculino", "Feminino", "Outro"];
const estadoCivilOptions = ["Solteiro", "Casado", "Divorciado", "Viúvo"];
const tipoContratoOptions = ["CLT", "PJ", "Estagiário", "Temporário"];

const funcaoOptions = [
  "Porteiro",
  "Zelador",
  "Faxineiro",
  "Jardineiro",
  "Segurança",
  "Manobrista",
  "Recepcionista",
  "Técnico de Manutenção",
  "Supervisor",
  "Gerente Predial",
  "Outro",
];

const departamentoOptions = [
  "Portaria",
  "Limpeza",
  "Manutenção",
  "Segurança",
  "Administração",
  "Jardinagem",
  "Outro",
];

function calcularINSS(salario: number): { percentual: number; valor: number } {
  let valor = 0;
  if (salario <= 1412) {
    valor = salario * 0.075;
  } else if (salario <= 2666.68) {
    valor = 1412 * 0.075 + (salario - 1412) * 0.09;
  } else if (salario <= 4000.03) {
    valor = 1412 * 0.075 + (2666.68 - 1412) * 0.09 + (salario - 2666.68) * 0.12;
  } else if (salario <= 7786.02) {
    valor = 1412 * 0.075 + (2666.68 - 1412) * 0.09 + (4000.03 - 2666.68) * 0.12 + (salario - 4000.03) * 0.14;
  } else {
    valor = 908.86;
  }
  valor = Math.min(valor, 908.86);
  const percentual = salario > 0 ? (valor / salario) * 100 : 0;
  return { percentual, valor };
}

function calcularFGTS(salario: number): { percentual: number; valor: number } {
  return { percentual: 8, valor: salario * 0.08 };
}

function calcularIRRF(salario: number, inss: number): { percentual: number; valor: number } {
  const baseCalculo = salario - inss;
  let valor = 0;

  if (baseCalculo <= 2112) {
    valor = 0;
  } else if (baseCalculo <= 2826.65) {
    valor = baseCalculo * 0.075 - 158.40;
  } else if (baseCalculo <= 3751.05) {
    valor = baseCalculo * 0.15 - 370.40;
  } else if (baseCalculo <= 4664.68) {
    valor = baseCalculo * 0.225 - 651.73;
  } else {
    valor = baseCalculo * 0.275 - 884.96;
  }

  valor = Math.max(0, valor);
  const percentual = salario > 0 ? (valor / salario) * 100 : 0;
  return { percentual, valor };
}

function calcularPassivoTrabalhista(
  salario: number,
  dataAdmissao: string | null
): {
  tempoServicoAnos: number;
  tempoServicoMeses: number;
  feriasProporcionais: number;
  decimoTerceiroProporcional: number;
  saldoFgts: number;
  multaFgts40: number;
  avisoPrevio: number;
  total: number;
} {
  if (!dataAdmissao || !salario) {
    return {
      tempoServicoAnos: 0,
      tempoServicoMeses: 0,
      feriasProporcionais: 0,
      decimoTerceiroProporcional: 0,
      saldoFgts: 0,
      multaFgts40: 0,
      avisoPrevio: 0,
      total: 0,
    };
  }

  const admissao = parseISO(dataAdmissao);
  const hoje = new Date();
  const mesesTrabalhados = differenceInMonths(hoje, admissao);
  const anosTrabalhados = differenceInYears(hoje, admissao);

  const feriasProporcionais = (mesesTrabalhados % 12 / 12) * salario * 1.33;
  const decimoTerceiroProporcional = (mesesTrabalhados % 12 / 12) * salario;
  const saldoFgts = salario * 0.08 * mesesTrabalhados;
  const multaFgts40 = saldoFgts * 0.4;
  const diasAvisoPrevio = Math.min(30 + anosTrabalhados * 3, 90);
  const avisoPrevio = (salario / 30) * diasAvisoPrevio;

  return {
    tempoServicoAnos: anosTrabalhados,
    tempoServicoMeses: mesesTrabalhados,
    feriasProporcionais,
    decimoTerceiroProporcional,
    saldoFgts,
    multaFgts40,
    avisoPrevio,
    total: feriasProporcionais + decimoTerceiroProporcional + saldoFgts + multaFgts40 + avisoPrevio,
  };
}

function calcularCustoMensal(
  salario: number,
  valeTransporte: number = 0,
  valeRefeicao: number = 0,
  valeAlimentacao: number = 0,
  planoSaude: number = 0
): number {
  const inssPatronal = salario * 0.20;
  const fgts = salario * 0.08;
  const decimoTerceiro = salario / 12;
  const feriasProporcionais = (salario / 12) * 1.33;
  const beneficios = valeTransporte + valeRefeicao + valeAlimentacao + planoSaude;
  
  return salario + inssPatronal + fgts + decimoTerceiro + feriasProporcionais + beneficios;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
}

function formatCEP(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 5) return cleaned;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
}

interface FuncionarioFormData {
  nomeCompleto: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  genero: string;
  estadoCivil: string;
  nacionalidade: string;
  telefone: string;
  telefoneEmergencia: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  funcao: string;
  departamento: string;
  dataAdmissao: string;
  tipoContrato: string;
  cargaHorariaSemanal: number;
  horarioTrabalho: string;
  salarioBase: number;
  valeTransporte: number;
  valeRefeicao: number;
  valeAlimentacao: number;
  planoSaude: number;
  outrosBeneficios: string;
  status: string;
  observacoes: string;
}

const initialFormData: FuncionarioFormData = {
  nomeCompleto: "",
  cpf: "",
  rg: "",
  dataNascimento: "",
  genero: "",
  estadoCivil: "",
  nacionalidade: "Brasileiro(a)",
  telefone: "",
  telefoneEmergencia: "",
  email: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  funcao: "",
  departamento: "",
  dataAdmissao: "",
  tipoContrato: "CLT",
  cargaHorariaSemanal: 44,
  horarioTrabalho: "08:00 às 17:00",
  salarioBase: 0,
  valeTransporte: 0,
  valeRefeicao: 0,
  valeAlimentacao: 0,
  planoSaude: 0,
  outrosBeneficios: "",
  status: "ativo",
  observacoes: "",
};

export default function RecursosHumanos() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FuncionarioFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [funcaoFilter, setFuncaoFilter] = useState<string>("todos");

  const { data: funcionarios = [], isLoading } = useQuery<Funcionario[]>({
    queryKey: ["/api/funcionarios"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertFuncionario>) => {
      await supabaseReady;
      if (!supabase) throw new Error("Supabase não configurado");
      
      // Valid funcionarios fields based on schema
      const validFields = [
        'nomeCompleto', 'cpf', 'rg', 'dataNascimento', 'genero', 'estadoCivil',
        'nacionalidade', 'telefone', 'telefoneEmergencia', 'email', 'cep',
        'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
        'funcao', 'departamento', 'dataAdmissao', 'tipoContrato', 'cargaHorariaSemanal',
        'horarioTrabalho', 'salarioBase', 'valeTransporte', 'valeRefeicao',
        'valeAlimentacao', 'planoSaude', 'outrosBeneficios', 'status', 'observacoes',
        'fotoUrl', 'documentosRgUrl', 'documentosCpfUrl', 'documentosCnhUrl',
        'documentosCtpsUrl', 'documentosContratoUrl', 'documentosComprovanteResidenciaUrl',
        'documentosOutros', 'condominiumId'
      ];
      
      const snakeData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        // Only include valid fields
        if (!validFields.includes(key)) continue;
        
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Convert empty strings to null, keep other values as-is
        if (value === "" || value === undefined) {
          snakeData[snakeKey] = null;
        } else {
          snakeData[snakeKey] = value;
        }
      }
      
      const { count } = await supabase.from('funcionarios').select('*', { count: 'exact', head: true });
      const nextNumber = (count || 0) + 1;
      snakeData.matricula = `FUNC-${String(nextNumber).padStart(4, '0')}`;
      
      const { data: result, error } = await supabase
        .from('funcionarios')
        .insert([snakeData])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      setIsFormOpen(false);
      resetForm();
      toast({ title: "Funcionário cadastrado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cadastrar funcionário", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFuncionario> }) => {
      await supabaseReady;
      if (!supabase) throw new Error("Supabase não configurado");
      
      // Valid funcionarios fields based on schema
      const validFields = [
        'nomeCompleto', 'cpf', 'rg', 'dataNascimento', 'genero', 'estadoCivil',
        'nacionalidade', 'telefone', 'telefoneEmergencia', 'email', 'cep',
        'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
        'funcao', 'departamento', 'dataAdmissao', 'tipoContrato', 'cargaHorariaSemanal',
        'horarioTrabalho', 'salarioBase', 'valeTransporte', 'valeRefeicao',
        'valeAlimentacao', 'planoSaude', 'outrosBeneficios', 'status', 'observacoes',
        'fotoUrl', 'documentosRgUrl', 'documentosCpfUrl', 'documentosCnhUrl',
        'documentosCtpsUrl', 'documentosContratoUrl', 'documentosComprovanteResidenciaUrl',
        'documentosOutros', 'condominiumId'
      ];
      
      const snakeData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        // Only include valid fields
        if (!validFields.includes(key)) continue;
        
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Convert empty strings to null, keep other values as-is
        if (value === "" || value === undefined) {
          snakeData[snakeKey] = null;
        } else {
          snakeData[snakeKey] = value;
        }
      }
      snakeData.updated_at = new Date().toISOString();
      
      const { data: result, error } = await supabase
        .from('funcionarios')
        .update(snakeData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      setIsFormOpen(false);
      resetForm();
      toast({ title: "Funcionário atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar funcionário", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseReady;
      if (!supabase) throw new Error("Supabase não configurado");
      
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funcionarios"] });
      setDeleteId(null);
      toast({ title: "Funcionário excluído com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir funcionário", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setSelectedFuncionario(null);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (func: Funcionario) => {
    setSelectedFuncionario(func);
    setFormData({
      nomeCompleto: func.nomeCompleto || "",
      cpf: func.cpf || "",
      rg: func.rg || "",
      dataNascimento: func.dataNascimento || "",
      genero: func.genero || "",
      estadoCivil: func.estadoCivil || "",
      nacionalidade: func.nacionalidade || "Brasileiro(a)",
      telefone: func.telefone || "",
      telefoneEmergencia: func.telefoneEmergencia || "",
      email: func.email || "",
      cep: func.cep || "",
      endereco: func.endereco || "",
      numero: func.numero || "",
      complemento: func.complemento || "",
      bairro: func.bairro || "",
      cidade: func.cidade || "",
      estado: func.estado || "",
      funcao: func.funcao || "",
      departamento: func.departamento || "",
      dataAdmissao: func.dataAdmissao || "",
      tipoContrato: func.tipoContrato || "CLT",
      cargaHorariaSemanal: func.cargaHorariaSemanal || 44,
      horarioTrabalho: func.horarioTrabalho || "08:00 às 17:00",
      salarioBase: func.salarioBase || 0,
      valeTransporte: func.valeTransporte || 0,
      valeRefeicao: func.valeRefeicao || 0,
      valeAlimentacao: func.valeAlimentacao || 0,
      planoSaude: func.planoSaude || 0,
      outrosBeneficios: func.outrosBeneficios || "",
      status: func.status || "ativo",
      observacoes: func.observacoes || "",
    });
    setCurrentStep(1);
    setIsFormOpen(true);
  };

  const openViewDetails = (func: Funcionario) => {
    setSelectedFuncionario(func);
    setIsViewOpen(true);
  };

  const handleSubmit = () => {
    const condominiumId = localStorage.getItem("selectedCondominiumId");
    if (!condominiumId) {
      toast({ title: "Erro", description: "Nenhum condomínio selecionado", variant: "destructive" });
      return;
    }
    
    const dataToSubmit = {
      ...formData,
      condominiumId,
      salarioBase: Number(formData.salarioBase),
      valeTransporte: Number(formData.valeTransporte) || null,
      valeRefeicao: Number(formData.valeRefeicao) || null,
      valeAlimentacao: Number(formData.valeAlimentacao) || null,
      planoSaude: Number(formData.planoSaude) || null,
      cargaHorariaSemanal: Number(formData.cargaHorariaSemanal) || 44,
    };

    if (selectedFuncionario) {
      updateMutation.mutate({ id: selectedFuncionario.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const fetchCEP = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            endereco: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
          }));
        }
      } catch (e) {
        console.error("Erro ao buscar CEP:", e);
      }
    }
  };

  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter((func) => {
      const matchesSearch =
        func.nomeCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.cpf?.includes(searchTerm) ||
        func.matricula?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || func.status === statusFilter;
      const matchesFuncao = funcaoFilter === "todos" || func.funcao === funcaoFilter;
      return matchesSearch && matchesStatus && matchesFuncao;
    });
  }, [funcionarios, searchTerm, statusFilter, funcaoFilter]);

  const totals = useMemo(() => {
    const ativos = funcionarios.filter((f) => f.status === "ativo");
    const folhaMensal = ativos.reduce((sum, f) => sum + (f.salarioBase || 0), 0);
    const passivoTotal = ativos.reduce((sum, f) => {
      const passivo = calcularPassivoTrabalhista(f.salarioBase || 0, f.dataAdmissao);
      return sum + passivo.total;
    }, 0);
    return { total: funcionarios.length, ativos: ativos.length, folhaMensal, passivoTotal };
  }, [funcionarios]);

  const inss = calcularINSS(formData.salarioBase);
  const fgts = calcularFGTS(formData.salarioBase);
  const irrf = calcularIRRF(formData.salarioBase, inss.valor);
  const custoMensal = calcularCustoMensal(
    formData.salarioBase,
    formData.valeTransporte,
    formData.valeRefeicao,
    formData.valeAlimentacao,
    formData.planoSaude
  );
  const passivo = calcularPassivoTrabalhista(formData.salarioBase, formData.dataAdmissao);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nomeCompleto}
                  onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                  placeholder="Nome completo do funcionário"
                  data-testid="input-nome-completo"
                />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  data-testid="input-cpf"
                />
              </div>
              <div>
                <Label>RG</Label>
                <Input
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  placeholder="RG"
                  data-testid="input-rg"
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.dataNascimento}
                  onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  data-testid="input-data-nascimento"
                />
              </div>
              <div>
                <Label>Gênero</Label>
                <Select
                  value={formData.genero}
                  onValueChange={(v) => setFormData({ ...formData, genero: v })}
                >
                  <SelectTrigger data-testid="select-genero">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {generoOptions.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado Civil</Label>
                <Select
                  value={formData.estadoCivil}
                  onValueChange={(v) => setFormData({ ...formData, estadoCivil: v })}
                >
                  <SelectTrigger data-testid="select-estado-civil">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadoCivilOptions.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  data-testid="input-telefone"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  data-testid="input-email"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.cep}
                    onChange={(e) => {
                      const value = formatCEP(e.target.value);
                      setFormData({ ...formData, cep: value });
                    }}
                    onBlur={(e) => fetchCEP(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    data-testid="input-cep"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Avenida, etc."
                  data-testid="input-endereco"
                />
              </div>
              <div>
                <Label>Número</Label>
                <Input
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Nº"
                  data-testid="input-numero"
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Apto, Bloco, etc."
                  data-testid="input-complemento"
                />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Bairro"
                  data-testid="input-bairro"
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                  data-testid="input-cidade"
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  placeholder="UF"
                  maxLength={2}
                  data-testid="input-estado"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Dados Profissionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Função *</Label>
                <Select
                  value={formData.funcao}
                  onValueChange={(v) => setFormData({ ...formData, funcao: v })}
                >
                  <SelectTrigger data-testid="select-funcao">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcaoOptions.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departamento</Label>
                <Select
                  value={formData.departamento}
                  onValueChange={(v) => setFormData({ ...formData, departamento: v })}
                >
                  <SelectTrigger data-testid="select-departamento">
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentoOptions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Admissão *</Label>
                <Input
                  type="date"
                  value={formData.dataAdmissao}
                  onChange={(e) => setFormData({ ...formData, dataAdmissao: e.target.value })}
                  data-testid="input-data-admissao"
                />
              </div>
              <div>
                <Label>Tipo de Contrato *</Label>
                <Select
                  value={formData.tipoContrato}
                  onValueChange={(v) => setFormData({ ...formData, tipoContrato: v })}
                >
                  <SelectTrigger data-testid="select-tipo-contrato">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoContratoOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carga Horária Semanal</Label>
                <Input
                  type="number"
                  value={formData.cargaHorariaSemanal}
                  onChange={(e) => setFormData({ ...formData, cargaHorariaSemanal: Number(e.target.value) })}
                  placeholder="44"
                  data-testid="input-carga-horaria"
                />
              </div>
              <div>
                <Label>Horário de Trabalho</Label>
                <Input
                  value={formData.horarioTrabalho}
                  onChange={(e) => setFormData({ ...formData, horarioTrabalho: e.target.value })}
                  placeholder="08:00 às 17:00"
                  data-testid="input-horario"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Remuneração e Encargos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Salário Base *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.salarioBase || ""}
                  onChange={(e) => setFormData({ ...formData, salarioBase: Number(e.target.value) })}
                  placeholder="0,00"
                  data-testid="input-salario"
                />
              </div>
              <div>
                <Label>Vale Transporte</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valeTransporte || ""}
                  onChange={(e) => setFormData({ ...formData, valeTransporte: Number(e.target.value) })}
                  placeholder="0,00"
                  data-testid="input-vale-transporte"
                />
              </div>
              <div>
                <Label>Vale Refeição</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valeRefeicao || ""}
                  onChange={(e) => setFormData({ ...formData, valeRefeicao: Number(e.target.value) })}
                  placeholder="0,00"
                  data-testid="input-vale-refeicao"
                />
              </div>
              <div>
                <Label>Vale Alimentação</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valeAlimentacao || ""}
                  onChange={(e) => setFormData({ ...formData, valeAlimentacao: Number(e.target.value) })}
                  placeholder="0,00"
                  data-testid="input-vale-alimentacao"
                />
              </div>
              <div>
                <Label>Plano de Saúde</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.planoSaude || ""}
                  onChange={(e) => setFormData({ ...formData, planoSaude: Number(e.target.value) })}
                  placeholder="0,00"
                  data-testid="input-plano-saude"
                />
              </div>
            </div>

            {formData.salarioBase > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Encargos Calculados
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">INSS:</span>
                      <p className="font-medium">{formatCurrency(inss.valor)} ({inss.percentual.toFixed(1)}%)</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">FGTS:</span>
                      <p className="font-medium">{formatCurrency(fgts.valor)} ({fgts.percentual}%)</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IRRF:</span>
                      <p className="font-medium">{formatCurrency(irrf.valor)} ({irrf.percentual.toFixed(1)}%)</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Custo Mensal:</span>
                      <p className="font-medium text-primary">{formatCurrency(custoMensal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Passivo Trabalhista
            </h3>

            {formData.salarioBase > 0 && formData.dataAdmissao ? (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">Projeção de Rescisão</p>
                    <p className="text-3xl font-bold text-amber-600">{formatCurrency(passivo.total)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tempo de Serviço:</span>
                      <p className="font-medium">{passivo.tempoServicoAnos} anos ({passivo.tempoServicoMeses} meses)</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Férias Proporcionais:</span>
                      <p className="font-medium">{formatCurrency(passivo.feriasProporcionais)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">13º Proporcional:</span>
                      <p className="font-medium">{formatCurrency(passivo.decimoTerceiroProporcional)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Aviso Prévio:</span>
                      <p className="font-medium">{formatCurrency(passivo.avisoPrevio)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Saldo FGTS:</span>
                      <p className="font-medium">{formatCurrency(passivo.saldoFgts)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Multa 40% FGTS:</span>
                      <p className="font-medium">{formatCurrency(passivo.multaFgts40)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Preencha o salário base e a data de admissão para calcular o passivo trabalhista.
              </p>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações e Finalização
            </h3>
            <div>
              <Label>Outros Benefícios</Label>
              <Input
                value={formData.outrosBeneficios}
                onChange={(e) => setFormData({ ...formData, outrosBeneficios: e.target.value })}
                placeholder="Descreva outros benefícios"
                data-testid="input-outros-beneficios"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações gerais sobre o funcionário"
                rows={4}
                data-testid="input-observacoes"
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Resumo do Cadastro</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> {formData.nomeCompleto}</div>
                  <div><span className="text-muted-foreground">CPF:</span> {formData.cpf}</div>
                  <div><span className="text-muted-foreground">Função:</span> {formData.funcao}</div>
                  <div><span className="text-muted-foreground">Salário:</span> {formatCurrency(formData.salarioBase)}</div>
                  <div><span className="text-muted-foreground">Custo Mensal:</span> {formatCurrency(custoMensal)}</div>
                  <div><span className="text-muted-foreground">Passivo:</span> {formatCurrency(passivo.total)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const totalSteps = 6;
  const stepTitles = ["Dados Pessoais", "Endereço", "Profissional", "Remuneração", "Passivo", "Finalizar"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-indigo-500" />
            Recursos Humanos
          </h1>
          <p className="text-muted-foreground">Gestão completa de funcionários e folha de pagamento</p>
        </div>
        <Button onClick={openCreateForm} data-testid="button-novo-funcionario">
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totals.total}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{totals.ativos}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Folha Mensal</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.folhaMensal)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passivo Total</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totals.passivoTotal)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Funcionários</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-buscar"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={funcaoFilter} onValueChange={setFuncaoFilter}>
                <SelectTrigger className="w-32" data-testid="filter-funcao">
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {funcaoOptions.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFuncionarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {funcionarios.length === 0
                ? "Nenhum funcionário cadastrado. Clique em 'Novo Funcionário' para começar."
                : "Nenhum funcionário encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFuncionarios.map((func) => {
                const funcPassivo = calcularPassivoTrabalhista(func.salarioBase || 0, func.dataAdmissao);
                const funcCusto = calcularCustoMensal(
                  func.salarioBase || 0,
                  func.valeTransporte || 0,
                  func.valeRefeicao || 0,
                  func.valeAlimentacao || 0,
                  func.planoSaude || 0
                );
                const status = statusOptions.find((s) => s.value === func.status);

                return (
                  <Card key={func.id} className="hover-elevate" data-testid={`card-funcionario-${func.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={func.fotoUrl || undefined} />
                          <AvatarFallback>
                            {func.nomeCompleto?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{func.nomeCompleto}</h3>
                            <Badge
                              className={`${status?.color} text-white text-xs`}
                            >
                              {status?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{func.matricula}</p>
                          <p className="text-sm">{func.funcao} | {func.tipoContrato}</p>
                          {func.dataAdmissao && (
                            <p className="text-xs text-muted-foreground">
                              Admissão: {format(parseISO(func.dataAdmissao), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 space-y-1 text-sm border-t pt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Salário:</span>
                          <span className="font-medium">{formatCurrency(func.salarioBase)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Custo Total:</span>
                          <span className="font-medium text-blue-600">{formatCurrency(funcCusto)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Passivo:</span>
                          <span className="font-medium text-amber-600">{formatCurrency(funcPassivo.total)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openViewDetails(func)}
                          data-testid={`button-ver-detalhes-${func.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditForm(func)}
                          data-testid={`button-editar-${func.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(func.id)}
                          data-testid={`button-excluir-${func.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFuncionario ? "Editar Funcionário" : "Novo Funcionário"}
            </DialogTitle>
            <DialogDescription>
              Passo {currentStep} de {totalSteps}: {stepTitles[currentStep - 1]}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded ${
                  i + 1 <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {renderStepContent()}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => currentStep === 1 ? setIsFormOpen(false) : setCurrentStep((s) => s - 1)}
              data-testid="button-voltar"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {currentStep === 1 ? "Cancelar" : "Voltar"}
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={() => setCurrentStep((s) => s + 1)}
                data-testid="button-proximo"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-salvar"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {selectedFuncionario ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedFuncionario?.fotoUrl || undefined} />
                <AvatarFallback>
                  {selectedFuncionario?.nomeCompleto?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedFuncionario?.nomeCompleto}</span>
                <p className="text-sm font-normal text-muted-foreground">{selectedFuncionario?.matricula}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedFuncionario && (
            <Tabs defaultValue="dados">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="profissional">Profissional</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="passivo">Passivo</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">CPF:</span>
                    <p className="font-medium">{selectedFuncionario.cpf}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">RG:</span>
                    <p className="font-medium">{selectedFuncionario.rg || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nascimento:</span>
                    <p className="font-medium">
                      {selectedFuncionario.dataNascimento
                        ? format(parseISO(selectedFuncionario.dataNascimento), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{selectedFuncionario.telefone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedFuncionario.email || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Endereço:</span>
                    <p className="font-medium">
                      {selectedFuncionario.endereco
                        ? `${selectedFuncionario.endereco}, ${selectedFuncionario.numero || "S/N"} ${selectedFuncionario.complemento || ""} - ${selectedFuncionario.bairro || ""}, ${selectedFuncionario.cidade || ""}/${selectedFuncionario.estado || ""}`
                        : "-"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profissional" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Função:</span>
                    <p className="font-medium">{selectedFuncionario.funcao}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Departamento:</span>
                    <p className="font-medium">{selectedFuncionario.departamento || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Admissão:</span>
                    <p className="font-medium">
                      {selectedFuncionario.dataAdmissao
                        ? format(parseISO(selectedFuncionario.dataAdmissao), "dd/MM/yyyy", { locale: ptBR })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo Contrato:</span>
                    <p className="font-medium">{selectedFuncionario.tipoContrato}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Carga Horária:</span>
                    <p className="font-medium">{selectedFuncionario.cargaHorariaSemanal || 44}h/semana</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Horário:</span>
                    <p className="font-medium">{selectedFuncionario.horarioTrabalho || "-"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financeiro" className="space-y-4">
                {(() => {
                  const viewInss = calcularINSS(selectedFuncionario.salarioBase || 0);
                  const viewFgts = calcularFGTS(selectedFuncionario.salarioBase || 0);
                  const viewIrrf = calcularIRRF(selectedFuncionario.salarioBase || 0, viewInss.valor);
                  const viewCusto = calcularCustoMensal(
                    selectedFuncionario.salarioBase || 0,
                    selectedFuncionario.valeTransporte || 0,
                    selectedFuncionario.valeRefeicao || 0,
                    selectedFuncionario.valeAlimentacao || 0,
                    selectedFuncionario.planoSaude || 0
                  );
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Salário Base:</span>
                          <p className="font-medium text-lg">{formatCurrency(selectedFuncionario.salarioBase)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Custo Total:</span>
                          <p className="font-medium text-lg text-blue-600">{formatCurrency(viewCusto)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Vale Transporte:</span>
                          <p className="font-medium">{formatCurrency(selectedFuncionario.valeTransporte)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vale Refeição:</span>
                          <p className="font-medium">{formatCurrency(selectedFuncionario.valeRefeicao)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vale Alimentação:</span>
                          <p className="font-medium">{formatCurrency(selectedFuncionario.valeAlimentacao)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plano Saúde:</span>
                          <p className="font-medium">{formatCurrency(selectedFuncionario.planoSaude)}</p>
                        </div>
                      </div>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <h4 className="font-medium mb-2">Encargos</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">INSS:</span>
                              <p className="font-medium">{formatCurrency(viewInss.valor)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">FGTS:</span>
                              <p className="font-medium">{formatCurrency(viewFgts.valor)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">IRRF:</span>
                              <p className="font-medium">{formatCurrency(viewIrrf.valor)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="passivo" className="space-y-4">
                {(() => {
                  const viewPassivo = calcularPassivoTrabalhista(
                    selectedFuncionario.salarioBase || 0,
                    selectedFuncionario.dataAdmissao
                  );
                  return (
                    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <CardContent className="pt-4">
                        <div className="text-center mb-4">
                          <p className="text-sm text-muted-foreground">Custo Total de Rescisão</p>
                          <p className="text-3xl font-bold text-amber-600">{formatCurrency(viewPassivo.total)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Tempo de Serviço:</span>
                            <p className="font-medium">{viewPassivo.tempoServicoAnos} anos ({viewPassivo.tempoServicoMeses} meses)</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Férias Proporcionais:</span>
                            <p className="font-medium">{formatCurrency(viewPassivo.feriasProporcionais)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">13º Proporcional:</span>
                            <p className="font-medium">{formatCurrency(viewPassivo.decimoTerceiroProporcional)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Aviso Prévio:</span>
                            <p className="font-medium">{formatCurrency(viewPassivo.avisoPrevio)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Saldo FGTS:</span>
                            <p className="font-medium">{formatCurrency(viewPassivo.saldoFgts)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Multa 40% FGTS:</span>
                            <p className="font-medium">{formatCurrency(viewPassivo.multaFgts40)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsViewOpen(false);
              if (selectedFuncionario) openEditForm(selectedFuncionario);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
