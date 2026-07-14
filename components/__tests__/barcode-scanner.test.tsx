import { act, render, screen } from '@testing-library/react';
import BarcodeScanner from '@/components/barcode-scanner';

const stopMock = jest.fn();
const playMock = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeOnceFromVideoElement: jest.fn(),
  })),
}));

describe('BarcodeScanner', () => {
  beforeEach(() => {
    stopMock.mockReset();
    playMock.mockClear();

    jest.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(playMock);

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopMock }],
          getVideoTracks: () => [{ getCapabilities: () => ({}) }],
        }),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stops the active camera stream and clears the video element on unmount', async () => {
    const { unmount } = render(
      <BarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />
    );

    const videoElement = (await screen.findByTestId(
      'barcode-video'
    )) as HTMLVideoElement;
    expect(videoElement).toBeInTheDocument();

    act(() => {
      unmount();
    });

    expect(stopMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a late arriving camera stream if unmount happens before getUserMedia resolves', async () => {
    let resolveGetUserMedia: ((stream: MediaStream) => void) | undefined;
    const pendingStream = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockReturnValue(pendingStream),
      },
      configurable: true,
    });

    const { unmount } = render(
      <BarcodeScanner onScan={jest.fn()} onClose={jest.fn()} />
    );

    act(() => {
      unmount();
    });

    const lateStream = {
      getTracks: () => [{ stop: stopMock }],
      getVideoTracks: () => [{ getCapabilities: () => ({}) }],
    } as unknown as MediaStream;

    await act(async () => {
      resolveGetUserMedia?.(lateStream);
      await Promise.resolve();
    });

    expect(stopMock).toHaveBeenCalledTimes(1);
  });
});
