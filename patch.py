import sys

filepath = 'frontend/src/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the first chunk
old1 = '''import SparePurchasePage from './modules/procurement/pages/SparePurchasePage'
import TemporaryItemPage from './modules/procurement/pages/TemporaryItemPage'
'''
new1 = '''import SparePurchasePage from './modules/procurement/pages/SparePurchasePage'
import SparePurchaseDetailPage from './modules/procurement/pages/SparePurchaseDetailPage'
import TemporaryItemPage from './modules/procurement/pages/TemporaryItemPage'
'''
content = content.replace(old1, new1)

# Replace the second chunk
old2 = '''          <Route path="procurement/spares/new" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <SparePurchasePage />
            </ProtectedRoute>
          } />'''
new2 = '''          <Route path="procurement/spares/new" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <SparePurchasePage />
            </ProtectedRoute>
          } />
          <Route path="procurement/spares/:id" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <SparePurchaseDetailPage />
            </ProtectedRoute>
          } />'''
content = content.replace(old2, new2)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
