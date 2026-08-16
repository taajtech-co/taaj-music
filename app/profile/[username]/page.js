'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { useSongPlayer } from '../../../context/PlayerContext';
import { useCachedQuery } from '../../../lib/useCachedQuery';
import { useDataCache } from '../../../context/DataCacheContext';

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const { playQueue } = useSongPlayer();
  const { clearCached } = useDataCache();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [editing, setEditing] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [tipping, setTipping] = useState(false);
  const [tipAmount, setTipAmount] = useState('5');
  const [tipLoading, setTipLoading] = useState(false);
  const [tipError, setTipError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id || null);
      setCurrentUserEmail(data.session?.user.email || null);
      setSessionChecked(true);
    });
  }, [username]);

  const fetchProfileBundle = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_path')
      .eq('username', username)
      .maybeSingle();

    if (!profileData) return { profile: null };

    const { data: sessionData } = await supabase.auth.getSession();
    const myId = sessionData.session?.user.id || null;

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

    return {
      profile: profileData,
      followerCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
      isFollowing: !!followRowRes.data,
      songs: songsRes.data || [],
    };
  };

  const cacheKey = `profile:${username}`;
  const { data: bundle, loading, refresh } = useCachedQuery(cacheKey, fetchProfileBundle);

  useEffect(() => {
    if (bundle?.profile) {
      setDisplayNameDraft(bundle.profile.display_name || '');
    }
  }, [bundle]);

  const avatarUrl = (p) => {
    if (!p?.avatar_path) return null;
    return supabase.storage.from('avatars').getPublicUrl(p.avatar_path).data.publicUrl;
  };

  const toggleFollow = async () => {
    if (!currentUserId || !bundle?.profile) return;
    const profile = bundle.profile;
    const nowFollowing = !bundle.isFollowing;

    if (nowFollowing) {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id });
    } else {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id);
    }

    clearCached(cacheKey);
    refresh();
  };

  const saveProfileEdits = async () => {
    if (!bundle?.profile) return;
    setSaving(true);

    let avatarPath = bundle.profile.avatar_path;
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

    clearCached(cacheKey);
    clearCached('users:all');

    setSaving(false);
    setEditing(false);
    setAvatarFile(null);
    refresh();
  };

  const sendTip = async () => {
    if (!currentUserEmail || !bundle?.profile) return;
    setTipError('');
    setTipLoading(true);

    try {
      const res = await fetch('/api/tip/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUserEmail,
          amount: tipAmount,
          artistId: bundle.profile.id,
        }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setTipError(json.error || 'Could not start payment.');
        setTipLoading(false);
        return;
      }

      window.location.href = json.authorizationUrl;
    } catch (err) {
      setTipError('Something went wrong: ' + err.message);
      setTipLoading(false);
    }
  };

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const playSongAt = (index) => {
    playQueue(bundle.songs, index);
  };

  if (loading || !sessionChecked) {
    return (
      <div className="content-area" style={{ paddingTop: '30px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!bundle?.profile) {
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

  const { profile, followerCount, followingCount, isFollowing, songs } = bundle;
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
              <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <button
                  className={isFollowing ? 'btn btn-outline' : 'btn btn-primary'}
                  onClick={toggleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="btn btn-outline" onClick={() => setTipping(!tipping)}>
                  <i className="fas fa-heart" style={{ marginRight: '6px', color: '#E5484D' }}></i>
                  Tip artist
                </button>
              </div>
            )}

            {tipping && (
              <div className="upload-card" style={{ maxWidth: '360px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, marginBottom: '12px' }}>Send a tip</div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Amount (GH₵)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                />
                {tipError && <div className="error-msg">{tipError}</div>}
                <button
                  className="btn btn-primary"
                  onClick={sendTip}
                  disabled={tipLoading}
                  style={{ width: '100%', padding: '12px', borderRadius: '999px', marginTop: '15px' }}
                >
                  {tipLoading ? 'Starting payment...' : `Send GH₵${tipAmount || '0'}`}
                </button>
              </div>
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
