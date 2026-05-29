variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_access_key_id" {
  description = "AWS access key ID"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS secret access key"
  type        = string
  sensitive   = true
}

variable "instance_name" {
  description = "Lightsail instance name"
  type        = string
  default     = "sitepulse-prod"
}

variable "bundle_id" {
  description = "Lightsail bundle ID (instance size)"
  type        = string
  default     = "small_3_0"
}

variable "blueprint_id" {
  description = "Lightsail blueprint ID (OS image)"
  type        = string
  default     = "ubuntu_24_04"
}

variable "availability_zone" {
  description = "AWS availability zone"
  type        = string
  default     = "us-east-1a"
}

variable "static_ip_name" {
  description = "Name for the Lightsail static IP"
  type        = string
  default     = "sitepulse-prod-ip"
}

variable "key_pair_name" {
  description = "Name for the Lightsail SSH key pair"
  type        = string
  default     = "sitepulse-deploy"
}

variable "ssh_public_key" {
  description = "SSH public key for the deploy key pair"
  type        = string
}

variable "db_password" {
  description = "MySQL database password for the sitepulse user"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token (Zone:DNS:Edit for sitepulsee.com)"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for sitepulsee.com"
  type        = string
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "sitepulsee.com"
}
