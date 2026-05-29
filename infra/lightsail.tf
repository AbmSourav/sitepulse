resource "aws_lightsail_key_pair" "deploy" {
  name       = var.key_pair_name
  public_key = var.ssh_public_key
}

resource "aws_lightsail_instance" "app" {
  name              = var.instance_name
  availability_zone = var.availability_zone
  blueprint_id      = var.blueprint_id
  bundle_id         = var.bundle_id
  key_pair_name     = aws_lightsail_key_pair.deploy.name
  user_data         = templatefile("${path.module}/scripts/bootstrap.sh", {
    SITEPULSE_DB_PASSWORD = var.db_password
  })

  tags = {
    Project     = "sitepulse"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "aws_lightsail_static_ip" "app" {
  name = var.static_ip_name
}

resource "aws_lightsail_static_ip_attachment" "app" {
  static_ip_name = aws_lightsail_static_ip.app.name
  instance_name  = aws_lightsail_instance.app.name
}
