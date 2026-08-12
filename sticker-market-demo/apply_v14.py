from pathlib import Path

root = Path('sticker-market-demo')
index = root / 'index.html'
html = index.read_text(encoding='utf-8')
css = (root / 'v14.css').read_text(encoding='utf-8')
js = (root / 'v14.js').read_text(encoding='utf-8')

marker_css = '/* Sticker Market v1.4 — shop/community/messages/notifications/action analytics/admin workbench */'
marker_js = marker_css
if marker_css not in html:
    pos = html.rfind('</style>')
    if pos < 0:
        raise SystemExit('missing </style>')
    html = html[:pos] + '\n' + css + '\n' + html[pos:]
if html.count(marker_js) < 2:
    pos = html.rfind('</script>')
    if pos < 0:
        raise SystemExit('missing </script>')
    html = html[:pos] + '\n' + js + '\n' + html[pos:]

html = html.replace('Sticker Market — Public Demo v1.3.0', 'Sticker Market — Public Demo v1.4.0')
index.write_text(html, encoding='utf-8')

required = [
    'v14ShopAdmin', 'v14OpenProposal', 'v14NotificationCenter',
    'v14MessagesPage', 'v14StrategyBoard', 'v14Anomalies',
    'v14AdminWorkbench', 'Public Demo v1.4.0'
]
for token in required:
    if token not in html:
        raise SystemExit(f'missing marker: {token}')
print('Sticker Market v1.4 patch applied')
