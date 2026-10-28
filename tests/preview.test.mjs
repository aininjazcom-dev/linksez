import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedLink, sourceFor, httpUrl, tagsFromText } from '../src/link-utils.js';
import { parseMetadata, publicIpv4, publicUrl } from '../preview.mjs';

test('extracts a link from a chat-style share message', () => {
  assert.deepEqual(sharedLink('?title=An%20article&text=Read%20later%20https%3A%2F%2Fexample.com%2Fstory'), {
    url: 'https://example.com/story', title: 'An article', note: 'Read later'
  });
  assert.equal(sharedLink('?text=No%20link%20here'), null);
});

test('recognizes sources without matching lookalike domains', () => {
  assert.equal(sourceFor('https://www.instagram.com/reel/abc', 'Post'), 'Instagram');
  assert.equal(sourceFor('https://youtube.com.evil.example/video', 'Video'), 'Website');
  assert.equal(httpUrl('javascript:alert(1)'), '');
  assert.deepEqual(tagsFromText('design, ideas, , travel'), ['design', 'ideas', 'travel']);
});

test('extracts rich metadata and resolves a relative image', () => {
  const html = '<title>Fallback</title><meta content="Hello &amp; World" property="og:title"><meta name="description" content="A good read"><meta property="og:image" content="/cover.jpg"><meta name="keywords" content="design, reading">';
  assert.deepEqual(parseMetadata(html, 'https://example.com/story'), {
    title: 'Hello & World', description: 'A good read', image: 'https://example.com/cover.jpg', tags: ['design', 'reading'], siteName: ''
  });
});

test('rejects private metadata targets', () => {
  assert.equal(publicIpv4('127.0.0.1'), false);
  assert.equal(publicIpv4('192.168.1.5'), false);
  assert.equal(publicIpv4('8.8.8.8'), true);
  assert.throws(() => publicUrl('http://localhost/private'));
  assert.throws(() => publicUrl('http://127.0.0.1/private'));
  assert.throws(() => publicUrl('http://[::1]/private'));
  assert.throws(() => publicUrl('file:///secret'));
});
