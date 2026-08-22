import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { Layout } from './Layout'
import { HomePage } from '@/pages/HomePage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { CategoryDetailPage } from '@/pages/CategoryDetailPage'
import { SearchPage } from '@/pages/SearchPage'
import { CompanyProfilePage } from '@/pages/CompanyProfilePage'
import { SavedPage } from '@/pages/SavedPage'
import { BattlePage } from '@/pages/BattlePage'
import { DealsPage } from '@/pages/DealsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CreateCompanyPage } from '@/pages/CreateCompanyPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={150}>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/:slug" element={<CategoryDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/companies/:slug" element={<CompanyProfilePage />} />
                <Route path="/saved" element={<SavedPage />} />
                <Route path="/battles/:id" element={<BattlePage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/new" element={<CreateCompanyPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#1B1E26', border: '1px solid #2A2E38', color: '#fff' } }} />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
