// Skillpack base App. Skills mount components by inserting at the named markers
// below. Do not remove the marker comments; they are how `skillpack add` knows
// where to put things.

import React from 'react';

// @skillpack:imports

export function App(): React.ReactElement {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32 }}>
      <h1>Hello, world.</h1>
      <p>Scaffolded with skillpack. Edit <code>src/App.tsx</code> and start building.</p>
      {/* @skillpack:mount */}
    </main>
  );
}
