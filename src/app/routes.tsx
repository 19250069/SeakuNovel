import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "../components/ProtectedRoute";

// Lazy-loaded pages for code splitting
const Home = lazy(() => import("./pages/Home").then(m => ({ default: m.Home })));
const Browse = lazy(() => import("./pages/Browse").then(m => ({ default: m.Browse })));
const Write = lazy(() => import("./pages/Write").then(m => ({ default: m.Write })));
const Library = lazy(() => import("./pages/Library").then(m => ({ default: m.Library })));
const ChapterPreview = lazy(() => import("./pages/ChapterPreview").then(m => ({ default: m.ChapterPreview })));
const Reviews = lazy(() => import("./pages/Reviews").then(m => ({ default: m.Reviews })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.Register })));
const NovelDetail = lazy(() => import("./pages/NovelDetail").then(m => ({ default: m.NovelDetail })));
const ChapterReader = lazy(() => import("./pages/ChapterReader").then(m => ({ default: m.ChapterReader })));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));

/** Page-level skeleton used while lazy chunks load */
function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Memuat halaman...</p>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<PageSkeleton />}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function HomePage() { return <Layout><Home /></Layout>; }
function BrowsePage() { return <Layout><Browse /></Layout>; }
function WritePage() { return <Layout><ProtectedRoute><Write /></ProtectedRoute></Layout>; }
function ChapterPreviewPage() { return <Layout><ProtectedRoute><ChapterPreview /></ProtectedRoute></Layout>; }
function LibraryPage() { return <Layout><ProtectedRoute><Library /></ProtectedRoute></Layout>; }
function ReviewsPage() { return <Layout><Reviews /></Layout>; }
function ProfilePage() { return <Layout><ProtectedRoute><Profile /></ProtectedRoute></Layout>; }
function AdminPage() {
  return (
    <Layout>
      <ProtectedRoute requiredRole="admin">
        <Admin />
      </ProtectedRoute>
    </Layout>
  );
}
function LoginPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Login />
    </Suspense>
  );
}
function RegisterPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Register />
    </Suspense>
  );
}
function NovelDetailPage() { return <Layout><NovelDetail /></Layout>; }
function ChapterReaderPage() { return <Layout><ChapterReader /></Layout>; }
function NotFoundPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotFound />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/", Component: HomePage },
  { path: "/browse", Component: BrowsePage },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/novel/:id", Component: NovelDetailPage },
  { path: "/read/:novelId/:chapterId", Component: ChapterReaderPage },
  { path: "/write", Component: WritePage },
  { path: "/write/:novelId/preview/:chapterId", Component: ChapterPreviewPage },
  { path: "/studio", Component: () => <Navigate to="/write" replace /> },
  { path: "/library", Component: LibraryPage },
  { path: "/reviews", Component: ReviewsPage },
  { path: "/profile", Component: ProfilePage },
  { path: "/profile/:id", Component: ProfilePage },
  { path: "/admin", Component: AdminPage },
  { path: "*", Component: NotFoundPage },
]);