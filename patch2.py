import sys

filepath = 'frontend/src/modules/procurement/pages/TemporaryItemPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the first chunk
old1 = '''                        <div>
                            <label className="label">Part Code</label>
                            <input {...register('part_code')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Description</label>
                            <input {...register('description')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <input {...register('category')} className="input" />
                        </div>
                        <div>
                            <label className="label">Landing Price</label>
                            <input type="number" step="0.01" {...register('dealer_landing_price')} className="input" />
                        </div>
                        <div>
                            <label className="label">Margin %</label>
                            <input type="number" step="0.01" {...register('dealer_margin_percent')} className="input" />
                        </div>
                        <div>
                            <label className="label">GST %</label>
                            <input type="number" step="0.01" {...register('gst_percentage')} className="input" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Remarks</label>
                            <input {...register('remarks')} className="input" />
                        </div>'''

new1 = '''                        <div>
                            <label className="label">Part Code</label>
                            <input {...register('initial_code')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Description / Name</label>
                            <input {...register('spare_name')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <input {...register('category')} className="input" />
                        </div>
                        <div>
                            <label className="label">Estimated Price</label>
                            <input type="number" step="0.01" {...register('price', { valueAsNumber: true })} className="input" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Remarks</label>
                            <input {...register('remarks')} className="input" />
                        </div>'''

content = content.replace(old1, new1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
