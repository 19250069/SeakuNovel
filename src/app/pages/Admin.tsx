import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  ShieldAlert,
  Users,
  BookOpen,
  Flag,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Shield,
  FileText,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import adminService from "../../services/adminService";
import { useDocumentTitle } from "../../utils/seo";

type AdminTab = "overview" | "users" | "novels" | "reports";

export function Admin() {
  useDocumentTitle("Panel Administrasi", "Pusat moderasi dan manajemen sistem platform SeakuNovel");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Users
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("");
  const [userPage, setUserPage] = useState<number>(1);
  const [userPagination, setUserPagination] = useState<any>({ totalPages: 1, total: 0 });

  // Novels
  const [novelsList, setNovelsList] = useState<any[]>([]);
  const [novelSearch, setNovelSearch] = useState<string>("");
  const [novelStatusFilter, setNovelStatusFilter] = useState<string>("");
  const [novelPage, setNovelPage] = useState<number>(1);
  const [novelPagination, setNovelPagination] = useState<any>({ totalPages: 1, total: 0 });

  // Reports
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("");
  const [reportPage, setReportPage] = useState<number>(1);
  const [reportPagination, setReportPagination] = useState<any>({ totalPages: 1, total: 0 });

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load admin stats:", err);
      setFeedback({ type: "error", text: "Gagal memuat statistik platform" });
    }
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const data = await adminService.getUsers({
        page: userPage,
        limit: 15,
        search: userSearch,
        role: userRoleFilter,
      });
      setUsersList(data.users || []);
      setUserPagination(data.pagination || { totalPages: 1, total: 0 });
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setFeedback({ type: "error", text: "Gagal memuat daftar pengguna" });
    }
  }, [userPage, userSearch, userRoleFilter]);

  // Load novels
  const loadNovels = useCallback(async () => {
    try {
      const data = await adminService.getNovels({
        page: novelPage,
        limit: 15,
        search: novelSearch,
        status: novelStatusFilter,
      });
      setNovelsList(data.novels || []);
      setNovelPagination(data.pagination || { totalPages: 1, total: 0 });
    } catch (err: any) {
      console.error("Failed to load novels:", err);
      setFeedback({ type: "error", text: "Gagal memuat daftar novel" });
    }
  }, [novelPage, novelSearch, novelStatusFilter]);

  // Load reports
  const loadReports = useCallback(async () => {
    try {
      const data = await adminService.getReports({
        page: reportPage,
        limit: 15,
        status: reportStatusFilter,
      });
      setReportsList(data.reports || []);
      setReportPagination(data.pagination || { totalPages: 1, total: 0 });
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      setFeedback({ type: "error", text: "Gagal memuat laporan" });
    }
  }, [reportPage, reportStatusFilter]);

  // Master refresh
  const refreshData = useCallback(async () => {
    setLoading(true);
    if (activeTab === "overview") await loadStats();
    else if (activeTab === "users") await loadUsers();
    else if (activeTab === "novels") await loadNovels();
    else if (activeTab === "reports") await loadReports();
    setLoading(false);
  }, [activeTab, loadStats, loadUsers, loadNovels, loadReports]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Actions
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id && newRole !== "admin") {
      alert("Anda tidak dapat menurunkan peran akun Anda sendiri.");
      return;
    }

    try {
      setActionLoading(userId);
      await adminService.updateUserRole(userId, newRole);
      setFeedback({ type: "success", text: "Peran pengguna berhasil diubah" });
      loadUsers();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.error || "Gagal mengubah peran pengguna",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === user?.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus pengguna "${userName}" beserta seluruh karyanya? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      setActionLoading(userId);
      await adminService.deleteUser(userId);
      setFeedback({ type: "success", text: `Pengguna ${userName} berhasil dihapus` });
      loadUsers();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.error || "Gagal menghapus pengguna",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleNovelStatusToggle = async (novelId: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    try {
      setActionLoading(novelId);
      await adminService.updateNovelStatus(novelId, newStatus);
      setFeedback({
        type: "success",
        text: `Status novel diubah menjadi ${newStatus === "published" ? "Diterbitkan" : "Draf"}`,
      });
      loadNovels();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.error || "Gagal mengubah status novel",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteNovel = async (novelId: string, novelTitle: string) => {
    if (!window.confirm(`Yakin ingin menghapus novel "${novelTitle}" secara permanen? Seluruh bab dan ulasan akan ikut terhapus.`)) {
      return;
    }

    try {
      setActionLoading(novelId);
      await adminService.deleteNovel(novelId);
      setFeedback({ type: "success", text: `Novel "${novelTitle}" berhasil dihapus` });
      loadNovels();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.error || "Gagal menghapus novel",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportAction = async (reportId: string, newStatus: "resolved" | "dismissed") => {
    try {
      setActionLoading(reportId);
      await adminService.updateReportStatus(reportId, newStatus);
      setFeedback({
        type: "success",
        text: `Laporan berhasil ditandai sebagai ${newStatus === "resolved" ? "Selesai" : "Ditolak/Diabaikan"}`,
      });
      loadReports();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.error || "Gagal memperbarui status laporan",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("Hapus catatan laporan ini?")) return;
    try {
      setActionLoading(reportId);
      await adminService.deleteReport(reportId);
      setFeedback({ type: "success", text: "Laporan berhasil dihapus" });
      loadReports();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.response?.data?.error || "Gagal menghapus laporan",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3 text-primary">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
                Panel Administrasi & Moderasi
              </h1>
              <p className="text-sm text-muted-foreground">
                Pusat kendali ekosistem SeakuNovel: kelola pengguna, moderasi karya, dan tindak lanjuti laporan konten.
              </p>
            </div>
          </div>

          <button
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2 self-start md:self-auto rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Segarkan Data
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center justify-between rounded-lg p-3 text-sm ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            <span>{feedback.text}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex border-b border-border gap-2 overflow-x-auto">
          {[
            { id: "overview", label: "Statistik Sistem", icon: BarChart3 },
            { id: "users", label: "Manajemen Pengguna", icon: Users },
            { id: "novels", label: "Moderasi Novel", icon: BookOpen },
            { id: "reports", label: "Laporan Pelanggaran", icon: Flag },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as AdminTab)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition whitespace-nowrap ${
                  isSelected
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="mt-6 space-y-6">
            {loading && !stats ? (
              <div className="py-20 text-center text-sm text-muted-foreground">
                Memuat data statistik...
              </div>
            ) : (
              <>
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Users Metric */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Total Pengguna
                      </span>
                      <Users size={18} className="text-blue-400" />
                    </div>
                    <div className="mt-3 text-3xl font-bold text-foreground">
                      {stats?.users?.total || 0}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-blue-400 font-medium">{stats?.users?.readers || 0} Reader</span>
                      <span>•</span>
                      <span className="text-purple-400 font-medium">{stats?.users?.authors || 0} Penulis</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">{stats?.users?.admins || 0} Admin</span>
                    </div>
                  </div>

                  {/* Novels Metric */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Total Novel
                      </span>
                      <BookOpen size={18} className="text-emerald-400" />
                    </div>
                    <div className="mt-3 text-3xl font-bold text-foreground">
                      {stats?.novels?.total || 0}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-emerald-400 font-medium">
                        {stats?.novels?.published || 0} Diterbitkan
                      </span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">
                        {stats?.novels?.drafts || 0} Draf
                      </span>
                    </div>
                  </div>

                  {/* Chapters Metric */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Total Bab & Konten
                      </span>
                      <FileText size={18} className="text-violet-400" />
                    </div>
                    <div className="mt-3 text-3xl font-bold text-foreground">
                      {stats?.chapters?.total || 0} Bab
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Total kata: {(stats?.chapters?.totalWords || 0).toLocaleString("id-ID")} kata
                    </div>
                  </div>

                  {/* Reports Metric */}
                  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Laporan Konten
                      </span>
                      <Flag size={18} className="text-red-400" />
                    </div>
                    <div className="mt-3 text-3xl font-bold text-foreground">
                      {stats?.reports?.total || 0}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-red-400 font-semibold">
                        {stats?.reports?.open || 0} Terbuka
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">
                        {stats?.reports?.resolved || 0} Selesai
                      </span>
                    </div>
                  </div>
                </div>

                {/* Engagement Row */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Aktivitas Komunitas</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <div className="text-xl font-bold text-foreground">{stats?.engagement?.reviews || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Ulasan</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <div className="text-xl font-bold text-foreground">{stats?.engagement?.comments || 0}</div>
                      <div className="text-xs text-muted-foreground">Komentar</div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg">
                      <div className="text-xl font-bold text-foreground">{stats?.engagement?.bookmarks || 0}</div>
                      <div className="text-xs text-muted-foreground">Bookmark Tersimpan</div>
                    </div>
                  </div>
                </div>

                {/* Two Column Section: Recent Users & Recent Novels */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Recent Users */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-foreground">Pengguna Baru Terdaftar</h3>
                      <button
                        onClick={() => setActiveTab("users")}
                        className="text-xs text-primary hover:underline"
                      >
                        Lihat Semua
                      </button>
                    </div>
                    <div className="divide-y divide-border/60">
                      {(stats?.recent?.users || []).map((u: any) => (
                        <div key={u.id} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                              {(u.display_name || u.username)[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{u.display_name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              u.role === "admin"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : u.role === "author"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Novels */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-foreground">Novel Terbaru</h3>
                      <button
                        onClick={() => setActiveTab("novels")}
                        className="text-xs text-primary hover:underline"
                      >
                        Lihat Semua
                      </button>
                    </div>
                    <div className="divide-y divide-border/60">
                      {(stats?.recent?.novels || []).map((n: any) => (
                        <div key={n.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-foreground">{n.title}</div>
                            <div className="text-xs text-muted-foreground">oleh {n.author_name}</div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              n.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {n.status === "published" ? "Diterbitkan" : "Draf"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="mt-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari username, nama, atau email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                className="w-full sm:w-44 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Peran</option>
                <option value="reader">Reader</option>
                <option value="author">Author (Penulis)</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Pengguna</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Peran (Role)</th>
                      <th className="px-4 py-3">Terdaftar</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          Memuat data pengguna...
                        </td>
                      </tr>
                    ) : usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          Tidak ada pengguna ditemukan.
                        </td>
                      </tr>
                    ) : (
                      usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-secondary/40 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                                {(u.display_name || u.username)[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{u.display_name}</div>
                                <div className="text-xs text-muted-foreground">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              disabled={actionLoading === u.id || u.id === user?.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none ${
                                u.role === "admin"
                                  ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                  : u.role === "author"
                                  ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              <option value="reader" className="bg-card text-foreground">Reader</option>
                              <option value="author" className="bg-card text-foreground">Author</option>
                              <option value="admin" className="bg-card text-foreground">Admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString("id-ID")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(u.id, u.display_name || u.username)}
                              disabled={actionLoading === u.id || u.id === user?.id}
                              title={u.id === user?.id ? "Tidak dapat menghapus akun sendiri" : "Hapus Pengguna"}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {userPagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-secondary/30 text-xs text-muted-foreground">
                  <span>
                    Halaman {userPage} dari {userPagination.totalPages} ({userPagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => p - 1)}
                      className="rounded border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      disabled={userPage >= userPagination.totalPages}
                      onClick={() => setUserPage((p) => p + 1)}
                      className="rounded border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NOVEL MODERATION */}
        {activeTab === "novels" && (
          <div className="mt-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari judul novel atau penulis..."
                  value={novelSearch}
                  onChange={(e) => {
                    setNovelSearch(e.target.value);
                    setNovelPage(1);
                  }}
                  className="w-full rounded-lg bg-secondary border border-border pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={novelStatusFilter}
                onChange={(e) => {
                  setNovelStatusFilter(e.target.value);
                  setNovelPage(1);
                }}
                className="w-full sm:w-44 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Status</option>
                <option value="published">Diterbitkan (Published)</option>
                <option value="draft">Draf (Draft)</option>
              </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="px-4 py-3">Novel</th>
                      <th className="px-4 py-3">Penulis</th>
                      <th className="px-4 py-3">Statistik</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          Memuat daftar novel...
                        </td>
                      </tr>
                    ) : novelsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          Tidak ada novel ditemukan.
                        </td>
                      </tr>
                    ) : (
                      novelsList.map((n) => (
                        <tr key={n.id} className="hover:bg-secondary/40 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {n.cover_image_url ? (
                                <img
                                  src={n.cover_image_url}
                                  alt={n.title}
                                  className="h-12 w-9 rounded object-cover border border-border"
                                />
                              ) : (
                                <div className="h-12 w-9 rounded bg-secondary flex items-center justify-center text-muted-foreground border border-border">
                                  <BookOpen size={14} />
                                </div>
                              )}
                              <div className="max-w-xs truncate">
                                <Link
                                  to={`/novel/${n.id}`}
                                  className="font-medium text-foreground hover:text-primary transition"
                                >
                                  {n.title}
                                </Link>
                                <div className="text-xs text-muted-foreground truncate">{n.synopsis}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {n.author_name} (@{n.author_username})
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div>{n.total_chapters || 0} Bab</div>
                            <div>★ {parseFloat(n.average_rating || 0).toFixed(1)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleNovelStatusToggle(n.id, n.status)}
                              disabled={actionLoading === n.id}
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                n.status === "published"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-amber-500/10 hover:text-amber-300"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-emerald-500/10 hover:text-emerald-300"
                              }`}
                              title="Klik untuk mengubah status"
                            >
                              {n.status === "published" ? "Diterbitkan" : "Draf"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/novel/${n.id}`}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                                title="Buka Halaman Novel"
                              >
                                <ExternalLink size={16} />
                              </Link>
                              <button
                                onClick={() => handleDeleteNovel(n.id, n.title)}
                                disabled={actionLoading === n.id}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                                title="Hapus Novel"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {novelPagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-secondary/30 text-xs text-muted-foreground">
                  <span>
                    Halaman {novelPage} dari {novelPagination.totalPages} ({novelPagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={novelPage <= 1}
                      onClick={() => setNovelPage((p) => p - 1)}
                      className="rounded border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
                    >
                      Sebelumnya
                    </button>
                    <button
                      disabled={novelPage >= novelPagination.totalPages}
                      onClick={() => setNovelPage((p) => p + 1)}
                      className="rounded border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CONTENT REPORTS & MODERATION */}
        {activeTab === "reports" && (
          <div className="mt-6 space-y-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-2">
              {[
                { id: "", label: "Semua Laporan" },
                { id: "open", label: "Menunggu Tindakan (Open)" },
                { id: "resolved", label: "Selesai (Resolved)" },
                { id: "dismissed", label: "Ditolak / Diabaikan" },
              ].map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => {
                    setReportStatusFilter(rf.id);
                    setReportPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    reportStatusFilter === rf.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            {/* Reports List */}
            <div className="space-y-3">
              {loading ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
                  Memuat data laporan...
                </div>
              ) : reportsList.length === 0 ? (
                <div className="rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                  Tidak ada laporan dalam status ini.
                </div>
              ) : (
                reportsList.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold uppercase text-primary">
                          {r.target_type}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            r.status === "open"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : r.status === "resolved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                          }`}
                        >
                          {r.status === "open"
                            ? "Terbuka"
                            : r.status === "resolved"
                            ? "Selesai"
                            : "Diabaikan"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Dilaporkan oleh{" "}
                          <span className="font-medium text-foreground">
                            {r.reporter_name || r.reporter_username || "Pengguna"}
                          </span>{" "}
                          pada {new Date(r.created_at).toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-foreground">
                        Alasan: <span className="font-normal text-muted-foreground">{r.reason}</span>
                      </div>

                      {r.details && (
                        <p className="text-xs text-muted-foreground bg-secondary/50 p-2.5 rounded-lg border border-border/50">
                          {r.details}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>Target ID: <code className="text-foreground">{r.target_id}</code></span>
                        {r.target_type === "novel" && (
                          <Link
                            to={`/novel/${r.target_id}`}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Buka Konten <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Report Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {r.status === "open" && (
                        <>
                          <button
                            onClick={() => handleReportAction(r.id, "resolved")}
                            disabled={actionLoading === r.id}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition"
                          >
                            <CheckCircle2 size={14} /> Selesai
                          </button>
                          <button
                            onClick={() => handleReportAction(r.id, "dismissed")}
                            disabled={actionLoading === r.id}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
                          >
                            <XCircle size={14} /> Tolak
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteReport(r.id)}
                        disabled={actionLoading === r.id}
                        className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Hapus Catatan Laporan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {reportPagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-card rounded-xl text-xs text-muted-foreground">
                <span>
                  Halaman {reportPage} dari {reportPagination.totalPages} ({reportPagination.total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={reportPage <= 1}
                    onClick={() => setReportPage((p) => p - 1)}
                    className="rounded border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={reportPage >= reportPagination.totalPages}
                    onClick={() => setReportPage((p) => p + 1)}
                    className="rounded border border-border px-2.5 py-1 hover:bg-secondary disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
