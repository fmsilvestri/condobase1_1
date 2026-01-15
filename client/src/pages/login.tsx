import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import logoImage from "@assets/image_1767976092597.png";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

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
      // Force full page reload to reinitialize auth context
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img 
            src={logoImage} 
            alt="CONDOBASE1" 
            className="h-20 w-auto object-contain"
            data-testid="img-logo"
          />
          <p className="text-muted-foreground text-center">
            Tudo do condomínio, conectado.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com seu e-mail e senha ou use sua conta Google
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full gap-2" 
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
                <span className="bg-card px-2 text-muted-foreground">ou</span>
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
                          placeholder="••••••" 
                          {...field} 
                          data-testid="input-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login-submit">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </Form>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Para solicitar acesso, entre em contato com o síndico do seu condomínio.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Ao continuar, você concorda com os Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}
