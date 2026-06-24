locals {
  vm_public_ip = try(oci_core_instance.licitacoes_app.public_ip, null)
  vm_ocid      = try(oci_core_instance.licitacoes_app.id, null)
}

output "instance_public_ip" {
  description = "IP publico da VM; vazio (null) enquanto a instancia nao existir."
  value       = local.vm_public_ip
}

output "instance_ocid" {
  description = "OCID da instancia (util para CLI/API)."
  value       = local.vm_ocid
}

output "vcn_ocid" {
  description = "OCID da VCN criada."
  value       = oci_core_vcn.licitacoes.id
}

output "ssh_command" {
  description = "Comando SSH real apos a VM subir; mensagem explicativa enquanto aguarda capacity."
  value = local.vm_public_ip != null ? "ssh -i ~/.ssh/oci_licitacoes ubuntu@${local.vm_public_ip}" : "(VM ainda nao criada — aguarde ./retry-apply.sh ou rode ./status.sh)"
}

output "availability_domain_used" {
  description = "AD onde a VM sera/foi criada."
  value       = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain_index].name
}

output "shape_summary" {
  description = "Shape e recursos alocados."
  value       = "VM.Standard.A1.Flex — ${var.instance_ocpus} OCPU / ${var.instance_memory_gb} GB RAM / boot ${var.boot_volume_size_gb} GB"
}
