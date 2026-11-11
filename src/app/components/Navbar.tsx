import { useState, memo, useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { SeakuLogo } from "./SeakuLogo";
import {
  Search,
  Menu,
  X,
  Feather,
  BookOpen,
  Star,
  Compass,
  User,
  LogOut,
  Bell,
  ShieldAlert,
  CheckCheck,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import notificationService from "../../services/notificationService";

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

/** Memoized nav link to prevent re-renders */
const NavLink = memo(function NavLink({
  to,
  label,
  icon: Icon,
  isActive,
}: {
  to: string;
  label: string;
  icon: any;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
        isActive
          ? "bg-primary/15 text-purple-300 font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon size={16} aria-hidden="true" />
      <span style={{ fontSize: "0.875rem" }}>{label}</span>
    </Link>
  );
});

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingNotifs(true);
      const res = await notificationService.getNotifications({ limit: 15 });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchNotifications]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
        setMobileOpen(false);
      }
    },
    [searchQuery, navigate]
  );

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    setNotifOpen(false);
    if (notif.data?.url) {
      navigate(notif.data.url);
    }
  };

  const links = [
    { to: "/", label: "Beranda", icon: Compass },
    { to: "/browse", label: "Jelajahi", icon: BookOpen },
    { to: "/write", label: "Tulis Novel", icon: Feather },
    { to: "/reviews", label: "Review", icon: Star },
    { to: "/library", label: "Perpustakaan", icon: BookOpen },
    ...(isAdmin ? [{ to: "/admin", label: "Admin Panel", icon: ShieldAlert }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header>
      <nav
        className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl"
        aria-label="Navigasi utama"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Beranda SeakuNovel">
              <SeakuLogo size={36} />
              <span
                style={{
                  fontFamily: "Cinzel, serif",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
                className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent"
              >
                SeakuNovel
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1" role="menubar" aria-label="Menu navigasi">
              {links.map((l) => (
                <div key={l.to} role="none">
                  <NavLink to={l.to} label={l.label} icon={l.icon} isActive={isActive(l.to)} />
                </div>
              ))}
            </div>

            {/* Desktop right section */}
            <div className="hidden md:flex items-center gap-3">
              <form onSubmit={handleSearch} className="relative" role="search" aria-label="Cari novel">
                <label htmlFor="navbar-search" className="sr-only">
                  Cari novel
                </label>
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="navbar-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari novel..."
                  className="w-48 rounded-lg bg-secondary border border-border pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  style={{ fontSize: "0.875rem" }}
                />
              </form>

              {isAuthenticated ? (
                <div className="flex items-center gap-2.5">
                  {/* Notifications Bell */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => {
                        setNotifOpen(!notifOpen);
                        if (!notifOpen) fetchNotifications();
                      }}
                      className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                      aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
                    >
                      <Bell size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown Panel */}
                    {notifOpen && (
                      <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/50">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground">Notifikasi</h3>
                            {unreadCount > 0 && (
                              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary font-medium">
                                {unreadCount} baru
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                            >
                              <CheckCheck size={14} /> Tandai semua dibaca
                            </button>
                          )}
                        </div>

                        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
                          {loadingNotifs && notifications.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                              Memuat notifikasi...
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                              <Bell size={24} className="mx-auto mb-2 opacity-40" />
                              Belum ada notifikasi baru
                            </div>
                          ) : (
                            notifications.map((n) => {
                              const isUnread = !n.is_read;
                              return (
                                <div
                                  key={n.id}
                                  onClick={() => handleNotifClick(n)}
                                  className={`flex items-start gap-3 p-3 text-left transition cursor-pointer hover:bg-secondary/60 ${
                                    isUnread ? "bg-primary/5 font-medium" : "opacity-85"
                                  }`}
                                >
                                  <div className="mt-0.5 p-2 rounded-lg bg-secondary text-primary shrink-0">
                                    {n.type === "new_chapter" ? (
                                      <BookOpen size={16} />
                                    ) : n.type === "comment_reply" ? (
                                      <MessageSquare size={16} />
                                    ) : (
                                      <Sparkles size={16} />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-foreground leading-snug line-clamp-2">
                                      {n.data?.message || "Notifikasi baru dari sistem"}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatRelativeTime(n.created_at)}
                                      </span>
                                      {isUnread && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    to={user?.id ? `/profile/${user.id}` : "/profile"}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-primary-foreground hover:bg-primary/90 transition"
                    style={{ fontSize: "0.875rem" }}
                    aria-label={`Profil ${user?.display_name}`}
                  >
                    <User size={16} aria-hidden="true" /> {user?.display_name}
                  </Link>

                  <button
                    onClick={logout}
                    className="rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-foreground transition"
                    style={{ fontSize: "0.875rem" }}
                    aria-label="Keluar"
                  >
                    <LogOut size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition"
                  style={{ fontSize: "0.875rem" }}
                >
                  Masuk
                </Link>
              )}
            </div>

            {/* Mobile menu toggle */}
            <div className="flex items-center gap-2 md:hidden">
              {isAuthenticated && (
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    if (!notifOpen) fetchNotifications();
                  }}
                  className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Buka notifikasi"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              )}
              <button
                className="text-foreground p-1"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1"
            role="menu"
            aria-label="Menu navigasi mobile"
          >
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                role="menuitem"
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${
                  isActive(l.to) ? "bg-primary/15 text-purple-300 font-medium" : "text-muted-foreground"
                }`}
              >
                <l.icon size={18} aria-hidden="true" />
                <span>{l.label}</span>
              </Link>
            ))}

            <div className="pt-2">
              <form onSubmit={handleSearch} className="relative" role="search">
                <label htmlFor="mobile-search" className="sr-only">
                  Cari novel
                </label>
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="mobile-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari novel..."
                  className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground"
                  style={{ fontSize: "0.875rem" }}
                />
              </form>
            </div>

            {isAuthenticated ? (
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <Link
                  to={user?.id ? `/profile/${user.id}` : "/profile"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm text-foreground"
                >
                  <User size={16} /> {user?.display_name}
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                >
                  <LogOut size={14} /> Keluar
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground"
                >
                  Masuk ke Akun
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}