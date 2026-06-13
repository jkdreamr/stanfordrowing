import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Cardinal Row — Stanford Rowing';

/** Link-share preview card (iMessage, Slack, etc.). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0d1110',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: 96,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              background: '#c8202b',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ position: 'relative', width: 60, height: 60, display: 'flex' }}>
              <div style={{ position: 'absolute', top: 7, left: 30, width: 16, height: 16, borderRadius: 16, background: '#fff' }} />
              <div style={{ position: 'absolute', top: 30, left: 4, width: 54, height: 10, borderRadius: 5, background: '#fff', transform: 'rotate(-32deg)' }} />
            </div>
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#8a918a', letterSpacing: 4, display: 'flex' }}>
            STANFORD ROWING
          </div>
        </div>
        <div style={{ marginTop: 40, fontSize: 104, fontWeight: 800, color: '#f3f1ea', letterSpacing: -3, display: 'flex' }}>
          Cardinal Row
        </div>
        <div style={{ marginTop: 16, fontSize: 44, color: '#c4c8c0', display: 'flex' }}>
          Summer work, kept honest.
        </div>
      </div>
    ),
    { ...size }
  );
}
