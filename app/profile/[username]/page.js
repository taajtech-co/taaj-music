'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import Navbar from '../../../components/Navbar';
import { useSongPlayer } from '../../../context/PlayerContext';

export default function ProfilePage() {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [songs, setSongs] = useState([]);
  const { playQueue } = useSongPlayer();

  useEffect(() => {
    load();
  }, [username]);

  const load = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const myId = sessionData.session?.user.id || null;
    setCurrentUserId(myId);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (!profileData) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(profileData);

    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileData.id);
    setFollowerCount(followers || 0);

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileData.id);
    setFollowingCount(following || 0);

    if (myId) {
      const { data: followRow } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', myId)
        .eq('following_id', profileData.id)
        .maybeSingle();
      setIsFollowing(!!followRow);
    }

    const { data: songsData } = await supabase
      .from('songs')
      .select('id, title, artist, storage_path, cover_path, lyrics, timed_lyrics, created_at')
      .eq('uploader_id', profileData.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    setSongs(songsData || []);

    setLoading(false);
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

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const playSongAt = (index) => {
    playQueue(songs, index);
  };

  if (loading) return null;

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="content-area">
          <p style={{ color: 'var(--text-muted)' }}>No profile found for @{username}.</p>
        </div>
      </>
    );
  }

  const isOwnProfile = currentUserId === profile.id;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'var(--accent)',
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
            {profile.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="section-title" style={{ marginBottom: '6px' }}>@{profile.username}</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
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
      </div>
    </>
  );
    }
