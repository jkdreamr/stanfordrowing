import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** Favicon / browser-tab icon — the cardinal mark on Stanford red. */
export default function Icon() {
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
          borderRadius: 110,
        }}
      >
        <div style={{ position: 'relative', width: 300, height: 300, display: 'flex' }}>
          {/* head */}
          <div style={{ position: 'absolute', top: 36, left: 150, width: 78, height: 78, borderRadius: 78, background: '#fff' }} />
          {/* oar / body */}
          <div style={{ position: 'absolute', top: 150, left: 18, width: 270, height: 50, borderRadius: 25, background: '#fff', transform: 'rotate(-32deg)' }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
