'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { useSongPlayer } from '../../../context/PlayerContext';

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [songs, setSongs] = useState([]);
  const { playQueue } = useSongPlayer();

  const [editing, setEditing] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [username]);

  const load = async () => {
    setLoading(true);

    // Get session and the profile itself first - everything else depends on the profile's id
    const [{ data: sessionData }, { data: profileData }] = await Promise.all([
      supabase.auth.getSession(),
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_path')
        .eq('username', username)
        .maybeSingle(),
    ]);

    const myId = sessionData.session?.user.id || null;
    setCurrentUserId(myId);

    if (!profileData) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(profileData);
    setDisplayNameDraft(profileData.display_name || '');

    // Now fire off everything else in parallel instead of one-by-one
    const [followersRes, followingRes, followRowRes, songsRes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
      myId
        ? supabase.from('follows').select('*').eq('follower_id', myId).eq('following_id', profileData.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('songs')
        .select('id, title, artist, storage_path, cover_path, lyrics, timed_lyrics, created_at')
        .eq('uploader_id', profileData.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
    ]);

    setFollowerCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
    setIsFollowing(!!followRowRes.data);
    setSongs(songsRes.data || []);

    setLoading(false);
  };

  const avatarUrl = (p) => {
    if (!p?.avatar_path) return null;
    return supabase.storage.from('avatars').getPublicUrl(p.avatar_path).data.publicUrl;
  };

  const toggleFollow = async () => {
    if (!currentUserId || !profile) return;

    if (isFollowing) {
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(c - 1, 0));
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id);
    } else {
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
      await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: profile.id });
    }
  };

  const saveProfileEdits = async () => {
    setSaving(true);

    let avatarPath = profile.avatar_path;
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const newPath = `${currentUserId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(newPath, avatarFile);
      if (!uploadError) avatarPath = newPath;
    }

    await supabase
      .from('profiles')
      .update({ display_name: displayNameDraft.trim() || null, avatar_path: avatarPath })
      .eq('id', currentUserId);

    setSaving(false);
    setEditing(false);
    setAvatarFile(null);
    load();
  };

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const playSongAt = (index) => {
    playQueue(songs, index);
  };

  if (loading) {
    return (
      <div className="content-area" style={{ paddingTop: '30px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <>
        <div className="settings-topbar">
          <button className="settings-back" onClick={() => router.back()}><i className="fas fa-arrow-left"></i></button>
          <div className="settings-topbar-title">Account</div>
          <div style={{ width: '32px' }}></div>
        </div>
        <div className="content-area">
          <p style={{ color: 'var(--text-muted)' }}>No profile found for @{username}.</p>
        </div>
      </>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const displayLabel = profile.display_name || `@${profile.username}`;

  return (
    <>
      <div className="settings-topbar">
        <button className="settings-back" onClick={() => router.back()}><i className="fas fa-xmark"></i></button>
        <div className="settings-topbar-title">Account</div>
        {isOwnProfile ? (
          <button className="settings-back" onClick={() => setEditing(!editing)}>
            <i className={editing ? 'fas fa-xmark' : 'fas fa-pencil'}></i>
          </button>
        ) : (
          <div style={{ width: '32px' }}></div>
        )}
      </div>

      <div className="content-area">
        {editing ? (
          <div className="upload-card" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <label style={{ position: 'relative', cursor: 'pointer' }}>
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: avatarFile ? `url(${URL.createObjectURL(avatarFile)}) center/cover` : (avatarUrl(profile) ? `url(${avatarUrl(profile)}) center/cover` : 'var(--accent)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '30px',
                  }}
                >
                  {!avatarFile && !avatarUrl(profile) && profile.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>
                  <i className="fas fa-camera"></i>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setAvatarFile(e.target.files[0])}
                />
              </label>
            </div>

            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Display name
            </label>
            <input
              type="text"
              placeholder="How you want to appear"
              value={displayNameDraft}
              onChange={(e) => setDisplayNameDraft(e.target.value)}
            />

            <button
              className="btn btn-primary"
              onClick={saveProfileEdits}
              disabled={saving}
              style={{ width: '100%', padding: '12px', borderRadius: '999px', marginTop: '18px' }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: avatarUrl(profile) ? `url(${avatarUrl(profile)}) center/cover` : 'var(--accent)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '28px',
                  flexShrink: 0,
                }}
              >
                {!avatarUrl(profile) && profile.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="section-title" style={{ marginBottom: '6px' }}>{displayLabel}</h1>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>@{profile.username}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                  <strong style={{ color: 'var(--text)' }}>{followerCount}</strong> followers ·{' '}
                  <strong style={{ color: 'var(--text)' }}>{followingCount}</strong> following
                </div>
              </div>
            </div>

            {!isOwnProfile && currentUserId && (
              <button
                className={isFollowing ? 'btn btn-outline' : 'btn btn-primary'}
                onClick={toggleFollow}
                style={{ marginBottom: '30px' }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}

            <h2 className="section-title" style={{ fontSize: '18px', marginTop: isOwnProfile ? 0 : '10px' }}>
              Uploads
            </h2>

            {songs.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No approved uploads yet.</p>
            )}

            <div className="cards-grid">
              {songs.map((song, index) => (
                <div className="card" key={song.id} onClick={() => playSongAt(index)}>
                  <div className="card-img" style={coverUrl(song) ? { background: `url(${coverUrl(song)}) center/cover` } : {}}>
                    {!coverUrl(song) && <i className="fas fa-music"></i>}
                  </div>
                  <div className="card-title">{song.title}</div>
                  <div className="card-desc">{song.artist}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
