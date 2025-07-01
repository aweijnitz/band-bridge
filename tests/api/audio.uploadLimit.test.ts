const fileUploadMock = jest.fn(() => (req: any, res: any, next: any) => next());
jest.mock('express-fileupload', () => ({ __esModule: true, default: fileUploadMock }));

beforeEach(() => {
  fileUploadMock.mockClear();
  delete process.env.MAX_UPLOAD_SIZE;
  jest.resetModules();
});

test('default upload limit is 1GB', () => {
  require('../../src/backend/audio/index');
  expect(fileUploadMock.mock.calls[0][0]).toEqual({ limits: { fileSize: 1024 ** 3 } });
});

test('uses configured MAX_UPLOAD_SIZE', () => {
  process.env.MAX_UPLOAD_SIZE = '2MB';
  require('../../src/backend/audio/index');
  expect(fileUploadMock.mock.calls[0][0]).toEqual({ limits: { fileSize: 2 * 1024 * 1024 } });
});
