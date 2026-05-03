import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders the upload area when no image is loaded', () => {
    render(<App />);
    expect(screen.getByText(/Import Media/i)).toBeInTheDocument();
  });

  it('displays the app title in header', () => {
    render(<App />);
    expect(screen.getByText(/Th3rdAI Vision Studio/i)).toBeInTheDocument();
  });

  it('shows drag and drop instruction', () => {
    render(<App />);
    expect(screen.getByText(/DRAG AND DROP OR CLICK TO BROWSE/i)).toBeInTheDocument();
  });
});
