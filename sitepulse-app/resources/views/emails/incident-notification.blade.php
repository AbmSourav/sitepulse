<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;}
        .wrapper { background: #fafafa; overflow: hidden; padding: 25px; }
        .header { text-align: center; margin-bottom: 25px; }
        .container { padding: 25px; background: #ffffff; margin-top: 20px; max-width: 560px; margin: 0 auto; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
        .status { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #111827; }
        .detail { font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 12px; }
        .meta { background: #f9fafb; border-radius: 6px; padding: 16px; margin: 20px 0; }
        .meta-row { font-size: 13px; color: #6b7280; margin: 4px 0; }
        .meta-row strong { color: #374151; }
        .btn { display: inline-block; margin: 20px 0 0; padding: 12px 24px; background: #16a34a; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
        .footer { padding: 20px; font-size: 12px; color: #9ca3af; }
        .down { color: #dc2626; }
        .up { color: #16a34a; }
    </style>
</head>

<body>

    <div class="wrapper">
        <div class="header">
            <a href="{{ $sitepulseUrl }}" style="display: inline-block; text-decoration: none;">
                <img src="https://sitepulsee.com/images/SitePulse.png" alt="SitePulse" style="height: 35px; width: 40px; vertical-align: middle;">
                <span style="font-size: 18px; font-weight: 700; color: #232323; vertical-align: middle; margin-left: 6px;">SitePulse</span>
            </a>
        </div>

        <div class="container">
            @if ($event === 'down')
                <p class="status down">🔴 {{ $domain }} is DOWN</p>
                <p class="detail">Your website <strong>{{ $domain }}</strong> is currently unreachable.</p>

                <div class="meta">
                    <div class="meta-row"><strong>Detected at:</strong> {{ $startedAt }}</div>
                    @if ($reason)
                    <div class="meta-row"><strong>Reason:</strong> {{ $reasonLabel }}</div>
                    @endif
                    @if ($httpStatus)
                    <div class="meta-row"><strong>HTTP Status:</strong> {{ $httpStatus }}</div>
                    @endif
                </div>

                <p class="detail">We'll notify you as soon as the site recovers.</p>
            @else
                <p class="status up">✅ {{ $domain }} is back Online</p>
                <p class="detail">Your website <strong>{{ $domain }}</strong> has recovered and is now responding normally.</p>

                <div class="meta">
                    <div class="meta-row"><strong>Recovered at:</strong> {{ $resolvedAt }}</div>
                    <div class="meta-row"><strong>Downtime duration:</strong> {{ $duration }}</div>
                </div>
            @endif

            <a href="{{ $siteUrl }}" class="btn">View Site</a>
        </div>

        <div class="footer">
            You're receiving this because your team has email notifications enabled on SitePulse.
        </div>
    </div>

</body>
</html>
