/**
 * Tela de Autenticação do Servidor (LoginPage)
 * Formulário institucional com validação, tratamento de erros da API,
 * feedback de loading e preenchimento rápido de perfis para teste operacional.
 */

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, KeyRound, Lock, Mail, Shield } from "lucide-react";
import { APP_CONFIG } from "../config/app.config";
import { useAuth } from "../contexts/AuthContext";
import authService from "../services/authService";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Destino pós-login (respeitando redirecionamento de ProtectedRoute)
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Por favor, informe seu e-mail institucional.");
      return;
    }
    if (!senha) {
      setErrorMessage("Por favor, digite sua senha de acesso.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: cleanEmail, senha });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(authService.getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreFill = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setSenha(userPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased">
      {/* Topo Institucional */}
      <div className="w-full max-w-md mx-auto text-center pt-6 sm:pt-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-lg mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {APP_CONFIG.nome}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {APP_CONFIG.secretaria} · {APP_CONFIG.municipio}/{APP_CONFIG.uf}
        </p>
      </div>

      {/* Cartão de Login */}
      <div className="w-full max-w-md mx-auto my-8 bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">
            Acesso do Servidor
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Entre com suas credenciais funcionais para acessar os serviços de fiscalização.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              E-mail Institucional
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="servidor@braunas.mg.gov.br"
                required
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={isSubmitting}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar no Sistema</span>
            )}
          </button>
        </form>

        {/* Atalhos para Contas Seed de Braúnas/MG */}
        <div className="mt-8 pt-5 border-t border-slate-700/60">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2.5">
            <KeyRound className="w-3.5 h-3.5 text-teal-400" />
            <span>Acesso Rápido (Contas de Teste - Braúnas):</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() =>
                handlePreFill("admin@braunas.mg.gov.br", "AdminMaster@2026")
              }
              className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/60 rounded-md transition-colors"
            >
              <div className="font-semibold text-purple-300">Admin Master</div>
              <div className="text-slate-400 text-[10px] truncate">
                admin@braunas.mg.gov.br
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handlePreFill(
                  "coordenador.visa@braunas.mg.gov.br",
                  "CoordVisa@2026"
                )
              }
              className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/60 rounded-md transition-colors"
            >
              <div className="font-semibold text-blue-300">Coordenador</div>
              <div className="text-slate-400 text-[10px] truncate">
                coordenador.visa@...
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handlePreFill("fiscal1.visa@braunas.mg.gov.br", "Fiscal1@2026")
              }
              className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/60 rounded-md transition-colors"
            >
              <div className="font-semibold text-teal-300">Fiscal Sanitário</div>
              <div className="text-slate-400 text-[10px] truncate">
                fiscal1.visa@...
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handlePreFill(
                  "digitador.visa@braunas.mg.gov.br",
                  "Digitador@2026"
                )
              }
              className="p-2 text-left bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/60 rounded-md transition-colors"
            >
              <div className="font-semibold text-slate-300">Digitador</div>
              <div className="text-slate-400 text-[10px] truncate">
                digitador.visa@...
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé Oficial da Tela de Login */}
      <div className="w-full max-w-md mx-auto text-center pb-4 text-xs text-slate-500">
        <p>
          {APP_CONFIG.orgao} · Versão {APP_CONFIG.versao}
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Acesso restrito a servidores autorizados da Vigilância Sanitária Municipal.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
