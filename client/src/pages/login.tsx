import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, Shield, BarChart3, Users } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase, supabaseReady } from "@/lib/supabase";
import logoImage from "@assets/imobcore-logo-new.png";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const features = [
  { icon: Building2, title: "Gestão Completa", description: "Controle total do seu condomínio" },
  { icon: Shield, title: "Segurança", description: "Dados protegidos e criptografados" },
  { icon: BarChart3, title: "Relatórios", description: "Dashboards e análises em tempo real" },
  { icon: Users, title: "Comunicação", description: "Conecte síndicos e moradores" },
];

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({ 
          title: "Erro no login", 
          description: result.error || "Credenciais inválidas", 
          variant: "destructive" 
        });
        return;
      }

      localStorage.setItem("authToken", result.token);
      localStorage.setItem("dbUserId", result.user.id);
      
      toast({ title: "Login realizado com sucesso!" });
      window.location.href = "/";
    } catch (error: any) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabaseReady;
    if (!supabase) {
      toast({ title: "Supabase não configurado", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        toast({ title: "Erro no login com Google", description: error.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative z-10">
          <img 
            src={logoImage} 
            alt="ImobCore" 
            className="h-32 w-auto object-contain drop-shadow-2xl"
            data-testid="img-logo-hero"
          />
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Sistema Inteligente para<br />
            Gestão de Condomínios
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Transforme a administração do seu condomínio com tecnologia de ponta, automação e insights em tempo real.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm"
                data-testid={`feature-${index}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                  <p className="text-xs text-white/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/60 text-sm">
          ImobCore - Plataforma completa de gestão condominial
        </div>

        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-400/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-4 lg:hidden">
            <img 
              src={logoImage} 
              alt="ImobCore" 
              className="h-24 w-auto object-contain"
              data-testid="img-logo-mobile"
            />
            <p className="text-muted-foreground text-center text-sm">
              Sistema Inteligente para Gestão de Condomínios
            </p>
          </div>

          <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center pb-4">
              <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Button 
                variant="outline" 
                className="w-full gap-2 h-11 font-medium" 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                data-testid="button-google-login"
              >
                <SiGoogle className="h-4 w-4" />
                Continuar com Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou continue com e-mail</span>
                </div>
              </div>

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="seu@email.com" 
                            className="h-11"
                            {...field} 
                            data-testid="input-login-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Digite sua senha" 
                            className="h-11"
                            {...field} 
                            data-testid="input-login-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-11 font-medium bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700" 
                    disabled={isLoading} 
                    data-testid="button-login-submit"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar no Sistema
                  </Button>
                </form>
              </Form>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Para solicitar acesso, entre em contato com o síndico do seu condomínio.
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os{" "}
            <span className="text-primary hover:underline cursor-pointer">Termos de Uso</span>
            {" "}e{" "}
            <span className="text-primary hover:underline cursor-pointer">Política de Privacidade</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
