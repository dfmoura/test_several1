resource "oci_core_vcn" "licitacoes" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = var.vcn_display_name
  dns_label      = "vcnlicit"
}

resource "oci_core_internet_gateway" "licitacoes" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.licitacoes.id
  display_name   = "igw-vcn-licitacoes"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.licitacoes.id
  display_name   = "rt-public-vcn-licitacoes"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.licitacoes.id
  }
}

resource "oci_core_security_list" "licitacoes" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.licitacoes.id
  display_name   = "sl-vcn-licitacoes"

  ingress_security_rules {
    description = "SSH apenas do IP do administrador"
    protocol    = "6"
    source      = var.ssh_allowed_cidr

    tcp_options {
      min = 22
      max = 22
    }
  }

  egress_security_rules {
    description = "Saida para internet (Docker, apt, Cloudflare Tunnel)"
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.licitacoes.id
  cidr_block                 = var.public_subnet_cidr
  display_name               = "subnet-public-vcn-licitacoes"
  dns_label                  = "public"
  prohibit_public_ip_on_vnic = false
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.licitacoes.id]
}

resource "oci_core_subnet" "private" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.licitacoes.id
  cidr_block                 = var.private_subnet_cidr
  display_name               = "subnet-private-vcn-licitacoes"
  dns_label                  = "private"
  prohibit_public_ip_on_vnic = true
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.licitacoes.id]
}
