module.exports = {
  create: () => ({
    on: jest.fn(),
    destroy: jest.fn(),
    playPause: jest.fn(),
    stop: jest.fn(),
    getCurrentTime: jest.fn(() => 0),
    setTime: jest.fn(),
    registerPlugin: jest.fn(() => ({
      destroy: jest.fn(),
      clear: jest.fn(),
      addRegion: jest.fn(),
    })),
    getActivePlugins: jest.fn(() => [{
      clear: jest.fn(),
      addRegion: jest.fn(),
      constructor: { name: 'RegionsPlugin' },
    }]),
  }),
}; 