import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App.js';

describe('App', () => {
  it('renders the greeting', () => {
    render(<App />);
    // Query by the unique substring 'world' so skill-added headings
    // (e.g. the Remotion preview's 'Hello from skillpack') don't collide.
    expect(screen.getByRole('heading', { level: 1, name: /world/i })).toBeInTheDocument();
  });
});
