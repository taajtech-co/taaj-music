import { NextResponse } from 'next/server';

export async function POST(request) {
  const { audioUrl } = await request.json();

  if (!audioUrl) {
    return NextResponse.json({ error: 'Missing audioUrl' }, { status: 400 });
  }

  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error('Could not fetch the audio file.');
    const audioBlob = await audioRes.blob();

    const formData = new FormData();
    formData.append('file', audioBlob, 'song.mp3');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json({ error: `Transcription failed: ${errText}` }, { status: 500 });
    }

    const data = await groqRes.json();
    const segments = data.segments || [];

    const lines = segments
      .map((seg) => ({ time: seg.start, text: seg.text.trim() }))
      .filter((l) => l.text.length > 0);

    if (lines.length === 0) {
      return NextResponse.json({ error: 'No speech/vocals detected in this track.' }, { status: 500 });
    }

    return NextResponse.json({ lines });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
