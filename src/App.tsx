import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { useAuth } from '@/auth/useAuth';
import { useStorageSync } from '@/hooks/useStorageSync';
import { ROUTES } from '@/constants';

/**
 * Pages are code-split with React.lazy so each route ships its own chunk; the
 * Suspense boundary lives in AppLayout. Named exports are adapted to the
 * default export React.lazy expects.
 */
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Consulting = lazy(() => import('@/pages/Consulting').then((m) => ({ default: m.Consulting })));
const AppDev = lazy(() => import('@/pages/AppDev').then((m) => ({ default: m.AppDev })));
const SocialPage = lazy(() => import('@/pages/SocialPage').then((m) => ({ default: m.SocialPage })));
const Companies = lazy(() => import('@/pages/Companies').then((m) => ({ default: m.Companies })));
const CompanyDetail = lazy(() =>
  import('@/pages/CompanyDetail').then((m) => ({ default: m.CompanyDetail }))
);
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

/** Route table. Every module page nests inside the persistent app shell. */
export default function App() {
  const { user } = useAuth();
  useStorageSync();

  // Gate the whole app behind the profile-picker login.
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        <Route path={ROUTES.consulting} element={<Consulting />} />
        <Route path={ROUTES.appdev} element={<AppDev />} />
        <Route path={ROUTES.social} element={<SocialPage />} />
        <Route path={ROUTES.companies} element={<Companies />} />
        <Route path={`${ROUTES.companies}/:id`} element={<CompanyDetail />} />
        <Route path={ROUTES.settings} element={<Settings />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
