const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildCloudinarySignature,
  buildCloudinaryUploadParams,
  normalizeUploadSource,
} = require('../utils/cloudinary');

test('buildCloudinarySignature returns deterministic SHA1 signature', () => {
  const signature = buildCloudinarySignature(
    {
      folder: 'net-viet-travel',
      public_id: 'sample-image',
      timestamp: 1719999999,
    },
    'secret123',
  );

  assert.equal(signature, '8fe20afb292f131c44bd888b96c89753b1cffe62');
});

test('buildCloudinaryUploadParams normalizes upload options', () => {
  const params = buildCloudinaryUploadParams(
    {
      context: {
        alt: 'hero image',
      },
      overwrite: true,
      resourceType: 'image',
      tags: ['tour', 'hero'],
    },
    {
      folder: 'net-viet-travel',
    },
  );

  assert.deepEqual(params, {
    context: 'alt=hero image',
    folder: 'net-viet-travel',
    overwrite: true,
    resource_type: 'image',
    tags: 'tour,hero',
  });
});

test('normalizeUploadSource accepts Buffer input', async () => {
  const result = await normalizeUploadSource(Buffer.from('hello'), {
    fileName: 'hello.txt',
    mimeType: 'text/plain',
  });

  assert.equal(result.kind, 'blob');
  assert.equal(result.fileName, 'hello.txt');
  assert.equal(await result.value.text(), 'hello');
});

test('normalizeUploadSource accepts local file path input', async () => {
  const tempFilePath = path.join(os.tmpdir(), `cloudinary-test-${Date.now()}.txt`);

  await fs.writeFile(tempFilePath, 'net-viet');

  try {
    const result = await normalizeUploadSource(tempFilePath);

    assert.equal(result.kind, 'blob');
    assert.equal(result.fileName, path.basename(tempFilePath));
    assert.equal(await result.value.text(), 'net-viet');
  } finally {
    await fs.unlink(tempFilePath).catch(() => {});
  }
});

test('normalizeUploadSource accepts base64 object input', async () => {
  const result = await normalizeUploadSource({
    base64: Buffer.from('travel').toString('base64'),
    mimeType: 'text/plain',
  });

  assert.equal(result.kind, 'string');
  assert.match(result.value, /^data:text\/plain;base64,/);
});
