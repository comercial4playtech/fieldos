insert into storage.buckets (id, name, public) values ('assinaturas','assinaturas',false), ('fotos','fotos',false) on conflict do nothing;
-- caminho obrigatório: <tenant_id>/<os_id>/arquivo
create policy "tenant le arquivos" on storage.objects for select to authenticated
  using (bucket_id in ('assinaturas','fotos') and (storage.foldername(name))[1] = auth_tenant()::text);
create policy "tenant grava arquivos" on storage.objects for insert to authenticated
  with check (bucket_id in ('assinaturas','fotos') and (storage.foldername(name))[1] = auth_tenant()::text);
