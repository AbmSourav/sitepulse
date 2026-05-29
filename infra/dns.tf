# proxied = true — Cloudflare terminates TLS, handles WAF/DDoS/CDN
# Caddy serves plain HTTP on port 80; no TLS config needed on the server
# ttl = 1 means "Auto" in Cloudflare (required when proxied = true)

resource "cloudflare_record" "root" {
  zone_id    = var.cloudflare_zone_id
  name       = "@"
  content    = aws_lightsail_static_ip.app.ip_address
  type       = "A"
  ttl        = 1
  proxied    = true
  depends_on = [aws_lightsail_static_ip_attachment.app]
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = var.domain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}
