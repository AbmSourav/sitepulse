output "static_ip_address" {
  description = "The static IP address of the Lightsail instance"
  value       = aws_lightsail_static_ip.app.ip_address
}

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh ubuntu@${aws_lightsail_static_ip.app.ip_address}"
}
