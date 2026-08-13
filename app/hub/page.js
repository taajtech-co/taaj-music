'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HubPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('inbox');
  const [inboxUnread, setInboxUnread] = useState(0);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [myVotes, setMyVotes] = useState(new Set());
  const [reqTitle, setReqTitle] = useState('');
  const [reqArtist, setReqArtist] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  const [polls, setPolls] = useState([]);
  const [pollsLoading, setPollsLoading] = useState(true);
  const [myPollVotes, setMyPollVotes] = useState({});

  const unvotedPollCount = polls.filter((p) => !p.closed && !myPollVotes[p.id]).length;
  const unvotedRequestCount = requests.filter((r) => r.requester_id !== userId && !myVotes.has(r.id)).length;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      setUserId(data.session.user.id);
      setChecking(false);

      const { data: profile } = await supabase
        .from('profiles')
        .select('last_seen_new_songs')
        .eq('id', data.session.user.id)
        .single();

      const lastSeen = profile?.last_seen_new_songs || '1970-01-01';
      const { count } = await supabase
        .from('inbox_posts')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastSeen);
      setInboxUnread(count || 0);

      loadInbox();
      loadRequests(data.session.user.id);
      loadPolls(data.session.user.id);

      await supabase
        .from('profiles')
        .update({ last_seen_new_songs: new Date().toISOString() })
        .eq('id', data.session.user.id);
    });
  }, []);

  const loadInbox = async () => {
    setPostsLoading(true);
    const { data } = await supabase
      .from('inbox_posts')
      .select('id, type, title, body, song_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setPosts(data || []);
    setPostsLoading(false);
  };

  const loadRequests = async (uid) => {
    setRequestsLoading(true);
    const { data } = await supabase
      .from('song_requests')
      .select('id, title, artist, note, vote_count, requester_id, created_at')
      .order('vote_count', { ascending: false })
      .limit(50);
    setRequests(data || []);

    const { data: votes } = await supabase
      .from('song_request_votes')
      .select('request_id')
      .eq('user_id', uid);
    setMyVotes(new Set((votes || []).map((v) => v.request_id)));

    setRequestsLoading(false);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;
    setSubmittingReq(true);

    const { data, error } = await supabase
      .from('song_requests')
      .insert({
        requester_id: userId,
        title: reqTitle.trim(),
        artist: reqArtist.trim() || null,
        note: reqNote.trim() || null,
      })
      .select()
      .single();

    if (!error && data) {
      await supabase.from('song_request_votes').insert({ request_id: data.id, user_id: userId });
      setReqTitle('');
      setReqArtist('');
      setReqNote('');
      loadRequests(userId);
    }
    setSubmittingReq(false);
  };

  const toggleUpvote = async (requestId) => {
    const hasVoted = myVotes.has(requestId);
    const nextVotes = new Set(myVotes);

    if (hasVoted) {
      nextVotes.delete(requestId);
      setMyVotes(nextVotes);
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, vote_count: Math.max(r.vote_count - 1, 0) } : r));
      await supabase.from('song_request_votes').delete().eq('request_id', requestId).eq('user_id', userId);
    } else {
      nextVotes.add(requestId);
      setMyVotes(nextVotes);
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, vote_count: r.vote_count + 1 } : r));
      await supabase.from('song_request_votes').insert({ request_id: requestId, user_id: userId });
    }
  };

  const loadPolls = async (uid) => {
    setPollsLoading(true);
    const { data: pollsData } = await supabase
      .from('polls')
      .select('id, question, closed, created_at, poll_options(id, option_text, vote_count)')
      .order('created_at', { ascending: false });
    setPolls(pollsData || []);

    const { data: votes } = await supabase
      .from('poll_votes')
      .select('poll_id, option_id')
      .eq('user_id', uid);

    const voteMap = {};
    (votes || []).forEach((v) => { voteMap[v.poll_id] = v.option_id; });
    setMyPollVotes(voteMap);

    setPollsLoading(false);
  };

  const votePoll = async (pollId, optionId) => {
    if (myPollVotes[pollId]) return;

    setMyPollVotes((prev) => ({ ...prev, [pollId]: optionId }));
    setPolls((prev) =>
      prev.map((p) =>
        p.id === pollId
          ? {
              ...p,
              poll_options: p.poll_options.map((o) =>
                o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
              ),
            }
          : p
      )
    );

    await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: userId, option_id: optionId });
  };

  if (checking) return null;

  const TabBadge = ({ count }) =>
    count > 0 ? (
      <span
        style={{
          marginLeft: '6px',
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 700,
          padding: '1px 6px',
        }}
      >
        {count > 9 ? '9+' : count}
      </span>
    ) : null;

  return (
    <>
      <div className="settings-topbar">
        <button className="settings-back" onClick={() => router.back()}><i className="fas fa-arrow-left"></i></button>
        <div className="settings-topbar-title">Hub</div>
        <div style={{ width: '32px' }}></div>
      </div>

      <div className="hub-tabs">
        <button className={`hub-tab ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
          Inbox<TabBadge count={inboxUnread} />
        </button>
        <button className={`hub-tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
          Requests<TabBadge count={unvotedRequestCount} />
        </button>
        <button className={`hub-tab ${tab === 'polls' ? 'active' : ''}`} onClick={() => setTab('polls')}>
          Polls<TabBadge count={unvotedPollCount} />
        </button>
      </div>

      <div className="content-area" style={{ paddingTop: 0 }}>
        {tab === 'inbox' && (
          <>
            {postsLoading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}
            {!postsLoading && posts.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>Nothing here yet.</p>
            )}
            {posts.map((post) => (
              <div key={post.id} className="card" style={{ cursor: 'default', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: post.type === 'new_song' ? 'var(--accent-2)' : 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', flexShrink: 0, fontSize: '14px',
                    }}
                  >
                    <i className={post.type === 'new_song' ? 'fas fa-music' : 'fas fa-bullhorn'}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {post.type === 'new_song' ? `New song: ${post.title}` : post.title}
                    </div>
                    {post.body && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>{post.body}</div>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                      {timeAgo(post.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'requests' && (
          <>
            <form onSubmit={submitRequest} className="upload-card" style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, marginBottom: '12px' }}>Request a song</div>
              <input
                type="text"
                placeholder="Song title"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Artist (optional)"
                value={reqArtist}
                onChange={(e) => setReqArtist(e.target.value)}
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={reqNote}
                onChange={(e) => setReqNote(e.target.value)}
              />
              <button className="btn btn-primary" type="submit" disabled={submittingReq} style={{ width: '100%', padding: '12px', borderRadius: '999px', marginTop: '10px' }}>
                {submittingReq ? 'Submitting...' : 'Submit request'}
              </button>
            </form>

            {requestsLoading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}
            {!requestsLoading && requests.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No requests yet — be the first!</p>
            )}
            {requests.map((r) => (
              <div key={r.id} className="request-row">
                <button
                  className={`upvote-btn ${myVotes.has(r.id) ? 'active' : ''}`}
                  onClick={() => toggleUpvote(r.id)}
                >
                  <i className="fas fa-caret-up" style={{ fontSize: '16px' }}></i>
                  {r.vote_count}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.title}</div>
                  {r.artist && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{r.artist}</div>}
                  {r.note && <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{r.note}</div>}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'polls' && (
          <>
            {pollsLoading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}
            {!pollsLoading && polls.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No polls right now.</p>
            )}
            {polls.map((poll) => {
              const totalVotes = poll.poll_options.reduce((sum, o) => sum + o.vote_count, 0);
              const votedOptionId = myPollVotes[poll.id];

              return (
                <div key={poll.id} className="card" style={{ cursor: 'default', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '12px' }}>{poll.question}</div>
                  {poll.poll_options.map((opt) => {
                    const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                    const isVoted = votedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        className="poll-option-btn"
                        onClick={() => votePoll(poll.id, opt.id)}
                        disabled={!!votedOptionId}
                        style={isVoted ? { borderColor: 'var(--accent)' } : {}}
                      >
                        {votedOptionId && (
                          <div className="poll-option-fill" style={{ width: `${pct}%` }}></div>
                        )}
                        <div className="poll-option-content">
                          <span>{opt.option_text}</span>
                          {votedOptionId && <span>{pct}%</span>}
                        </div>
                      </button>
                    );
                  })}
                  {totalVotes > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
                                    }
