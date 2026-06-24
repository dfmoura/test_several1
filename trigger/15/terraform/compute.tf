resource "oci_core_instance" "licitacoes_app" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[var.availability_domain_index].name
  compartment_id      = var.compartment_ocid
  display_name        = var.instance_display_name
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_size_gb
    boot_volume_vpus_per_gb = 10
  }

  create_vnic_details {
    assign_public_ip = true
    subnet_id        = oci_core_subnet.public.id
    display_name     = "vnic-licitacoes-app"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }

  agent_config {
    is_management_disabled = false
    is_monitoring_disabled = false
  }

  lifecycle {
    ignore_changes = [
      source_details[0].source_id,
    ]
  }
}
