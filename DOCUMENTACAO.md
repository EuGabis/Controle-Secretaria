# Documentação do Sistema - Lito Academy 📂✨

Bem-vindo à documentação oficial do **Sistema de Gestão de Tarefas (Lito Academy)**. Este sistema foi desenvolvido para ser uma plataforma moderna com **Kanban Dinâmico**, **Gamificação** e **Controle Hierárquico Multi-Tenant** focado na eficiência e controle de produtividade de equipes de trabalho.

---

## 🚀 1. Arquitetura Técnica

- **Frontend & Backend (Meta-Framework):** Next.js 15 (App Router Server Components & Actions)
- **Linguagem Principal:** TypeScript e React
- **Estilização UI/UX:** CSS Modules Baseados em Variáveis Nativas (Glassmorphism Interativo), Layout Adaptativo.
- **Banco de Dados (BaaS):** Supabase (PostgreSQL) com Real-time, Auth e RLS (Row Level Security).
- **Gerenciamento de Drag and Drop:** `@dnd-kit/core`
- **Ícones Gerais:** `lucide-react`
- **Automação de Tarefas:** Integração Vercel Cron Jobs (`vercel.json`)
- **Hospedagem / Deploy:** Vercel

---

## 👥 2. Modelo de Hierarquia Multi-Tenant

O sistema opera num modelo hierárquico cascata (Top-Down) de três níveis principais:

1. 👑 **Master Admin (`master`)**
   - Nível hierárquico superior (Diretoria).
   - Tem acesso irrestrito a todas as métricas agregadas da empresa e **todos** os usuários subordinados a si (mesmo sub-subordinados).
   - Sua configuração de identificação é estar listado como `master_id` nos usuários de baixo.
2. 🛡️ **Administrador (`admin`)**
   - Responsável direto sobre a delegação de tarefas de seu pequeno nicho.
   - Sua configuração é estar atrelado ao usuário via `admin_id`.
   - Pode visualizar o Dashboard unindo informações de seus Colaboradores.
3. 👤 **Colaborador (`usuario`)**
   - Focado 100% em execução de trabalho e auto-organização.
   - Vê apenas as tarefas em que for designado como `usuario_id`, bem como os próprios feedbacks.

---

## 🗄️ 3. Modelo de Dados (Supabase PostgreSQL)

A infraestrutura de dados suporta apagamentos em Cascata para manter integridade, e utiliza referências com `auth.users` global do Supabase:

* **Tabela `usuarios`:** Perfil público associado à Autenticação. Carrega as flags de permissão (`perfil`) e a árvore de hierarquia (`master_id`, `admin_id`).
* **Tabela `tarefas`:** Registra o trabalho a ser feito. Armazena dados essenciais, status atual, progresso em % e flags de gamificação de pontuação, além do **tipo** da tarefa (Normal, Diária, Semanal, Mensal ou Rotativa).
* **Tabela `follow_up_log`:** O coração da observabilidade. Audita toda mudança de raia (Status A -> Status B) do Dashboard Kanban, preservando quem fez qual movimentação e quando.
* **Tabela `feedbacks`:** Avaliações de Performance individuais do time, podendo ser Positivas ou Construtivas. Permite avaliações entre Admin -> Colaborador.
* **Tabela `notificacoes`:** Central de alertas de tarefas criadas ou realocadas para avisar o usuário proativamente das exigências de trabalho.

---

## 🧩 4. Funcionalidades Core

### 🎯 4.1 Kanban Inteligente e Drag-N-Drop
- Um quadro interativo dividido nas 3 fases essenciais de execução (`a_fazer`, `fazendo`, `feito`).
- Utiliza sensores de movimento e bibliotecas físicas para dar um UX super elegante quando cartões são arrastados.

### 🔄 4.2 Tarefas Fixas e Recorrentes
- Tarefas não precisam sempre possuir datas de término engessadas para serem punitivas.
- O sistema possui **Cron Jobs Diários** (ativados às `05:00 AM` BRT).
- Uma tarefa `Diária`, quando concluída (`feito`), não morre; o cron-job a empurra automaticamente de volta pro `a_fazer` do dia e zera o progresso no raiar do dia.

### 🏆 4.3 Engajamento e Recompensas
- Feedback de som agradável (arcade-style) e efeitos de confete (`canvas-confetti`) ocorrem dinamicamente quando um colaborador joga a tarefa na coluna de conclusão, incentivando o ciclo biológico de recompensa.
- **Conclusão:** 100% de progress bar visualmente satisfatório.

### 🗣️ 4.4 Feedbacks Individuais Direcionados
- Módulo onde gestores injetam direcionamentos na tela do funcionário baseando-se no trabalho.
- Utilização de `card badges` (Positivo Verde / Construtivo Amarelo).

---

## 🛡️ 5. Regras de Segurança (RLS - Supabase)
As políticas RLS (Row Level Security) garantem a confidencialidade das instâncias dos administradores. Em regra, todo fetch do `supabase-js` passa pelos interceptadores do banco que impendem vazamento de dados laterais (Usuário 1 jamais vê Tarefas e Feedbacks do Usuário 2 que é de outra empresa, caso estejam rodando no mesmo banco).

---

## 🧰 6. Estrutura de Diretórios 

```text
secretaria-app/
├── app/
│   ├── api/          # Middlewares, Scripts Serverless, Webhooks do Supabase e rotas CRON.
│   ├── dashboard/    # Todas as visões internas (Pages Dinâmicas) do usuário master/admin/comum.
│   ├── login/        # Fluxo de Autenticação Segura de Entrada.
│   └── globals.css   # O Cérebro do Design Visual! (CSS Variables e Modificadores e Animações Global).
├── components/       # (UI Kit) Componentes visuais burros (Botões) & Componentes lógicos (Board Clients).
├── lib/
│   ├── supabase/     # Criação da ponte conectora com Supabase (Cookies Server/Browser).
│   └── types.ts      # Tipagem Rígida TypeScript do Banco de Dados Inteiro.
└── public/
    └── audios/       # Arquétipos de Recompensa de UIUX (Sons de Sucesso).
```
