import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { BookOpen, CalendarDays, Eye, Heart, Users, Pencil, Lock, LogOut, Plus, Feather, X, Check } from 'lucide-react';


// ==================== TYPES ====================
interface ProfileUser {
  id: string;
  username: string;
  display_name: string;
  email?: string;
  avatar_url?: string | null;
  bio?: string | null;
  role?: string;
  created_at?: string;
  total_novels?: number;
  total_chapters?: number;
  total_views?: number;
  total_bookmarks?: number;
  total_followers?: number;
}

interface NovelSummary {
  id: string;
  title: string;
  slug: string;
  cover_url?: string | null;
  status: string;
  total_views?: number;
  created_at?: string;
}

interface ProfileFormData {
  display_name: string;
  username: string;
  bio: string;
}

// ==================== CONSTANTS ====================
const MESSAGES = {
  LOADING: 'Memuat profil...',
  NOT_FOUND: 'Profil tidak ditemukan.',
  EMPTY_BIO: 'Belum ada bio.',
  NO_NOVELS_OWNER: 'Belum ada novel.',
  NO_NOVELS_OTHER: 'Pengguna ini belum memiliki novel yang dipublikasikan.',
  SAVE_SUCCESS: 'Profil berhasil diperbarui',
  SAVE_ERROR: 'Failed to update profile',
  LOAD_ERROR: 'Failed to load profile',
  SAVING: 'Menyimpan...',
  SAVE_BUTTON: 'Simpan',
  CANCEL_BUTTON: 'Batal',
  EDIT_BUTTON: 'Edit Profile',
  PASSWORD_BUTTON: 'Change Password',
  LOGOUT_BUTTON: 'Logout',
  FOLLOW_BUTTON: 'Follow',
  ADD_NOVEL: 'Tambah Novel',
  MY_NOVELS: 'Novel Saya',
  PUBLIC_NOVELS: 'Novel Publik',
  EDIT_PROFILE_TITLE: 'Edit Profil',
  JOINED_DATE: 'Bergabung',
} as const;

const STATS_CONFIG = [
  { label: 'Novel', icon: BookOpen, key: 'total_novels' as const },
  { label: 'Total Views', icon: Eye, key: 'total_views' as const },
  { label: 'Chapter', icon: BookOpen, key: 'total_chapters' as const },
  { label: 'Bookmark', icon: Heart, key: 'total_bookmarks' as const },
  { label: 'Followers', icon: Users, key: 'total_followers' as const },
] as const;

// ==================== REUSABLE COMPONENTS ====================
const LoadingState = () => (
  <div className="min-h-screen bg-background px-4 py-12">
    <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-card/70 p-8 text-center text-muted-foreground">
      {MESSAGES.LOADING}
    </div>
  </div>
);

interface ErrorStateProps {
  message?: string;
}

const ErrorState = ({ message }: ErrorStateProps) => (
  <div className="min-h-screen bg-background px-4 py-12">
    <div className="mx-auto max-w-6xl rounded-2xl border border-border bg-card/70 p-8 text-center text-muted-foreground">
      {message || MESSAGES.NOT_FOUND}
    </div>
  </div>
);

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
}

const StatCard = ({ label, value, icon: Icon }: StatCardProps) => (
  <div className="rounded-2xl border border-border bg-background/60 p-4">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon size={16} />
      {label}
    </div>
    <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
  </div>
);

// ==================== MAIN COMPONENT ====================
export function Profile() {
  const { user: authUser, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [novels, setNovels] = useState<NovelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: '',
    username: '',
    bio: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Password modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [becomingAuthor, setBecomingAuthor] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter');
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1200);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleBecomeAuthor = async () => {
    if (!window.confirm('Apakah Anda ingin mendaftar sebagai Penulis untuk mulai membuat novel?')) return;
    setBecomingAuthor(true);
    try {
      const res = await authService.becomeAuthor();
      if (res.user) {
        updateUser(res.user);
        setProfile((prev) => (prev ? { ...prev, role: 'author' } : null));
      }
      alert('Selamat! Akun Anda kini terdaftar sebagai Penulis.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal mengupgrade peran akun.');
    } finally {
      setBecomingAuthor(false);
    }
  };

  const isOwner = useMemo(() => !id || id === authUser?.id, [id, authUser?.id]);


  // Cleanup avatar preview URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');

      try {
        const endpoint = isOwner ? '/profile/me' : `/users/${id}/profile`;
        const response = await api.get(endpoint);
        const profileData = response.data.profile;
        
        setProfile(profileData);
        setNovels(response.data.novels || []);
        setFormData({
          display_name: profileData?.display_name || '',
          username: profileData?.username || '',
          bio: profileData?.bio || '',
        });
      } catch (err: any) {
        setError(err.response?.data?.error || MESSAGES.LOAD_ERROR);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id, isOwner]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.display_name.trim() || !formData.username.trim()) {
      setError('Display name and username are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('display_name', formData.display_name.trim());
      formDataToSend.append('username', formData.username.trim());
      formDataToSend.append('bio', formData.bio.trim());
      if (avatarFile) formDataToSend.append('avatar', avatarFile);

      await api.put('/profile', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reload profile after successful update
      const response = await api.get('/profile/me');
      setProfile(response.data.profile);
      setNovels(response.data.novels || []);
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      setError(err.response?.data?.error || MESSAGES.SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Revoke previous preview URL if exists
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleInputChange = (field: keyof ProfileFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const cancelEdit = () => {
    setEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setFormData({
      display_name: profile?.display_name || '',
      username: profile?.username || '',
      bio: profile?.bio || '',
    });
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!profile) {
    return <ErrorState message={error || MESSAGES.NOT_FOUND} />;
  }

  const avatarInitial = profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || 'U';
  const avatarSrc = avatarPreview || profile.avatar_url;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Profile Header Card */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card/80 shadow-lg">
          <div className="h-40 bg-gradient-to-r from-purple-700 via-violet-600 to-fuchsia-500" />
          
          <div className="relative px-6 pb-6 pt-0 md:px-8">
            <div className="-mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-end gap-4">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-background text-3xl font-semibold text-foreground shadow-lg">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={profile.display_name} className="h-full w-full object-cover" />
                  ) : (
                    <span aria-label={`Avatar initial: ${avatarInitial}`}>{avatarInitial}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold text-foreground">{profile.display_name || profile.username}</h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      profile.role === 'admin'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : profile.role === 'author'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {profile.role === 'admin' ? 'Admin' : profile.role === 'author' ? 'Penulis' : 'Pembaca'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>
              </div>

              {isOwner ? (
                <div className="flex flex-wrap gap-2">
                  {profile.role === 'reader' && (
                    <button
                      onClick={handleBecomeAuthor}
                      disabled={becomingAuthor}
                      className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Feather size={16} /> {becomingAuthor ? 'Memproses...' : 'Daftar Jadi Penulis'}
                    </button>
                  )}
                  <button
                    onClick={() => setEditing((prev) => !prev)}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
                    aria-label={editing ? 'Cancel editing' : MESSAGES.EDIT_BUTTON}
                  >
                    <span className="mr-2 inline-flex"><Pencil size={16} /></span>
                    {editing ? 'Cancel' : MESSAGES.EDIT_BUTTON}
                  </button>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
                  >
                    <span className="mr-2 inline-flex"><Lock size={16} /></span>
                    {MESSAGES.PASSWORD_BUTTON}
                  </button>
                  <button onClick={handleLogout} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary">
                    <span className="mr-2 inline-flex"><LogOut size={16} /></span>
                    {MESSAGES.LOGOUT_BUTTON}
                  </button>
                </div>
              ) : (
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                  <span className="mr-2 inline-flex"><Plus size={16} /></span>
                  {MESSAGES.FOLLOW_BUTTON}
                </button>
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-border bg-background/60 p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays size={16} />
                  {MESSAGES.JOINED_DATE}{' '}
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                    : '-'}
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{profile.bio || MESSAGES.EMPTY_BIO}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {STATS_CONFIG.map(stat => (
                  <StatCard
                    key={stat.key}
                    label={stat.label}
                    value={profile[stat.key] ?? 0}
                    icon={stat.icon}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isOwner && editing && (
          <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-foreground">{MESSAGES.EDIT_PROFILE_TITLE}</h2>
            
            {error && (
              <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label htmlFor="displayName" className="mb-2 block text-sm font-medium">
                  Display Name
                </label>
                <input
                  id="displayName"
                  value={formData.display_name}
                  onChange={handleInputChange('display_name')}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  required
                />
              </div>

              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium">
                  Username
                </label>
                <input
                  id="username"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  required
                />
              </div>

              <div>
                <label htmlFor="bio" className="mb-2 block text-sm font-medium">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleInputChange('bio')}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>

              <div>
                <label htmlFor="avatar" className="mb-2 block text-sm font-medium">
                  Avatar
                </label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? MESSAGES.SAVING : MESSAGES.SAVE_BUTTON}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
                >
                  {MESSAGES.CANCEL_BUTTON}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Novels Section */}
        <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {isOwner ? MESSAGES.MY_NOVELS : MESSAGES.PUBLIC_NOVELS}
            </h2>
            {isOwner && (
              <Link
                to="/write"
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                {MESSAGES.ADD_NOVEL}
              </Link>
            )}
          </div>

          {novels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {isOwner ? MESSAGES.NO_NOVELS_OWNER : MESSAGES.NO_NOVELS_OTHER}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {novels.map(novel => (
                <Link
                  key={novel.id}
                  to={`/novel/${novel.id}`}
                  className="overflow-hidden rounded-2xl border border-border bg-background/60 transition hover:border-purple-500/40"
                >
                  <div className="h-36 bg-gradient-to-br from-purple-950/40 to-background" />
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">{novel.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {novel.status === 'published' ? 'Published' : novel.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Lock size={18} className="text-purple-400" /> Ubah Password
                </h3>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              {passwordError && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500" role="alert">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-400 flex items-center gap-2" role="status">
                  <Check size={16} /> {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Password Saat Ini</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password Baru (min. 8 karakter, 1 huruf besar, 1 angka)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    required
                    minLength={8}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {passwordLoading ? 'Menyimpan...' : 'Simpan Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}