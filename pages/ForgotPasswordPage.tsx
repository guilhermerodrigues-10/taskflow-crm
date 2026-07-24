import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Mail } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setEmailSent(true);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-8 bg-black border-b-4 border-primary-500">
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="TaskFlow Logo"
              className="h-32 w-auto object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              {emailSent ? 'Email Enviado!' : 'Esqueceu a Senha?'}
            </h1>
            <p className="text-slate-400">
              {emailSent
                ? 'Verifique sua caixa de entrada'
                : 'Enviaremos um link de recuperação'}
            </p>
          </div>
        </div>

        <div className="p-8">
          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  label="Endereço de Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Digite o email associado à sua conta. Enviaremos instruções para redefinir sua senha.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                <Mail size={16} className="mr-2" />
                Enviar Link de Recuperação
              </Button>

              <Link
                to="/login"
                className="flex items-center justify-center text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 transition-colors"
              >
                <ArrowLeft size={16} className="mr-2" />
                Voltar para o Login
              </Link>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Mail size={32} className="text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div>
                <p className="text-slate-600 dark:text-slate-300 mb-2">
                  Um link de recuperação seria enviado para:
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {email}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Nota:</strong> Este é um app de demonstração. Em produção, um email real seria enviado com instruções para redefinir sua senha.
                </p>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Para acessar o sistema demo, use as credenciais de teste na tela de login.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full"
                >
                  Tentar Novamente
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center text-sm text-slate-600 dark:text-slate-400 hover:text-primary-500 transition-colors"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar para o Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
