import re

def main():
    with open('/home/brunomortari/lia/jinja/templates/pages/manual.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Remove jinja blocks and variables
    html = re.sub(r'{%.*?%}', '', html)
    html = re.sub(r'{{.*?}}', '', html)
    
    # Remove HTML comments
    html = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    
    # Remove <link> tags (we already imported css)
    html = re.sub(r'<link.*?>', '', html)
    
    # Replace class with className
    html = html.replace('class="', 'className="')
    
    # Standardize SVG attributes for React
    html = html.replace('stroke-width="', 'strokeWidth="')
    html = html.replace('stroke-linecap="', 'strokeLinecap="')
    html = html.replace('stroke-linejoin="', 'strokeLinejoin="')
    html = html.replace('fill-rule="', 'fillRule="')
    html = html.replace('clip-rule="', 'clipRule="')
    
    # Self-close SVG tags since React requires it for void elements
    # Just fix the explicit closing tags
    html = html.replace('></polygon>', ' />')
    html = html.replace('></polyline>', ' />')
    html = html.replace('></circle>', ' />')
    html = html.replace('></path>', ' />')
    html = html.replace('></line>', ' />')

    # Find unclosed tags (like <path d="..."> without closing tag)
    # Using regex, but we only want to self-close if it's not already self closed and doesn't have a closing tag
    # Since we already ran the above replacement, tags that HAD a closing tag now have ' />' as their end.
    # We can just match <tag ...> and if it doesn't end in /, make it end in /
    tags = ['polygon', 'polyline', 'circle', 'path', 'line']
    for tag in tags:
        # Match <tag ... > but not <tag ... />
        pattern = f'<{tag}([^>]*[^/])>'
        html = re.sub(pattern, f'<{tag}\\1 />', html)

    # Convert inline styles
    def style_replacer(match):
        style_content = match.group(1)
        rules = [r.strip() for r in style_content.split(';') if r.strip()]
        obj_str = "{"
        for rule in rules:
            if ':' not in rule: continue
            k, v = rule.split(':', 1)
            k = k.strip()
            v = v.strip()
            # camelCase the key
            parts = k.split('-')
            k_camel = parts[0] + ''.join(p.capitalize() for p in parts[1:])
            obj_str += f" {k_camel}: '{v}',"
        obj_str += " }"
        return f"style={{{obj_str}}}"
        
    html = re.sub(r'style="([^"]*)"', style_replacer, html)

    tsx = """import './manual.css';
import './manual_fluxo.css';

export default function ManualPage() {
    return (
        <div className="manual-page-container">
""" + html + """
        </div>
    );
}
"""

    with open('/home/brunomortari/lia/frontend/src/app/(dashboard)/manual/page.tsx', 'w', encoding='utf-8') as f:
        f.write(tsx)

if __name__ == '__main__':
    main()
