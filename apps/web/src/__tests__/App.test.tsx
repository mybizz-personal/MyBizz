import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('should render without crashing', async () => {
    render(<App />);
    expect(screen.getByText(/Starting MyBizz/i)).toBeInTheDocument();
  });
});
