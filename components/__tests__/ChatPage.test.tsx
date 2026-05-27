// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const Div = (props: any) => React.createElement('div', props, props.children);
  const Button = (props: any) => React.createElement('button', props, props.children);
  const Span = (props: any) => React.createElement('span', props, props.children);
  const P = (props: any) => React.createElement('p', props, props.children);
  return {
    motion: { div: Div, button: Button, span: Span, p: P },
    AnimatePresence: (props: any) => React.createElement(React.Fragment, null, props.children),
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const createIcon = (name: string) => (props: any) =>
    React.createElement('span', { ...props, 'data-testid': `${name}-icon` }, name);
  return {
    Send: createIcon('Send'),
    Sparkles: createIcon('Sparkles'),
    Loader2: createIcon('Loader2'),
    FileText: createIcon('FileText'),
    X: createIcon('X'),
    CheckCircle2: createIcon('CheckCircle2'),
    ArrowRight: createIcon('ArrowRight'),
    MessageSquare: createIcon('MessageSquare'),
    User: createIcon('User'),
    Bot: createIcon('Bot'),
    RefreshCw: createIcon('RefreshCw'),
    Edit3: createIcon('Edit3'),
  };
});

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('renders the welcome message on load', async () => {
    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));
    expect(screen.getAllByText(/AI resume builder/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tell me about yourself/i)).toBeTruthy();
  });

  it('renders the input textarea and send button', async () => {
    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));
    expect(screen.getByPlaceholderText(/Describe your background/i)).toBeTruthy();
    expect(screen.getByTestId('Send-icon')).toBeTruthy();
  });

  it('shows suggested messages when no messages sent yet', async () => {
    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));
    expect(screen.getByText(/Try saying:/i)).toBeTruthy();
    expect(screen.getByText(/full-stack developer/i)).toBeTruthy();
  });

  it('clicking a suggested message fills the input', async () => {
    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));
    const suggestion = screen.getByText(/full-stack developer/i);
    fireEvent.click(suggestion);
    const textarea = screen.getByPlaceholderText(/Describe your background/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('full-stack developer');
  });

  it('sends message and shows user bubble on submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resume: {
          name: 'Test User',
          email: '',
          phone: '',
          location: '',
          title: 'Developer',
          summary: 'Test summary',
          skills: ['JS'],
          experience: [{ company: 'Co', role: 'Dev', duration: '2020', bullets: ['Worked'] }],
          education: [{ school: 'MIT', degree: 'BS', year: '2019' }],
        },
      }),
    });

    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const textarea = screen.getByPlaceholderText(/Describe your background/i);
    fireEvent.change(textarea, { target: { value: 'I am a developer' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('I am a developer')).toBeTruthy();
    });
  });

  it('shows "Save & Edit" and "Start Over" when resume is generated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resume: {
          name: 'Test',
          email: '',
          phone: '',
          location: '',
          title: 'Dev',
          summary: '',
          skills: [],
          experience: [],
          education: [],
        },
      }),
    });

    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const textarea = screen.getByPlaceholderText(/Describe your background/i);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Save & Edit')).toBeTruthy();
      expect(screen.getByText('Start Over')).toBeTruthy();
      expect(screen.getByText('Resume ready')).toBeTruthy();
    });
  });

  it('saves to localStorage and redirects on "Save & Edit" click', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resume: {
          name: 'Rahul',
          email: '',
          phone: '',
          location: '',
          title: 'Dev',
          summary: '',
          skills: [],
          experience: [],
          education: [],
        },
      }),
    });

    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const textarea = screen.getByPlaceholderText(/Describe your background/i);
    fireEvent.change(textarea, { target: { value: 'Rahul dev' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Save & Edit')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Save & Edit'));

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'lazyme_pending_resume',
      expect.stringContaining('Rahul')
    );
    expect(mockPush).toHaveBeenCalledWith('/resume');
  });

  it('shows error message when API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'AI service unavailable' }),
    });

    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const textarea = screen.getByPlaceholderText(/Describe your background/i);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/AI service unavailable/i)).toBeTruthy();
    });
  });

  it('calls handleRefine instead of handleSend when resume already generated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resume: {
          name: 'Test',
          email: '',
          phone: '',
          location: '',
          title: 'Dev',
          summary: '',
          skills: [],
          experience: [],
          education: [],
        },
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resume: {
          name: 'Test Updated',
          email: '',
          phone: '',
          location: '',
          title: 'Senior Dev',
          summary: '',
          skills: ['React'],
          experience: [],
          education: [],
        },
      }),
    });

    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const textarea = screen.getByPlaceholderText(/Describe your background/i);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Resume ready')).toBeTruthy();
    });

    const textareaAfter = screen.getByPlaceholderText(/Ask me to refine/i);
    fireEvent.change(textareaAfter, { target: { value: 'make me senior' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('make me senior')).toBeTruthy();
    });
  });

  it('generating state shows loading indicator', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const textarea = screen.getByPlaceholderText(/Describe your background/i);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/Generating your resume/i)).toBeTruthy();
    });
  });

  it('does not send empty messages - send button is disabled', async () => {
    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const sendBtn = screen.getByTestId('Send-icon').closest('button')!;
    expect(sendBtn.hasAttribute('disabled')).toBe(true);
  });

  it('allows starting over after resume generation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resume: {
          name: 'Test',
          email: '',
          phone: '',
          location: '',
          title: 'Dev',
          summary: '',
          skills: [],
          experience: [],
          education: [],
        },
      }),
    });

    const ChatPage = (await import('../ChatPage')).default;
    render(React.createElement(ChatPage));

    const textarea = screen.getByPlaceholderText(/Describe your background/i);
    fireEvent.change(textarea, { target: { value: 'test' } });
    fireEvent.click(screen.getByTestId('Send-icon').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Start Over')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Start Over'));

    expect(screen.queryByText('Save & Edit')).toBeNull();
    expect(screen.getByText(/Try saying/i)).toBeTruthy();
  });
});
