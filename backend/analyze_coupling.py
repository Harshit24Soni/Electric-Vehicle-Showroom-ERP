import os
import re
from collections import defaultdict

directories = ['app/domains', 'app/modules']
coupling = defaultdict(list)

for base_dir in directories:
    if not os.path.exists(base_dir): continue
    for domain in os.listdir(base_dir):
        domain_path = os.path.join(base_dir, domain)
        if not os.path.isdir(domain_path): continue
        
        models_file = os.path.join(domain_path, 'models.py')
        if not os.path.exists(models_file): continue
        
        with open(models_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        fks = re.findall(r'ForeignKey\([\'"]([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.[a-zA-Z0-9_]+[\'"]', content)
        for schema, table in fks:
            if schema != domain and schema not in ['public']:
                coupling[domain].append(schema)

print('Coupling Analysis:')
for domain, targets in coupling.items():
    unique_targets = list(set(targets))
    print(f'- {domain} depends on: {unique_targets}')
