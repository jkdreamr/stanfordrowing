import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS home-screen icon (iOS applies its own rounded mask, so no border radius). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#c8202b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative', width: 108, height: 108, display: 'flex' }}>
          <div style={{ position: 'absolute', top: 13, left: 54, width: 28, height: 28, borderRadius: 28, background: '#fff' }} />
          <div style={{ position: 'absolute', top: 54, left: 7, width: 97, height: 18, borderRadius: 9, background: '#fff', transform: 'rotate(-32deg)' }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
