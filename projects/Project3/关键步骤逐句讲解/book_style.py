"""Shared rendering conventions carried forward from the Project2 book."""
import html, unicodedata
from pygments import lex
from pygments.lexers import get_lexer_for_filename, TextLexer
from pygments.formatters import HtmlFormatter
esc=html.escape

def p(text):
    return '<p>'+esc(str(text))+'</p>'

def paras(texts):
    return ''.join(p(text) for text in texts)

def box(title, text, kind='note'):
    return f'<aside class="{kind}"><strong>{esc(title)}</strong>{p(text)}</aside>'

def ul(items, ordered=False):
    tag = 'ol' if ordered else 'ul'
    return '<'+tag+'>'+''.join('<li>'+esc(str(item))+'</li>' for item in items)+'</'+tag+'>'

def table(headers, rows):
    return '<table><thead><tr>'+''.join('<th>'+esc(s)+'</th>' for s in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+esc(str(s))+'</td>' for s in row)+'</tr>' for row in rows)+'</tbody></table>'

def source_code(text, filename, first, changed):
    try:
        lexer = get_lexer_for_filename(filename, stripnl=False, ensurenl=False)
    except Exception:
        lexer = TextLexer(stripnl=False, ensurenl=False)
    formatter = HtmlFormatter(style='friendly')
    rows = []
    number = first
    width = 0
    continuation = False
    fragments = []

    def emit():
        nonlocal fragments
        label = '&gt;' if continuation else str(number)
        marker = '+' if number in changed else ''
        cls = 'code-line changed' if number in changed else 'code-line'
        rows.append(f'<div class="{cls}"><span class="marker">{marker}</span><span class="lineno">{label}</span><code>'+''.join(fragments)+'</code></div>')
        fragments = []

    for token, value in lex(text.expandtabs(4), lexer):
        css = formatter._get_css_class(token)
        part = ''

        def flush():
            nonlocal part
            if part:
                fragments.append(f'<span class="{css}">{esc(part)}</span>')
                part = ''

        for ch in value:
            if ch == '\n':
                flush(); emit()
                number += 1; width = 0; continuation = False
                continue
            size = 2 if unicodedata.east_asian_width(ch) in 'WF' else 1
            if width + size > 87:
                flush(); emit(); width = 0; continuation = True
            part += ch; width += size
        flush()
    if fragments:
        emit()
    return '<div class="source">'+''.join(rows)+'</div>'

CSS = r'''
@page{size:A4;margin:17mm 14mm 18mm}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Noto Sans CJK SC',sans-serif;color:#23384c;font-size:10pt;line-height:1.72;margin:0}h1,h2,h3{line-height:1.4;break-after:avoid}h1{color:#143f64;font-size:23pt;margin:0 0 6mm}h2{color:#106b61;font-size:14.5pt;border-bottom:1px solid #b9d8d5;padding-bottom:2mm;margin:7mm 0 3mm}h3{font-size:11.5pt;color:#27577b;margin:5mm 0 2mm}p{margin:2mm 0 3mm;orphans:3;widows:3}a{color:#155e91;text-decoration:none;overflow-wrap:anywhere}li{margin:1.5mm 0;orphans:2;widows:2}ul,ol{padding-left:6mm}table{border-collapse:collapse;table-layout:fixed;width:100%;font-size:9pt;line-height:1.65;margin:3mm 0 5mm}th,td{border:1px solid #d2e1e9;padding:2mm 2.5mm;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e8f1f8;color:#194b6e}thead{display:table-header-group}tr{break-inside:avoid}aside{padding:3mm 4mm;background:#eef6fb;border-left:1.2mm solid #2787a4;border-radius:1.5mm;margin:4mm 0;break-inside:avoid}aside p:last-child{margin-bottom:0}aside.warn{background:#fff5e1;border-color:#d5972d}aside.ok{background:#edf8f1;border-color:#29866e}.chapter{break-before:page}.eyebrow{font-size:9.5pt;color:#148378;font-weight:700;letter-spacing:1px}.cover{min-height:244mm;padding-top:22mm;break-after:page}.cover h1{font-size:33pt;margin:12mm 0 8mm;line-height:1.45}.cover .subtitle{font-size:17pt;color:#4d6f86}.ribbon{background:linear-gradient(105deg,#173f66,#157b72);color:white;border-radius:3mm;padding:6mm;margin:14mm 0 10mm;font-size:13pt}.small{font-size:8.8pt;color:#58728a}.hash{font-family:monospace;font-size:7.6pt;word-break:break-all}.cover .bottom{border-top:1px solid #c9dce8;margin-top:16mm;padding-top:5mm}.role{background:#f1f6f9;border-left:1mm solid #85aec2;padding:3mm 4mm}.stage{display:inline-block;background:#126d63;color:white;padding:1mm 3mm;border-radius:1mm;font-size:10pt}.source-meta{font-size:8.5pt;color:#526f84;overflow-wrap:anywhere}.source{border:1px solid #cbdce7;background:#f5f8fb;padding:3mm 1mm;font-size:8.2pt;line-height:1.53;margin:3mm 0 5mm}.code-line{display:flex;break-inside:avoid;min-height:12.6pt}.code-line.changed{background:#fff6e2}.marker{flex:0 0 3mm;color:#b47716;font:8pt/1.55 monospace;text-align:center}.lineno{flex:0 0 9mm;text-align:right;padding-right:2mm;color:#6f8aa1;font:7.5pt/1.68 'DejaVu Sans Mono',monospace}.code-line code{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;font-family:'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace}.explain{display:flex;border-bottom:1px solid #dbe7ee;padding:3mm 0;break-inside:avoid}.range{flex:0 0 16mm;color:#117469;font-size:9pt;font-weight:700;padding-right:2mm}.explain-body{flex:1;min-width:0}.explain-body pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;background:#f0f5fa;padding:2mm;margin:0 0 2mm;font:8pt/1.55 'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace;color:#285573}.explain-body p{margin:0;font-size:9.6pt}.command{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef5fa;padding:4mm;font:9pt/1.7 'DejaVu Sans Mono','Noto Sans Mono CJK SC',monospace}.toc li{font-size:9.4pt}.tocgroup{margin-top:4mm}.code-part{margin-top:7mm}.qa{background:#fff5e9;border-left:1mm solid #d08a3b;padding:3mm 5mm}.flow{padding:4mm;border:1px solid #add2c9;background:#eef8f3;border-radius:2mm;white-space:pre-wrap;font-size:10pt;line-height:1.9}svg{display:block;width:100%;height:auto;break-inside:avoid;margin:4mm 0}.license{font:7.5pt/1.5 monospace;white-space:pre-wrap}.navback{font-size:8pt;margin-top:5mm}@media print{.navback{display:none}}@media screen{body{max-width:920px;margin:25px auto;padding:35px;box-shadow:0 0 22px #d2dce4}.chapter{margin-top:55px}.cover{min-height:720px}}
'''
