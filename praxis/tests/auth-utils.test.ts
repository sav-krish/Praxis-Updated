import assert from 'node:assert/strict';
import test from 'node:test';
import * as auth from '../src/lib/auth-utils';

test('post-login destinations preserve local joins and reject external redirects', () => {
  assert.equal(typeof auth.safeAuthNextPath, 'function');
  for (const unsafe of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/\nevil.example']) {
    assert.equal(auth.safeAuthNextPath(unsafe), '/dashboard');
  }
  assert.equal(auth.safeAuthNextPath('/join?code=CLASS123'), '/join?code=CLASS123');
  assert.equal(auth.safeAuthNextPath('/dashboard'), '/dashboard');
});
