variable "tenancy_ocid" {
  description = "OCID da tenancy (conta raiz). Console → Profile → Tenancy."
  type        = string
}

variable "compartment_ocid" {
  description = "OCID do compartment onde criar recursos. Use o root (mesmo da tenancy) se não tiver sub-compartment."
  type        = string
}

variable "user_ocid" {
  description = "OCID do usuário IAM com permissão para criar recursos."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint da chave API (arquivo ~/.oci/config)."
  type        = string
}

variable "private_key_path" {
  description = "Caminho absoluto da chave privada API (ex: /home/SEU/.oci/oci_api_key.pem)."
  type        = string
}

variable "private_key_password" {
  description = "Passphrase da chave API, se houver. Deixe vazio (\"\") se a chave nao tiver senha."
  type        = string
  sensitive   = true
  default     = ""
}

variable "region" {
  description = "Região OCI."
  type        = string
  default     = "sa-saopaulo-1"
}

variable "vcn_cidr" {
  description = "CIDR da VCN."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR da subnet pública."
  type        = string
  default     = "10.0.0.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR da subnet privada (criada mas não usada pela VM)."
  type        = string
  default     = "10.0.1.0/24"
}

variable "ssh_public_key" {
  description = "Conteúdo completo do arquivo .pub (ssh-ed25519 ...)."
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "IP público do seu PC com /32 (ex: 191.54.7.183/32). Apenas SSH."
  type        = string
}

variable "instance_ocpus" {
  description = "OCPUs da VM A1.Flex. Use 1 se der out of capacity."
  type        = number
  default     = 2
}

variable "instance_memory_gb" {
  description = "RAM em GB. Use 6 se der out of capacity."
  type        = number
  default     = 8
}

variable "boot_volume_size_gb" {
  description = "Tamanho do boot volume em GB (Always Free: até 200 GB total na conta)."
  type        = number
  default     = 50
}

variable "instance_display_name" {
  description = "Nome da instância no console OCI."
  type        = string
  default     = "licitacoes-app"
}

variable "vcn_display_name" {
  description = "Nome da VCN."
  type        = string
  default     = "vcn-licitacoes"
}

variable "availability_domain_index" {
  description = "Índice do AD (0 = AD-1 em São Paulo)."
  type        = number
  default     = 0
}
