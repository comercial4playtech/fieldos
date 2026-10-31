# FieldOS — ERP de Ordens de Serviço de Campo (multiempresa)
1. Crie um projeto no Supabase e rode `supabase/migrations/0001` e `0002` no SQL Editor.
2. Copie `.env.example` para `.env` com a URL e a anon key do projeto.
3. `npm install && npm run dev`
4. Nova empresa: crie o usuário em Authentication e rode `select criar_empresa('Nome','slug','<uuid-do-usuario>','Nome do usuário');`
5. Deploy: importe o repositório no Vercel e defina as mesmas duas variáveis de ambiente.
